import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, KeyRound, AlertCircle, CheckCircle2, LogOut } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';

export const AdminSecurity: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const { changePassword, logout } = useAdmin();
  const { addToast } = useNotifications();
  const { t, language } = useLanguage();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [lastPasswordChange, setLastPasswordChange] = useState<string | null>(null);

  useEffect(() => {
    api.admin.getSettings().then((res) => {
      if (res.success && res.data.security.lastPasswordChange) {
        setLastPasswordChange(res.data.security.lastPasswordChange);
      }
    }).catch(() => {});
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg(t.admin.passwordRequired);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(t.admin.passwordMismatch);
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg(t.admin.passwordMinLength);
      return;
    }

    setIsSubmitting(true);
    const res = await changePassword(currentPassword, newPassword, confirmPassword);
    setIsSubmitting(false);

    if (res.success) {
      addToast('success', res.message || t.admin.passwordChangedSuccess);
      setSuccessMsg(t.admin.passwordChangedSuccess);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLastPasswordChange(new Date().toISOString());
    } else {
      setErrorMsg(res.error || 'Failed to update password.');
      addToast('error', res.error || 'Failed to update password.');
    }
  };

  const handleLogout = () => {
    logout();
    addToast('info', t.admin.sessionClosed);
    if (onLogout) {
      onLogout();
    } else {
      window.history.pushState(null, '', '/beranda');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const locale = language === 'en' ? 'en-US' : 'id-ID';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
      {/* Left: Change Password Form (Requirement #13) */}
      <div className="card" style={{ padding: '1.75rem', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-50)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <KeyRound size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {t.admin.changePasswordTitle}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              {t.admin.changePasswordSubtitle}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              backgroundColor: 'var(--primary-50)',
              border: '1px solid var(--primary-200)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--primary-800)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={16} color="var(--primary-600)" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              backgroundColor: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--success-text)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            <CheckCircle2 size={16} color="var(--success-main)" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t.admin.currentPasswordLabel}</label>
            <input
              type="password"
              placeholder={t.admin.currentPasswordPlaceholder}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="form-input"
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t.admin.newPasswordLabel}</label>
            <input
              type="password"
              placeholder={t.admin.newPasswordPlaceholder}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t.admin.confirmPasswordLabel}</label>
            <input
              type="password"
              placeholder={t.admin.confirmPasswordPlaceholder}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ marginTop: '0.5rem', height: '44px', fontWeight: 700 }}
          >
            <Lock size={16} />
            <span>{isSubmitting ? t.common.saving : t.admin.saveNewPasswordBtn}</span>
          </button>
        </form>
      </div>

      {/* Right: Security Status & Policy (Requirement #8, #9, #10, #35) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.75rem', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {t.admin.securityStatusTitle}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                {t.admin.securityStatusSubtitle}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>{t.admin.hashMethodLabel}</span>
              <strong style={{ color: 'var(--text-main)' }}>{t.admin.hashMethodVal}</strong>
            </div>

            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>{t.admin.policyLabel}</span>
              <strong style={{ color: 'var(--text-main)' }}>{t.admin.policyVal}</strong>
            </div>

            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>{t.admin.sessionLabel}</span>
              <strong style={{ color: 'var(--text-main)' }}>{t.admin.sessionVal}</strong>
            </div>

            {lastPasswordChange && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>{t.admin.lastUpdatedLabel}</span>
                <strong style={{ color: 'var(--text-main)' }}>
                  {new Date(lastPasswordChange).toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* Session Termination Card */}
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary-600)', backgroundColor: 'var(--bg-card)' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            {t.admin.terminateSessionTitle}
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            {t.admin.terminateSessionDesc}
          </p>
          <button
            onClick={handleLogout}
            className="btn btn-danger"
            style={{ width: '100%', height: '42px', fontWeight: 700 }}
          >
            <LogOut size={16} />
            <span>{t.admin.logoutAdminBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
