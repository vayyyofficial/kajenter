import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, CheckSquare, Calendar, Users, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useMemberAuth } from '../../context/MemberAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { ClassKasRecord, ClassTask, ClassSchedule, PiketSchedule } from '../../types';
import { PortalTabId } from './PortalBottomNav';
import { useRealtimeSync } from '../../context/SyncContext';
import { generateKasWeeks, getActiveKasWeekIndex } from '../../utils/kasPeriod';

interface PortalHomeTabProps {
  onSwitchTab: (tab: PortalTabId) => void;
}

export const PortalHomeTab: React.FC<PortalHomeTabProps> = ({ onSwitchTab }) => {
  const { member } = useMemberAuth();
  const { t } = useLanguage();

  const [myKasStatus, setMyKasStatus] = useState<ClassKasRecord | null>(null);
  const [defaultAmount, setDefaultAmount] = useState(3000);
  const [upcomingTasks, setUpcomingTasks] = useState<ClassTask[]>([]);
  const [todaySchedules, setTodaySchedules] = useState<ClassSchedule[]>([]);
  const [todayPiket, setTodayPiket] = useState<PiketSchedule[]>([]);

  // Compute current day in Indonesian
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayIndex = new Date().getDay();
  const todayDayName = dayNames[todayIndex] || 'Senin';

  // Real-time Kas period calculation (1 Oktober 2026 – 31 Juli 2027)
  const allKasWeeks = useMemo(() => generateKasWeeks(), []);
  const activeKasWeekIndex = useMemo(() => getActiveKasWeekIndex(allKasWeeks), [allKasWeeks]);
  const activeKasWeekPeriod = useMemo(
    () => allKasWeeks.find((w) => w.weekIndex === activeKasWeekIndex) || allKasWeeks[0],
    [allKasWeeks, activeKasWeekIndex]
  );

  const loadDashboardData = useCallback(async () => {
    if (!member) return;
    try {
      // Load Kas for the active real-time period
      const kasRes = await api.portal.kas.getAll({
        week: activeKasWeekIndex,
        member_id: member.id,
      });
      if (kasRes.success) {
        setDefaultAmount(kasRes.defaultAmount || 3000);
        setMyKasStatus(kasRes.data && kasRes.data.length > 0 ? kasRes.data[0] : null);
      }

      // Load Tasks
      const tasksRes = await api.portal.tasks.getAll();
      if (tasksRes.success && tasksRes.data) {
        const active = tasksRes.data
          .filter((task) => task.status !== 'completed')
          .slice(0, 3);
        setUpcomingTasks(active);
      }

      // Load today's schedules
      const scheduleRes = await api.portal.schedules.getAll(todayDayName);
      if (scheduleRes.success && scheduleRes.data) {
        setTodaySchedules(scheduleRes.data);
      }

      // Load today's piket
      const piketRes = await api.portal.piket.getAll(todayDayName);
      if (piketRes.success && piketRes.data) {
        setTodayPiket(piketRes.data);
      }
    } catch (err) {
      console.error('Portal dashboard load error:', err);
    }
  }, [member, todayDayName, activeKasWeekIndex]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Real-time synchronization
  useRealtimeSync(['settings', 'members'], loadDashboardData);

  const isPaid = myKasStatus ? Boolean(myKasStatus.is_paid) : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', paddingBottom: '3.5rem' }}>
      {/* 1. Quick Actions (Professional Outline Style) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          padding: '1rem',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border-color)',
        }}
      >
        <button
          onClick={() => onSwitchTab('kas')}
          type="button"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.35rem',
            borderRadius: '10px',
            transition: 'background-color 0.15s ease',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              backgroundColor: 'var(--primary-50)',
              color: 'var(--primary-600)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Wallet size={20} strokeWidth={2} />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {t.portal.quickActions.payKas}
          </span>
        </button>

        <button
          onClick={() => onSwitchTab('tasks')}
          type="button"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.35rem',
            borderRadius: '10px',
            transition: 'background-color 0.15s ease',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--primary-600)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckSquare size={20} strokeWidth={2} />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {t.portal.quickActions.viewTasks}
          </span>
        </button>

        <button
          onClick={() => onSwitchTab('schedules')}
          type="button"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.35rem',
            borderRadius: '10px',
            transition: 'background-color 0.15s ease',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--primary-600)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={20} strokeWidth={2} />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {t.portal.quickActions.classSchedule}
          </span>
        </button>

        <button
          onClick={() => onSwitchTab('piket')}
          type="button"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.35rem',
            borderRadius: '10px',
            transition: 'background-color 0.15s ease',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--primary-600)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={20} strokeWidth={2} />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {t.portal.quickActions.piketSchedule}
          </span>
        </button>
      </div>

      {/* 2. My Kas Status Card (Clean Mature Card) */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t.portal.kas.myStatus} • Periode #{activeKasWeekIndex} ({activeKasWeekPeriod.label})
          </div>
          <div
            style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              color: isPaid ? '#059669' : 'var(--danger-main, #ef4444)',
              marginTop: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            {isPaid ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{isPaid ? t.portal.kas.statusPaid : t.portal.kas.statusUnpaid}</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Nominal: Rp {defaultAmount.toLocaleString('id-ID')} / minggu
          </div>
        </div>

        <button
          onClick={() => onSwitchTab('kas')}
          type="button"
          style={{
            backgroundColor: isPaid ? '#059669' : 'var(--primary-600)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 0.95rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {isPaid ? 'Riwayat' : 'Detail'}
        </button>
      </div>

      {/* 3. Responsive Grid for Tasks, Schedules, and Piket */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Upcoming Tasks Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.9rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Clock size={16} color="var(--primary-600)" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {t.portal.tasks.title}
              </h3>
            </div>
            <button
              onClick={() => onSwitchTab('tasks')}
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-600)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Lihat Semua →
            </button>
          </div>

          {upcomingTasks.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
              Tidak ada deadline tugas mendesak saat ini.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: '0.5rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      {task.subject} {task.teacher_name ? `• ${task.teacher_name}` : ''}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      backgroundColor: 'var(--danger-bg)',
                      color: 'var(--danger-text)',
                      border: '1px solid var(--danger-border)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      flexShrink: 0,
                    }}
                  >
                    <Calendar size={11} />
                    <span>{task.deadline_date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Schedule Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.9rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Calendar size={16} color="var(--primary-600)" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Pelajaran Hari Ini ({todayDayName})
              </h3>
            </div>
            <button
              onClick={() => onSwitchTab('schedules')}
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-600)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Jadwal Lengkap →
            </button>
          </div>

          {todaySchedules.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
              Tidak ada jadwal pelajaran yang tercatat untuk hari {todayDayName}.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {todaySchedules.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.8rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: '10px',
                    borderLeft: '3px solid var(--primary-600)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {item.subject}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      {item.teacher_name}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {item.start_time} - {item.end_time}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Piket Hari Ini Card */}
        {todayPiket.length > 0 && (
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem' }}>
              <Users size={16} color="var(--primary-600)" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Piket Kelas Hari Ini ({todayDayName})
              </h3>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {todayPiket.map((p) => (
                <span
                  key={p.id}
                  style={{
                    fontSize: '0.775rem',
                    fontWeight: 600,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '6px',
                    backgroundColor: 'var(--primary-50)',
                    color: 'var(--primary-700)',
                    border: '1px solid var(--primary-200)',
                  }}
                >
                  {p.member_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
