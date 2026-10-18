import React, { useState, useEffect, useCallback } from 'react';
import { Clock, User, RefreshCw } from 'lucide-react';
import type { ActivityLog } from '../../types';
import { api } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';

export const AdminAuditLogs: React.FC = () => {
  const { addToast } = useNotifications();
  const { t, language } = useLanguage();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.admin.getAuditLogs(60);
      if (res.success) setLogs(res.data);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const locale = language === 'en' ? 'en-US' : 'id-ID';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {t.admin.auditTitle}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            {t.admin.auditSubtitle}
          </p>
        </div>

        <button onClick={fetchLogs} className="btn btn-secondary btn-sm" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>{t.admin.refreshLogsBtn}</span>
        </button>
      </div>

      <div className="card" style={{ boxShadow: 'var(--shadow-md)', backgroundColor: 'var(--bg-card)' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>{t.admin.colAuditTime}</th>
                <th>{t.admin.colAuditActor}</th>
                <th>{t.admin.colAuditAction}</th>
                <th>{t.admin.colAuditEntity}</th>
                <th>{t.admin.colAuditDetails}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    {t.admin.loadingAudit}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    {t.admin.emptyAudit}
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
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={13} color="var(--primary-600)" />
                          <span>
                            {new Date(log.created_at).toLocaleString(locale, {
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
                          <User size={14} color="var(--text-muted)" />
                          <strong style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>{log.user_name}</strong>
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
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
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
