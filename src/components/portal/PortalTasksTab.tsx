import React, { useState, useEffect, useCallback } from 'react';
import { CheckSquare, ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, BookOpen, User, X, Check, Trash2, Edit2 } from 'lucide-react';
import { useMemberAuth } from '../../context/MemberAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { ClassTask } from '../../types';
import { Modal } from '../common/Modal';

export const PortalTasksTab: React.FC = () => {
  const { member } = useMemberAuth();
  const { t } = useLanguage();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<ClassTask[]>([]);
  const [deadlineDates, setDeadlineDates] = useState<string[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<ClassTask | null>(null);

  // Edit task modal & form fields (Requirement #11)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editTeacher, setEditTeacher] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete task confirmation state (Requirement #12)
  const [taskToDelete, setTaskToDelete] = useState<ClassTask | null>(null);

  // New task form fields
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newTeacher, setNewTeacher] = useState('');
  const [newDeadline, setNewDeadline] = useState(selectedDateStr);
  const [newDescription, setNewDescription] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Role permissions: Sekretaris, Wakil, Ketua, Developer
  const roleLower = (member?.role || '').toLowerCase();
  const canManageTasks = Boolean(
    member?.permissions?.canManageTasks ||
    roleLower.includes('sekretaris') ||
    roleLower.includes('ketua') ||
    roleLower.includes('wakil') ||
    roleLower.includes('developer')
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.portal.tasks.getAll({ month: monthStr });
      if (res.success) {
        setTasks(res.data);
        setDeadlineDates(res.deadlineDates || []);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [monthStr]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Calendar calculations
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSubject.trim() || !newDeadline) return;

    try {
      setSubmitting(true);
      await api.portal.tasks.create({
        title: newTitle.trim(),
        subject: newSubject.trim(),
        teacher_name: newTeacher.trim() || undefined,
        deadline_date: newDeadline,
        description: newDescription.trim() || undefined,
        notes: newNotes.trim() || undefined,
      });

      setIsAddModalOpen(false);
      setNewTitle('');
      setNewSubject('');
      setNewTeacher('');
      setNewDescription('');
      setNewNotes('');
      await loadTasks();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan tugas.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleTaskStatus = async (task: ClassTask) => {
    if (!canManageTasks) return;
    try {
      const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
      await api.portal.tasks.update(task.id, { status: nextStatus });
      await loadTasks();
      if (selectedTaskDetail?.id === task.id) {
        setSelectedTaskDetail({ ...task, status: nextStatus });
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status tugas.');
    }
  };

  const handleOpenEditTask = (task: ClassTask) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title || '');
    setEditSubject(task.subject || '');
    setEditTeacher(task.teacher_name || '');
    setEditDeadline(task.deadline_date || '');
    setEditDescription(task.description || '');
    setEditNotes(task.notes || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId || !editTitle.trim() || !editSubject.trim() || !editDeadline) return;

    try {
      setEditSubmitting(true);
      const res = await api.portal.tasks.update(editingTaskId, {
        title: editTitle.trim(),
        subject: editSubject.trim(),
        teacher_name: editTeacher.trim() || undefined,
        deadline_date: editDeadline,
        description: editDescription.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });

      if (res.success) {
        setIsEditModalOpen(false);
        if (selectedTaskDetail?.id === editingTaskId) {
          setSelectedTaskDetail({
            ...selectedTaskDetail,
            title: editTitle.trim(),
            subject: editSubject.trim(),
            teacher_name: editTeacher.trim() || undefined,
            deadline_date: editDeadline,
            description: editDescription.trim() || undefined,
            notes: editNotes.trim() || undefined,
          });
        }
        await loadTasks();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui tugas.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await api.portal.tasks.delete(taskToDelete.id);
      if (selectedTaskDetail?.id === taskToDelete.id) {
        setSelectedTaskDetail(null);
      }
      setTaskToDelete(null);
      await loadTasks();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus tugas.');
    }
  };

  const handleDeleteTask = (task: ClassTask) => {
    if (!canManageTasks) return;
    setTaskToDelete(task);
  };

  // Filter tasks for selected date
  const selectedDateTasks = tasks.filter((t) => t.deadline_date === selectedDateStr);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '12px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckSquare size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                {t.portal.tasks.title}
              </h2>
              <div style={{ fontSize: '0.725rem', color: 'var(--gray-500)' }}>
                {t.portal.tasks.calendarView}
              </div>
            </div>
          </div>

          {canManageTasks && (
            <button
              onClick={() => {
                setNewDeadline(selectedDateStr);
                setIsAddModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'var(--primary-600)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
              }}
            >
              <Plus size={15} />
              <span>{t.portal.tasks.addTask}</span>
            </button>
          )}
        </div>

        {/* Month Selector Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.4rem 0.6rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: '12px',
            marginBottom: '0.9rem',
          }}
        >
          <button
            onClick={handlePrevMonth}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gray-700)',
              cursor: 'pointer',
              padding: '0.2rem',
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gray-900)' }}>
            {monthNames[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gray-700)',
              cursor: 'pointer',
              padding: '0.2rem',
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendar Day Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            textAlign: 'center',
            marginBottom: '0.4rem',
          }}
        >
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d, i) => (
            <div
              key={d}
              style={{
                fontSize: '0.675rem',
                fontWeight: 700,
                color: i === 0 ? 'var(--primary-600)' : 'var(--gray-500)',
                padding: '0.2rem 0',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid (ONLY deadline dates are marked per Requirement #16) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '0.25rem',
          }}
        >
          {/* Empty prefix cells */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} style={{ height: '36px' }} />
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isDeadline = deadlineDates.includes(dateStr);
            const isSelected = selectedDateStr === dateStr;

            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDateStr(dateStr)}
                style={{
                  height: '38px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid var(--primary-600)' : '1px solid transparent',
                  backgroundColor: isSelected
                    ? 'var(--primary-50)'
                    : isDeadline
                    ? 'rgba(239, 68, 68, 0.08)'
                    : 'transparent',
                  color: isSelected
                    ? 'var(--primary-700)'
                    : isDeadline
                    ? 'var(--danger-main)'
                    : 'var(--gray-900)',
                  fontWeight: isSelected || isDeadline ? 800 : 500,
                  fontSize: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{dayNum}</span>
                {/* Deadline Dot (Requirement #16: only deadline date is marked) */}
                {isDeadline && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-600)',
                      marginTop: '1px',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Tasks for Selected Deadline Date */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--gray-200)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--gray-900)' }}>
            Deadline: {selectedDateStr}
          </h3>
          <span style={{ fontSize: '0.725rem', color: 'var(--gray-500)', fontWeight: 600 }}>
            {selectedDateTasks.length} Tugas
          </span>
        </div>

        {selectedDateTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--gray-500)', fontSize: '0.825rem' }}>
            {t.portal.tasks.noTasks}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {selectedDateTasks.map((task) => {
              const isCompleted = task.status === 'completed';
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskDetail(task)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '14px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--gray-200)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        color: isCompleted ? 'var(--gray-400)' : 'var(--gray-900)',
                        textDecoration: isCompleted ? 'line-through' : 'none',
                      }}
                    >
                      {task.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.15rem' }}>
                      {task.subject} {task.teacher_name ? `• ${task.teacher_name}` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '0.675rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        backgroundColor: isCompleted ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: isCompleted ? 'var(--success-text)' : 'var(--danger-text)',
                        border: `1px solid ${isCompleted ? 'var(--success-border)' : 'var(--danger-border)'}`,
                      }}
                    >
                      {isCompleted ? t.portal.tasks.statusCompleted : t.portal.tasks.statusPending}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Task Details Modal (Requirement #4, #11, #12) */}
      {selectedTaskDetail && (
        <Modal
          isOpen={Boolean(selectedTaskDetail)}
          onClose={() => setSelectedTaskDetail(null)}
          title="Detail Tugas"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <span
                style={{
                  fontSize: '0.675rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--primary-50)',
                  color: 'var(--primary-600)',
                  display: 'inline-block',
                  marginBottom: '0.4rem',
                }}
              >
                {selectedTaskDetail.status === 'completed' ? 'Selesai' : 'Aktif'}
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
                {selectedTaskDetail.title}
              </h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--primary-600)', fontWeight: 700 }}>
                {selectedTaskDetail.subject}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                fontSize: '0.825rem',
                backgroundColor: 'var(--bg-subtle)',
                padding: '0.9rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>
                  GURU PENGAMPU
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedTaskDetail.teacher_name || '-'}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>
                  DEADLINE TUGAS
                </span>
                <span style={{ fontWeight: 700, color: 'var(--danger-main)' }}>
                  📅 {selectedTaskDetail.deadline_date}
                </span>
              </div>

              {selectedTaskDetail.description && (
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>
                    DESKRIPSI TUGAS
                  </span>
                  <p style={{ margin: '0.2rem 0 0 0', lineHeight: 1.45, color: 'var(--text-main)' }}>
                    {selectedTaskDetail.description}
                  </p>
                </div>
              )}

              {selectedTaskDetail.notes && (
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>
                    CATATAN TAMBAHAN
                  </span>
                  <p style={{ margin: '0.2rem 0 0 0', lineHeight: 1.45, color: 'var(--text-main)' }}>
                    {selectedTaskDetail.notes}
                  </p>
                </div>
              )}
            </div>

            {canManageTasks && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--border-color)',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleToggleTaskStatus(selectedTaskDetail)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    backgroundColor: selectedTaskDetail.status === 'completed' ? 'var(--bg-subtle)' : 'var(--success-main)',
                    color: selectedTaskDetail.status === 'completed' ? 'var(--text-main)' : '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '0.6rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Check size={15} />
                  <span>{selectedTaskDetail.status === 'completed' ? 'Tandai Aktif' : 'Tandai Selesai'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEditTask(selectedTaskDetail)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    backgroundColor: 'var(--primary-50)',
                    color: 'var(--primary-600)',
                    border: '1px solid var(--primary-200)',
                    borderRadius: '10px',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Edit Tugas"
                >
                  <Edit2 size={15} />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteTask(selectedTaskDetail)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.6rem 0.75rem',
                    backgroundColor: 'var(--danger-bg)',
                    color: 'var(--danger-main)',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                  }}
                  title="Hapus Tugas"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 4. Add Task Modal (Requirement #4, #10) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t.portal.tasks.addTask}
        size="sm"
      >
        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Judul Tugas *
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Contoh: Laporan Topologi Jaringan"
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
              Mata Pelajaran *
            </label>
            <input
              type="text"
              required
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Contoh: Komputer dan Jaringan Dasar"
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
                Guru
              </label>
              <input
                type="text"
                value={newTeacher}
                onChange={(e) => setNewTeacher(e.target.value)}
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

            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Deadline Date *
              </label>
              <input
                type="date"
                required
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
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

          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Deskripsi Tugas
            </label>
            <textarea
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Keterangan mengenai tugas..."
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input, var(--bg-surface))',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Catatan Tambahan
            </label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Link pengumpulan atau catatan..."
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
            disabled={submitting}
            style={{
              marginTop: '0.5rem',
              padding: '0.8rem',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-600)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Menyimpan...' : 'Simpan Tugas'}
          </button>
        </form>
      </Modal>

      {/* 5. Edit Task Modal (Requirement #11) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Tugas"
        size="sm"
      >
        <form onSubmit={handleUpdateTask} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Judul Tugas *
            </label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
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
              Mata Pelajaran *
            </label>
            <input
              type="text"
              required
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
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
                Guru
              </label>
              <input
                type="text"
                value={editTeacher}
                onChange={(e) => setEditTeacher(e.target.value)}
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
                Deadline Date *
              </label>
              <input
                type="date"
                required
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
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

          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Deskripsi Tugas
            </label>
            <textarea
              rows={2}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input, var(--bg-surface))',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Catatan Tambahan
            </label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
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
            disabled={editSubmitting}
            style={{
              marginTop: '0.5rem',
              padding: '0.8rem',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-600)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: editSubmitting ? 'not-allowed' : 'pointer',
              opacity: editSubmitting ? 0.7 : 1,
            }}
          >
            {editSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}
          </button>
        </form>
      </Modal>

      {/* 6. Delete Confirmation Modal (Requirement #12) */}
      {taskToDelete && (
        <Modal
          isOpen={Boolean(taskToDelete)}
          onClose={() => setTaskToDelete(null)}
          title="Konfirmasi Hapus Tugas"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
              Are you sure you want to delete this assignment?
            </p>
            <div
              style={{
                padding: '0.75rem',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                fontSize: '0.85rem',
              }}
            >
              <strong>{taskToDelete.title}</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                {taskToDelete.subject} • Deadline: {taskToDelete.deadline_date}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                style={{
                  padding: '0.6rem 1rem',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  padding: '0.6rem 1.15rem',
                  fontSize: '0.825rem',
                  fontWeight: 800,
                  borderRadius: '10px',
                  backgroundColor: 'var(--danger-main)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
