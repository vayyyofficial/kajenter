import React, { useState, useEffect, useCallback } from 'react';
import { Clock, User, RefreshCw } from 'lucide-react';
import type { ActivityLog } from '../../types';
import { api } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';

export const AdminAuditLogs: React.FC = () => {
  const { addToast } = useNotifications();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.admin.getAuditLogs(60);
      if (res.success) setLogs(res.data);
    } catch (err: any) {
      addToast('error', err.message || 'Gagal memuat log aktivitas.');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900)' }}>
            Log Aktivitas & Jejak Audit (Audit Trail)
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', margin: 0 }}>
            Rekaman historis seluruh aksi administratif yang dilakukan oleh Super Admin, Pengurus, dan Guru
          </p>
        </div>

        <button onClick={fetchLogs} className="btn btn-secondary btn-sm" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Muat Ulang Log</span>
        </button>
      </div>

      <div className="card" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Waktu & Tanggal</th>
                <th>Pelaksana Aksi</th>
                <th>Jenis Aksi</th>
                <th>Entitas</th>
                <th>Rincian Aktivitas</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Memuat riwayat audit...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                    Belum ada riwayat aktivitas yang tercatat.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionColor =
                    log.action === 'CREATE'
                      ? 'var(--success-bg)'
                      : log.action === 'DELETE'
                      ? 'var(--danger-bg)'
                      : log.action === 'APPROVE' || log.action === 'ROLE_CHANGE'
                      ? 'var(--primary-50)'
                      : 'var(--info-bg)';

                  const actionTextColor =
                    log.action === 'CREATE'
                      ? 'var(--success-text)'
                      : log.action === 'DELETE'
                      ? 'var(--danger-text)'
                      : log.action === 'APPROVE' || log.action === 'ROLE_CHANGE'
                      ? 'var(--primary-700)'
                      : 'var(--info-text)';

                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={13} color="var(--primary-600)" />
                          <span>
                            {new Date(log.created_at).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <User size={14} color="var(--gray-500)" />
                          <strong style={{ color: 'var(--gray-900)', fontSize: '0.85rem' }}>{log.user_name}</strong>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: actionColor,
                            color: actionTextColor,
                            fontSize: '0.725rem',
                            fontWeight: 700,
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.725rem' }}>
                          {log.entity_type}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--gray-700)' }}>
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
