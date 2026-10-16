import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, KeyRound, AlertCircle, CheckCircle2, LogOut } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useNotifications } from '../../context/NotificationContext';
import { api } from '../../services/api';

export const AdminSecurity: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const { changePassword, logout } = useAdmin();
  const { addToast } = useNotifications();

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
      setErrorMsg('Semua kolom password wajib diisi.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Password baru dan konfirmasi password tidak cocok.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password baru minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);
    const res = await changePassword(currentPassword, newPassword, confirmPassword);
    setIsSubmitting(false);

    if (res.success) {
      addToast('success', res.message || 'Password admin berhasil diubah.');
      setSuccessMsg('Password admin berhasil diubah dengan aman.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLastPasswordChange(new Date().toISOString());
    } else {
      setErrorMsg(res.error || 'Gagal mengubah password admin.');
      addToast('error', res.error || 'Gagal mengubah password.');
    }
  };

  const handleLogout = () => {
    logout();
    addToast('info', 'Sesi admin telah ditutup.');
    if (onLogout) {
      onLogout();
    } else {
      window.history.pushState(null, '', '/beranda');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
      {/* Left: Change Password Form (Requirement #13) */}
      <div className="card" style={{ padding: '1.75rem' }}>
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
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--gray-900)' }}>
              Ganti Password Admin
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', margin: 0 }}>
              Perbarui kredensial rahasia pengelola website
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
            <label className="form-label">Password Saat Ini</label>
            <input
              type="password"
              placeholder="Masukkan password saat ini"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="form-input"
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password Baru</label>
            <input
              type="password"
              placeholder="Minimal 6 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Konfirmasi Password Baru</label>
            <input
              type="password"
              placeholder="Ulangi password baru"
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
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Password Baru'}</span>
          </button>
        </form>
      </div>

      {/* Right: Security Status & Policy (Requirement #8, #9, #10, #35) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.75rem' }}>
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
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                Status Keamanan Sistem
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', margin: 0 }}>
                Arsitektur proteksi server-side aktif
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--gray-50)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--gray-200)',
              }}
            >
              <span style={{ color: 'var(--gray-500)', fontSize: '0.75rem', display: 'block' }}>Metode Hashing Password</span>
              <strong style={{ color: 'var(--gray-900)' }}>Bcrypt Salted Hash (Server-side)</strong>
            </div>

            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--gray-50)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--gray-200)',
              }}
            >
              <span style={{ color: 'var(--gray-500)', fontSize: '0.75rem', display: 'block' }}>Kebijakan Anti Brute-Force</span>
              <strong style={{ color: 'var(--gray-900)' }}>Maksimal 3x Percobaan → Lockout 12 Jam</strong>
            </div>

            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--gray-50)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--gray-200)',
              }}
            >
              <span style={{ color: 'var(--gray-500)', fontSize: '0.75rem', display: 'block' }}>Sesi Otentikasi Admin</span>
              <strong style={{ color: 'var(--gray-900)' }}>JWT Token Terenkripsi (Kedaluwarsa 8 Jam)</strong>
            </div>

            {lastPasswordChange && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--gray-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--gray-200)',
                }}
              >
                <span style={{ color: 'var(--gray-500)', fontSize: '0.75rem', display: 'block' }}>Terakhir Diperbarui</span>
                <strong style={{ color: 'var(--gray-900)' }}>
                  {new Date(lastPasswordChange).toLocaleDateString('id-ID', {
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
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary-600)' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '0.35rem' }}>
            Tutup Sesi Admin
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Keluar dari Secret Admin Panel dan hancurkan sesi token aktif. Password rahasia akan diminta kembali saat masuk.
          </p>
          <button
            onClick={handleLogout}
            className="btn btn-danger"
            style={{ width: '100%', height: '42px', fontWeight: 700 }}
          >
            <LogOut size={16} />
            <span>Logout dari Admin Panel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
