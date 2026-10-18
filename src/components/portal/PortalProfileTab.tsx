import React, { useState, useRef } from 'react';
import { User, Lock, Mail, Camera, ShieldCheck, ChevronRight, UserCog } from 'lucide-react';
import { useMemberAuth } from '../../context/MemberAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { BRANDING } from '../../config/branding';
import { Modal } from '../common/Modal';

export const PortalProfileTab: React.FC = () => {
  const {
    member,
    updateProfile,
    changePassword,
    changeEmail,
    requestVerificationCode,
    logout,
  } = useMemberAuth();
  const { t } = useLanguage();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit personal data states
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [fullName, setFullName] = useState(member?.full_name || '');
  const [nickname, setNickname] = useState(member?.nickname || '');
  const [birthPlace, setBirthPlace] = useState(member?.birth_place || '');
  const [birthDate, setBirthDate] = useState(member?.birth_date || '');
  const [phone, setPhone] = useState(member?.phone || '');
  const [savingInfo, setSavingInfo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Change Password Modal states (Requirements #23)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState<'form' | 'verify'>('form');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passVerificationCode, setPassVerificationCode] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  // Change Email Modal states (Requirements #24 & #25)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailStep, setEmailStep] = useState<'form' | 'verify'>('form');
  const [newEmail, setNewEmail] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // User Management Modal states (Developer only - Requirement #22)
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [userList, setUserList] = useState<any[]>([]);
  const [mgmtLoading, setMgmtLoading] = useState(false);
  const [selectedRoleUser, setSelectedRoleUser] = useState<any | null>(null);
  const [newAssignedRole, setNewAssignedRole] = useState('');

  if (!member) return null;

  const isDeveloper = Boolean(
    member.permissions?.isDeveloper ||
    member.role?.toLowerCase().includes('developer')
  );

  const photoSrc = member.photo_number
    ? (member.photo_number.startsWith('http') || member.photo_number.startsWith('/')
        ? member.photo_number
        : `/foto-anggota/${member.photo_number}`)
    : BRANDING.logoUrl;

  // 1. Photo Upload Handler (Requirements #27 & #28)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const res = await api.upload.image(file);
      if (res.success && res.data) {
        // Update member photo
        await updateProfile({ photo_number: res.data.url });
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengupload foto profil.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // 2. Save Personal Details (Requirements #26 & #28)
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingInfo(true);
      const res = await updateProfile({
        full_name: fullName.trim(),
        nickname: nickname.trim() || undefined,
        birth_place: birthPlace.trim() || undefined,
        birth_date: birthDate.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      if (res.success) {
        setIsEditingInfo(false);
      } else {
        alert(res.error || 'Gagal menyimpan profil.');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan profil.');
    } finally {
      setSavingInfo(false);
    }
  };

  // 3. Password Request Code & Verify Flow (Requirement #23)
  const handleRequestPasswordCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassError('Semua kolom password wajib diisi.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Konfirmasi password tidak cocok.');
      return;
    }
    if (newPassword.length < 6) {
      setPassError('Password baru minimal 6 karakter.');
      return;
    }

    try {
      setPassLoading(true);
      setPassError(null);
      const res = await requestVerificationCode('password');
      if (res.success) {
        setPasswordStep('verify');
        setPassSuccess(res.message || 'Kode verifikasi telah dikirim.');
      } else {
        setPassError(res.error || 'Gagal meminta kode verifikasi.');
      }
    } catch (err: any) {
      setPassError(err.message || 'Gagal meminta kode verifikasi.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleVerifyChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passVerificationCode || passVerificationCode.length !== 6) {
      setPassError('Masukkan 6 digit kode verifikasi.');
      return;
    }

    try {
      setPassLoading(true);
      setPassError(null);
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
        code: passVerificationCode.trim(),
      });

      if (res.success) {
        setPassSuccess('Password berhasil diubah!');
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPasswordStep('form');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPassVerificationCode('');
          setPassSuccess(null);
        }, 1200);
      } else {
        setPassError(res.error || 'Kode verifikasi salah atau expired.');
      }
    } catch (err: any) {
      setPassError(err.message || 'Gagal mengubah password.');
    } finally {
      setPassLoading(false);
    }
  };

  // 4. Email Request Code & Verify Flow (Requirements #24 & #25)
  const handleRequestEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      setEmailError('Format email baru tidak valid.');
      return;
    }

    try {
      setEmailLoading(true);
      setEmailError(null);
      const res = await requestVerificationCode('email', newEmail.trim());
      if (res.success) {
        setEmailStep('verify');
        setEmailSuccess(res.message || 'Kode verifikasi telah dikirim.');
      } else {
        setEmailError(res.error || 'Gagal meminta kode verifikasi email.');
      }
    } catch (err: any) {
      setEmailError(err.message || 'Gagal meminta kode verifikasi email.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailVerificationCode || emailVerificationCode.length !== 6) {
      setEmailError('Masukkan 6 digit kode verifikasi.');
      return;
    }

    try {
      setEmailLoading(true);
      setEmailError(null);
      const res = await changeEmail({
        newEmail: newEmail.trim(),
        code: emailVerificationCode.trim(),
      });

      if (res.success) {
        setEmailSuccess('Email berhasil diperbarui!');
        setTimeout(() => {
          setIsEmailModalOpen(false);
          setEmailStep('form');
          setNewEmail('');
          setEmailVerificationCode('');
          setEmailSuccess(null);
        }, 1200);
      } else {
        setEmailError(res.error || 'Kode verifikasi email salah atau expired.');
      }
    } catch (err: any) {
      setEmailError(err.message || 'Gagal mengubah email.');
    } finally {
      setEmailLoading(false);
    }
  };

  // 5. Developer User Management (Requirement #22)
  const openUserManagement = async () => {
    setIsUserMgmtOpen(true);
    setMgmtLoading(true);
    try {
      const res = await api.portal.users.getAll();
      if (res.success) {
        setUserList(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMgmtLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRoleUser || !newAssignedRole) return;
    try {
      const res = await api.portal.users.updateRole(selectedRoleUser.id, newAssignedRole);
      if (res.success) {
        alert(res.message || 'Role berhasil diperbarui!');
        setSelectedRoleUser(null);
        openUserManagement();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah role.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>
      {/* 1. Profile Avatar Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '24px',
          padding: '1.5rem',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--gray-200)',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 1rem auto' }}>
          <img
            src={photoSrc}
            alt={member.full_name}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid var(--primary-600)',
              backgroundColor: 'var(--white)',
              boxShadow: '0 6px 16px rgba(220, 38, 38, 0.2)',
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 30,
              height: 30,
              borderRadius: '50%',
              backgroundColor: 'var(--primary-600)',
              color: '#ffffff',
              border: '2px solid var(--white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-md)',
            }}
            title={t.portal.profile.uploadPhoto}
          >
            <Camera size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoUpload}
          />
        </div>

        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--gray-900)' }}>
          {member.full_name}
        </h2>
        <div style={{ fontSize: '0.8rem', color: 'var(--primary-600)', fontWeight: 700, marginTop: '0.15rem' }}>
          {member.role || (member.member_type === 'guru' ? 'Guru' : 'Siswa')}
          {member.attendance_number ? ` • Absen #${member.attendance_number}` : ''}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.15rem' }}>
          {member.email}
        </div>
      </div>

      {/* 2. Personal Information Card */}
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
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--gray-900)' }}>
            {t.portal.profile.personalInfo}
          </h3>
          <button
            onClick={() => setIsEditingInfo(!isEditingInfo)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-600)',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {isEditingInfo ? 'Batal' : t.portal.profile.editProfile}
          </button>
        </div>

        {isEditingInfo ? (
          <form onSubmit={handleSaveInfo} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-500)', marginBottom: '0.2rem' }}>
                NAMA LENGKAP
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid var(--gray-300)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--gray-900)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-500)', marginBottom: '0.2rem' }}>
                NICKNAME
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid var(--gray-300)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--gray-900)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-500)', marginBottom: '0.2rem' }}>
                  TEMPAT LAHIR
                </label>
                <input
                  type="text"
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.8rem',
                    borderRadius: '10px',
                    border: '1px solid var(--gray-300)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--gray-900)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-500)', marginBottom: '0.2rem' }}>
                  TANGGAL LAHIR
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.8rem',
                    borderRadius: '10px',
                    border: '1px solid var(--gray-300)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--gray-900)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-500)', marginBottom: '0.2rem' }}>
                NOMOR TELEPON
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid var(--gray-300)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--gray-900)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={savingInfo}
              style={{
                marginTop: '0.4rem',
                padding: '0.75rem',
                borderRadius: '12px',
                backgroundColor: 'var(--primary-600)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: savingInfo ? 'not-allowed' : 'pointer',
              }}
            >
              {savingInfo ? 'Menyimpan...' : t.portal.profile.saveChanges}
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--gray-200)' }}>
              <span style={{ color: 'var(--gray-500)' }}>Nama Lengkap</span>
              <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{member.full_name}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--gray-200)' }}>
              <span style={{ color: 'var(--gray-500)' }}>Nickname</span>
              <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{member.nickname || '-'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--gray-200)' }}>
              <span style={{ color: 'var(--gray-500)' }}>Kelahiran</span>
              <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>
                {member.birth_place ? `${member.birth_place}, ` : ''}{member.birth_date || '-'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--gray-200)' }}>
              <span style={{ color: 'var(--gray-500)' }}>Nomor Telepon</span>
              <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{member.phone || '-'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
              <span style={{ color: 'var(--gray-500)' }}>Role / Jabatan</span>
              <span style={{ fontWeight: 800, color: 'var(--primary-600)' }}>
                {member.role || 'Siswa'} 🔒
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Account & Security Card (Requirements #23, #24, #25) */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--gray-200)',
        }}
      >
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '0.85rem' }}>
          Akun & Keamanan
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {/* Change Password Button */}
          <button
            onClick={() => {
              setPasswordStep('form');
              setPassError(null);
              setPassSuccess(null);
              setIsPasswordModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              borderRadius: '14px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--gray-200)',
              cursor: 'pointer',
              color: 'var(--gray-900)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Lock size={18} color="var(--primary-600)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{t.portal.profile.changePassword}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>Verifikasi 6-digit via email</div>
              </div>
            </div>
            <ChevronRight size={18} color="var(--gray-400)" />
          </button>

          {/* Change Email Button */}
          <button
            onClick={() => {
              setEmailStep('form');
              setEmailError(null);
              setEmailSuccess(null);
              setNewEmail('');
              setIsEmailModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              borderRadius: '14px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--gray-200)',
              cursor: 'pointer',
              color: 'var(--gray-900)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Mail size={18} color="var(--primary-600)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{t.portal.profile.changeEmail}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>Sinkron otomatis ke seluruh website</div>
              </div>
            </div>
            <ChevronRight size={18} color="var(--gray-400)" />
          </button>

          {/* User Management Button (Developer Only - Requirement #22) */}
          {isDeveloper && (
            <button
              onClick={openUserManagement}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                borderRadius: '14px',
                backgroundColor: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid var(--primary-200)',
                cursor: 'pointer',
                color: 'var(--primary-700)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <UserCog size={18} color="var(--primary-600)" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>Manajemen Role (Developer)</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--primary-600)' }}>Atur hak akses anggota kelas</div>
                </div>
              </div>
              <ChevronRight size={18} color="var(--primary-600)" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Logout Button */}
      <button
        onClick={logout}
        style={{
          padding: '0.85rem',
          borderRadius: '14px',
          border: '1px solid var(--danger-border)',
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger-main)',
          fontWeight: 800,
          fontSize: '0.85rem',
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        {t.portal.logout}
      </button>

      {/* ========================================================= */}
      {/* CHANGE PASSWORD MODAL (Requirement #23)                   */}
      {/* ========================================================= */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={t.portal.security.currentPassword ? 'Ganti Password' : 'Change Password'}
        size="sm"
      >
        {passError && (
              <div
                style={{
                  padding: '0.65rem 0.8rem',
                  borderRadius: '10px',
                  backgroundColor: 'var(--danger-bg)',
                  color: 'var(--danger-text)',
                  fontSize: '0.75rem',
                  marginBottom: '0.85rem',
                }}
              >
                {passError}
              </div>
            )}

            {passSuccess && (
              <div
                style={{
                  padding: '0.65rem 0.8rem',
                  borderRadius: '10px',
                  backgroundColor: 'var(--success-bg)',
                  color: 'var(--success-text)',
                  fontSize: '0.75rem',
                  marginBottom: '0.85rem',
                }}
              >
                {passSuccess}
              </div>
            )}

            {passwordStep === 'form' ? (
              <form onSubmit={handleRequestPasswordCode} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-600)', marginBottom: '0.2rem' }}>
                    {t.portal.security.currentPassword} *
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.8rem',
                      borderRadius: '10px',
                      border: '1px solid var(--gray-300)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--gray-900)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-600)', marginBottom: '0.2rem' }}>
                    {t.portal.security.newPassword} *
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.8rem',
                      borderRadius: '10px',
                      border: '1px solid var(--gray-300)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--gray-900)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-600)', marginBottom: '0.2rem' }}>
                    {t.portal.security.confirmNewPassword} *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.8rem',
                      borderRadius: '10px',
                      border: '1px solid var(--gray-300)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--gray-900)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={passLoading}
                  style={{
                    marginTop: '0.4rem',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    backgroundColor: 'var(--primary-600)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: passLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {passLoading ? 'Mengirim kode...' : t.portal.security.sendCode}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)', lineHeight: 1.45 }}>
                  {t.portal.security.codeSentNotice}
                </p>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-600)', marginBottom: '0.2rem' }}>
                    {t.portal.security.enterCode}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={passVerificationCode}
                    onChange={(e) => setPassVerificationCode(e.target.value)}
                    placeholder="Contoh: 123456"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: '2px solid var(--primary-600)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--gray-900)',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      letterSpacing: '0.25em',
                      textAlign: 'center',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={passLoading}
                  style={{
                    padding: '0.8rem',
                    borderRadius: '12px',
                    backgroundColor: 'var(--primary-600)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: passLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {passLoading ? 'Memverifikasi...' : t.portal.security.verifyAndSave}
                </button>
              </form>
            )}
      </Modal>

      {/* ========================================================= */}
      {/* CHANGE EMAIL MODAL (Requirements #24 & #25)               */}
      {/* ========================================================= */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title={t.portal.profile.changeEmail}
        size="sm"
      >
        {emailError && (
              <div
                style={{
                  padding: '0.65rem 0.8rem',
                  borderRadius: '10px',
                  backgroundColor: 'var(--danger-bg)',
                  color: 'var(--danger-text)',
                  fontSize: '0.75rem',
                  marginBottom: '0.85rem',
                }}
              >
                {emailError}
              </div>
            )}

            {emailSuccess && (
              <div
                style={{
                  padding: '0.65rem 0.8rem',
                  borderRadius: '10px',
                  backgroundColor: 'var(--success-bg)',
                  color: 'var(--success-text)',
                  fontSize: '0.75rem',
                  marginBottom: '0.85rem',
                }}
              >
                {emailSuccess}
              </div>
            )}

            {emailStep === 'form' ? (
              <form onSubmit={handleRequestEmailCode} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)', lineHeight: 1.45 }}>
                  Email baru akan menjadi identitas login resmi Anda dan tersinkron ke website utama.
                </p>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-600)', marginBottom: '0.2rem' }}>
                    {t.portal.security.newEmailAddress} *
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="nama@tkj.sch.id"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.8rem',
                      borderRadius: '10px',
                      border: '1px solid var(--gray-300)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--gray-900)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={emailLoading}
                  style={{
                    marginTop: '0.4rem',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    backgroundColor: 'var(--primary-600)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: emailLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {emailLoading ? 'Mengirim kode...' : t.portal.security.sendCode}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyChangeEmail} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)', lineHeight: 1.45 }}>
                  {t.portal.security.codeSentNotice}
                </p>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-600)', marginBottom: '0.2rem' }}>
                    {t.portal.security.enterCode}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={emailVerificationCode}
                    onChange={(e) => setEmailVerificationCode(e.target.value)}
                    placeholder="Contoh: 123456"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: '2px solid var(--primary-600)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--gray-900)',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      letterSpacing: '0.25em',
                      textAlign: 'center',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={emailLoading}
                  style={{
                    padding: '0.8rem',
                    borderRadius: '12px',
                    backgroundColor: 'var(--primary-600)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: emailLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {emailLoading ? 'Memverifikasi...' : t.portal.security.verifyAndSaveEmail}
                </button>
              </form>
            )}
      </Modal>

      {/* ========================================================= */}
      {/* DEVELOPER USER MANAGEMENT MODAL (Requirement #22)          */}
      {/* ========================================================= */}
      <Modal
        isOpen={isUserMgmtOpen}
        onClose={() => setIsUserMgmtOpen(false)}
        title="Manajemen Role Anggota"
        size="md"
      >
            {selectedRoleUser ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                  Ubah role untuk: <strong>{selectedRoleUser.full_name}</strong>
                </p>
                <div>
                  <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Pilih Role Baru:
                  </label>
                  <select
                    value={newAssignedRole}
                    onChange={(e) => setNewAssignedRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.8rem',
                      borderRadius: '10px',
                      border: '1px solid var(--gray-300)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--gray-900)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="">-- Pilih Role --</option>
                    <option value="Ketua Kelas">Ketua Kelas</option>
                    <option value="Wakil Ketua">Wakil Ketua</option>
                    <option value="Sekretaris">Sekretaris</option>
                    <option value="Bendahara">Bendahara</option>
                    <option value="Siswa">Siswa</option>
                    <option value="Developer">Developer</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => setSelectedRoleUser(null)}
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: '10px',
                      border: '1px solid var(--gray-300)',
                      background: 'none',
                      color: 'var(--gray-700)',
                      cursor: 'pointer',
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleUpdateRole}
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: 'var(--primary-600)',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Simpan Role
                  </button>
                </div>
              </div>
            ) : mgmtLoading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--gray-500)' }}>
                Memuat daftar pengguna...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {userList.map((u) => (
                  <div
                    key={u.id}
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
                        {u.full_name}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--gray-500)' }}>
                        {u.email} • <span style={{ color: 'var(--primary-600)', fontWeight: 600 }}>{u.role || 'Siswa'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedRoleUser(u);
                        setNewAssignedRole(u.role || 'Siswa');
                      }}
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '8px',
                        border: '1px solid var(--primary-600)',
                        backgroundColor: 'transparent',
                        color: 'var(--primary-600)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Ubah Role
                    </button>
                  </div>
                ))}
              </div>
            )}
      </Modal>
    </div>
  );
};
