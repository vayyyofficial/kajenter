import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wallet,
  Check,
  Plus,
  Trash2,
  X,
  RefreshCw,
  Search,
  UserCheck,
  Sparkles,
  Sliders
} from 'lucide-react';
import { useMemberAuth } from '../../context/MemberAuthContext';
import { api } from '../../services/api';
import { ClassKasRecord, ClassKasWeek, Member } from '../../types';
import { useRealtimeSync } from '../../context/SyncContext';

// Helper: Format Indonesian date range given a start date and week index
function generateWeekRange(startDateStr: string, weekOffset: number): { label: string; dateRange: string } {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const base = new Date(startDateStr);
  if (isNaN(base.getTime())) {
    return { label: `Week ${weekOffset + 1}`, dateRange: '' };
  }

  const start = new Date(base);
  start.setDate(start.getDate() + weekOffset * 7);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = months[start.getMonth()];
  const endMonth = months[end.getMonth()];

  let dateRange = '';
  if (startMonth === endMonth) {
    dateRange = `${startDay}–${endDay} ${startMonth}`;
  } else {
    dateRange = `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
  }

  return {
    label: `Week ${weekOffset + 1}`,
    dateRange,
  };
}

export const PortalKasTab: React.FC = () => {
  const { member } = useMemberAuth();

  const [weeks, setWeeks] = useState<ClassKasWeek[]>([]);
  const [students, setStudents] = useState<Member[]>([]);
  const [records, setRecords] = useState<ClassKasRecord[]>([]);
  const [defaultAmount, setDefaultAmount] = useState<number>(3000);
  const [loading, setLoading] = useState<boolean>(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  // Search & Select Anggota (for Bendahara/Ketua/Wakil/Developer)
  const [searchMemberQuery, setSearchMemberQuery] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Member | null>(null);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState<boolean>(false);

  // Toast / User Notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // "Set Periode Kas" Modal State
  const [isPeriodeModalOpen, setIsPeriodeModalOpen] = useState<boolean>(false);
  const [periodeNominal, setPeriodeNominal] = useState<number>(3000);
  const [periodeStartDate, setPeriodeStartDate] = useState<string>('2026-09-01');
  const [periodeNumWeeks, setPeriodeNumWeeks] = useState<number>(4);
  const [editableWeeks, setEditableWeeks] = useState<Array<{ weekNumber: number; label: string; dateRange: string }>>([]);
  const [periodeSubmitting, setPeriodeSubmitting] = useState<boolean>(false);

  // Show Toast Helper
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Check role permission dynamically from database member role
  const userRole = (member?.role || '').toLowerCase();
  const canManageKas = Boolean(
    member?.permissions?.canManageKas ||
    userRole === 'developer' ||
    userRole.includes('bendahara') ||
    userRole.includes('ketua') ||
    userRole.includes('wakil')
  );

  // Load all kas data, weeks, and students
  const loadKasData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch weeks
      let fetchedWeeks: ClassKasWeek[] = [];
      try {
        const weeksRes = await api.portal.kas.weeks.getAll();
        if (weeksRes.success && Array.isArray(weeksRes.data) && weeksRes.data.length > 0) {
          fetchedWeeks = weeksRes.data;
        }
      } catch (wErr) {
        console.warn('Could not load kas weeks, using defaults:', wErr);
      }

      // Default weeks if none exist yet
      if (fetchedWeeks.length === 0) {
        fetchedWeeks = [
          { id: 1, week_number: 1, label: 'Week 1', date_range: '1–7 Sep', year: 2026, order_index: 1 },
          { id: 2, week_number: 2, label: 'Week 2', date_range: '8–14 Sep', year: 2026, order_index: 2 },
          { id: 3, week_number: 3, label: 'Week 3', date_range: '15–21 Sep', year: 2026, order_index: 3 },
          { id: 4, week_number: 4, label: 'Week 4', date_range: '22–28 Sep', year: 2026, order_index: 4 },
        ];
      }
      setWeeks(fetchedWeeks);

      // 2. Fetch all registered students from database
      const membersRes = await api.members.getAll();
      if (membersRes.success && membersRes.data) {
        const sortedStudents = [...membersRes.data.siswa].sort(
          (a, b) => (a.attendance_number || 99) - (b.attendance_number || 99)
        );
        setStudents(sortedStudents);
      }

      // 3. Fetch payment records
      const kasRes = await api.portal.kas.getAll();
      if (kasRes.success) {
        setRecords(kasRes.data || []);
        setDefaultAmount(kasRes.defaultAmount || 3000);
        setPeriodeNominal(kasRes.defaultAmount || 3000);
      }
    } catch (err: any) {
      console.error('Failed to load kas spreadsheet data:', err);
      showToast('Data Kas belum dapat dimuat dari database. Silakan coba beberapa saat lagi.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKasData();
  }, [loadKasData]);

  // Real-time synchronization
  useRealtimeSync(['settings', 'members'], loadKasData);

  // Toggle single cell payment status (optimistic UI)
  const handleToggleCell = async (studentId: number, weekNumber: number, existingRecord?: ClassKasRecord) => {
    if (!canManageKas) return;

    const cellKey = `${studentId}_${weekNumber}`;
    try {
      setTogglingKey(cellKey);
      const newPaidStatus = existingRecord ? !existingRecord.is_paid : true;

      // Optimistic update
      setRecords((prev) => {
        const index = prev.findIndex(
          (r) => r.member_id === studentId && Number(r.week_number) === Number(weekNumber)
        );
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            status: newPaidStatus ? 'paid' : 'unpaid',
            is_paid: newPaidStatus,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              id: Date.now(),
              member_id: studentId,
              memberId: studentId,
              week_number: weekNumber,
              weekNumber,
              month_year: String(new Date().getFullYear()),
              monthYear: String(new Date().getFullYear()),
              year: new Date().getFullYear(),
              amount: defaultAmount,
              status: newPaidStatus ? 'paid' : 'unpaid',
              is_paid: newPaidStatus,
            } as ClassKasRecord,
          ];
        }
      });

      await api.portal.kas.record({
        member_id: studentId,
        year: new Date().getFullYear(),
        week_number: weekNumber,
        amount: defaultAmount,
        is_paid: newPaidStatus,
        notes: newPaidStatus ? 'Lunas' : 'Belum Bayar',
      });
    } catch (err: any) {
      console.error('Toggle cell error:', err);
      const friendlyErr = err.message?.includes('schema cache')
        ? 'Tabel Kas belum tersedia di Supabase. Silakan jalankan script supabase-migration-kas-jadwal-piket.sql di SQL Editor Supabase.'
        : err.message || 'Gagal mengubah status kas.';
      showToast(friendlyErr, 'error');
      await loadKasData();
    } finally {
      setTogglingKey(null);
    }
  };

  // Open "Set Periode Kas" Modal
  const handleOpenSetPeriode = () => {
    setPeriodeNominal(defaultAmount || 3000);
    if (weeks.length > 0) {
      setEditableWeeks(
        weeks.map((w) => ({
          weekNumber: w.week_number,
          label: w.label,
          dateRange: w.date_range || '',
        }))
      );
      setPeriodeNumWeeks(weeks.length);
    } else {
      handleGenerateDefaultWeeks(4, periodeStartDate);
    }
    setIsPeriodeModalOpen(true);
  };

  // Helper to generate weeks from start date and count
  const handleGenerateDefaultWeeks = (count: number, startDateStr: string) => {
    const generated = [];
    for (let i = 0; i < count; i++) {
      const { label, dateRange } = generateWeekRange(startDateStr, i);
      generated.push({
        weekNumber: i + 1,
        label,
        dateRange,
      });
    }
    setEditableWeeks(generated);
  };

  // Save Periode Kas to Supabase
  const handleSavePeriodeKas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editableWeeks.length === 0) {
      showToast('Minimal harus ada 1 minggu kas.', 'error');
      return;
    }

    try {
      setPeriodeSubmitting(true);
      await api.portal.kas.setPeriode({
        nominal: periodeNominal,
        startDate: periodeStartDate,
        weeks: editableWeeks.map((w, idx) => ({
          weekNumber: w.weekNumber || idx + 1,
          label: w.label.trim(),
          dateRange: w.dateRange.trim(),
          year: new Date().getFullYear(),
          orderIndex: idx + 1,
        })),
      });

      showToast('Periode kas berhasil disimpan dan disinkronkan ke Supabase!', 'success');
      setIsPeriodeModalOpen(false);
      await loadKasData();
    } catch (err: any) {
      console.error('Save periode error:', err);
      const friendlyErr = err.message?.includes('schema cache')
        ? 'Tabel Periode Kas belum tersedia di database. Silakan jalankan script migrasi supabase-migration-kas-jadwal-piket.sql di Supabase SQL Editor.'
        : err.message || 'Gagal menyimpan periode kas.';
      showToast(friendlyErr, 'error');
    } finally {
      setPeriodeSubmitting(false);
    }
  };

  // Add individual new week in modal
  const handleAddEditableWeek = () => {
    const nextNum = editableWeeks.length > 0 ? Math.max(...editableWeeks.map((w) => w.weekNumber)) + 1 : 1;
    const { label, dateRange } = generateWeekRange(periodeStartDate, nextNum - 1);
    setEditableWeeks([...editableWeeks, { weekNumber: nextNum, label, dateRange }]);
  };

  // Remove individual week in modal
  const handleRemoveEditableWeek = (index: number) => {
    setEditableWeeks(editableWeeks.filter((_, i) => i !== index));
  };

  // Filter students for Search Anggota
  const filteredStudents = useMemo(() => {
    if (!searchMemberQuery.trim()) return students;
    const q = searchMemberQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        (s.nickname && s.nickname.toLowerCase().includes(q)) ||
        (s.attendance_number !== null && s.attendance_number !== undefined && String(s.attendance_number).includes(q))
    );
  }, [students, searchMemberQuery]);

  // Overall statistics
  const totalStats = useMemo(() => {
    let totalPaidCells = 0;
    const totalPotentialCells = students.length * weeks.length;

    students.forEach((st) => {
      weeks.forEach((w) => {
        const rec = records.find(
          (r) => r.member_id === st.id && Number(r.week_number) === Number(w.week_number)
        );
        if (rec && rec.is_paid) totalPaidCells++;
      });
    });

    const totalMoney = totalPaidCells * defaultAmount;
    const totalUnpaidCells = Math.max(0, totalPotentialCells - totalPaidCells);

    return {
      totalCollected: totalMoney,
      paidCount: totalPaidCells,
      unpaidCount: totalUnpaidCells,
      completionRate: totalPotentialCells > 0 ? Math.round((totalPaidCells / totalPotentialCells) * 100) : 0,
    };
  }, [students, weeks, records, defaultAmount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'sticky',
            top: '0.75rem',
            zIndex: 100,
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            backgroundColor: toastMessage.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(34, 197, 94, 0.95)',
            color: '#ffffff',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.2rem' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 1. Header Banner */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--gray-200)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Wallet size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                  {canManageKas ? 'Sistem Kas Mingguan' : 'View Kas Kelas'}
                </h2>
                {!canManageKas && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--primary-50)',
                      color: 'var(--primary-700)',
                      border: '1px solid var(--primary-200)',
                    }}
                  >
                    Hanya Lihat
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '2px' }}>
                Rp{defaultAmount.toLocaleString('id-ID')} / minggu &bull; {weeks.length} Minggu Kas Aktif
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* "Set Periode Kas" button only visible to Bendahara, Wakil, Ketua, Developer */}
            {canManageKas && (
              <button
                onClick={handleOpenSetPeriode}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '10px',
                  backgroundColor: 'var(--primary-600)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'opacity 0.2s',
                }}
              >
                <Sliders size={15} />
                <span>Set Periode Kas</span>
              </button>
            )}

            <button
              onClick={loadKasData}
              style={{
                background: 'none',
                border: '1px solid var(--gray-200)',
                borderRadius: '10px',
                color: 'var(--gray-600)',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Refresh Data Kas"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Total Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.6rem',
            marginTop: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '14px',
              padding: '0.75rem 0.6rem',
              textAlign: 'center',
              border: '1px solid var(--gray-200)',
            }}
          >
            <div style={{ fontSize: '0.65rem', color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase' }}>
              Terkumpul
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-600)', marginTop: '0.2rem' }}>
              Rp{totalStats.totalCollected.toLocaleString('id-ID')}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '14px',
              padding: '0.75rem 0.6rem',
              textAlign: 'center',
              border: '1px solid var(--gray-200)',
            }}
          >
            <div style={{ fontSize: '0.65rem', color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase' }}>
              Total Lunas
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--success-main)', marginTop: '0.2rem' }}>
              {totalStats.paidCount} kali
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '14px',
              padding: '0.75rem 0.6rem',
              textAlign: 'center',
              border: '1px solid var(--gray-200)',
            }}
          >
            <div style={{ fontSize: '0.65rem', color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase' }}>
              Tercapai
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--gray-900)', marginTop: '0.2rem' }}>
              {totalStats.completionRate}%
            </div>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & PILIH ANGGOTA UNTUK BENDAHARA */}
      {canManageKas && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '20px',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--gray-200)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <UserCheck size={18} color="var(--primary-600)" />
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                Search & Catat Anggota
              </h3>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>
              Pilih dari {students.length} anggota kelas
            </span>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--gray-300)',
                borderRadius: '12px',
                padding: '0.6rem 0.85rem',
              }}
            >
              <Search size={16} color="var(--gray-400)" />
              <input
                type="text"
                value={searchMemberQuery}
                onFocus={() => setIsMemberDropdownOpen(true)}
                onChange={(e) => {
                  setSearchMemberQuery(e.target.value);
                  setIsMemberDropdownOpen(true);
                }}
                placeholder="Cari nama atau nomor absen siswa..."
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  width: '100%',
                  fontSize: '0.825rem',
                  color: 'var(--gray-900)',
                }}
              />
              {searchMemberQuery && (
                <button
                  onClick={() => setSearchMemberQuery('')}
                  style={{ background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', padding: '0.1rem' }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Dropdown list of students matching query */}
            {isMemberDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '12px',
                  border: '1px solid var(--gray-200)',
                  boxShadow: 'var(--shadow-lg)',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  zIndex: 40,
                }}
              >
                {filteredStudents.length === 0 ? (
                  <div style={{ padding: '0.85rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    Tidak ada siswa yang cocok.
                  </div>
                ) : (
                  filteredStudents.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setSelectedStudent(st);
                        setIsMemberDropdownOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        border: 'none',
                        borderBottom: '1px solid var(--gray-100)',
                        backgroundColor: selectedStudent?.id === st.id ? 'var(--primary-50)' : 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            color: 'var(--primary-600)',
                            fontSize: '0.725rem',
                            width: '22px',
                          }}
                        >
                          {String(st.attendance_number || '-').padStart(2, '0')}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{st.full_name}</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>Pilih &rarr;</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Focused Student Weekly Status Card */}
          {selectedStudent && (
            <div
              style={{
                marginTop: '1rem',
                padding: '1rem',
                borderRadius: '14px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1.5px solid var(--primary-200)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--primary-600)', fontWeight: 800 }}>
                    ANGGOTA TERPILIH
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--gray-900)', marginTop: '2px' }}>
                    {String(selectedStudent.attendance_number || '-').padStart(2, '0')} &bull; {selectedStudent.full_name}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '8px',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.725rem',
                    color: 'var(--gray-600)',
                    cursor: 'pointer',
                  }}
                >
                  Tutup
                </button>
              </div>

              {/* Weekly clickable row for the selected student */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(2, weeks.length)}, 1fr)`, gap: '0.5rem' }}>
                {weeks.map((w) => {
                  const record = records.find(
                    (r) => r.member_id === selectedStudent.id && Number(r.week_number) === Number(w.week_number)
                  );
                  const isPaid = record ? Boolean(record.is_paid) : false;
                  const isCellToggling = togglingKey === `${selectedStudent.id}_${w.week_number}`;

                  return (
                    <button
                      key={w.id}
                      disabled={isCellToggling}
                      onClick={() => handleToggleCell(selectedStudent.id, w.week_number, record)}
                      style={{
                        padding: '0.6rem 0.4rem',
                        borderRadius: '10px',
                        border: isPaid ? '1.5px solid var(--success-main)' : '1px dashed var(--gray-300)',
                        backgroundColor: isPaid ? 'rgba(34, 197, 94, 0.12)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                        opacity: isCellToggling ? 0.5 : 1,
                      }}
                    >
                      <span style={{ fontSize: '0.725rem', fontWeight: 800, color: 'var(--gray-800)' }}>
                        {w.label}
                      </span>
                      {w.date_range && (
                        <span style={{ fontSize: '0.625rem', color: 'var(--gray-500)' }}>
                          {w.date_range}
                        </span>
                      )}
                      <div
                        style={{
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          color: isPaid ? 'var(--success-main)' : 'var(--gray-400)',
                        }}
                      >
                        {isPaid ? (
                          <>
                            <Check size={14} strokeWidth={3} />
                            <span>Lunas</span>
                          </>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. TAMPILAN KAS EXCEL / SPREADSHEET */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--gray-200)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--gray-900)' }}>
              Tabel Rekapitulasi Kas Mingguan
            </h3>
            <div style={{ fontSize: '0.725rem', color: 'var(--gray-500)', marginTop: '2px' }}>
              {canManageKas
                ? 'Klik cell minggu untuk mengubah status pembayaran. Hijau (✓) = Lunas, Strip (-) = Belum bayar.'
                : 'Tampilan rekapitulasi pembayaran kas kelas X ICP TKJ (Hanya Lihat).'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.7rem', color: 'var(--gray-500)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: 'var(--success-main)', fontWeight: 800 }}>✓</span> Lunas
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: 'var(--gray-400)', fontWeight: 800 }}>-</span> Belum Bayar
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
            Memuat tabel spreadsheet kas...
          </div>
        ) : (
          /* Mobile horizontal scroll container specifically scoped to the table */
          <div
            style={{
              overflowX: 'auto',
              borderRadius: '14px',
              border: '1px solid var(--gray-200)',
              background: 'var(--bg-card)',
              WebkitOverflowScrolling: 'touch',
              maxWidth: '100%',
              scrollbarWidth: 'thin',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: `${Math.max(400, 160 + weeks.length * 80)}px`,
              }}
            >
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-subtle)' }}>
                  {/* Sticky Student Name Column Header */}
                  <th
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 10,
                      backgroundColor: 'var(--bg-subtle)',
                      textAlign: 'left',
                      padding: '0.8rem 0.85rem',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      color: 'var(--gray-800)',
                      borderBottom: '2px solid var(--gray-200)',
                      borderRight: '1.5px solid var(--gray-200)',
                      boxShadow: '3px 0 6px -2px rgba(0,0,0,0.06)',
                      minWidth: '150px',
                      maxWidth: '180px',
                    }}
                  >
                    Nama Siswa
                  </th>

                  {/* Dynamic Week Header Columns (Week 1, Week 2 with sub-dates) */}
                  {weeks.map((w) => (
                    <th
                      key={w.id}
                      style={{
                        textAlign: 'center',
                        padding: '0.7rem 0.5rem',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        color: 'var(--gray-800)',
                        borderBottom: '2px solid var(--gray-200)',
                        borderRight: '1px solid var(--gray-200)',
                        backgroundColor: 'var(--bg-subtle)',
                        minWidth: '75px',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span>{w.label}</span>
                        {w.date_range && (
                          <span
                            style={{
                              fontSize: '0.625rem',
                              fontWeight: 500,
                              color: 'var(--gray-500)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {w.date_range}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}

                  {/* Total Student Progress Column */}
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '0.7rem 0.6rem',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      color: 'var(--gray-700)',
                      borderBottom: '2px solid var(--gray-200)',
                      backgroundColor: 'var(--bg-subtle)',
                      minWidth: '65px',
                    }}
                  >
                    Progres
                  </th>
                </tr>
              </thead>

              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={weeks.length + 2}
                      style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--gray-500)', fontSize: '0.8rem' }}
                    >
                      Belum ada data anggota siswa.
                    </td>
                  </tr>
                ) : (
                  students.map((student, idx) => {
                    let studentPaidWeeks = 0;
                    weeks.forEach((w) => {
                      const r = records.find(
                        (rec) => rec.member_id === student.id && Number(rec.week_number) === Number(w.week_number)
                      );
                      if (r && r.is_paid) studentPaidWeeks++;
                    });

                    const isSelf = member && student.id === member.id;
                    const rowBg = isSelf ? 'rgba(59, 130, 246, 0.05)' : idx % 2 === 0 ? 'transparent' : 'var(--bg-subtle)';

                    return (
                      <tr key={student.id} style={{ backgroundColor: rowBg }}>
                        {/* Sticky Student Name Cell */}
                        <td
                          style={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 5,
                            backgroundColor: isSelf ? 'var(--bg-card)' : idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-subtle)',
                            padding: '0.65rem 0.85rem',
                            fontSize: '0.775rem',
                            fontWeight: isSelf ? 800 : 700,
                            color: isSelf ? 'var(--primary-600)' : 'var(--gray-900)',
                            borderBottom: '1px solid var(--gray-200)',
                            borderRight: '1.5px solid var(--gray-200)',
                            boxShadow: '3px 0 6px -2px rgba(0,0,0,0.06)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '180px',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              width: '20px',
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              color: 'var(--gray-400)',
                              marginRight: '6px',
                            }}
                          >
                            {String(student.attendance_number || idx + 1).padStart(2, '0')}
                          </span>
                          <span>{student.full_name}</span>
                          {isSelf && (
                            <span
                              style={{
                                marginLeft: '6px',
                                fontSize: '0.625rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--primary-50)',
                                color: 'var(--primary-600)',
                                fontWeight: 800,
                              }}
                            >
                              Saya
                            </span>
                          )}
                        </td>

                        {/* Week Cells (Excel style: ✓ or -) */}
                        {weeks.map((w) => {
                          const record = records.find(
                            (r) => r.member_id === student.id && Number(r.week_number) === Number(w.week_number)
                          );
                          const isPaid = record ? Boolean(record.is_paid) : false;
                          const isCellToggling = togglingKey === `${student.id}_${w.week_number}`;

                          return (
                            <td
                              key={w.id}
                              style={{
                                textAlign: 'center',
                                padding: '0.5rem 0.35rem',
                                borderBottom: '1px solid var(--gray-200)',
                                borderRight: '1px solid var(--gray-200)',
                              }}
                            >
                              {canManageKas ? (
                                <button
                                  disabled={isCellToggling}
                                  onClick={() => handleToggleCell(student.id, w.week_number, record)}
                                  style={{
                                    cursor: 'pointer',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    border: isPaid
                                      ? '1.5px solid var(--success-main)'
                                      : '1px solid var(--gray-300)',
                                    backgroundColor: isPaid ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                                    color: isPaid ? 'var(--success-main)' : 'var(--gray-400)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease',
                                    opacity: isCellToggling ? 0.4 : 1,
                                    margin: '0 auto',
                                  }}
                                  title={
                                    isPaid
                                      ? `${student.full_name} (${w.label}): Lunas. Klik untuk batalkan.`
                                      : `${student.full_name} (${w.label}): Belum bayar. Klik untuk tandai lunas.`
                                  }
                                >
                                  {isPaid ? (
                                    <Check size={16} strokeWidth={3} />
                                  ) : (
                                    <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)', fontWeight: 700 }}>
                                      -
                                    </span>
                                  )}
                                </button>
                              ) : (
                                /* Read-only for Siswa biasa */
                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    backgroundColor: isPaid ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                                    color: isPaid ? 'var(--success-main)' : 'var(--gray-300)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto',
                                  }}
                                >
                                  {isPaid ? (
                                    <Check size={16} strokeWidth={3} />
                                  ) : (
                                    <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)', fontWeight: 700 }}>
                                      -
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Student Total Progress */}
                        <td
                          style={{
                            textAlign: 'center',
                            padding: '0.65rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: studentPaidWeeks === weeks.length ? 'var(--success-main)' : 'var(--gray-700)',
                            borderBottom: '1px solid var(--gray-200)',
                          }}
                        >
                          {studentPaidWeeks}/{weeks.length}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. MODAL: SET PERIODE KAS (Bendahara, Wakil, Ketua, Developer) */}
      {isPeriodeModalOpen && canManageKas && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '20px',
              padding: '1.5rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--gray-200)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={20} color="var(--primary-600)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                  Set Periode Kas Mingguan
                </h3>
              </div>
              <button
                onClick={() => setIsPeriodeModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--gray-500)', cursor: 'pointer', padding: '0.2rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePeriodeKas} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Nominal & Start Date Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                    Nominal Kas (Rp) *
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={periodeNominal}
                    onChange={(e) => setPeriodeNominal(parseInt(e.target.value, 10) || 3000)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '10px',
                      border: '1px solid var(--gray-300)',
                      fontSize: '0.85rem',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--gray-900)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                    Tanggal Mulai Kas *
                  </label>
                  <input
                    type="date"
                    value={periodeStartDate}
                    onChange={(e) => setPeriodeStartDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '10px',
                      border: '1px solid var(--gray-300)',
                      fontSize: '0.85rem',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--gray-900)',
                    }}
                  />
                </div>
              </div>

              {/* Auto-generate tool banner */}
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '12px',
                  backgroundColor: 'var(--primary-50)',
                  border: '1px solid var(--primary-200)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                    Generate Tanggal Otomatis
                  </div>
                  <div style={{ fontSize: '0.675rem', color: 'var(--primary-600)', marginTop: '1px' }}>
                    Buat rentang 7 harian secara otomatis
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <select
                    value={periodeNumWeeks}
                    onChange={(e) => setPeriodeNumWeeks(parseInt(e.target.value, 10) || 4)}
                    style={{
                      padding: '0.35rem 0.5rem',
                      borderRadius: '8px',
                      border: '1px solid var(--primary-300)',
                      backgroundColor: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--primary-700)',
                    }}
                  >
                    <option value={4}>4 Minggu</option>
                    <option value={8}>8 Minggu</option>
                    <option value={12}>12 Minggu</option>
                    <option value={16}>16 Minggu</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleGenerateDefaultWeeks(periodeNumWeeks, periodeStartDate)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.4rem 0.65rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--primary-600)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    <Sparkles size={13} />
                    <span>Generate</span>
                  </button>
                </div>
              </div>

              {/* Editable Weeks List */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gray-800)' }}>
                    Daftar Periode Minggu ({editableWeeks.length} Minggu)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddEditableWeek}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-600)',
                      fontSize: '0.725rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={14} />
                    <span>Tambah Minggu</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                  {editableWeeks.map((w, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 2fr auto',
                        gap: '0.45rem',
                        alignItems: 'center',
                        padding: '0.4rem 0.5rem',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--gray-200)',
                      }}
                    >
                      <input
                        type="text"
                        value={w.label}
                        onChange={(e) => {
                          const updated = [...editableWeeks];
                          updated[idx].label = e.target.value;
                          setEditableWeeks(updated);
                        }}
                        placeholder="Week 1"
                        required
                        style={{
                          padding: '0.4rem 0.5rem',
                          borderRadius: '8px',
                          border: '1px solid var(--gray-300)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--gray-900)',
                        }}
                      />

                      <input
                        type="text"
                        value={w.dateRange}
                        onChange={(e) => {
                          const updated = [...editableWeeks];
                          updated[idx].dateRange = e.target.value;
                          setEditableWeeks(updated);
                        }}
                        placeholder="Contoh: 1–7 Sep"
                        required
                        style={{
                          padding: '0.4rem 0.5rem',
                          borderRadius: '8px',
                          border: '1px solid var(--gray-300)',
                          fontSize: '0.75rem',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--gray-900)',
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveEditableWeek(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger-main)',
                          cursor: 'pointer',
                          padding: '0.25rem',
                        }}
                        title="Hapus Minggu"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsPeriodeModalOpen(false)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--gray-700)',
                    border: '1px solid var(--gray-300)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={periodeSubmitting}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '10px',
                    backgroundColor: 'var(--primary-600)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    opacity: periodeSubmitting ? 0.7 : 1,
                  }}
                >
                  {periodeSubmitting ? 'Menyimpan ke Supabase...' : 'Simpan Periode Kas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
