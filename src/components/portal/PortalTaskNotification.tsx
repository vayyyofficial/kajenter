import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, ChevronRight, X, Calendar, Layers } from 'lucide-react';
import { api } from '../../services/api';
import { ClassTask } from '../../types';
import { useRealtimeSync } from '../../context/SyncContext';
import { formatIndonesianDate } from '../../utils/dateHelper';

interface PortalTaskNotificationProps {
  onViewTask: (task: ClassTask) => void;
  isDismissed: boolean;
  onDismiss: () => void;
}

export const PortalTaskNotification: React.FC<PortalTaskNotificationProps> = ({
  onViewTask,
  isDismissed,
  onDismiss,
}) => {
  const [tasks, setTasks] = useState<ClassTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);

  const fetchDueTomorrow = useCallback(async () => {
    try {
      const res = await api.portal.tasks.getDueTomorrow();
      const taskList = res.tasks || (res as any).data || [];
      if (res.success && Array.isArray(taskList)) {
        setTasks(taskList);
      }
    } catch {
      // Silent catch to prevent UI break on network hiccup
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDueTomorrow();
  }, [fetchDueTomorrow]);

  // Real-time synchronization
  useRealtimeSync(['settings'], fetchDueTomorrow);

  // Smooth dismiss handler with exit animation
  const handleDismiss = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
      setIsExiting(false);
    }, 200);
  }, [isExiting, onDismiss]);

  // Action handler: view task and dismiss notification
  const handleViewTask = useCallback(
    (task: ClassTask) => {
      if (isExiting) return;
      setIsExiting(true);
      setTimeout(() => {
        onViewTask(task);
        onDismiss();
        setIsExiting(false);
      }, 150);
    },
    [isExiting, onViewTask, onDismiss]
  );

  if (loading || isDismissed || tasks.length === 0 || typeof document === 'undefined') {
    return null;
  }

  const primaryTask = tasks[0];

  return createPortal(
    <aside
      className="portal-toast-floating-wrapper"
      role="region"
      aria-label="Notifikasi Tugas Besok"
    >
      <div className={`portal-toast-card ${isExiting ? 'toast-exiting' : ''}`}>
        {/* Top Header Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid rgba(220, 38, 38, 0.18)',
              }}
            >
              <Bell size={16} strokeWidth={2.2} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span
                style={{
                  fontSize: '0.675rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--primary-600)',
                  color: '#ffffff',
                  letterSpacing: '0.04em',
                  lineHeight: 1.2,
                }}
              >
                DEADLINE BESOK (H-1)
              </span>

              {tasks.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowAllTasks(!showAllTasks)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    fontSize: '0.675rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                  }}
                  title="Lihat daftar tugas besok"
                >
                  <Layers size={11} />
                  <span>+{tasks.length - 1} lainnya</span>
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup Notifikasi"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 26,
              height: 26,
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, color 0.15s ease',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
              e.currentTarget.style.color = 'var(--text-main)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Task Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: 'var(--primary-600)',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            {primaryTask.subject}
          </div>

          <div
            style={{
              fontSize: '0.925rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              lineHeight: 1.35,
              wordBreak: 'break-word',
            }}
          >
            {primaryTask.title}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontWeight: 600,
              marginTop: '0.15rem',
            }}
          >
            <Calendar size={13} style={{ color: 'var(--primary-600)' }} />
            <span>
              Tenggat: <strong>{formatIndonesianDate(primaryTask.deadline_date || (primaryTask as any).deadline)}</strong>
            </span>
          </div>
        </div>

        {/* Multi-task Expandable Preview List if more than 1 task */}
        {showAllTasks && tasks.length > 1 && (
          <div
            style={{
              marginTop: '0.25rem',
              padding: '0.5rem',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              maxHeight: '140px',
              overflowY: 'auto',
            }}
          >
            {tasks.slice(1).map((t, idx) => (
              <div
                key={t.id || idx}
                onClick={() => handleViewTask(t)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-card)',
                  cursor: 'pointer',
                  border: '1px solid var(--border-color)',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                    {t.subject}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.title}
                  </div>
                </div>
                <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: '0.5rem' }} />
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            marginTop: '0.25rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
              e.currentTarget.style.color = 'var(--text-main)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={() => handleViewTask(primaryTask)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              backgroundColor: 'var(--primary-600)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-700)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-600)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>Lihat Tugas</span>
            <ChevronRight size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </aside>,
    document.body
  );
};
