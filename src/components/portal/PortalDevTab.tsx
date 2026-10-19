import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Wrench,
  Power,
  Users,
  Film,
  Activity,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  KeyRound,
  RefreshCw,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Camera,
  Music,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useMemberAuth } from '../../context/MemberAuthContext';
import { useRealtimeSync } from '../../context/SyncContext';
import { api } from '../../services/api';
import { Member, MemberStory } from '../../types';
import { getMemberPhotoUrl, getDefaultAvatar } from '../../utils/avatar';
import { Modal } from '../common/Modal';
import { StoryViewerModal } from '../members/StoryViewerModal';
import { PortalActivityConsole } from './PortalActivityConsole';

type DevSection = 'all' | 'maintenance' | 'members' | 'stories' | 'console';

export const PortalDevTab: React.FC = () => {
  const { member } = useMemberAuth();
  const isDeveloper = Boolean(
    member?.permissions?.isDeveloper ||
    member?.role?.toLowerCase() === 'developer'
  );

  const [activeSection, setActiveSection] = useState<DevSection>('all');
  const [hubMsg, setHubMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // =========================================================
  // 1. MAINTENANCE MODE STATE & HANDLERS
  // =========================================================
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [isConfirmMaintenanceOpen, setIsConfirmMaintenanceOpen] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState<string | null>(null);

  const fetchMaintenance = useCallback(async () => {
    try {
      setLoadingMaintenance(true);
      const res = await api.portal.maintenance.getStatus();
      if (res && res.success) {
        setMaintenanceEnabled(Boolean(res.maintenance));
      }
    } catch (e) {
      console.error('Failed to get maintenance status:', e);
    } finally {
      setLoadingMaintenance(false);
    }
  }, []);

  const handleToggleMaintenance = async () => {
    try {
      setTogglingMaintenance(true);
      setMaintenanceMsg(null);
      const nextState = !maintenanceEnabled;
      const res = await api.portal.maintenance.toggle(nextState);
      if (res.success) {
        setMaintenanceEnabled(nextState);
        setIsConfirmMaintenanceOpen(false);
        setMaintenanceMsg(res.message);
        setTimeout(() => setMaintenanceMsg(null), 5000);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status pemeliharaan.');
    } finally {
      setTogglingMaintenance(false);
    }
  };

  // =========================================================
  // 2. MEMBER MANAGEMENT STATE & HANDLERS
  // =========================================================
  const [userList, setUserList] = useState<Member[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [mgmtLoading, setMgmtLoading] = useState(false);

  // Edit Member Modal
  const [selectedEditUser, setSelectedEditUser] = useState<Member | null>(null);
  const [editUserFullName, setEditUserFullName] = useState('');
  const [editUserNickname, setEditUserNickname] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserBirthPlace, setEditUserBirthPlace] = useState('');
  const [editUserBirthDate, setEditUserBirthDate] = useState('');
  const [editUserRole, setEditUserRole] = useState('Siswa');
  const [editUserAttendance, setEditUserAttendance] = useState<number | string>('');
  const [editUserPhotoNumber, setEditUserPhotoNumber] = useState<string | null>(null);
  const [uploadingUserPhoto, setUploadingUserPhoto] = useState(false);
  const editUserFileInputRef = useRef<HTMLInputElement>(null);
  const [savingUserEdit, setSavingUserEdit] = useState(false);

  // Quick Role Change Modal
  const [selectedRoleUser, setSelectedRoleUser] = useState<Member | null>(null);
  const [newAssignedRole, setNewAssignedRole] = useState('');
  const [savingRole, setSavingRole] = useState(false);

  // Add Member Modal
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newMemberFullName, setNewMemberFullName] = useState('');
  const [newMemberNickname, setNewMemberNickname] = useState('');
  const [newMemberAttendance, setNewMemberAttendance] = useState<string>('01');
  const [newMemberRole, setNewMemberRole] = useState('Siswa');
  const [newMemberType, setNewMemberType] = useState<'siswa' | 'guru'>('siswa');
  const [newMemberBirthPlace, setNewMemberBirthPlace] = useState('Malang');
  const [newMemberBirthDate, setNewMemberBirthDate] = useState('2008-01-01');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  // Developer Member Password Change
  const [selectedPasswordUser, setSelectedPasswordUser] = useState<Member | null>(null);
  const [devNewPassword, setDevNewPassword] = useState('');
  const [devConfirmPassword, setDevConfirmPassword] = useState('');
  const [savingDevPass, setSavingDevPass] = useState(false);
  const [devPassError, setDevPassError] = useState<string | null>(null);

  const fetchUserList = useCallback(async () => {
    try {
      setMgmtLoading(true);
      const res = await api.portal.users.getAll();
      if (res.success && res.data) {
        setUserList(res.data);
      }
    } catch (err) {
      console.error('Failed to load user list:', err);
    } finally {
      setMgmtLoading(false);
    }
  }, []);

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
    setEditUserPhotoNumber(targetUser.photo_number || null);
  };

  const handleEditUserPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingUserPhoto(true);
      const res = await api.upload.image(file);
      if (res.success && res.data?.url) {
        setEditUserPhotoNumber(res.data.url);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengunggah foto profil.');
    } finally {
      setUploadingUserPhoto(false);
      if (editUserFileInputRef.current) editUserFileInputRef.current.value = '';
    }
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
        photo_number: editUserPhotoNumber !== null ? editUserPhotoNumber : undefined,
      });

      if (res.success) {
        setSelectedEditUser(null);
        fetchUserList();
        setHubMsg({ type: 'success', text: `Data ${editUserFullName} berhasil diperbarui.` });
        setTimeout(() => setHubMsg(null), 4000);
      } else {
        alert(res.message || 'Gagal menyimpan perubahan.');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui data anggota.');
    } finally {
      setSavingUserEdit(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRoleUser || !newAssignedRole) return;
    try {
      setSavingRole(true);
      const res = await api.portal.users.updateRole(selectedRoleUser.id, newAssignedRole);
      if (res.success) {
        setSelectedRoleUser(null);
        fetchUserList();
        setHubMsg({ type: 'success', text: `Role ${selectedRoleUser.full_name} diubah menjadi ${newAssignedRole}.` });
        setTimeout(() => setHubMsg(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah role.');
    } finally {
      setSavingRole(false);
    }
  };

  const handleOpenAddUserModal = () => {
    const studentUsers = userList.filter((u) => u.member_type === 'siswa');
    const nextAbsen = studentUsers.length > 0
      ? Math.max(...studentUsers.map((s) => Number(s.attendance_number) || 0)) + 1
      : 1;
    const padAbsen = String(nextAbsen).padStart(2, '0');
    setNewMemberAttendance(padAbsen);
    setNewMemberFullName('');
    setNewMemberNickname('');
    setNewMemberBirthPlace('Malang');
    setNewMemberBirthDate('2008-01-01');
    setNewMemberEmail(`absen${padAbsen}@icptkj35.local`);
    setNewMemberRole('Siswa');
    setNewMemberType('siswa');
    setNewMemberPhone('');
    setAddMemberError(null);
    setIsAddUserModalOpen(true);
  };

  const handleSaveNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberFullName.trim()) {
      setAddMemberError('Nama lengkap anggota wajib diisi.');
      return;
    }
    try {
      setAddingMember(true);
      setAddMemberError(null);
      const res = await api.members.create({
        fullName: newMemberFullName.trim(),
        nickname: newMemberNickname.trim() || undefined,
        birthPlace: newMemberBirthPlace.trim() || 'Malang',
        birthDate: newMemberBirthDate || undefined,
        email: newMemberEmail.trim() || undefined,
        role: newMemberRole.trim(),
        memberType: newMemberType,
        attendanceNumber: newMemberType === 'siswa' ? String(newMemberAttendance) : undefined,
        phone: newMemberPhone.trim() || undefined,
      });

      if (res.success) {
        setIsAddUserModalOpen(false);
        fetchUserList();
        setHubMsg({ type: 'success', text: `Anggota baru ${newMemberFullName} berhasil ditambahkan.` });
        setTimeout(() => setHubMsg(null), 4000);
      } else {
        setAddMemberError((res as any).error || (res as any).message || 'Gagal menambahkan anggota.');
      }
    } catch (err: any) {
      setAddMemberError(err.message || 'Gagal menambahkan anggota.');
    } finally {
      setAddingMember(false);
    }
  };

  const handleOpenDevPasswordModal = (u: Member) => {
    setSelectedPasswordUser(u);
    let def = 'icptkj35_01';
    if (u.attendance_number) {
      def = `icptkj35_${String(u.attendance_number).padStart(2, '0')}`;
    } else if (u.member_type === 'guru') {
      def = 'icptkj35_guru';
    }
    setDevNewPassword(def);
    setDevConfirmPassword(def);
    setDevPassError(null);
  };

  const handleSaveDevPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPasswordUser) return;
    if (!devNewPassword || devNewPassword.length < 6) {
      setDevPassError('Password baru minimal 6 karakter.');
      return;
    }
    if (devNewPassword !== devConfirmPassword) {
      setDevPassError('Konfirmasi password tidak cocok.');
      return;
    }
    try {
      setSavingDevPass(true);
      setDevPassError(null);
      const res = await api.portal.users.updatePassword(selectedPasswordUser.id, devNewPassword);
      if (res.success) {
        setHubMsg({ type: 'success', text: `Password untuk ${selectedPasswordUser.full_name} berhasil diubah.` });
        setTimeout(() => setHubMsg(null), 4000);
        setSelectedPasswordUser(null);
      } else {
        setDevPassError(res.message || 'Gagal mengubah password anggota.');
      }
    } catch (err: any) {
      setDevPassError(err.message || 'Gagal mengubah password anggota.');
    } finally {
      setSavingDevPass(false);
    }
  };

  // =========================================================
  // 3. STORY MODERATION STATE & HANDLERS
  // =========================================================
  const [allStories, setAllStories] = useState<MemberStory[]>([]);
  const [loadingAllStories, setLoadingAllStories] = useState(false);
  const [manageStorySearch, setManageStorySearch] = useState('');
  const [previewManageStory, setPreviewManageStory] = useState<MemberStory | null>(null);
  const [storyToModerateEdit, setStoryToModerateEdit] = useState<MemberStory | null>(null);
  const [editStoryCaption, setEditStoryCaption] = useState('');
  const [editStoryExpirationType, setEditStoryExpirationType] = useState<'24h' | 'custom' | 'lifetime'>('24h');
  const [editStoryCustomDate, setEditStoryCustomDate] = useState('');
  const [editMusicTitle, setEditMusicTitle] = useState('');
  const [editMusicArtist, setEditMusicArtist] = useState('');
  const [editMusicUrl, setEditMusicUrl] = useState('');
  const [editRemoveMusic, setEditRemoveMusic] = useState(false);
  const [savingStoryEdit, setSavingStoryEdit] = useState(false);
  const [editStoryError, setEditStoryError] = useState<string | null>(null);
  const [storyToModerateDelete, setStoryToModerateDelete] = useState<MemberStory | null>(null);
  const [moderateDeleting, setModerateDeleting] = useState(false);

  const loadAllStories = useCallback(async () => {
    try {
      setLoadingAllStories(true);
      const res = await api.portal.stories.getAllManage();
      if (res.success) {
        setAllStories(res.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load all stories:', err);
    } finally {
      setLoadingAllStories(false);
    }
  }, []);

  const handleOpenEditStory = (st: MemberStory) => {
    setStoryToModerateEdit(st);
    setEditStoryCaption(st.caption || '');
    setEditStoryExpirationType(st.expiration_type || '24h');
    if (st.expiration_type === 'custom' && st.expires_at) {
      const dt = new Date(st.expires_at);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const hh = String(dt.getHours()).padStart(2, '0');
      const min = String(dt.getMinutes()).padStart(2, '0');
      setEditStoryCustomDate(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
    } else {
      setEditStoryCustomDate('');
    }
    const musicInfo = st.music || {
      title: st.music_title || '',
      artist: st.music_artist || '',
      url: st.music_url || '',
    };
    setEditMusicTitle(musicInfo.title || '');
    setEditMusicArtist(musicInfo.artist || '');
    setEditMusicUrl(musicInfo.url || '');
    setEditRemoveMusic(false);
    setEditStoryError(null);
  };

  const handleSaveEditStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyToModerateEdit) return;
    try {
      setSavingStoryEdit(true);
      setEditStoryError(null);
      const res = await api.portal.stories.update(storyToModerateEdit.id, {
        caption: editStoryCaption.trim() || null,
        music_title: editRemoveMusic ? null : (editMusicTitle.trim() || null),
        music_artist: editRemoveMusic ? null : (editMusicArtist.trim() || null),
        music_url: editRemoveMusic ? null : (editMusicUrl.trim() || null),
        remove_music: editRemoveMusic,
        expiration_type: editStoryExpirationType,
        expires_at: editStoryExpirationType === 'custom' && editStoryCustomDate ? new Date(editStoryCustomDate).toISOString() : undefined,
      });
      if (res.success) {
        setStoryToModerateEdit(null);
        loadAllStories();
        setHubMsg({ type: 'success', text: 'Story berhasil diperbarui dan disinkronkan.' });
        setTimeout(() => setHubMsg(null), 4000);
      } else {
        setEditStoryError(res.message || 'Gagal memperbarui story.');
      }
    } catch (err: any) {
      setEditStoryError(err.message || 'Gagal memperbarui story.');
    } finally {
      setSavingStoryEdit(false);
    }
  };

  const handleDeleteStoryAdmin = async () => {
    if (!storyToModerateDelete) return;
    try {
      setModerateDeleting(true);
      const res = await api.portal.stories.delete(storyToModerateDelete.id);
      if (res.success) {
        setStoryToModerateDelete(null);
        loadAllStories();
        setHubMsg({ type: 'success', text: 'Story berhasil dihapus oleh Developer.' });
        setTimeout(() => setHubMsg(null), 4000);
      } else {
        alert(res.message || 'Gagal menghapus story.');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus story.');
    } finally {
      setModerateDeleting(false);
    }
  };

  // Initial load & real-time synchronization
  useEffect(() => {
    if (isDeveloper) {
      fetchMaintenance();
      fetchUserList();
      loadAllStories();
    }
  }, [isDeveloper, fetchMaintenance, fetchUserList, loadAllStories]);

  useRealtimeSync(['settings', 'members', 'stories'], () => {
    if (isDeveloper) {
      fetchMaintenance();
      fetchUserList();
      loadAllStories();
    }
  });

  if (!isDeveloper) {
    return (
      <div
        style={{
          padding: '3rem 1.5rem',
          textAlign: 'center',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          maxWidth: '500px',
          margin: '2rem auto',
        }}
      >
        <ShieldAlert size={48} color="var(--danger-main, #ef4444)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem' }}>
          Akses Ditolak
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Developer Hub hanya dapat diakses oleh anggota dengan peran Developer.
        </p>
      </div>
    );
  }

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

  const filteredManageStories = allStories.filter((s) => {
    const q = manageStorySearch.toLowerCase();
    return (
      !q ||
      (s.member_name && s.member_name.toLowerCase().includes(q)) ||
      (s.caption && s.caption.toLowerCase().includes(q)) ||
      (s.member_role && s.member_role.toLowerCase().includes(q)) ||
      (s.music_title && s.music_title.toLowerCase().includes(q)) ||
      (s.music_artist && s.music_artist.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', paddingBottom: '3.5rem' }}>
      {/* 1. Header Banner & Status */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-600)',
              }}
            >
              <Wrench size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
                  Developer Hub
                </h2>
                <span
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: 800,
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '20px',
                    textTransform: 'uppercase',
                  }}
                >
                  Supreme Access
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0', lineHeight: 1.4 }}>
                Pusat kontrol internal sistem, manajemen anggota, moderasi story, dan monitoring log aktivitas.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-subtle)',
                padding: '0.3rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontWeight: 600,
              }}
            >
              Timezone: WIB (UTC+7)
            </span>
          </div>
        </div>

        {/* Section Navigation Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            overflowX: 'auto',
            paddingBottom: '0.2rem',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '0.75rem',
          }}
        >
          {[
            { id: 'all', label: 'Semua Fitur', icon: ShieldCheck },
            { id: 'maintenance', label: 'Status & Maintenance', icon: Power },
            { id: 'members', label: 'Manajemen Anggota', icon: Users, badge: userList.length },
            { id: 'stories', label: 'Moderasi Story', icon: Film, badge: allStories.length },
            { id: 'console', label: 'Activity Console', icon: Activity },
          ].map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id as DevSection)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '10px',
                  border: isActive ? '1px solid var(--primary-600)' : '1px solid var(--border-color)',
                  backgroundColor: isActive ? 'var(--primary-600)' : 'var(--bg-subtle)',
                  color: isActive ? '#ffffff' : 'var(--text-main)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} />
                <span>{sec.label}</span>
                {sec.badge !== undefined && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '0.05rem 0.4rem',
                      borderRadius: '9999px',
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-card)',
                      color: isActive ? '#ffffff' : 'var(--text-muted)',
                    }}
                  >
                    {sec.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Hub Feedback Message */}
      {hubMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            backgroundColor: hubMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${hubMsg.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
            color: hubMsg.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          {hubMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{hubMsg.text}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 1: STATUS PORTAL & MAINTENANCE MODE               */}
      {/* ========================================================= */}
      {(activeSection === 'all' || activeSection === 'maintenance') && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  backgroundColor: maintenanceEnabled ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  border: `1px solid ${maintenanceEnabled ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: maintenanceEnabled ? '#ef4444' : '#10b981',
                }}
              >
                <Power size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Portal Kelas Status
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: maintenanceEnabled ? '#ef4444' : '#10b981',
                      display: 'inline-block',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: maintenanceEnabled ? '#ef4444' : '#10b981',
                    }}
                  >
                    {maintenanceEnabled ? '● Maintenance Mode' : '● Online'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (maintenanceEnabled) {
                  handleToggleMaintenance();
                } else {
                  setIsConfirmMaintenanceOpen(true);
                }
              }}
              disabled={togglingMaintenance || loadingMaintenance}
              className={`btn btn-sm ${maintenanceEnabled ? 'btn-secondary' : 'btn-danger'}`}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: '10px',
              }}
            >
              <Power size={14} />
              <span>{maintenanceEnabled ? 'Disable Maintenance' : 'Enable Maintenance'}</span>
            </button>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
            {maintenanceEnabled
              ? 'Mode pemeliharaan sedang AKTIF. Anggota biasa tidak dapat mengakses Portal Kelas. Anda sebagai Developer tetap memiliki akses penuh.'
              : 'Portal Kelas beroperasi normal. Mengaktifkan mode pemeliharaan akan menampilkan halaman pemeliharaan pada anggota biasa.'}
          </p>

          {maintenanceMsg && (
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              {maintenanceMsg}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: MANAJEMEN ANGGOTA                              */}
      {/* ========================================================= */}
      {(activeSection === 'all' || activeSection === 'members') && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary-600)',
                }}
              >
                <Users size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Manajemen Anggota ({userList.length})
                </h3>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  Kelola data profil, foto PP, peran (role), dan reset password anggota.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAddUserModal}
              className="btn btn-primary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.55rem 0.95rem',
                borderRadius: '10px',
                fontSize: '0.775rem',
                fontWeight: 800,
              }}
            >
              <Plus size={15} />
              <span>Tambah Anggota</span>
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', width: '100%' }}>
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
              placeholder="Cari nama, absen, role, email..."
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

          {/* Member List */}
          {mgmtLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Memuat data anggota...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Tidak ada anggota yang cocok dengan pencarian.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '0.75rem',
                maxHeight: activeSection === 'members' ? 'none' : '450px',
                overflowY: activeSection === 'members' ? 'visible' : 'auto',
                paddingRight: '0.2rem',
              }}
            >
              {filteredUsers.map((u) => {
                const { src: avatarSrc } = getMemberPhotoUrl(u);
                const roleColorMap: Record<string, { bg: string; color: string; border: string }> = {
                  developer: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.25)' },
                  ketua: { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: 'rgba(234, 179, 8, 0.25)' },
                  wakil: { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: 'rgba(234, 179, 8, 0.25)' },
                  sekretaris: { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.25)' },
                  bendahara: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'rgba(16, 185, 129, 0.25)' },
                  siswa: { bg: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-muted)', border: 'var(--border-color)' },
                };
                const rStyle = roleColorMap[u.role?.toLowerCase() || 'siswa'] || roleColorMap.siswa;

                return (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                      padding: '0.85rem',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <img
                        src={avatarSrc}
                        alt={u.full_name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = getDefaultAvatar();
                        }}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid var(--border-color)',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.attendance_number ? `#${u.attendance_number} ` : ''}{u.full_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '0.1rem 0.45rem',
                              borderRadius: '6px',
                              backgroundColor: rStyle.bg,
                              color: rStyle.color,
                              border: `1px solid ${rStyle.border}`,
                              textTransform: 'uppercase',
                            }}
                          >
                            {u.role || 'Siswa'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.email}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.55rem' }}>
                      <button
                        type="button"
                        onClick={() => openEditUserModal(u)}
                        style={{
                          flex: 1,
                          padding: '0.4rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <Edit2 size={12} />
                        <span>Edit Data / PP</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoleUser(u);
                          setNewAssignedRole(u.role || 'Siswa');
                        }}
                        style={{
                          padding: '0.4rem 0.65rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem',
                        }}
                        title="Ubah Role"
                      >
                        <ShieldCheck size={12} />
                        <span>Role</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDevPasswordModal(u)}
                        style={{
                          padding: '0.4rem 0.65rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem',
                        }}
                        title="Reset / Ganti Password"
                      >
                        <KeyRound size={12} />
                        <span>Password</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 3: MODERASI STORY ANGGOTA                         */}
      {/* ========================================================= */}
      {(activeSection === 'all' || activeSection === 'stories') && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary-600)',
                }}
              >
                <Film size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Moderasi Story Anggota ({allStories.length})
                </h3>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  Pantau, sunting caption/musik, atau hapus Story yang tidak pantas.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={loadAllStories}
              disabled={loadingAllStories}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
              }}
            >
              <RefreshCw size={13} className={loadingAllStories ? 'animate-spin' : ''} />
              <span>Segarkan</span>
            </button>
          </div>

          {/* Search Story */}
          <div style={{ position: 'relative', width: '100%' }}>
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
              value={manageStorySearch}
              onChange={(e) => setManageStorySearch(e.target.value)}
              placeholder="Cari berdasarkan nama anggota, caption, musik, role..."
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

          {/* Stories Grid */}
          {loadingAllStories ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Memuat data story...
            </div>
          ) : filteredManageStories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Tidak ada story yang ditemukan.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '0.85rem',
              }}
            >
              {filteredManageStories.map((st) => {
                const isExp = st.expires_at ? new Date(st.expires_at).getTime() < Date.now() : false;
                const uploadDate = new Date(st.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={st.id}
                    style={{
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-subtle)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Media Thumbnail */}
                    <div
                      style={{
                        position: 'relative',
                        height: '140px',
                        backgroundColor: '#000000',
                        cursor: 'pointer',
                        overflow: 'hidden',
                      }}
                      onClick={() => setPreviewManageStory(st)}
                    >
                      <img
                        src={st.media_url}
                        alt="Story"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          opacity: isExp ? 0.6 : 1,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '0.45rem',
                          left: '0.45rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          backgroundColor: isExp ? 'rgba(107, 114, 128, 0.85)' : 'rgba(0, 0, 0, 0.75)',
                          color: '#ffffff',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        {isExp ? 'Expired' : st.expiration_type || '24h'}
                      </div>
                    </div>

                    {/* Story Details */}
                    <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {st.member_name}
                        </span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                          {st.member_role}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                        Upload: {uploadDate}
                      </div>

                      {st.caption && (
                        <div
                          style={{
                            fontSize: '0.725rem',
                            color: 'var(--text-main)',
                            backgroundColor: 'var(--bg-card)',
                            padding: '0.35rem 0.55rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            lineHeight: 1.35,
                            maxHeight: '44px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          "{st.caption}"
                        </div>
                      )}

                      {/* Music Badge */}
                      {(st.music?.title || st.music_title) && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.675rem',
                            color: 'var(--primary-600)',
                            backgroundColor: 'rgba(59, 130, 246, 0.08)',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            alignSelf: 'flex-start',
                            fontWeight: 600,
                          }}
                        >
                          <Music size={11} />
                          <span>♫ {st.music?.title || st.music_title} {st.music?.artist || st.music_artist ? `— ${st.music?.artist || st.music_artist}` : ''}</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ marginTop: 'auto', paddingTop: '0.45rem', display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => setPreviewManageStory(st)}
                          style={{
                            flex: 1,
                            padding: '0.45rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-main)',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <Eye size={12} />
                          <span>Preview</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditStory(st)}
                          style={{
                            padding: '0.45rem 0.65rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-main)',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem',
                          }}
                          title="Edit Story"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setStoryToModerateDelete(st)}
                          style={{
                            padding: '0.45rem 0.65rem',
                            borderRadius: '8px',
                            border: '1px solid var(--danger-border, rgba(239, 68, 68, 0.2))',
                            backgroundColor: 'var(--danger-bg, rgba(239, 68, 68, 0.08))',
                            color: 'var(--danger-main, #ef4444)',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem',
                          }}
                          title="Hapus Story"
                        >
                          <Trash2 size={12} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 4: ACTIVITY CONSOLE (REAL-TIME WIB LOGS)          */}
      {/* ========================================================= */}
      {(activeSection === 'all' || activeSection === 'console') && (
        <PortalActivityConsole />
      )}

      {/* ========================================================= */}
      {/* MODALS SECTION                                            */}
      {/* ========================================================= */}

      {/* Maintenance Confirmation Modal */}
      {isConfirmMaintenanceOpen && (
        <Modal
          isOpen={isConfirmMaintenanceOpen}
          onClose={() => !togglingMaintenance && setIsConfirmMaintenanceOpen(false)}
          title="Aktifkan Maintenance Mode?"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                padding: '0.85rem',
                borderRadius: '12px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                Portal Kelas tidak akan dapat diakses oleh anggota selama maintenance. Halaman pemeliharaan akan ditampilkan pada siswa.
                <div style={{ marginTop: '0.35rem', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  Anda sebagai Developer tetap memiliki akses penuh untuk melakukan perbaikan.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsConfirmMaintenanceOpen(false)}
                disabled={togglingMaintenance}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleMaintenance}
                disabled={togglingMaintenance}
                className="btn btn-danger btn-sm"
              >
                {togglingMaintenance ? <RefreshCw size={14} className="animate-spin" /> : <Power size={14} />}
                <span>{togglingMaintenance ? 'Mengaktifkan...' : 'Aktifkan'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Member Modal */}
      {selectedEditUser && (
        <Modal
          isOpen={Boolean(selectedEditUser)}
          onClose={() => setSelectedEditUser(null)}
          title={`Edit Anggota: ${selectedEditUser.full_name}`}
          size="md"
        >
          <form onSubmit={handleSaveDeveloperUserEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Photo PP Upload */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <img
                src={editUserPhotoNumber || getDefaultAvatar()}
                alt={editUserFullName}
                style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => editUserFileInputRef.current?.click()}
                    disabled={uploadingUserPhoto}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <Camera size={13} />
                    <span>{uploadingUserPhoto ? 'Mengunggah...' : 'Ganti Foto'}</span>
                  </button>
                  {editUserPhotoNumber && (
                    <button
                      type="button"
                      onClick={() => setEditUserPhotoNumber('')}
                      className="btn btn-danger btn-sm"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <RotateCcw size={13} />
                      <span>Reset Foto</span>
                    </button>
                  )}
                </div>
                <input
                  ref={editUserFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleEditUserPhotoUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  NAMA LENGKAP
                </label>
                <input
                  type="text"
                  required
                  value={editUserFullName}
                  onChange={(e) => setEditUserFullName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  NAMA PANGGILAN
                </label>
                <input
                  type="text"
                  value={editUserNickname}
                  onChange={(e) => setEditUserNickname(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  ROLE
                </label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                >
                  <option value="Siswa">Siswa</option>
                  <option value="Ketua">Ketua</option>
                  <option value="Wakil">Wakil</option>
                  <option value="Sekretaris">Sekretaris</option>
                  <option value="Bendahara">Bendahara</option>
                  <option value="Developer">Developer</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  NOMOR ABSEN
                </label>
                <input
                  type="number"
                  value={editUserAttendance}
                  onChange={(e) => setEditUserAttendance(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  EMAIL
                </label>
                <input
                  type="email"
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  NOMOR TELEPON / WA
                </label>
                <input
                  type="text"
                  value={editUserPhone}
                  onChange={(e) => setEditUserPhone(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setSelectedEditUser(null)}
                disabled={savingUserEdit}
                className="btn btn-secondary btn-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingUserEdit}
                className="btn btn-primary btn-sm"
              >
                {savingUserEdit ? <RefreshCw size={14} className="animate-spin" /> : <Edit2 size={14} />}
                <span>{savingUserEdit ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Quick Role Change Modal */}
      {selectedRoleUser && (
        <Modal
          isOpen={Boolean(selectedRoleUser)}
          onClose={() => setSelectedRoleUser(null)}
          title={`Ubah Role: ${selectedRoleUser.full_name}`}
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                PILIH ROLE BARU
              </label>
              <select
                value={newAssignedRole}
                onChange={(e) => setNewAssignedRole(e.target.value)}
                className="form-input"
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              >
                <option value="Siswa">Siswa</option>
                <option value="Ketua">Ketua</option>
                <option value="Wakil">Wakil</option>
                <option value="Sekretaris">Sekretaris</option>
                <option value="Bendahara">Bendahara</option>
                <option value="Developer">Developer</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedRoleUser(null)}
                disabled={savingRole}
                className="btn btn-secondary btn-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUpdateRole}
                disabled={savingRole}
                className="btn btn-primary btn-sm"
              >
                {savingRole ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                <span>{savingRole ? 'Menyimpan...' : 'Simpan Role'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Member Modal */}
      {isAddUserModalOpen && (
        <Modal
          isOpen={isAddUserModalOpen}
          onClose={() => !addingMember && setIsAddUserModalOpen(false)}
          title="Tambah Anggota Baru"
          size="md"
        >
          <form onSubmit={handleSaveNewMember} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {addMemberError && (
              <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', fontSize: '0.8rem' }}>
                {addMemberError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  NAMA LENGKAP *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama lengkap..."
                  value={newMemberFullName}
                  onChange={(e) => setNewMemberFullName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  NAMA PANGGILAN
                </label>
                <input
                  type="text"
                  placeholder="Nama panggilan..."
                  value={newMemberNickname}
                  onChange={(e) => setNewMemberNickname(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  ROLE
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                >
                  <option value="Siswa">Siswa</option>
                  <option value="Ketua">Ketua</option>
                  <option value="Wakil">Wakil</option>
                  <option value="Sekretaris">Sekretaris</option>
                  <option value="Bendahara">Bendahara</option>
                  <option value="Developer">Developer</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  NOMOR ABSEN
                </label>
                <input
                  type="number"
                  value={newMemberAttendance}
                  onChange={(e) => setNewMemberAttendance(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  EMAIL
                </label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  NOMOR TELEPON / WA
                </label>
                <input
                  type="text"
                  placeholder="+628..."
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                disabled={addingMember}
                className="btn btn-secondary btn-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={addingMember}
                className="btn btn-primary btn-sm"
              >
                {addingMember ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>{addingMember ? 'Menambahkan...' : 'Tambah Anggota'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Member Password Change Modal */}
      {selectedPasswordUser && (
        <Modal
          isOpen={Boolean(selectedPasswordUser)}
          onClose={() => setSelectedPasswordUser(null)}
          title={`Ganti Password: ${selectedPasswordUser.full_name}`}
          size="sm"
        >
          <form onSubmit={handleSaveDevPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {devPassError && (
              <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', fontSize: '0.8rem' }}>
                {devPassError}
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  PASSWORD BARU
                </label>
                <button
                  type="button"
                  onClick={() => {
                    let def = 'icptkj35_01';
                    if (selectedPasswordUser.attendance_number) {
                      def = `icptkj35_${String(selectedPasswordUser.attendance_number).padStart(2, '0')}`;
                    } else if (selectedPasswordUser.member_type === 'guru') {
                      def = 'icptkj35_guru';
                    }
                    setDevNewPassword(def);
                    setDevConfirmPassword(def);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-600)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Gunakan Default (icptkj35_...)
                </button>
              </div>
              <input
                type="text"
                required
                value={devNewPassword}
                onChange={(e) => setDevNewPassword(e.target.value)}
                className="form-input"
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                KONFIRMASI PASSWORD BARU
              </label>
              <input
                type="text"
                required
                value={devConfirmPassword}
                onChange={(e) => setDevConfirmPassword(e.target.value)}
                className="form-input"
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setSelectedPasswordUser(null)}
                disabled={savingDevPass}
                className="btn btn-secondary btn-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingDevPass}
                className="btn btn-primary btn-sm"
              >
                {savingDevPass ? <RefreshCw size={14} className="animate-spin" /> : <KeyRound size={14} />}
                <span>{savingDevPass ? 'Menyimpan...' : 'Simpan Password'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Moderasi Story Modal */}
      {storyToModerateEdit && (
        <Modal
          isOpen={Boolean(storyToModerateEdit)}
          onClose={() => setStoryToModerateEdit(null)}
          title={`Moderasi Story: ${storyToModerateEdit.member_name}`}
          size="md"
        >
          <form onSubmit={handleSaveEditStory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {editStoryError && (
              <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', fontSize: '0.8rem' }}>
                {editStoryError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                CAPTION STORY
              </label>
              <textarea
                rows={3}
                maxLength={200}
                value={editStoryCaption}
                onChange={(e) => setEditStoryCaption(e.target.value)}
                placeholder="Tulis caption..."
                className="form-input"
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>

            {/* Moderasi Musik */}
            <div style={{ padding: '0.85rem', borderRadius: '12px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Music size={15} color="var(--primary-600)" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    INFORMASI MUSIK / BACKSOUND
                  </span>
                </div>
                {(editMusicTitle || editMusicArtist || (!editRemoveMusic && (storyToModerateEdit.music || storyToModerateEdit.music_title))) && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditMusicTitle('');
                      setEditMusicArtist('');
                      setEditMusicUrl('');
                      setEditRemoveMusic(true);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--danger-main, #ef4444)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Hapus Musik dari Story
                  </button>
                )}
              </div>

              {editRemoveMusic ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--danger-main, #ef4444)', fontWeight: 600 }}>
                  Musik akan dihapus dari Story ini saat disimpan.
                  <button
                    type="button"
                    onClick={() => setEditRemoveMusic(false)}
                    style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: 'var(--primary-600)', cursor: 'pointer', fontSize: '0.725rem', fontWeight: 700, textDecoration: 'underline' }}
                  >
                    Batalkan Hapus
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                        Judul Lagu
                      </label>
                      <input
                        type="text"
                        maxLength={100}
                        placeholder="Judul lagu..."
                        value={editMusicTitle}
                        onChange={(e) => setEditMusicTitle(e.target.value)}
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
                        placeholder="Nama artis..."
                        value={editMusicArtist}
                        onChange={(e) => setEditMusicArtist(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      Link Audio (Opsional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://... (Direct audio link)"
                      value={editMusicUrl}
                      onChange={(e) => setEditMusicUrl(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                    />
                  </div>
                </>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                MASA AKTIF STORY
              </label>
              <select
                value={editStoryExpirationType}
                onChange={(e) => setEditStoryExpirationType(e.target.value as any)}
                className="form-input"
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
              >
                <option value="24h">24 Jam (Standar)</option>
                <option value="custom">Kustom (Tentukan tanggal & jam)</option>
                <option value="lifetime">Selamanya (Tidak pernah kedaluwarsa)</option>
              </select>
            </div>

            {editStoryExpirationType === 'custom' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  TANGGAL & WAKTU KEDALUWARSA
                </label>
                <input
                  type="datetime-local"
                  required
                  value={editStoryCustomDate}
                  onChange={(e) => setEditStoryCustomDate(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setStoryToModerateEdit(null)}
                disabled={savingStoryEdit}
                className="btn btn-secondary btn-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingStoryEdit}
                className="btn btn-primary btn-sm"
              >
                {savingStoryEdit ? <RefreshCw size={14} className="animate-spin" /> : <Edit2 size={14} />}
                <span>{savingStoryEdit ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Story Confirmation Modal */}
      {storyToModerateDelete && (
        <Modal
          isOpen={Boolean(storyToModerateDelete)}
          onClose={() => !moderateDeleting && setStoryToModerateDelete(null)}
          title="Hapus Story Anggota?"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', backgroundColor: 'var(--danger-bg)', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--danger-border)' }}>
              <Trash2 size={20} color="var(--danger-main, #ef4444)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                Apakah Anda yakin ingin menghapus Story milik <strong>{storyToModerateDelete.member_name}</strong>? Tindakan ini bersifat permanen.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setStoryToModerateDelete(null)}
                disabled={moderateDeleting}
                className="btn btn-secondary btn-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteStoryAdmin}
                disabled={moderateDeleting}
                className="btn btn-danger btn-sm"
              >
                {moderateDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>{moderateDeleting ? 'Menghapus...' : 'Hapus Story'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Story Viewer Preview Modal */}
      {previewManageStory && (
        <StoryViewerModal
          member={((previewManageStory as any).members || {
            id: previewManageStory.member_id,
            full_name: previewManageStory.member_name,
            nickname: previewManageStory.member_nickname,
            role: previewManageStory.member_role,
            photo_number: previewManageStory.member_photo,
          }) as any}
          isOpen={Boolean(previewManageStory)}
          onClose={() => setPreviewManageStory(null)}
          stories={[previewManageStory]}
        />
      )}
    </div>
  );
};
