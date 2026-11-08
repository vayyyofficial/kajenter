import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Lock,
  Mail,
  Camera,
  ShieldCheck,
  Edit2,
  CheckCircle,
  AlertCircle,
  KeyRound,
  RotateCcw,
  Plus,
  Eye,
  EyeOff,
  PlayCircle,
  Trash2,
  Music,
  Code2,
  Play,
  Pause,
  Upload,
} from 'lucide-react';
import { useMemberAuth } from '../../context/MemberAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import { MemberStory } from '../../types';
import { getMemberPhotoUrl, getDefaultAvatar } from '../../utils/avatar';
import { Modal } from '../common/Modal';
import { StoryViewerModal } from '../members/StoryViewerModal';
import { useRealtimeSync } from '../../context/SyncContext';
import { STORY_MUSIC_PRESETS } from '../../config/storyMusicPresets';

export const PortalProfileTab: React.FC = () => {
  const {
    member,
    updateProfile,
    changePassword,
    logout,
  } = useMemberAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const isDeveloper = Boolean(
    member?.permissions?.isDeveloper ||
    member?.role?.toLowerCase() === 'developer'
  );

  // Form states for personal details
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [fullName, setFullName] = useState(member?.full_name || '');
  const [nickname, setNickname] = useState(member?.nickname || '');
  const [birthPlace, setBirthPlace] = useState(member?.birth_place || '');
  const [birthDate, setBirthDate] = useState(member?.birth_date || '');
  const [phone, setPhone] = useState(member?.phone || '');
  const [savingInfo, setSavingInfo] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile Picture modal & upload state
  const [isChangePhotoModalOpen, setIsChangePhotoModalOpen] = useState(false);
  const [selectedPPFile, setSelectedPPFile] = useState<File | null>(null);
  const [selectedPPPreview, setSelectedPPPreview] = useState<string | null>(null);
  const [ppUploadError, setPpUploadError] = useState<string | null>(null);
  const [uploadingPP, setUploadingPP] = useState(false);
  const [resettingPP, setResettingPP] = useState(false);

  // My Stories states
  const [myStories, setMyStories] = useState<MemberStory[]>([]);
  const [, setStoriesLoading] = useState(false);
  const [activeStoryCount, setActiveStoryCount] = useState(0);

  // Story Music states
  const [selectedMusicPreset, setSelectedMusicPreset] = useState<string>('');
  const [storyMusicTitle, setStoryMusicTitle] = useState('');
  const [storyMusicArtist, setStoryMusicArtist] = useState('');
  const [storyMusicUrl, setStoryMusicUrl] = useState('');
  const [isPreviewingStoryAudio, setIsPreviewingStoryAudio] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Add Story modal states
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState<string | null>(null);
  const [storyExpirationType, setStoryExpirationType] = useState<'24h' | 'custom' | 'lifetime'>('24h');
  const [storyCustomDate, setStoryCustomDate] = useState<string>('');
  const [storyCaption, setStoryCaption] = useState<string>('');
  const [savingStory, setSavingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);

  // Delete Story modal state
  const [storyToDelete, setStoryToDelete] = useState<MemberStory | null>(null);
  const [deletingStory, setDeletingStory] = useState(false);

  // View Story modal state
  const [viewingStoryIdx, setViewingStoryIdx] = useState<number | null>(null);

  // Change password states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

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

  const loadMyStories = useCallback(async () => {
    try {
      setStoriesLoading(true);
      const res = await api.portal.stories.getMyStories();
      if (res.success) {
        setMyStories(res.data || []);
        setActiveStoryCount(res.activeCount || 0);
      }
    } catch (err: any) {
      console.error('Failed to load my stories:', err);
    } finally {
      setStoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyStories();
  }, [loadMyStories]);

  useRealtimeSync(['stories'], loadMyStories);

  // Helper to stop auditioning story backsound audio
  const stopPreviewAudio = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current.src = '';
    }
    setIsPreviewingStoryAudio(false);
  }, []);

  const handleTogglePreviewStoryAudio = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!storyMusicUrl) return;

    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
    }

    const audio = previewAudioRef.current;
    if (isPreviewingStoryAudio) {
      audio.pause();
      setIsPreviewingStoryAudio(false);
    } else {
      audio.pause();
      audio.src = storyMusicUrl;
      audio.volume = 0.45;
      audio.onended = () => setIsPreviewingStoryAudio(false);
      audio.onerror = () => setIsPreviewingStoryAudio(false);
      audio
        .play()
        .then(() => setIsPreviewingStoryAudio(true))
        .catch(() => setIsPreviewingStoryAudio(false));
    }
  };

  // 1. Camera Click Handler - All logged-in students can change their own PP
  const handleCameraClick = () => {
    setPpUploadError(null);
    setSelectedPPFile(null);
    setSelectedPPPreview(null);
    setIsChangePhotoModalOpen(true);
  };

  const handleSelectPPFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setPpUploadError('Format file tidak didukung. Harap pilih gambar bertipe JPG, PNG, atau WebP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPpUploadError('Ukuran file maksimal 5MB. Silakan pilih foto dengan resolusi lebih kecil.');
      return;
    }

    setSelectedPPFile(file);
    setPpUploadError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedPPPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfilePhoto = async () => {
    if (!selectedPPFile) {
      setPpUploadError('Pilih foto terlebih dahulu sebelum menyimpan.');
      return;
    }

    try {
      setUploadingPP(true);
      setPpUploadError(null);
      setProfileMsg(null);

      const uploadRes = await api.upload.image(selectedPPFile);
      if (uploadRes.success && uploadRes.data?.url) {
        const updateRes = await updateProfile({
          photo_number: uploadRes.data.url,
        });

        if (updateRes.success) {
          setIsChangePhotoModalOpen(false);
          setSelectedPPFile(null);
          setSelectedPPPreview(null);
          setProfileMsg({
            type: 'success',
            text: 'Foto profil berhasil diperbarui dan disinkronkan ke seluruh sistem.',
          });
        } else {
          setPpUploadError(updateRes.error || 'Gagal memperbarui foto profil.');
        }
      } else {
        setPpUploadError(uploadRes.message || 'Gagal mengunggah foto ke storage.');
      }
    } catch (err: any) {
      setPpUploadError(err.message || 'Terjadi kesalahan saat mengunggah foto.');
    } finally {
      setUploadingPP(false);
    }
  };

  const handleResetToDefaultPhoto = async () => {
    try {
      setResettingPP(true);
      setPpUploadError(null);
      setProfileMsg(null);

      const updateRes = await updateProfile({
        photo_number: '',
      });

      if (updateRes.success) {
        setIsChangePhotoModalOpen(false);
        setSelectedPPFile(null);
        setSelectedPPPreview(null);
        setProfileMsg({
          type: 'success',
          text: 'Foto profil berhasil dikembalikan ke avatar outline default.',
        });
      } else {
        setPpUploadError(updateRes.error || 'Gagal mereset foto profil.');
      }
    } catch (err: any) {
      setPpUploadError(err.message || 'Terjadi kesalahan saat mereset foto.');
    } finally {
      setResettingPP(false);
    }
  };

  // Story Handlers
  const handleOpenAddStory = () => {
    if (activeStoryCount >= 5) {
      alert('Batas maksimal 5 Story aktif telah tercapai. Hapus salah satu Story Anda untuk menambahkan Story baru.');
      return;
    }
    stopPreviewAudio();
    setStoryFile(null);
    setStoryPreview(null);
    setStoryCaption('');
    setSelectedMusicPreset('');
    setStoryMusicTitle('');
    setStoryMusicArtist('');
    setStoryMusicUrl('');
    setStoryExpirationType('24h');
    setStoryCustomDate('');
    setStoryError(null);
    setIsAddStoryModalOpen(true);
  };

  const handleStoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStoryError('File harus berupa gambar (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStoryError('Ukuran file maksimal 10MB.');
      return;
    }

    setStoryFile(file);
    setStoryError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setStoryPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePublishStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyFile) {
      setStoryError('Pilih file gambar untuk Story.');
      return;
    }

    if (storyExpirationType === 'custom' && !storyCustomDate) {
      setStoryError('Tentukan tanggal & jam kedaluwarsa untuk opsi kustom.');
      return;
    }

    try {
      setSavingStory(true);
      setStoryError(null);

      const formData = new FormData();
      formData.append('image', storyFile);
      formData.append('caption', storyCaption.trim());
      formData.append('expiration_type', storyExpirationType);
      if (storyExpirationType === 'custom' && storyCustomDate) {
        formData.append('expires_at', new Date(storyCustomDate).toISOString());
      }
      if (storyMusicTitle.trim()) {
        formData.append('music_title', storyMusicTitle.trim());
      }
      if (storyMusicArtist.trim()) {
        formData.append('music_artist', storyMusicArtist.trim());
      }
      if (storyMusicUrl.trim()) {
        formData.append('music_url', storyMusicUrl.trim());
      }

      const res = await api.portal.stories.create(formData);
      if (res.success) {
        setIsAddStoryModalOpen(false);
        loadMyStories();
        setProfileMsg({
          type: 'success',
          text: 'Story baru berhasil dipublikasikan.',
        });
      } else {
        setStoryError((res as any).error || res.message || 'Gagal mempublikasikan story.');
      }
    } catch (err: any) {
      setStoryError(err.message || 'Terjadi kesalahan saat mengunggah story.');
    } finally {
      setSavingStory(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!storyToDelete) return;
    try {
      setDeletingStory(true);
      const res = await api.portal.stories.delete(storyToDelete.id);
      if (res.success) {
        setStoryToDelete(null);
        loadMyStories();
        setProfileMsg({
          type: 'success',
          text: 'Story berhasil dihapus.',
        });
      } else {
        alert(res.message || 'Gagal menghapus story.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menghapus story.');
    } finally {
      setDeletingStory(false);
    }
  };

  // Save personal details
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

  // Change Password
  const handleSubmitChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassError('Semua kolom password wajib diisi.');
      return;
    }
    if (newPassword.length < 6) {
      setPassError('Password baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Konfirmasi password baru tidak cocok.');
      return;
    }

    try {
      setPassLoading(true);
      setPassError(null);
      setPassSuccess(null);
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        setPassSuccess(res.message || 'Password berhasil diubah. Gunakan password baru Anda pada login berikutnya.');
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPassSuccess(null);
        }, 1600);
      } else {
        setPassError(res.error || 'Password saat ini yang Anda masukkan salah.');
      }
    } catch (err: any) {
      setPassError(err.message || 'Gagal mengubah password.');
    } finally {
      setPassLoading(false);
    }
  };

  const { src: avatarSrc } = getMemberPhotoUrl(member || {});
  const fallbackAvatar = getDefaultAvatar(theme === 'dark');
  const roleName = member?.role || (member?.member_type === 'guru' ? 'Guru' : 'Siswa');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', paddingBottom: '3.5rem' }}>
      {/* Status Alert Banner */}
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
          {profileMsg.type === 'success' ? <CheckCircle size={17} /> : <AlertCircle size={17} />}
          <span>{profileMsg.text}</span>
        </div>
      )}

      {/* Developer Hub Fast Shortcut for Developers */}
      {isDeveloper && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Code2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Developer Hub
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                Seluruh tools developer (Status, Anggota, Moderasi Story, Activity Console) tersedia di tab [Dev].
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '0.2rem 0.6rem',
              borderRadius: '20px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              color: 'var(--primary-600)',
            }}
          >
            Tab [Dev] Aktif
          </span>
        </div>
      )}

      {/* 1. Profile Information Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Avatar Container with Camera Badge */}
          <div style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid var(--border-color)',
                boxShadow: 'var(--shadow-md)',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              <img
                src={avatarSrc}
                alt={member?.full_name || 'Profile'}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = fallbackAvatar;
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: uploadingPP ? 0.5 : 1,
                }}
              />
            </div>

            <button
              onClick={handleCameraClick}
              disabled={uploadingPP}
              type="button"
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: 'var(--primary-600, #dc2626)',
                color: '#ffffff',
                border: '2px solid var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 0.15s ease',
              }}
              title="Ganti Foto Profil"
            >
              <Camera size={14} />
            </button>
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                {member?.full_name || 'Anggota Kelas'}
              </h2>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  backgroundColor: 'var(--primary-50)',
                  color: 'var(--primary-600)',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-color)',
                  textTransform: 'uppercase',
                }}
              >
                <ShieldCheck size={12} />
                {roleName}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
              {member?.attendance_number && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Absen #{member.attendance_number}
                </span>
              )}
              {member?.nickname && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Panggilan: <strong>{member.nickname}</strong>
                </span>
              )}
            </div>

            {member?.photo_number && (
              <button
                onClick={() => setIsChangePhotoModalOpen(true)}
                type="button"
                style={{
                  marginTop: '0.5rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <RotateCcw size={12} />
                <span>Ubah / Reset ke Avatar Default</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Edit Form */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Data Pribadi
            </span>
            {!isEditingInfo && (
              <button
                onClick={() => setIsEditingInfo(true)}
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-600)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0.2rem 0.4rem',
                }}
              >
                <Edit2 size={13} />
                <span>Ubah</span>
              </button>
            )}
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
                  NAMA PANGGILAN
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    TEMPAT LAHIR
                  </label>
                  <input
                    type="text"
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
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

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditingInfo(false)}
                  disabled={savingInfo}
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingInfo}
                  className="btn btn-primary btn-sm"
                >
                  {savingInfo ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)' }}>TEMPAT, TGL LAHIR</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                  {member?.birth_place ? `${member.birth_place}, ` : ''}{member?.birth_date ? new Date(member.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                </div>
              </div>

              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)' }}>NOMOR TELEPON</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                  {member?.phone || '-'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. My Stories Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlayCircle size={18} color="var(--primary-600)" strokeWidth={2.5} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              My Stories
            </h3>
            <span
              style={{
                fontSize: '0.725rem',
                fontWeight: 800,
                padding: '0.15rem 0.55rem',
                borderRadius: '6px',
                backgroundColor: activeStoryCount >= 5 ? 'var(--danger-bg)' : 'var(--primary-50)',
                color: activeStoryCount >= 5 ? 'var(--danger-main)' : 'var(--primary-600)',
                border: '1px solid var(--border-color)',
              }}
            >
              Aktif: {activeStoryCount}/5
            </span>
          </div>

          <button
            onClick={handleOpenAddStory}
            disabled={activeStoryCount >= 5}
            type="button"
            className="btn btn-primary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 800,
              opacity: activeStoryCount >= 5 ? 0.6 : 1,
            }}
          >
            <Plus size={14} />
            <span>Tambah Story</span>
          </button>
        </div>

        {myStories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>
              Anda belum memiliki Story aktif saat ini.
            </p>
            <button
              onClick={handleOpenAddStory}
              type="button"
              className="btn btn-primary btn-sm"
              style={{ fontSize: '0.75rem' }}
            >
              Mulai Buat Story
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {myStories.map((story, idx) => {
              const isExpired = story.expires_at ? new Date(story.expires_at).getTime() < Date.now() : false;
              const expLabel = story.expiration_type === 'lifetime'
                ? 'Selamanya'
                : story.expiration_type === 'custom'
                ? 'Kustom'
                : '24 Jam';

              return (
                <div
                  key={story.id}
                  style={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{ position: 'relative', height: '160px', backgroundColor: '#000000', cursor: 'pointer' }}
                    onClick={() => setViewingStoryIdx(idx)}
                  >
                    <img
                      src={story.media_url}
                      alt="Story"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isExpired ? 0.6 : 1 }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '0.35rem',
                        left: '0.35rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: isExpired ? 'rgba(107, 114, 128, 0.85)' : 'rgba(0, 0, 0, 0.7)',
                        backdropFilter: 'blur(4px)',
                        color: '#ffffff',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                      }}
                    >
                      {isExpired ? 'Expired' : expLabel}
                    </div>
                  </div>

                  {/* Caption & Controls */}
                  <div style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                    <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {story.caption || 'Foto Story'}
                      </div>
                      {(story.music?.title || story.music_title) && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', color: 'var(--primary-600)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Music size={10} />
                          <span>♫ {story.music?.title || story.music_title}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setStoryToDelete(story)}
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--danger-main, #ef4444)',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                      }}
                      title="Hapus Story"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
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
              setPassError(null);
              setPassSuccess(null);
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
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
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Perbarui kata sandi akun Anda</div>
              </div>
            </div>
            <KeyRound size={16} color="var(--primary-600)" />
          </button>

          {/* Email Info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
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
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{member?.email || 'Email Anggota'}</div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Email login resmi X ICP TKJ</div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.675rem',
                fontWeight: 700,
                padding: '0.2rem 0.55rem',
                borderRadius: '9999px',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                border: '1px solid var(--border-color)',
              }}
            >
              Terdaftar
            </span>
          </div>
        </div>
      </div>

      {/* Logout Action */}
      <button
        onClick={logout}
        style={{
          width: '100%',
          padding: '0.85rem',
          borderRadius: '14px',
          border: '1px solid var(--danger-border, rgba(239, 68, 68, 0.2))',
          backgroundColor: 'var(--danger-bg, rgba(239, 68, 68, 0.08))',
          color: 'var(--danger-main, #ef4444)',
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
      {/* PERSONAL MODALS                                           */}
      {/* ========================================================= */}

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPassError(null);
          setPassSuccess(null);
        }}
        title="Ubah Password Akun"
        size="sm"
      >
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '1rem', marginTop: 0 }}>
          Masukkan password akun Anda saat ini untuk verifikasi, lalu tentukan password baru yang aman.
        </p>

        {passError && (
          <div style={{ padding: '0.75rem', borderRadius: '10px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertCircle size={16} />
            <span>{passError}</span>
          </div>
        )}

        {passSuccess && (
          <div style={{ padding: '0.75rem', borderRadius: '10px', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle size={16} />
            <span>{passSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSubmitChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Password Saat Ini
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrentPass ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Masukkan password saat ini"
                className="form-input"
                style={{ width: '100%', padding: '0.7rem 2.4rem 0.7rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
              >
                {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Password Baru
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPass ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="form-input"
                style={{ width: '100%', padding: '0.7rem 2.4rem 0.7rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
              >
                {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Konfirmasi Password Baru
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPass ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="form-input"
                style={{ width: '100%', padding: '0.7rem 2.4rem 0.7rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
              >
                {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={passLoading}
            className="btn btn-primary"
            style={{ marginTop: '0.4rem', padding: '0.75rem', borderRadius: '12px', fontWeight: 800 }}
          >
            {passLoading ? 'Menyimpan Password...' : 'Perbarui Password'}
          </button>
        </form>
      </Modal>

      {/* Add Story Modal */}
      {isAddStoryModalOpen && (
        <Modal
          isOpen={isAddStoryModalOpen}
          onClose={() => !savingStory && setIsAddStoryModalOpen(false)}
          title="Tambah Story Baru"
          size="md"
        >
          <form onSubmit={handlePublishStory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {storyError && (
              <div style={{ padding: '0.65rem 0.85rem', borderRadius: '10px', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={15} />
                <span>{storyError}</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                PILIH FOTO STORY (MAKS. 10MB)
              </label>
              {storyPreview ? (
                <div style={{ position: 'relative', width: '100%', maxHeight: '260px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000000', textAlign: 'center' }}>
                  <img src={storyPreview} alt="Preview" style={{ maxHeight: '260px', width: '100%', objectFit: 'contain' }} />
                  <button
                    type="button"
                    onClick={() => {
                      setStoryFile(null);
                      setStoryPreview(null);
                    }}
                    style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', padding: '0.3rem 0.65rem', borderRadius: '6px', backgroundColor: 'rgba(0, 0, 0, 0.7)', color: '#ffffff', border: 'none', fontSize: '0.725rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Ganti Foto
                  </button>
                </div>
              ) : (
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', border: '2px dashed var(--border-color)', borderRadius: '12px', cursor: 'pointer', backgroundColor: 'var(--bg-subtle)' }}>
                  <Camera size={32} color="var(--primary-600)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.5rem' }}>
                    Klik untuk memilih foto dari perangkat
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Mendukung JPG, PNG, WebP (Rasio potret/9:16 disarankan)
                  </span>
                  <input type="file" accept="image/*" onChange={handleStoryFileChange} style={{ display: 'none' }} />
                </label>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                CAPTION (OPSIONAL)
              </label>
              <textarea
                rows={2}
                maxLength={200}
                placeholder="Tulis caption singkat..."
                value={storyCaption}
                onChange={(e) => setStoryCaption(e.target.value)}
                className="form-input"
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>

            {/* Music Input with Presets & Real Working Audio */}
            <div style={{ padding: '0.85rem', borderRadius: '12px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Music size={15} color="var(--primary-600)" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    MUSIK / BACKSOUND (OPSIONAL)
                  </span>
                </div>
                {storyMusicUrl && (
                  <button
                    type="button"
                    onClick={handleTogglePreviewStoryAudio}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '8px',
                      border: '1px solid var(--primary-600)',
                      backgroundColor: isPreviewingStoryAudio ? 'var(--primary-600)' : 'var(--primary-50)',
                      color: isPreviewingStoryAudio ? '#ffffff' : 'var(--primary-600)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isPreviewingStoryAudio ? <Pause size={11} /> : <Play size={11} />}
                    <span>{isPreviewingStoryAudio ? 'Jeda Suara' : 'Dengar Preview'}</span>
                  </button>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  Pilih Backsound
                </label>
                <select
                  value={selectedMusicPreset}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedMusicPreset(val);
                    stopPreviewAudio();
                    if (!val) {
                      setStoryMusicTitle('');
                      setStoryMusicArtist('');
                      setStoryMusicUrl('');
                    } else if (val === 'custom') {
                      setStoryMusicTitle('');
                      setStoryMusicArtist('');
                      setStoryMusicUrl('');
                    } else {
                      const preset = STORY_MUSIC_PRESETS.find((p) => p.id === val);
                      if (preset) {
                        setStoryMusicTitle(preset.title);
                        setStoryMusicArtist(preset.artist);
                        setStoryMusicUrl(preset.url);
                      }
                    }
                  }}
                  className="form-input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                >
                  <option value="">-- Tanpa Backsound --</option>
                  {STORY_MUSIC_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      ♫ {preset.title} — {preset.artist} ({preset.genre})
                    </option>
                  ))}
                  <option value="custom">Kustom: Masukkan Link Audio Sendiri (.mp3 / .wav / .ogg)</option>
                </select>
              </div>

              {selectedMusicPreset === 'custom' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                        Judul Lagu
                      </label>
                      <input
                        type="text"
                        maxLength={100}
                        placeholder="Contoh: A Sky Full of Stars"
                        value={storyMusicTitle}
                        onChange={(e) => setStoryMusicTitle(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                        Nama Artis / Penyanyi
                      </label>
                      <input
                        type="text"
                        maxLength={100}
                        placeholder="Contoh: Coldplay"
                        value={storyMusicArtist}
                        onChange={(e) => setStoryMusicArtist(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      Direct Link Audio (HTTPS format .mp3 / .wav / .ogg)
                    </label>
                    <input
                      type="url"
                      placeholder="https://... (Direct audio link)"
                      value={storyMusicUrl}
                      onChange={(e) => {
                        setStoryMusicUrl(e.target.value);
                        stopPreviewAudio();
                      }}
                      className="form-input"
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                    />
                  </div>
                </>
              )}

              {storyMusicTitle && storyMusicArtist && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.725rem', fontWeight: 700, color: 'var(--primary-600)', backgroundColor: 'var(--primary-50)', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', alignSelf: 'flex-start' }}>
                  <Music size={12} />
                  <span>♫ {storyMusicTitle} — {storyMusicArtist}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                disabled={savingStory}
                onClick={() => setIsAddStoryModalOpen(false)}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingStory || !storyFile}
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
              >
                {savingStory ? 'Mempublikasikan...' : 'Publikasikan Story'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Story Modal */}
      {storyToDelete && (
        <Modal
          isOpen={Boolean(storyToDelete)}
          onClose={() => !deletingStory && setStoryToDelete(null)}
          title="Hapus Story"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0 }}>
              Apakah Anda yakin ingin menghapus Story ini? Story yang dihapus tidak akan ditampilkan lagi di Website Kelas.
            </p>

            <div style={{ width: '100%', height: '140px', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#000000', textAlign: 'center' }}>
              <img src={storyToDelete.media_url} alt="To delete" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                disabled={deletingStory}
                onClick={() => setStoryToDelete(null)}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingStory}
                onClick={handleDeleteStory}
                className="btn btn-danger btn-sm"
                style={{ flex: 1 }}
              >
                {deletingStory ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Viewer for Own Stories */}
      {viewingStoryIdx !== null && member && (
        <StoryViewerModal
          member={member}
          stories={myStories}
          isOpen={viewingStoryIdx !== null}
          onClose={() => setViewingStoryIdx(null)}
        />
      )}

      {/* Ganti Foto Profil Modal - Enabled for ALL logged-in students */}
      {isChangePhotoModalOpen && (
        <Modal
          isOpen={isChangePhotoModalOpen}
          onClose={() => {
            if (!uploadingPP && !resettingPP) {
              setIsChangePhotoModalOpen(false);
              setSelectedPPFile(null);
              setSelectedPPPreview(null);
              setPpUploadError(null);
            }
          }}
          title="Ganti Foto Profil"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {ppUploadError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  backgroundColor: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger-text)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{ppUploadError}</span>
              </div>
            )}

            {/* Current vs New Photo Preview */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1.25rem',
                borderRadius: '16px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '3px solid var(--primary-600, #dc2626)',
                  boxShadow: 'var(--shadow-md)',
                  backgroundColor: 'var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={selectedPPPreview || avatarSrc}
                  alt={member?.full_name || 'Preview'}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = fallbackAvatar;
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {selectedPPPreview ? 'Pratinjau Foto Baru' : 'Foto Profil Saat Ini'}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {selectedPPPreview
                    ? selectedPPFile?.name
                    : member?.photo_number
                    ? 'Foto kustom tersimpan'
                    : 'Avatar outline default'}
                </div>
              </div>
            </div>

            {/* File Upload Selector */}
            <div>
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.5rem 1rem',
                  border: '2px dashed var(--border-color)',
                  borderRadius: '14px',
                  cursor: uploadingPP || resettingPP ? 'not-allowed' : 'pointer',
                  backgroundColor: 'var(--bg-surface)',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                }}
              >
                <Upload size={28} color="var(--primary-600)" />
                <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.5rem' }}>
                  {selectedPPFile ? 'Ganti Foto Pilihan' : 'Klik untuk memilih foto dari perangkat'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Format: JPG, PNG, WebP • Maksimal 5MB
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleSelectPPFile}
                  disabled={uploadingPP || resettingPP}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Actions: Save, Reset to Default, Cancel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangePhotoModalOpen(false);
                    setSelectedPPFile(null);
                    setSelectedPPPreview(null);
                    setPpUploadError(null);
                  }}
                  disabled={uploadingPP || resettingPP}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleSaveProfilePhoto}
                  disabled={uploadingPP || resettingPP || !selectedPPFile}
                  className="btn btn-primary btn-sm"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                >
                  {uploadingPP ? 'Mengunggah...' : 'Simpan Foto'}
                </button>
              </div>

              {/* Reset to Default Outline Vector Avatar */}
              {member?.photo_number && (
                <button
                  type="button"
                  onClick={handleResetToDefaultPhoto}
                  disabled={uploadingPP || resettingPP}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '0.55rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <RotateCcw size={13} />
                  <span>{resettingPP ? 'Mereset...' : 'Kembalikan ke Avatar Default'}</span>
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
