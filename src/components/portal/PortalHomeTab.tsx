import React, { useState, useEffect } from 'react';
import { Wallet, CheckSquare, Calendar, Users, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useMemberAuth } from '../../context/MemberAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { ClassKasRecord, ClassTask, ClassSchedule, PiketSchedule } from '../../types';
import { PortalTabId } from './PortalBottomNav';

import { DueTomorrowNotification } from '../common/DueTomorrowNotification';

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
  const [loading, setLoading] = useState(true);

  // Compute current day in Indonesian
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayIndex = new Date().getDay();
  const todayDayName = dayNames[todayIndex] || 'Senin';

  // Compute current week of year
  const currentDate = new Date();
  const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
  const currentWeek = Math.ceil(((currentDate.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      if (!member) return;
      try {
        setLoading(true);
        // Load Kas
        const kasRes = await api.portal.kas.getAll({
          year: currentDate.getFullYear(),
          week: currentWeek,
          member_id: member.id,
        });
        if (isMounted && kasRes.success) {
          setDefaultAmount(kasRes.defaultAmount || 3000);
          setMyKasStatus(kasRes.data && kasRes.data.length > 0 ? kasRes.data[0] : null);
        }

        // Load Tasks
        const tasksRes = await api.portal.tasks.getAll();
        if (isMounted && tasksRes.success && tasksRes.data) {
          // Take top 3 upcoming tasks
          const active = tasksRes.data
            .filter((task) => task.status !== 'completed')
            .slice(0, 3);
          setUpcomingTasks(active);
        }

        // Load today's schedules
        const scheduleRes = await api.portal.schedules.getAll(todayDayName);
        if (isMounted && scheduleRes.success && scheduleRes.data) {
          setTodaySchedules(scheduleRes.data);
        }

        // Load today's piket
        const piketRes = await api.portal.piket.getAll(todayDayName);
        if (isMounted && piketRes.success && piketRes.data) {
          setTodayPiket(piketRes.data);
        }
      } catch (err) {
        console.error('Portal dashboard load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [member, currentWeek, todayDayName]);

  const isPaid = myKasStatus ? Boolean(myKasStatus.is_paid) : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>
      {/* H-1 Task Due Notification */}
      <DueTomorrowNotification portalContext onNavigateToTasks={() => onSwitchTab('tasks')} />

      {/* 1. Quick Actions (E-Wallet style Grid) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.65rem',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          padding: '1.1rem 0.75rem',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--gray-200)',
        }}
      >
        <button
          onClick={() => onSwitchTab('kas')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '16px',
              backgroundColor: 'var(--primary-50)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(220, 38, 38, 0.12)',
            }}
          >
            <Wallet size={22} />
          </div>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--gray-800)' }}>
            {t.portal.quickActions.payKas}
          </span>
        </button>

        <button
          onClick={() => onSwitchTab('tasks')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '16px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckSquare size={22} />
          </div>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--gray-800)' }}>
            {t.portal.quickActions.viewTasks}
          </span>
        </button>

        <button
          onClick={() => onSwitchTab('schedules')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '16px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={22} />
          </div>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--gray-800)' }}>
            {t.portal.quickActions.classSchedule}
          </span>
        </button>

        <button
          onClick={() => onSwitchTab('piket')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '16px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={22} />
          </div>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--gray-800)' }}>
            {t.portal.quickActions.piketSchedule}
          </span>
        </button>
      </div>

      {/* 2. My Kas Status Card (E-Wallet Balance banner style) */}
      <div
        style={{
          background: isPaid
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)'
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
          border: `1.5px solid ${isPaid ? 'var(--success-border)' : 'var(--danger-border)'}`,
          borderRadius: '20px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>
            {t.portal.kas.myStatus} • Minggu #{currentWeek}
          </div>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: isPaid ? 'var(--success-main)' : 'var(--danger-main)',
              marginTop: '0.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {isPaid ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{isPaid ? t.portal.kas.statusPaid : t.portal.kas.statusUnpaid}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginTop: '0.2rem' }}>
            Nominal: Rp{defaultAmount.toLocaleString('id-ID')} / minggu
          </div>
        </div>

        <button
          onClick={() => onSwitchTab('kas')}
          style={{
            backgroundColor: isPaid ? 'var(--success-main)' : 'var(--primary-600)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '9999px',
            padding: '0.5rem 0.95rem',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {isPaid ? 'Riwayat' : 'Detail'}
        </button>
      </div>

      {/* 3. Upcoming Deadlines Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--gray-200)',
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
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--gray-900)' }}>
              {t.portal.tasks.title}
            </h3>
          </div>
          <button
            onClick={() => onSwitchTab('tasks')}
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
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontStyle: 'italic', padding: '0.5rem 0' }}>
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
                  borderRadius: '12px',
                  border: '1px solid var(--gray-200)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--gray-500)' }}>
                    {task.subject} {task.teacher_name ? `• ${task.teacher_name}` : ''}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--danger-bg)',
                    color: 'var(--danger-text)',
                    border: '1px solid var(--danger-border)',
                  }}
                >
                  📅 {task.deadline_date}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Today's Lesson Schedule */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--gray-200)',
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
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--gray-900)' }}>
              Pelajaran Hari Ini ({todayDayName})
            </h3>
          </div>
          <button
            onClick={() => onSwitchTab('schedules')}
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
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontStyle: 'italic', padding: '0.5rem 0' }}>
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
                  borderRadius: '12px',
                  borderLeft: '3px solid var(--primary-600)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                    {item.subject}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--gray-500)' }}>
                    {item.teacher_name} {item.room ? `• ${item.room}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-700)' }}>
                  {item.start_time} - {item.end_time}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Piket Hari Ini */}
      {todayPiket.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '20px',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--gray-200)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem' }}>
            <Users size={16} color="var(--primary-600)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--gray-900)' }}>
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
                  padding: '0.3rem 0.65rem',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--primary-50)',
                  color: 'var(--primary-700)',
                  border: '1px solid var(--primary-200)',
                }}
              >
                🧹 {p.member_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
