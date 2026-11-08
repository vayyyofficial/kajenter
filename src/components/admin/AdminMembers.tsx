import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, User, Upload, RotateCcw, Loader2 } from 'lucide-react';
import { Member } from '../../types';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useNotifications } from '../../context/NotificationContext';
import { useRealtimeSync } from '../../context/SyncContext';
import { dataCache } from '../../services/dataCache';
import { getMemberPhotoUrl, getDefaultAvatar } from '../../utils/avatar';
import { useLanguage } from '../../context/LanguageContext';

export const AdminMembers: React.FC = () => {
  const { t, language } = useLanguage();
  const { addToast } = useNotifications();
  const [guruList, setGuruList] = useState<Member[]>([]);
  const [siswaList, setSiswaList] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    nickname: '',
    birthPlace: '',
    birthDate: '',
    email: '',
    memberType: 'siswa' as 'guru' | 'siswa',
    attendanceNumber: '01',
    role: 'Siswa',
    phone: '',
    customPhotoNumber: '',
  });

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.members.getAll();
      if (res.success) {
        setGuruList(res.data.guru);
        setSiswaList(res.data.siswa);
      }
    } catch (err: any) {
      addToast('error', err.message || (language === 'en' ? 'Failed to load members.' : 'Gagal memuat anggota.'));
    } finally {
      setLoading(false);
    }
  }, [addToast, language]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Real-time synchronization: automatically updates when member changes on any device
  useRealtimeSync(['members'], () => {
    fetchMembers();
  });

  const handleOpenAdd = () => {
    setEditingMember(null);
    const nextAbsen = siswaList.length > 0
      ? Math.max(...siswaList.map((s) => s.attendance_number || 0)) + 1
      : 1;

    setFormData({
      fullName: '',
      nickname: '',
      birthPlace: 'Malang', // Default untuk anggota baru: Malang (Sesuai Aturan #8)
      birthDate: '2008-01-01',
      email: '',
      memberType: 'siswa',
      attendanceNumber: String(nextAbsen),
      role: 'Siswa',
      phone: '+62812345678',
      customPhotoNumber: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      fullName: member.full_name,
      nickname: member.nickname || '',
      birthPlace: member.birth_place || '',
      birthDate: member.birth_date || '',
      email: member.email || '',
      memberType: member.member_type,
      attendanceNumber: member.attendance_number ? String(member.attendance_number) : '',
      role: member.role,
      phone: member.phone || '',
      customPhotoNumber: member.photo_number || '',
    });
    setIsModalOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('error', language === 'en' ? 'File must be an image (JPG, PNG, WebP).' : 'File harus berupa gambar (JPG, PNG, WebP).');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const res = await api.upload.image(file);
      if (res.success && res.data?.url) {
        setFormData((prev) => ({ ...prev, customPhotoNumber: res.data.url }));
        addToast('success', language === 'en' ? 'Profile picture uploaded to storage server!' : 'Foto profil berhasil di-upload ke storage server!');
      }
    } catch (err: any) {
      addToast('error', err.message || (language === 'en' ? 'Failed to upload photo.' : 'Gagal meng-upload foto profil.'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.role) {
      addToast('error', language === 'en' ? 'Full name and role are required.' : 'Nama lengkap dan role wajib diisi.');
      return;
    }

    try {
      if (editingMember) {
        await api.members.update(editingMember.id, formData);
        addToast('success', language === 'en' ? 'Member data updated.' : 'Data anggota berhasil diperbarui.');
      } else {
        await api.members.create(formData);
        addToast('success', language === 'en' ? 'New member added.' : 'Anggota baru berhasil ditambahkan.');
      }
      dataCache.invalidate('members');
      setIsModalOpen(false);
      fetchMembers();
    } catch (err: any) {
      addToast('error', err.message || (language === 'en' ? 'Failed to save member.' : 'Gagal menyimpan anggota.'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await api.members.delete(deleteId);
      dataCache.invalidate('members');
      addToast('success', language === 'en' ? 'Member deleted.' : 'Anggota berhasil dihapus.');
      setDeleteId(null);
      fetchMembers();
    } catch (err: any) {
      addToast('error', err.message || (language === 'en' ? 'Failed to delete member.' : 'Gagal menghapus anggota.'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Preview path based on custom upload or default vector avatar
  const previewPhotoSrc = formData.customPhotoNumber
    ? (formData.customPhotoNumber.startsWith('/') || formData.customPhotoNumber.startsWith('http')
        ? formData.customPhotoNumber
        : `/foto-anggota/${formData.customPhotoNumber}.jpg`)
    : getDefaultAvatar();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {language === 'en' ? 'Manage Class Members & Teachers' : 'Kelola Anggota Kelas & Guru'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            {language === 'en' ? 'Profile management, class roles, and automated attendance mapping' : 'Manajemen profil, role pengurus kelas, dan mapping foto absen otomatis'}
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>{t.admin.addMemberBtn}</span>
        </button>
      </div>

      {loading && guruList.length === 0 && siswaList.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', flexDirection: 'column', gap: '0.75rem', padding: '3rem' }}>
          <Loader2 size={32} className="spin" color="var(--primary-600)" />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t.common.loading}</span>
        </div>
      ) : (
        <>
          {/* Guru Section */}
          <div className="card" style={{ boxShadow: 'var(--shadow-md)' }}>
            <div className="card-header" style={{ padding: '1.25rem 1.5rem' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {t.admin.teachersListTitle.replace('{count}', String(guruList.length))}
              </h4>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>{t.admin.colPhoto}</th>
                    <th>{t.admin.colName}</th>
                    <th>{t.admin.colRole}</th>
                    <th>{t.admin.colEmail}</th>
                    <th>{t.admin.colPhone}</th>
                    <th style={{ textAlign: 'center' }}>{t.admin.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {guruList.map((g) => {
                    const { src: initialPhoto } = getMemberPhotoUrl(g);
                    return (
                      <tr key={g.id}>
                        <td>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--bg-surface)' }}>
                            <img
                              src={initialPhoto}
                              alt={g.full_name}
                              onError={(e) => {
                                e.currentTarget.src = getDefaultAvatar();
                              }}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-main)' }}>{g.full_name}</strong>
                          {g.nickname && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>({g.nickname})</span>}
                        </td>
                        <td>
                          <span className="badge badge-primary" style={{ fontSize: '0.725rem' }}>{g.role}</span>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{g.email || '-'}</td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{g.phone || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button onClick={() => handleOpenEdit(g)} className="btn-icon" style={{ padding: '0.35rem' }} title={t.admin.edit}>
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => setDeleteId(g.id)} className="btn-icon" style={{ color: 'var(--danger-main)', padding: '0.35rem' }} title={t.admin.delete}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Siswa Section */}
          <div className="card" style={{ boxShadow: 'var(--shadow-md)' }}>
            <div className="card-header" style={{ padding: '1.25rem 1.5rem' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {t.admin.studentsListTitle.replace('{count}', String(siswaList.length))}
              </h4>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>No</th>
                    <th style={{ width: '60px' }}>{t.admin.colPhoto}</th>
                    <th>{t.admin.colName}</th>
                    <th>{t.admin.colRole}</th>
                    <th>{t.admin.colBirth}</th>
                    <th>{t.admin.colEmail}</th>
                    <th style={{ textAlign: 'center' }}>{t.admin.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {siswaList.map((s) => {
                    const { src: initialPhoto } = getMemberPhotoUrl(s);
                    return (
                      <tr key={s.id}>
                        <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary-500)' }}>
                          {String(s.attendance_number).padStart(2, '0')}
                        </td>
                        <td>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--bg-surface)' }}>
                            <img
                              src={initialPhoto}
                              alt={s.full_name}
                              onError={(e) => {
                                e.currentTarget.src = getDefaultAvatar();
                              }}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-main)' }}>{s.full_name}</strong>
                          {s.nickname && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>({s.nickname})</span>}
                        </td>
                        <td>
                          <span
                            className={
                              s.role === 'Developer'
                                ? 'badge badge-developer'
                                : s.role !== 'Siswa'
                                ? 'badge badge-warning'
                                : 'badge badge-neutral'
                            }
                            style={{ fontSize: '0.725rem' }}
                          >
                            {s.role}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {s.birth_place ? `${s.birth_place}, ` : ''}{s.birth_date || '-'}
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{s.email || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button onClick={() => handleOpenEdit(s)} className="btn-icon" style={{ padding: '0.35rem' }} title={t.admin.edit}>
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => setDeleteId(s.id)} className="btn-icon" style={{ color: 'var(--danger-main)', padding: '0.35rem' }} title={t.admin.delete}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit Member Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMember ? t.admin.editMemberTitle : t.admin.addMemberTitle}
        size="md"
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Photo Mapping & Persistent Upload Section */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {previewPhotoSrc ? (
                  <img
                    src={previewPhotoSrc}
                    alt="Preview"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <User size={28} color="var(--primary-500)" />
                )}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                <strong>{formData.customPhotoNumber ? t.admin.customPhotoServer : `${t.admin.colPhoto}:`}</strong>
                <div style={{ wordBreak: 'break-all', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {formData.customPhotoNumber
                    ? formData.customPhotoNumber
                    : t.admin.defaultVectorAvatar}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label
                className="btn btn-secondary btn-sm"
                style={{ cursor: isUploadingPhoto ? 'not-allowed' : 'pointer', margin: 0, padding: '0.35rem 0.65rem' }}
                title={t.admin.uploadPhotoBtn}
              >
                {isUploadingPhoto ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
                <span style={{ fontSize: '0.75rem' }}>{isUploadingPhoto ? t.common.loading : t.admin.uploadPhotoBtn}</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  disabled={isUploadingPhoto}
                  onChange={handlePhotoUpload}
                />
              </label>
              {formData.customPhotoNumber && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, customPhotoNumber: '' })}
                  className="btn-icon"
                  title={t.admin.resetAvatarBtn}
                  style={{ padding: '0.35rem', color: 'var(--text-muted)' }}
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t.admin.memberType}</label>
              <select
                value={formData.memberType}
                onChange={(e) => setFormData({ ...formData, memberType: e.target.value as any })}
                className="form-select"
                required
              >
                <option value="siswa">{t.members.roleStudent}</option>
                <option value="guru">{t.members.roleHomeroom} / {t.members.educatorBadge}</option>
              </select>
            </div>

            {formData.memberType === 'siswa' ? (
              <div className="form-group">
                <label className="form-label">{t.admin.attendanceNo}</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={formData.attendanceNumber}
                  onChange={(e) => setFormData({ ...formData, attendanceNumber: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">{language === 'en' ? 'Educator Status' : 'Status Pendidik'}</label>
                <input type="text" value={language === 'en' ? 'Active Educator' : 'Guru Aktif'} disabled className="form-input" />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t.admin.fullNameLabel}</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t.admin.nicknameLabel}</label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t.admin.roleLabel}</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="form-select"
              required
            >
              {formData.memberType === 'guru' ? (
                <>
                  <option value="Wali Kelas">Wali Kelas</option>
                  <option value="Guru Produktif TKJ">Guru Produktif TKJ</option>
                  <option value="Guru Bimbingan Konseling">Guru Bimbingan Konseling</option>
                  <option value="Guru Mata Pelajaran">Guru Mata Pelajaran</option>
                  {!['Wali Kelas', 'Guru Produktif TKJ', 'Guru Bimbingan Konseling', 'Guru Mata Pelajaran'].includes(formData.role) && (
                    <option value={formData.role}>{formData.role}</option>
                  )}
                </>
              ) : (
                <>
                  <option value="Siswa">Siswa</option>
                  <option value="Ketua Kelas">Ketua Kelas</option>
                  <option value="Wakil Ketua">Wakil Ketua</option>
                  <option value="Sekretaris">Sekretaris</option>
                  <option value="Bendahara">Bendahara</option>
                  <option value="Developer">Developer</option>
                  <option value="Wali Kelas">Wali Kelas</option>
                  {!['Siswa', 'Ketua Kelas', 'Wakil Ketua', 'Sekretaris', 'Bendahara', 'Developer', 'Wali Kelas'].includes(formData.role) && (
                    <option value={formData.role}>{formData.role}</option>
                  )}
                </>
              )}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t.admin.birthPlaceLabel}</label>
              <input
                type="text"
                value={formData.birthPlace}
                onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t.admin.birthDateLabel}</label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t.admin.colEmail}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t.admin.phoneLabel}</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              {t.admin.cancel}
            </button>
            <button type="submit" className="btn btn-primary">
              {t.admin.saveMember}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t.admin.confirmDeleteTitle}
        message={t.admin.confirmDeleteMemberMsg}
        confirmLabel={t.admin.yesDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};
