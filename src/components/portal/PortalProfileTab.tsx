import React, { useState, useRef, useEffect } from 'react';
import {
  Lock,
  Mail,
  Camera,
  ShieldCheck,
  UserCog,
  Edit2,
  Search,
  CheckCircle,
  AlertCircle,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { useMemberAuth } from '../../context/MemberAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import { Member } from '../../types';
import { getMemberPhotoUrl, getDefaultAvatar } from '../../utils/avatar';
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync state when member updates
  useEffect(() => {
    if (member) {
      setFullName(member.full_name || '');
      setNickname(member.nickname || '');
      setBirthPlace(member.birth_place || '');
      setBirthDate(member.birth_date || '');
      setPhone(member.phone || '');
    }
  }, [member]);

  // Change Password Modal states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState<'form' | 'verify'>('form');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passVerificationCode, setPassVerificationCode] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passHintOtp, setPassHintOtp] = useState<string | null>(null);

  // Change Email Modal states
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailStep, setEmailStep] = useState<'form' | 'verify'>('form');
  const [newEmail, setNewEmail] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailHintOtp, setEmailHintOtp] = useState<string | null>(null);

  // Developer User Management Modal states
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [userList, setUserList] = useState<Member[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [mgmtLoading, setMgmtLoading] = useState(false);

  // Developer Edit Member modal states
  const [selectedEditUser, setSelectedEditUser] = useState<Member | null>(null);
  const [editUserFullName, setEditUserFullName] = useState('');
  const [editUserNickname, setEditUserNickname] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserBirthPlace, setEditUserBirthPlace] = useState('');
  const [editUserBirthDate, setEditUserBirthDate] = useState('');
  const [editUserRole, setEditUserRole] = useState('Siswa');
  const [editUserAttendance, setEditUserAttendance] = useState<number | string>('');
  const [savingUserEdit, setSavingUserEdit] = useState(false);

  // Developer Role Quick Change state
  const [selectedRoleUser, setSelectedRoleUser] = useState<Member | null>(null);
  const [newAssignedRole, setNewAssignedRole] = useState('');

  if (!member) return null;

  const isDeveloper = Boolean(
    member.permissions?.isDeveloper ||
    member.role?.toLowerCase() === 'developer'
  );

  const { src: photoSrc } = getMemberPhotoUrl(member);

  // 1. Photo Upload Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      setProfileMsg(null);
      const res = await api.upload.image(file);
      if (res.success && res.data) {
        const updateRes = await updateProfile({ photo_number: res.data.url });
        if (updateRes.success) {
          setProfileMsg({ type: 'success', text: 'Foto profil berhasil diperbarui dan disinkronkan.' });
        } else {
          setProfileMsg({ type: 'error', text: updateRes.error || 'Gagal menyimpan foto profil.' });
        }
      }
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Gagal mengunggah foto profil.' });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 2. Save Personal Details (Role is strictly locked)
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingInfo(true);
      setProfileMsg(null);
      const res = await updateProfile({
        full_name: fullName.trim(),
        nickname: nickname.trim() || undefined,
        birth_place: birthPlace.trim() || undefined,
        birth_date: birthDate || undefined,
        phone: phone.trim() || undefined,
      });

      if (res.success) {
        setIsEditingInfo(false);
        setProfileMsg({ type: 'success', text: 'Data pribadi berhasil disimpan dan disinkronkan.' });
      } else {
        setProfileMsg({ type: 'error', text: res.error || 'Gagal menyimpan profil.' });
      }
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Gagal menyimpan profil.' });
    } finally {
      setSavingInfo(false);
    }
  };

  // 3. Password Request Code & Verify Flow
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
      setPassHintOtp(null);
      const res = await requestVerificationCode('password', { currentPassword });
      if (res.success) {
        setPasswordStep('verify');
        setPassSuccess(res.message || 'Kode verifikasi telah dikirim.');
        if (res.code) {
          setPassHintOtp(res.code);
        }
      } else {
        setPassError(res.error || 'Password saat ini salah atau terjadi kesalahan.');
      }
    } catch (err: any) {
      setPassError(err.message || 'Gagal meminta kode verifikasi.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleVerifyChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passVerificationCode || passVerificationCode.trim().length !== 6) {
      setPassError('Masukkan 6 digit kode OTP verifikasi.');
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
        setPassSuccess('Password berhasil diubah. Gunakan password baru Anda pada login berikutnya.');
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPasswordStep('form');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPassVerificationCode('');
          setPassSuccess(null);
          setPassHintOtp(null);
        }, 1500);
      } else {
        setPassError(res.error || 'Kode verifikasi salah atau kedaluwarsa.');
      }
    } catch (err: any) {
      setPassError(err.message || 'Gagal mengubah password.');
    } finally {
      setPassLoading(false);
    }
  };

  // 4. Email Request Code & Verify Flow
  const handleRequestEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      setEmailError('Format email baru tidak valid.');
      return;
    }

    try {
      setEmailLoading(true);
      setEmailError(null);
      setEmailHintOtp(null);
      const res = await requestVerificationCode('email', { newEmail: newEmail.trim() });
      if (res.success) {
        setEmailStep('verify');
        setEmailSuccess(res.message || 'Kode verifikasi telah dikirim.');
        if (res.code) {
          setEmailHintOtp(res.code);
        }
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
    if (!emailVerificationCode || emailVerificationCode.trim().length !== 6) {
      setEmailError('Masukkan 6 digit kode OTP verifikasi.');
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
        setEmailSuccess('Email login berhasil diperbarui!');
        setTimeout(() => {
          setIsEmailModalOpen(false);
          setEmailStep('form');
          setNewEmail('');
          setEmailVerificationCode('');
          setEmailSuccess(null);
          setEmailHintOtp(null);
        }, 1500);
      } else {
        setEmailError(res.error || 'Kode verifikasi email salah atau kedaluwarsa.');
      }
    } catch (err: any) {
      setEmailError(err.message || 'Gagal mengubah email.');
    } finally {
      setEmailLoading(false);
    }
  };

  // 5. Developer User Management
  const openUserManagement = async () => {
    setIsUserMgmtOpen(true);
    setMgmtLoading(true);
    try {
      const res = await api.portal.users.getAll();
      if (res.success && res.data) {
        setUserList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch user list:', err);
    } finally {
      setMgmtLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRoleUser || !newAssignedRole) return;
    try {
      const res = await api.portal.users.updateRole(selectedRoleUser.id, newAssignedRole);
      if (res.success) {
        setSelectedRoleUser(null);
        openUserManagement();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah role.');
    }
  };

  const openEditUserModal = (targetUser: Member) => {
    setSelectedEditUser(targetUser);
    setEditUserFullName(targetUser.full_name || '');
    setEditUserNickname(targetUser.nickname || '');
    setEditUserEmail(targetUser.email || '');
    setEditUserPhone(targetUser.phone || '');
    setEditUserBirthPlace(targetUser.birth_place || '');
    setEditUserBirthDate(targetUser.birth_date || '');
    setEditUserRole(targetUser.role || 'Siswa');
    setEditUserAttendance(targetUser.attendance_number ?? '');
  };

  const handleSaveDeveloperUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditUser) return;
    try {
      setSavingUserEdit(true);
      const res = await api.portal.users.updateUser(selectedEditUser.id, {
        full_name: editUserFullName.trim(),
        nickname: editUserNickname.trim() || undefined,
        email: editUserEmail.trim() || undefined,
        phone: editUserPhone.trim() || undefined,
        birth_place: editUserBirthPlace.trim() || undefined,
        birth_date: editUserBirthDate || undefined,
        role: editUserRole.trim(),
        attendance_number: editUserAttendance !== '' ? Number(editUserAttendance) : undefined,
      });

      if (res.success) {
        setSelectedEditUser(null);
        openUserManagement();
      } else {
        alert(res.message || 'Gagal menyimpan perubahan.');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui data anggota.');
    } finally {
      setSavingUserEdit(false);
    }
  };

  const filteredUsers = userList.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.nickname && u.nickname.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      String(u.attendance_number || '').includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>
      {/* Status Alert Banner if any */}
      {profileMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.85rem 1rem',
            borderRadius: '14px',
            backgroundColor: profileMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${profileMsg.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
            color: profileMsg.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
            fontSize: '0.825rem',
            fontWeight: 600,
          }}
        >
          {profileMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{profileMsg.text}</span>
        </div>
      )}

      {/* 1. Profile Avatar & Identity Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          padding: '1.5rem',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border-color)',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', width: 92, height: 92, margin: '0 auto 1rem auto' }}>
          <img
            src={photoSrc}
            alt={member.full_name}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = getDefaultAvatar(isDark);
            }}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid var(--primary-600)',
              backgroundColor: 'var(--bg-surface)',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.18)',
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: 'var(--primary-600)',
              color: '#ffffff',
              border: '2px solid var(--bg-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--shadow-md)',
              transition: 'transform 0.15s ease',
            }}
            title={uploadingPhoto ? 'Mengunggah...' : 'Ganti Foto Profil'}
          >
            {uploadingPhoto ? <RefreshCw size={14} className="animate-spin" /> : <Camera size={15} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoUpload}
          />
        </div>

        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.2rem 0' }}>
          {member.full_name}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.725rem',
              fontWeight: 800,
              color: 'var(--primary-600)',
              backgroundColor: 'var(--primary-50)',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
            }}
          >
            <ShieldCheck size={12} />
            {member.role || 'Siswa'}
          </span>
          {member.attendance_number && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              • Absen #{member.attendance_number}
            </span>
          )}
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
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
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            {t.portal.profile.personalInfo}
          </h3>
          <button
            onClick={() => setIsEditingInfo(!isEditingInfo)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-600)',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Edit2 size={13} />
            <span>{isEditingInfo ? 'Batal' : t.portal.profile.editProfile}</span>
          </button>
        </div>

        {isEditingInfo ? (
          <form onSubmit={handleSaveInfo} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                NAMA LENGKAP
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                NAMA PANGGILAN (NICKNAME)
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Contoh: Fairuz"
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  TEMPAT LAHIR
                </label>
                <input
                  type="text"
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  placeholder="Kota kelahiran"
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  TANGGAL LAHIR
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                NOMOR TELEPON / WA
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+628123456789"
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
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
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {savingInfo ? 'Menyimpan...' : t.portal.profile.saveChanges}
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Nama Lengkap</span>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{member.full_name}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Nama Panggilan</span>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{member.nickname || '-'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Kelahiran</span>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                {member.birth_place ? `${member.birth_place}, ` : ''}{member.birth_date || '-'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Nomor Telepon</span>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{member.phone || '-'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Role / Jabatan</span>
              <span style={{ fontWeight: 800, color: 'var(--primary-600)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                {member.role || 'Siswa'}
                <span title="Role hanya dapat diubah oleh Developer" style={{ fontSize: '0.75rem' }}>🔒</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Account & Security Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border-color)',
        }}
      >
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.85rem' }}>
          Akun & Keamanan
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {/* Change Password Button */}
          <button
            onClick={() => {
              setIsPasswordModalOpen(true);
              setPasswordStep('form');
              setPassError(null);
              setPassSuccess(null);
              setPassHintOtp(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '10px',
                  backgroundColor: 'var(--primary-50)',
                  color: 'var(--primary-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{t.portal.profile.changePassword}</div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Amankan akun dengan verifikasi OTP</div>
              </div>
            </div>
            <KeyRound size={16} color="var(--primary-600)" />
          </button>

          {/* Change Email Button */}
          <button
            onClick={() => {
              setIsEmailModalOpen(true);
              setEmailStep('form');
              setEmailError(null);
              setEmailSuccess(null);
              setEmailHintOtp(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '10px',
                  backgroundColor: 'var(--primary-50)',
                  color: 'var(--primary-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Mail size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{t.portal.profile.changeEmail}</div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Ganti email login dengan verifikasi OTP</div>
              </div>
            </div>
            <Mail size={16} color="var(--primary-600)" />
          </button>
        </div>
      </div>

      {/* 4. Developer User Management Section */}
      {isDeveloper && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '20px',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
            border: '1.5px solid var(--primary-600)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '10px',
                  backgroundColor: 'var(--primary-50)',
                  color: 'var(--primary-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserCog size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Manajemen Anggota Kelas
                </h3>
                <div style={{ fontSize: '0.725rem', color: 'var(--primary-600)', fontWeight: 700 }}>
                  Fitur Khusus Developer
                </div>
              </div>
            </div>

            <button
              onClick={openUserManagement}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '10px',
                backgroundColor: 'var(--primary-600)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Buka Panel
            </button>
          </div>
          <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
            Sebagai Developer, Anda dapat mengelola seluruh data siswa dan guru, mengatur role/jabatan, serta memodifikasi profil kelas secara terpusat.
          </p>
        </div>
      )}

      {/* Logout Action */}
      <button
        onClick={logout}
        style={{
          width: '100%',
          padding: '0.85rem',
          borderRadius: '14px',
          border: '1px solid var(--danger-border)',
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger-text)',
          fontWeight: 800,
          fontSize: '0.85rem',
          cursor: 'pointer',
          marginTop: '0.5rem',
          transition: 'all 0.15s ease',
        }}
      >
        {t.portal.logout}
      </button>

      {/* ========================================================= */}
      {/* CHANGE PASSWORD MODAL WITH 6-DIGIT OTP                    */}
      {/* ========================================================= */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={t.portal.security.changePasswordTitle}
        size="sm"
      >
        {passError && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '10px',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{passError}</span>
          </div>
        )}

        {passSuccess && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '10px',
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success-text)',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <CheckCircle size={16} />
            <span>{passSuccess}</span>
          </div>
        )}

        {passHintOtp && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '10px',
              backgroundColor: 'var(--primary-50)',
              border: '1px solid var(--primary-200)',
              color: 'var(--primary-700)',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              textAlign: 'center',
            }}
          >
            Kode OTP Verifikasi Anda:{' '}
            <strong style={{ letterSpacing: '0.15em', fontSize: '1rem' }}>{passHintOtp}</strong>
          </div>
        )}

        {passwordStep === 'form' ? (
          <form onSubmit={handleRequestPasswordCode} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {t.portal.security.currentPassword}
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Masukkan password saat ini"
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {t.portal.security.newPassword}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {t.portal.security.confirmNewPassword}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
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
              {passLoading ? 'Memeriksa & Mengirim OTP...' : t.portal.security.sendCode}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
              Masukkan 6 digit kode OTP yang telah dikirim ke email akun Anda untuk mengonfirmasi perubahan password.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {t.portal.security.enterCode}
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={passVerificationCode}
                onChange={(e) => setPassVerificationCode(e.target.value)}
                placeholder="123456"
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '2px solid var(--primary-600)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
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
              {passLoading ? 'Memverifikasi...' : t.portal.security.verifyAndSavePassword}
            </button>
          </form>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* CHANGE EMAIL MODAL WITH 6-DIGIT OTP                       */}
      {/* ========================================================= */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title={t.portal.security.changeEmailTitle}
        size="sm"
      >
        {emailError && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '10px',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{emailError}</span>
          </div>
        )}

        {emailSuccess && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '10px',
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success-text)',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <CheckCircle size={16} />
            <span>{emailSuccess}</span>
          </div>
        )}

        {emailHintOtp && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '10px',
              backgroundColor: 'var(--primary-50)',
              border: '1px solid var(--primary-200)',
              color: 'var(--primary-700)',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              textAlign: 'center',
            }}
          >
            Kode OTP Verifikasi Anda:{' '}
            <strong style={{ letterSpacing: '0.15em', fontSize: '1rem' }}>{emailHintOtp}</strong>
          </div>
        )}

        {emailStep === 'form' ? (
          <form onSubmit={handleRequestEmailCode} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {t.portal.security.newEmail}
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nama@email.com"
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
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
              {emailLoading ? 'Mengirim kode OTP...' : t.portal.security.sendCode}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyChangeEmail} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
              {t.portal.security.codeSentNotice}
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {t.portal.security.enterCode}
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={emailVerificationCode}
                onChange={(e) => setEmailVerificationCode(e.target.value)}
                placeholder="123456"
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '2px solid var(--primary-600)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
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
      {/* DEVELOPER USER MANAGEMENT MAIN MODAL                      */}
      {/* ========================================================= */}
      <Modal
        isOpen={isUserMgmtOpen}
        onClose={() => {
          setIsUserMgmtOpen(false);
          setSelectedRoleUser(null);
          setSelectedEditUser(null);
        }}
        title="Manajemen Anggota (Developer)"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
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
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Cari berdasarkan nama, absen, role, email..."
              className="form-input"
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem 0.6rem 2.25rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-main)',
                fontSize: '0.825rem',
              }}
            />
          </div>

          {mgmtLoading ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Memuat data anggota...
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.55rem',
                maxHeight: '380px',
                overflowY: 'auto',
              }}
            >
              {filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Tidak ada anggota yang cocok dengan pencarian.
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, paddingRight: '0.5rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {u.attendance_number ? `#${u.attendance_number} ` : ''}{u.full_name}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        {u.email} • <span style={{ color: 'var(--primary-600)', fontWeight: 700 }}>{u.role || 'Siswa'}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                      <button
                        onClick={() => openEditUserModal(u)}
                        style={{
                          padding: '0.35rem 0.6rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Edit Data
                      </button>

                      <button
                        onClick={() => {
                          setSelectedRoleUser(u);
                          setNewAssignedRole(u.role || 'Siswa');
                        }}
                        style={{
                          padding: '0.35rem 0.6rem',
                          borderRadius: '8px',
                          border: '1px solid var(--primary-600)',
                          backgroundColor: 'var(--primary-50)',
                          color: 'var(--primary-600)',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Role
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* DEVELOPER QUICK ROLE CHANGE MODAL                         */}
      {/* ========================================================= */}
      {selectedRoleUser && (
        <Modal
          isOpen={Boolean(selectedRoleUser)}
          onClose={() => setSelectedRoleUser(null)}
          title="Ubah Role Anggota"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0 }}>
              Ubah role untuk: <strong style={{ color: 'var(--text-main)' }}>{selectedRoleUser.full_name}</strong>
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                PILIH ROLE BARU:
              </label>
              <select
                value={newAssignedRole}
                onChange={(e) => setNewAssignedRole(e.target.value)}
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="Ketua Kelas">Ketua Kelas</option>
                <option value="Wakil Ketua">Wakil Ketua</option>
                <option value="Sekretaris">Sekretaris</option>
                <option value="Bendahara">Bendahara</option>
                <option value="Siswa">Siswa</option>
                <option value="Developer">Developer</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
              <button
                onClick={() => setSelectedRoleUser(null)}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
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
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Simpan Role
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* DEVELOPER EDIT MEMBER DATA MODAL                          */}
      {/* ========================================================= */}
      {selectedEditUser && (
        <Modal
          isOpen={Boolean(selectedEditUser)}
          onClose={() => setSelectedEditUser(null)}
          title={`Edit Data: ${selectedEditUser.full_name}`}
          size="md"
        >
          <form onSubmit={handleSaveDeveloperUserEdit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                NAMA LENGKAP
              </label>
              <input
                type="text"
                required
                value={editUserFullName}
                onChange={(e) => setEditUserFullName(e.target.value)}
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  NICKNAME
                </label>
                <input
                  type="text"
                  value={editUserNickname}
                  onChange={(e) => setEditUserNickname(e.target.value)}
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  NOMOR ABSEN
                </label>
                <input
                  type="number"
                  value={editUserAttendance}
                  onChange={(e) => setEditUserAttendance(e.target.value)}
                  placeholder="Contoh: 1"
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  EMAIL
                </label>
                <input
                  type="email"
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  NOMOR TELEPON
                </label>
                <input
                  type="text"
                  value={editUserPhone}
                  onChange={(e) => setEditUserPhone(e.target.value)}
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  TEMPAT LAHIR
                </label>
                <input
                  type="text"
                  value={editUserBirthPlace}
                  onChange={(e) => setEditUserBirthPlace(e.target.value)}
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  TANGGAL LAHIR
                </label>
                <input
                  type="date"
                  value={editUserBirthDate}
                  onChange={(e) => setEditUserBirthDate(e.target.value)}
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                ROLE / JABATAN
              </label>
              <select
                value={editUserRole}
                onChange={(e) => setEditUserRole(e.target.value)}
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="Ketua Kelas">Ketua Kelas</option>
                <option value="Wakil Ketua">Wakil Ketua</option>
                <option value="Sekretaris">Sekretaris</option>
                <option value="Bendahara">Bendahara</option>
                <option value="Siswa">Siswa</option>
                <option value="Developer">Developer</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
              <button
                type="button"
                onClick={() => setSelectedEditUser(null)}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingUserEdit}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: 'var(--primary-600)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: savingUserEdit ? 'not-allowed' : 'pointer',
                }}
              >
                {savingUserEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
