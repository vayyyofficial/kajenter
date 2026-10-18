import React, { useState, useEffect } from 'react';
import { ChevronRight, X, Bell } from 'lucide-react';
import { api } from '../../services/api';
import { ClassTask } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface DueTomorrowNotificationProps {
  onNavigateToTasks?: () => void;
  portalContext?: boolean;
}

export const DueTomorrowNotification: React.FC<DueTomorrowNotificationProps> = ({
  onNavigateToTasks,
  portalContext = false,
}) => {
  const { language } = useLanguage();
  const [tasks, setTasks] = useState<ClassTask[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const isEn = language === 'en';

  useEffect(() => {
    let isMounted = true;

    async function checkDueTomorrow() {
      try {
        const res = await api.portal.tasks.getDueTomorrow();
        const taskList = res.tasks || (res as any).data || [];
        if (isMounted && res.success && taskList.length > 0) {
          // Task deadline is tomorrow - show notification for current view
          setTasks(taskList);
        }
      } catch (err) {
        // Silent catch to prevent errors on network hiccup
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkDueTomorrow();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || dismissed || tasks.length === 0) {
    return null;
  }

  const primaryTask = tasks[0];

  // Dismiss hides notification for current view without permanently deleting it
  // Re-appears upon reload/new session as long as task deadline is still tomorrow
  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
  };

  const handleAction = () => {
    if (onNavigateToTasks) {
      onNavigateToTasks();
    } else {
      window.location.href = '/portal/tugas';
    }
  };

  return (
    <div
      className="due-tomorrow-notif-container"
      style={{
        zIndex: 999,
        margin: portalContext ? '0.75rem 0.75rem 0 0.75rem' : '0.75rem auto 1rem auto',
        maxWidth: portalContext ? '100%' : '720px',
        width: portalContext ? 'auto' : '92%',
        animation: 'slideDown 0.35s ease-out',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          backgroundColor: 'var(--bg-card)',
          border: '1.5px solid var(--primary-600)',
          borderRadius: '16px',
          padding: '0.85rem 1rem',
          boxShadow: '0 8px 24px rgba(220, 38, 38, 0.16)',
          backdropFilter: 'blur(8px)',
          boxSizing: 'border-box',
        }}
      >
        {/* Left Information Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '220px', flex: '1 1 240px' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              backgroundColor: 'var(--primary-50)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bell size={18} className="animate-pulse" />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
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
                }}
              >
                {isEn ? 'DUE TOMORROW' : 'DEADLINE H-1'}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main, var(--gray-900))' }}>
                {isEn ? 'Tomorrow you have an assignment.' : 'Besok ada tugas.'}
              </span>
            </div>

            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted, var(--gray-600))',
                marginTop: '0.2rem',
                wordBreak: 'break-word',
                lineHeight: 1.35,
              }}
            >
              {primaryTask.subject}: <strong style={{ color: 'var(--text-main)' }}>{primaryTask.title}</strong>
              {tasks.length > 1 && (isEn ? ` (+${tasks.length - 1} more tasks)` : ` (+${tasks.length - 1} tugas lainnya)`)}
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexShrink: 0,
            marginLeft: 'auto',
          }}
        >
          <button
            onClick={handleAction}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              backgroundColor: 'var(--primary-600)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              padding: '0.45rem 0.85rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{isEn ? 'View Task' : 'Lihat Tugas'}</span>
            <ChevronRight size={14} />
          </button>

          <button
            onClick={handleDismiss}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color, var(--gray-300))',
              color: 'var(--text-muted, var(--gray-500))',
              borderRadius: '9999px',
              padding: '0.4rem 0.7rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            title={isEn ? 'Dismiss notification for now' : 'Tutup notifikasi'}
            aria-label="Dismiss"
          >
            <X size={14} />
            <span>{isEn ? 'Dismiss' : 'Tutup'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
