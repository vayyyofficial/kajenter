import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  RotateCcw,
  Search,
  CheckCircle,
  AlertCircle,
  Filter,
  Clock,
  Smartphone,
  Laptop,
  User,
  Shield,
  Layers,
  Calendar,
} from 'lucide-react';
import { api } from '../../services/api';
import { ActivityLog } from '../../types';
import { useRealtimeSync } from '../../context/SyncContext';

export const PortalActivityConsole: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [lastRefreshedWIB, setLastRefreshedWIB] = useState<string>('');

  const fetchLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await api.portal.admin.getActivityLogs(100);
      if (res && res.success && Array.isArray(res.data)) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      if (!isSilent) setLoading(false);

      // Record last refresh time in WIB
      const nowWIB = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date());
      setLastRefreshedWIB(`${nowWIB} WIB`);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Real-time synchronization
  useRealtimeSync(['logs', 'settings'], () => {
    fetchLogs(true);
  });

  // Filter logs by search, role, and status
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (log.user_name && log.user_name.toLowerCase().includes(q)) ||
        (log.message && log.message.toLowerCase().includes(q)) ||
        (log.action && log.action.toLowerCase().includes(q)) ||
        (log.target && log.target.toLowerCase().includes(q)) ||
        (log.role && log.role.toLowerCase().includes(q)) ||
        (log.device && log.device.toLowerCase().includes(q));

      const matchRole =
        selectedRole === 'ALL' ||
        (log.role && log.role.toLowerCase() === selectedRole.toLowerCase());

      const matchStatus =
        selectedStatus === 'ALL' ||
        (log.status && log.status.toUpperCase() === selectedStatus.toUpperCase());

      return matchQuery && matchRole && matchStatus;
    });
  }, [logs, searchQuery, selectedRole, selectedStatus]);

  // Group logs by WIB date
  const groupedLogs = useMemo(() => {
    const groups: Record<string, ActivityLog[]> = {};
    for (const log of filteredLogs) {
      const dateKey = log.wib_date || 'Aktivitas Terbaru';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    }
    return groups;
  }, [filteredLogs]);

  const rolePills = [
    { id: 'ALL', label: 'Semua Role' },
    { id: 'Developer', label: 'Developer' },
    { id: 'Bendahara', label: 'Bendahara' },
    { id: 'Sekretaris', label: 'Sekretaris' },
    { id: 'Ketua', label: 'Ketua / Wakil' },
    { id: 'Siswa', label: 'Siswa' },
  ];

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-xl, 20px)',
        border: '1px solid var(--border-color)',
        padding: 'clamp(1rem, 3vw, 1.5rem)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          paddingBottom: '0.85rem',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              backgroundColor: 'var(--primary-50, rgba(239, 68, 68, 0.08))',
              color: 'var(--primary-600, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-color)',
            }}
          >
            <Activity size={18} strokeWidth={2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Developer Activity Console
              </h3>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.675rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                  }}
                />
                Live WIB
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              Monitoring aktivitas penting website & Portal Kelas dalam waktu real-time WIB (UTC+7)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {lastRefreshedWIB && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'none' }} className="d-sm-inline">
              Update: {lastRefreshedWIB}
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchLogs()}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.775rem',
              fontWeight: 700,
              gap: '0.4rem',
            }}
            title="Segarkan log aktivitas"
          >
            <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Cari user, aktivitas, target..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
              }}
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="form-input"
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-main)',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            <option value="ALL">Semua Status</option>
            <option value="SUCCESS">Hanya Berhasil (SUCCESS)</option>
            <option value="FAILED">Hanya Gagal (FAILED)</option>
          </select>
        </div>

        {/* Role Pills */}
        <div
          style={{
            display: 'flex',
            gap: '0.35rem',
            overflowX: 'auto',
            paddingBottom: '0.25rem',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {rolePills.map((p) => {
            const active = selectedRole === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedRole(p.id)}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.725rem',
                  fontWeight: active ? 700 : 500,
                  backgroundColor: active ? 'var(--primary-600, #dc2626)' : 'var(--bg-subtle)',
                  color: active ? '#ffffff' : 'var(--text-main)',
                  border: active ? '1px solid var(--primary-600, #dc2626)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Log Entries Container */}
      <div
        style={{
          maxHeight: '440px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          paddingRight: '0.25rem',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div
            style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.825rem',
              border: '1px dashed var(--border-color)',
              borderRadius: '12px',
            }}
          >
            Tidak ada log aktivitas yang cocok dengan filter.
          </div>
        ) : (
          Object.entries(groupedLogs).map(([dateKey, items]) => (
            <div key={dateKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {/* Date Group Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  padding: '0.2rem 0',
                }}
              >
                <Calendar size={12} />
                <span>{dateKey}</span>
                <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>({items.length} aktivitas)</span>
              </div>

              {/* Log Items */}
              {items.map((log) => {
                const isSuccess = log.status !== 'FAILED';
                const isMobile = log.device && /android|ios|iphone|ipad/i.test(log.device);

                return (
                  <div
                    key={log.id}
                    style={{
                      padding: '0.7rem 0.85rem',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    {/* Top Row: Timestamp, Role, Action, Status */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.4rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        {/* WIB Time Badge */}
                        <span
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--primary-600, #dc2626)',
                            backgroundColor: 'var(--primary-50, rgba(239, 68, 68, 0.08))',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '5px',
                            border: '1px solid var(--border-color)',
                            lineHeight: 1,
                          }}
                        >
                          {log.wib_short || `[${log.wib_time} WIB]`}
                        </span>

                        {/* Role Chip */}
                        <span
                          style={{
                            fontSize: '0.675rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '5px',
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                          }}
                        >
                          {log.role || 'Member'}
                        </span>

                        {/* User Name */}
                        <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {log.user_name}
                        </span>
                      </div>

                      {/* Status Indicator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: isSuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: isSuccess ? '#10b981' : '#ef4444',
                            border: isSuccess ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                          }}
                        >
                          {isSuccess ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                          {log.status || 'SUCCESS'}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Message */}
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 500, lineHeight: 1.4 }}>
                      {log.message}
                    </div>

                    {/* Bottom Metadata: Target & Device */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.675rem',
                        color: 'var(--text-muted)',
                        flexWrap: 'wrap',
                        gap: '0.4rem',
                        marginTop: '0.1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Layers size={11} />
                          <span>{log.target || log.entity_type}</span>
                        </span>
                        {log.identifier && log.identifier !== '-' && (
                          <>
                            <span>•</span>
                            <span style={{ opacity: 0.85 }}>{log.identifier}</span>
                          </>
                        )}
                      </div>

                      {log.device && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: 0.85 }}>
                          {isMobile ? <Smartphone size={11} /> : <Laptop size={11} />}
                          <span>{log.device}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
