import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useMemberAuth } from '../../context/MemberAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { ClassKasRecord, Member } from '../../types';
import { useRealtimeSync } from '../../context/SyncContext';

export const PortalKasTab: React.FC = () => {
  const { member } = useMemberAuth();
  const { t } = useLanguage();

  const currentDate = new Date();
  const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
  const currentWeekNumber = Math.ceil(((currentDate.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

  const [selectedYear] = useState(currentDate.getFullYear());
  const [selectedWeek, setSelectedWeek] = useState(currentWeekNumber);
  const [records, setRecords] = useState<ClassKasRecord[]>([]);
  const [classList, setClassList] = useState<Member[]>([]);
  const [defaultAmount, setDefaultAmount] = useState(3000);
  const [summary, setSummary] = useState({ totalMembers: 0, paidCount: 0, unpaidCount: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  // Check role permission
  const canManageKas = Boolean(
    member?.permissions?.canManageKas ||
    member?.role?.toLowerCase().includes('bendahara') ||
    member?.role?.toLowerCase().includes('developer')
  );

  const loadKasData = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { year: selectedYear, week: selectedWeek };
      if (!canManageKas && member) {
        params.member_id = member.id;
      }
      const res = await api.portal.kas.getAll(params);
      if (res.success) {
        setRecords(res.data);
        setDefaultAmount(res.defaultAmount || 3000);
        setSummary(res.summary);
      }

      if (canManageKas) {
        const membersRes = await api.members.getAll();
        if (membersRes.success && membersRes.data) {
          // Filter to siswa only
          const students = membersRes.data.siswa.sort((a, b) => (a.attendance_number || 99) - (b.attendance_number || 99));
          setClassList(students);
        }
      }
    } catch (err) {
      console.error('Failed to load kas records:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedWeek, canManageKas, member]);

  useEffect(() => {
    loadKasData();
  }, [loadKasData]);

  // Real-time synchronization
  useRealtimeSync(['settings', 'members'], loadKasData);

  // Toggle or record payment (Bendahara / Developer only)
  const handleTogglePayment = async (targetMemberId: number, currentRecord?: ClassKasRecord) => {
    if (!canManageKas) return;
    try {
      setSavingId(targetMemberId);
      const newPaidStatus = currentRecord ? !currentRecord.is_paid : true;

      await api.portal.kas.record({
        member_id: targetMemberId,
        year: selectedYear,
        week_number: selectedWeek,
        amount: defaultAmount,
        is_paid: newPaidStatus,
        notes: newPaidStatus ? 'Lunas' : 'Belum Bayar',
      });

      await loadKasData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status kas.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '12px',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                {t.portal.kas.title}
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                Rp{defaultAmount.toLocaleString('id-ID')} / minggu
              </div>
            </div>
          </div>

          <button
            onClick={loadKasData}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gray-500)',
              cursor: 'pointer',
              padding: '0.4rem',
            }}
            title="Refresh"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        {/* Week Selector Bar (Calendar Weeks) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.4rem',
            scrollbarWidth: 'none',
          }}
        >
          {Array.from({ length: 12 }, (_, i) => {
            const w = Math.max(1, currentWeekNumber - 5 + i);
            const isSelected = w === selectedWeek;
            const isCurrent = w === currentWeekNumber;
            return (
              <button
                key={w}
                onClick={() => setSelectedWeek(w)}
                style={{
                  flexShrink: 0,
                  padding: '0.45rem 0.85rem',
                  borderRadius: '12px',
                  border: isSelected ? '1.5px solid var(--primary-600)' : '1px solid var(--gray-300)',
                  backgroundColor: isSelected ? 'var(--primary-600)' : 'var(--bg-subtle)',
                  color: isSelected ? '#ffffff' : 'var(--gray-800)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.15rem',
                  minWidth: '64px',
                }}
              >
                <span>W{w}</span>
                {isCurrent && (
                  <span
                    style={{
                      fontSize: '0.625rem',
                      opacity: isSelected ? 0.9 : 0.6,
                      fontWeight: 800,
                    }}
                  >
                    Kini
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Summary Card (For Bendahara / Developer) */}
      {canManageKas && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.6rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '0.9rem 0.75rem',
              textAlign: 'center',
              border: '1px solid var(--gray-200)',
            }}
          >
            <div style={{ fontSize: '0.675rem', color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase' }}>
              Terkumpul
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary-600)', marginTop: '0.2rem' }}>
              Rp{summary.totalAmount.toLocaleString('id-ID')}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '0.9rem 0.75rem',
              textAlign: 'center',
              border: '1px solid var(--gray-200)',
            }}
          >
            <div style={{ fontSize: '0.675rem', color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase' }}>
              {t.portal.kas.summaryPaid}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--success-main)', marginTop: '0.2rem' }}>
              {summary.paidCount}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '0.9rem 0.75rem',
              textAlign: 'center',
              border: '1px solid var(--gray-200)',
            }}
          >
            <div style={{ fontSize: '0.675rem', color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase' }}>
              {t.portal.kas.summaryUnpaid}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--danger-main)', marginTop: '0.2rem' }}>
              {summary.unpaidCount}
            </div>
          </div>
        </div>
      )}

      {/* 3. Member Kas List / Personal Status */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--gray-200)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--gray-900)' }}>
            {canManageKas ? `Status Kas Minggu #${selectedWeek}` : t.portal.kas.myStatus}
          </h3>
          <span style={{ fontSize: '0.725rem', color: 'var(--gray-500)', fontWeight: 600 }}>
            Tahun {selectedYear}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
            Memuat data kas...
          </div>
        ) : canManageKas ? (
          /* Bendahara / Developer Class Overview Table */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {classList.map((student) => {
              const record = records.find((r) => r.member_id === student.id);
              const isPaid = record ? Boolean(record.is_paid) : false;
              const isSaving = savingId === student.id;

              return (
                <div
                  key={student.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.9rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: '14px',
                    border: '1px solid var(--gray-200)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        backgroundColor: 'var(--gray-200)',
                        color: 'var(--gray-800)',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {student.attendance_number || '-'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                        {student.full_name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>
                        {student.role || 'Siswa'} {record?.paid_date ? `• ${record.paid_date}` : ''}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTogglePayment(student.id, record)}
                    disabled={isSaving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '9999px',
                      border: 'none',
                      backgroundColor: isPaid ? 'var(--success-bg)' : 'var(--danger-bg)',
                      color: isPaid ? 'var(--success-text)' : 'var(--danger-text)',
                      fontSize: '0.725rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      opacity: isSaving ? 0.6 : 1,
                    }}
                  >
                    {isPaid ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    <span>{isPaid ? t.portal.kas.statusPaid : t.portal.kas.statusUnpaid}</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* Regular Student View */
          <div>
            {records.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  padding: '2rem 1rem',
                  gap: '0.5rem',
                  color: 'var(--gray-500)',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={28} />
                <span>{t.portal.kas.noRecords}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {records.map((rec) => {
                  const paid = Boolean(rec.is_paid);
                  return (
                    <div
                      key={rec.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        borderRadius: '16px',
                        backgroundColor: paid ? 'var(--success-bg)' : 'var(--danger-bg)',
                        border: `1.5px solid ${paid ? 'var(--success-border)' : 'var(--danger-border)'}`,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            color: paid ? 'var(--success-text)' : 'var(--danger-text)',
                          }}
                        >
                          Minggu #{rec.week_number} ({rec.year})
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: '0.2rem' }}>
                          Nominal: Rp{rec.amount.toLocaleString('id-ID')}
                          {rec.recorded_by_name ? ` • Dicatat oleh ${rec.recorded_by_name}` : ''}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          color: paid ? 'var(--success-text)' : 'var(--danger-text)',
                        }}
                      >
                        {paid ? <CheckCircle size={18} /> : <XCircle size={18} />}
                        <span>{paid ? t.portal.kas.statusPaid : t.portal.kas.statusUnpaid}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
