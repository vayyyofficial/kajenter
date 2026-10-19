import React, { useState, useEffect, useCallback } from 'react';
import { Download, Plus, Trash2, Edit3, AlertTriangle } from 'lucide-react';
import { useMemberAuth } from '../../context/MemberAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { ClassSchedule, PiketSchedule } from '../../types';
import { downloadSchedulePdf, downloadPiketPdf } from '../../utils/pdfGenerator';
import { BRANDING } from '../../config/branding';
import { Modal } from '../common/Modal';
import { useRealtimeSync } from '../../context/SyncContext';

interface PortalScheduleTabProps {
  defaultSubTab?: 'schedule' | 'piket';
}

export const PortalScheduleTab: React.FC<PortalScheduleTabProps> = ({ defaultSubTab = 'schedule' }) => {
  const { member } = useMemberAuth();
  const { t } = useLanguage();

  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'piket'>(defaultSubTab);

  useEffect(() => {
    if (defaultSubTab) {
      setActiveSubTab(defaultSubTab);
    }
  }, [defaultSubTab]);
  const [selectedDay, setSelectedDay] = useState('Senin');

  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [piketList, setPiketList] = useState<PiketSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddScheduleModalOpen, setIsAddScheduleModalOpen] = useState(false);
  const [isEditScheduleModalOpen, setIsEditScheduleModalOpen] = useState(false);
  const [isAddPiketModalOpen, setIsAddPiketModalOpen] = useState(false);
  const [isEditPiketModalOpen, setIsEditPiketModalOpen] = useState(false);

  // Deletion Confirmation Modals
  const [scheduleToDelete, setScheduleToDelete] = useState<ClassSchedule | null>(null);
  const [piketToDelete, setPiketToDelete] = useState<PiketSchedule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states for schedule create
  const [schedStartTime, setSchedStartTime] = useState('07:00');
  const [schedEndTime, setSchedEndTime] = useState('08:30');
  const [schedSubject, setSchedSubject] = useState('');
  const [schedTeacher, setSchedTeacher] = useState('');

  // Form states for schedule edit
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [editSchedDay, setEditSchedDay] = useState('Senin');
  const [editSchedStartTime, setEditSchedStartTime] = useState('07:00');
  const [editSchedEndTime, setEditSchedEndTime] = useState('08:30');
  const [editSchedSubject, setEditSchedSubject] = useState('');
  const [editSchedTeacher, setEditSchedTeacher] = useState('');

  // Form states for piket create
  const [piketMemberName, setPiketMemberName] = useState('');

  // Form states for piket edit
  const [editingPiket, setEditingPiket] = useState<PiketSchedule | null>(null);
  const [editPiketDay, setEditPiketDay] = useState('Senin');
  const [editPiketMemberName, setEditPiketMemberName] = useState('');

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  const roleLower = (member?.role || '').toLowerCase();
  const canManage = Boolean(
    member?.permissions?.canManageSchedules ||
    roleLower.includes('sekretaris') ||
    roleLower.includes('ketua') ||
    roleLower.includes('wakil') ||
    roleLower.includes('developer')
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeSubTab === 'schedule') {
        const res = await api.portal.schedules.getAll(selectedDay);
        if (res.success) setSchedules(res.data);
      } else {
        const res = await api.portal.piket.getAll(selectedDay);
        if (res.success) setPiketList(res.data);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  }, [activeSubTab, selectedDay]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time synchronization
  useRealtimeSync(['settings'], loadData);

  // Download PDF handlers (Requirements #18 & #19)
  const handleDownloadSchedulePdf = async () => {
    try {
      const res = await api.portal.schedules.getAll();
      if (res.success && res.data) {
        downloadSchedulePdf(res.data, BRANDING.name);
      }
    } catch {
      alert('Gagal mendownload PDF Jadwal.');
    }
  };

  const handleDownloadPiketPdf = async () => {
    try {
      const res = await api.portal.piket.getAll();
      if (res.success && res.data) {
        downloadPiketPdf(res.data, BRANDING.name);
      }
    } catch {
      alert('Gagal mendownload PDF Piket.');
    }
  };

  // Create schedule handler
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedSubject.trim() || !schedTeacher.trim()) return;
    try {
      await api.portal.schedules.create({
        day_of_week: selectedDay,
        start_time: schedStartTime,
        end_time: schedEndTime,
        subject: schedSubject.trim(),
        teacher_name: schedTeacher.trim(),
        order_index: schedules.length + 1,
      });
      setIsAddScheduleModalOpen(false);
      setSchedSubject('');
      setSchedTeacher('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan jadwal.');
    }
  };

  // Open Edit Schedule
  const openEditSchedule = (item: ClassSchedule) => {
    setEditingSchedule(item);
    setEditSchedDay(item.day_of_week || (item as any).day || selectedDay);
    setEditSchedStartTime(item.start_time || (item as any).startTime || '07:00');
    setEditSchedEndTime(item.end_time || (item as any).endTime || '08:30');
    setEditSchedSubject(item.subject);
    setEditSchedTeacher(item.teacher_name || (item as any).teacherName || '');
    setIsEditScheduleModalOpen(true);
  };

  // Update schedule handler
  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule || !editSchedSubject.trim() || !editSchedTeacher.trim()) return;
    try {
      await api.portal.schedules.update(editingSchedule.id, {
        day_of_week: editSchedDay,
        start_time: editSchedStartTime,
        end_time: editSchedEndTime,
        subject: editSchedSubject.trim(),
        teacher_name: editSchedTeacher.trim(),
      });
      setIsEditScheduleModalOpen(false);
      setEditingSchedule(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui jadwal.');
    }
  };

  // Confirm delete schedule handler
  const handleConfirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    try {
      setIsDeleting(true);
      await api.portal.schedules.delete(scheduleToDelete.id);
      setScheduleToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus jadwal.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Create piket handler
  const handleCreatePiket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!piketMemberName.trim()) return;
    try {
      await api.portal.piket.create({
        day_of_week: selectedDay,
        member_name: piketMemberName.trim(),
        order_index: piketList.length + 1,
      });
      setIsAddPiketModalOpen(false);
      setPiketMemberName('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan piket.');
    }
  };

  // Open Edit Piket
  const openEditPiket = (item: PiketSchedule) => {
    setEditingPiket(item);
    setEditPiketDay(item.day_of_week || (item as any).day || selectedDay);
    setEditPiketMemberName(item.member_name || (item as any).memberName || '');
    setIsEditPiketModalOpen(true);
  };

  // Update piket handler
  const handleUpdatePiket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPiket || !editPiketMemberName.trim()) return;
    try {
      await api.portal.piket.update(editingPiket.id, {
        day_of_week: editPiketDay,
        member_name: editPiketMemberName.trim(),
      });
      setIsEditPiketModalOpen(false);
      setEditingPiket(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui piket.');
    }
  };

  // Confirm delete piket handler
  const handleConfirmDeletePiket = async () => {
    if (!piketToDelete) return;
    try {
      setIsDeleting(true);
      await api.portal.piket.delete(piketToDelete.id);
      setPiketToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus piket.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>
      {/* 1. Header Banner & Segmented Toggle */}
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
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gray-900)' }}>
              {activeSubTab === 'schedule' ? t.portal.schedules.title : t.portal.schedules.piketTitle}
            </h2>
            <div style={{ fontSize: '0.725rem', color: 'var(--gray-500)' }}>
              {activeSubTab === 'schedule' ? t.portal.schedules.subtitle : t.portal.schedules.piketSubtitle}
            </div>
          </div>

          {/* Download PDF Button (Requirements #18 & #19) */}
          <button
            onClick={activeSubTab === 'schedule' ? handleDownloadSchedulePdf : handleDownloadPiketPdf}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'var(--bg-subtle)',
              border: '1.5px solid var(--primary-600)',
              color: 'var(--primary-600)',
              borderRadius: '9999px',
              padding: '0.45rem 0.85rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Download PDF"
          >
            <Download size={14} />
            <span>PDF</span>
          </button>
        </div>

        {/* Segmented Switch (Jadwal Pelajaran vs Jadwal Piket) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: '12px',
            padding: '3px',
            marginBottom: '1rem',
          }}
        >
          <button
            onClick={() => setActiveSubTab('schedule')}
            style={{
              padding: '0.55rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeSubTab === 'schedule' ? 'var(--bg-card)' : 'transparent',
              color: activeSubTab === 'schedule' ? 'var(--primary-600)' : 'var(--gray-600)',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: activeSubTab === 'schedule' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Jadwal Pelajaran
          </button>
          <button
            onClick={() => setActiveSubTab('piket')}
            style={{
              padding: '0.55rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeSubTab === 'piket' ? 'var(--bg-card)' : 'transparent',
              color: activeSubTab === 'piket' ? 'var(--primary-600)' : 'var(--gray-600)',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: activeSubTab === 'piket' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Jadwal Piket
          </button>
        </div>

        {/* Day Selector Tabs (Senin - Jumat) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '0.35rem',
          }}
        >
          {days.map((day) => {
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                style={{
                  padding: '0.45rem 0',
                  borderRadius: '10px',
                  border: isSelected ? '1.5px solid var(--primary-600)' : '1px solid var(--gray-300)',
                  backgroundColor: isSelected ? 'var(--primary-600)' : 'var(--bg-subtle)',
                  color: isSelected ? '#ffffff' : 'var(--gray-800)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Content Section */}
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
            {selectedDay} • {activeSubTab === 'schedule' ? 'Mata Pelajaran' : 'Petugas Piket'}
          </h3>

          {canManage && (
            <button
              onClick={() => (activeSubTab === 'schedule' ? setIsAddScheduleModalOpen(true) : setIsAddPiketModalOpen(true))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                backgroundColor: 'var(--primary-600)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.725rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              <span>{activeSubTab === 'schedule' ? 'Tambah Mapel' : 'Tambah Piket'}</span>
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
            Memuat jadwal...
          </div>
        ) : activeSubTab === 'schedule' ? (
          /* Jadwal Pelajaran List */
          schedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--gray-500)', fontSize: '0.825rem' }}>
              {t.portal.schedules.noSchedule}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {schedules.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.8rem 0.95rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: '14px',
                    borderLeft: '4px solid var(--primary-600)',
                    border: '1px solid var(--gray-200)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, marginRight: '0.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                      {item.subject}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.15rem' }}>
                      👨‍🏫 {item.teacher_name || (item as any).teacherName}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        padding: '0.25rem 0.5rem',
                        borderRadius: '8px',
                        backgroundColor: 'var(--primary-50)',
                        color: 'var(--primary-700)',
                        border: '1px solid var(--primary-200)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.start_time || (item as any).startTime} - {item.end_time || (item as any).endTime}
                    </div>

                    {canManage && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <button
                          onClick={() => openEditSchedule(item)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--gray-600)',
                            cursor: 'pointer',
                            padding: '0.35rem',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '6px',
                          }}
                          title="Edit Jadwal"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => setScheduleToDelete(item)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--danger-main)',
                            cursor: 'pointer',
                            padding: '0.35rem',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '6px',
                          }}
                          title="Hapus Jadwal"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Jadwal Piket List */
          piketList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--gray-500)', fontSize: '0.825rem' }}>
              {t.portal.schedules.noPiket}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {piketList.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.9rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: '14px',
                    border: '1px solid var(--gray-200)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-50)',
                        color: 'var(--primary-600)',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                        {item.member_name || (item as any).memberName}
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <button
                        onClick={() => openEditPiket(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--gray-600)',
                          cursor: 'pointer',
                          padding: '0.35rem',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '6px',
                        }}
                        title="Edit Piket"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => setPiketToDelete(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger-main)',
                          cursor: 'pointer',
                          padding: '0.35rem',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '6px',
                        }}
                        title="Hapus Piket"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* 1. Add Schedule Modal (Unified Modal System) */}
      <Modal
        isOpen={isAddScheduleModalOpen}
        onClose={() => setIsAddScheduleModalOpen(false)}
        title={`Tambah Jadwal Pelajaran (${selectedDay})`}
        size="sm"
      >
        <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Mata Pelajaran *
            </label>
            <input
              type="text"
              required
              value={schedSubject}
              onChange={(e) => setSchedSubject(e.target.value)}
              placeholder="Contoh: Pemrograman Dasar"
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input, var(--bg-surface))',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Guru Pengampu *
            </label>
            <input
              type="text"
              required
              value={schedTeacher}
              onChange={(e) => setSchedTeacher(e.target.value)}
              placeholder="Nama Guru"
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input, var(--bg-surface))',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Jam Mulai
              </label>
              <input
                type="time"
                required
                value={schedStartTime}
                onChange={(e) => setSchedStartTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input, var(--bg-surface))',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Jam Selesai
              </label>
              <input
                type="time"
                required
                value={schedEndTime}
                onChange={(e) => setSchedEndTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input, var(--bg-surface))',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              marginTop: '0.5rem',
              padding: '0.8rem',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-600)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Simpan Jadwal
          </button>
        </form>
      </Modal>

      {/* 2. Edit Schedule Modal */}
      <Modal
        isOpen={isEditScheduleModalOpen}
        onClose={() => {
          setIsEditScheduleModalOpen(false);
          setEditingSchedule(null);
        }}
        title="Edit Jadwal Pelajaran"
        size="sm"
      >
        <form onSubmit={handleUpdateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Hari
            </label>
            <select
              value={editSchedDay}
              onChange={(e) => setEditSchedDay(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input, var(--bg-surface))',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
              }}
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Mata Pelajaran *
            </label>
            <input
              type="text"
              required
              value={editSchedSubject}
              onChange={(e) => setEditSchedSubject(e.target.value)}
              placeholder="Contoh: Pemrograman Dasar"
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input, var(--bg-surface))',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Guru Pengampu *
            </label>
            <input
              type="text"
              required
              value={editSchedTeacher}
              onChange={(e) => setEditSchedTeacher(e.target.value)}
              placeholder="Nama Guru"
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input, var(--bg-surface))',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Jam Mulai
              </label>
              <input
                type="time"
                required
                value={editSchedStartTime}
                onChange={(e) => setEditSchedStartTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input, var(--bg-surface))',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Jam Selesai
              </label>
              <input
                type="time"
                required
                value={editSchedEndTime}
                onChange={(e) => setEditSchedEndTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input, var(--bg-surface))',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              marginTop: '0.5rem',
              padding: '0.8rem',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-600)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Simpan Perubahan
          </button>
        </form>
      </Modal>

      {/* 3. Delete Schedule Confirmation Modal */}
      <Modal
        isOpen={Boolean(scheduleToDelete)}
        onClose={() => setScheduleToDelete(null)}
        title="Konfirmasi Hapus Jadwal"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center', padding: '0.5rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={24} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--gray-900)' }}>
              Hapus mata pelajaran ini?
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
              &quot;{scheduleToDelete?.subject}&quot; ({scheduleToDelete?.day_of_week}, {scheduleToDelete?.start_time} - {scheduleToDelete?.end_time})
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setScheduleToDelete(null)}
              disabled={isDeleting}
              style={{
                padding: '0.65rem',
                borderRadius: '10px',
                border: '1px solid var(--gray-300)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--gray-700)',
                fontWeight: 700,
                fontSize: '0.825rem',
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteSchedule}
              disabled={isDeleting}
              style={{
                padding: '0.65rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'var(--danger-main)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.825rem',
                cursor: 'pointer',
              }}
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 4. Add Piket Modal */}
      <Modal
        isOpen={isAddPiketModalOpen}
        onClose={() => setIsAddPiketModalOpen(false)}
        title={`Tambah Petugas Piket (${selectedDay})`}
        size="sm"
      >
        <form onSubmit={handleCreatePiket} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Nama Anggota *
            </label>
            <input
              type="text"
              required
              value={piketMemberName}
              onChange={(e) => setPiketMemberName(e.target.value)}
              placeholder="Nama Siswa"
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input, var(--bg-surface))',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: '0.5rem',
              padding: '0.8rem',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-600)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Simpan Piket
          </button>
        </form>
      </Modal>

      {/* 5. Edit Piket Modal */}
      <Modal
        isOpen={isEditPiketModalOpen}
        onClose={() => {
          setIsEditPiketModalOpen(false);
          setEditingPiket(null);
        }}
        title="Edit Petugas Piket"
        size="sm"
      >
        <form onSubmit={handleUpdatePiket} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Hari
            </label>
            <select
              value={editPiketDay}
              onChange={(e) => setEditPiketDay(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input, var(--bg-surface))',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
              }}
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Nama Anggota *
            </label>
            <input
              type="text"
              required
              value={editPiketMemberName}
              onChange={(e) => setEditPiketMemberName(e.target.value)}
              placeholder="Nama Siswa"
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input, var(--bg-surface))',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: '0.5rem',
              padding: '0.8rem',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-600)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Simpan Perubahan
          </button>
        </form>
      </Modal>

      {/* 6. Delete Piket Confirmation Modal */}
      <Modal
        isOpen={Boolean(piketToDelete)}
        onClose={() => setPiketToDelete(null)}
        title="Konfirmasi Hapus Piket"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center', padding: '0.5rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={24} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--gray-900)' }}>
              Hapus petugas piket ini?
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
              &quot;{piketToDelete?.member_name || (piketToDelete as any)?.memberName}&quot; ({piketToDelete?.day_of_week || (piketToDelete as any)?.day})
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setPiketToDelete(null)}
              disabled={isDeleting}
              style={{
                padding: '0.65rem',
                borderRadius: '10px',
                border: '1px solid var(--gray-300)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--gray-700)',
                fontWeight: 700,
                fontSize: '0.825rem',
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmDeletePiket}
              disabled={isDeleting}
              style={{
                padding: '0.65rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'var(--danger-main)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.825rem',
                cursor: 'pointer',
              }}
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
