import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, User, ShieldCheck, MapPin, Mail, Phone, Upload, RotateCcw, Loader2 } from 'lucide-react';
import { Member } from '../../types';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useNotifications } from '../../context/NotificationContext';
import { useRealtimeSync } from '../../context/SyncContext';

export const AdminMembers: React.FC = () => {
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
      addToast('error', err.message || 'Gagal memuat anggota.');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

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
      birthPlace: 'Surabaya',
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
      addToast('error', 'File harus berupa gambar (JPG, PNG, WebP).');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const res = await api.upload.image(file);
      if (res.success && res.data?.url) {
        setFormData((prev) => ({ ...prev, customPhotoNumber: res.data.url }));
        addToast('success', 'Foto profil berhasil di-upload ke storage server!');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Gagal meng-upload foto profil.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.role) {
      addToast('error', 'Nama lengkap dan role wajib diisi.');
      return;
    }

    try {
      if (editingMember) {
        await api.members.update(editingMember.id, formData);
        addToast('success', 'Data anggota berhasil diperbarui.');
      } else {
        await api.members.create(formData);
        addToast('success', 'Anggota baru berhasil ditambahkan.');
      }
      setIsModalOpen(false);
      fetchMembers();
    } catch (err: any) {
      addToast('error', err.message || 'Gagal menyimpan anggota.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await api.members.delete(deleteId);
      addToast('success', 'Anggota berhasil dihapus.');
      setDeleteId(null);
      fetchMembers();
    } catch (err: any) {
      addToast('error', err.message || 'Gagal menghapus anggota.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Preview path based on custom upload or attendance number per requirement #13 & #16
  const previewPhotoNum = formData.memberType === 'siswa' && formData.attendanceNumber
    ? String(formData.attendanceNumber).padStart(2, '0')
    : null;

  const previewPhotoSrc = formData.customPhotoNumber
    ? (formData.customPhotoNumber.startsWith('/') || formData.customPhotoNumber.startsWith('http')
        ? formData.customPhotoNumber
        : `/foto-anggota/${formData.customPhotoNumber}.jpg`)
    : previewPhotoNum
    ? `/foto-anggota/${previewPhotoNum}.jpg`
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900)' }}>Kelola Anggota Kelas & Guru</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', margin: 0 }}>
            Manajemen profil, role pengurus kelas, dan mapping foto absen otomatis
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Tambah Anggota Baru</span>
        </button>
      </div>

      {/* Guru Section */}
      <div className="card" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="card-header" style={{ padding: '1.25rem 1.5rem' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gray-900)' }}>
            Dewan Guru & Tenaga Pendidik ({guruList.length})
          </h4>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Foto</th>
                <th>Nama Lengkap</th>
                <th>Role / Jabatan</th>
                <th>Email</th>
                <th>No. Telepon</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {guruList.map((g) => {
                const guruPhoto = g.photo_number && (g.photo_number.startsWith('/') || g.photo_number.startsWith('http'))
                  ? g.photo_number
                  : `/foto-anggota/${g.photo_number}.jpg`;
                return (
                  <tr key={g.id}>
                    <td>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--primary-100)' }}>
                        <img
                          src={guruPhoto}
                          alt={g.full_name}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--gray-900)' }}>{g.full_name}</strong>
                      {g.nickname && <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginLeft: '0.4rem' }}>({g.nickname})</span>}
                    </td>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: '0.725rem' }}>{g.role}</span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--gray-700)' }}>{g.email || '-'}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--gray-700)' }}>{g.phone || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button onClick={() => handleOpenEdit(g)} className="btn-icon" style={{ padding: '0.35rem' }} title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setDeleteId(g.id)} className="btn-icon" style={{ color: 'var(--danger-main)', padding: '0.35rem' }} title="Hapus">
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
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gray-900)' }}>
            Daftar Siswa Kelas X ICP TKJ ({siswaList.length})
          </h4>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>No</th>
                <th style={{ width: '60px' }}>Foto</th>
                <th>Nama Lengkap</th>
                <th>Role Kelas</th>
                <th>Kelahiran</th>
                <th>Email</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {siswaList.map((s) => {
                const siswaPhoto = s.photo_number && (s.photo_number.startsWith('/') || s.photo_number.startsWith('http'))
                  ? s.photo_number
                  : `/foto-anggota/${String(s.attendance_number).padStart(2, '0')}.jpg`;
                return (
                  <tr key={s.id}>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary-600)' }}>
                      {String(s.attendance_number).padStart(2, '0')}
                    </td>
                    <td>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--primary-100)' }}>
                        <img
                          src={siswaPhoto}
                          alt={s.full_name}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    </td>
                  <td>
                    <strong style={{ color: 'var(--gray-900)' }}>{s.full_name}</strong>
                    {s.nickname && <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginLeft: '0.4rem' }}>({s.nickname})</span>}
                  </td>
                  <td>
                    <span className={s.role !== 'Siswa' ? 'badge badge-warning' : 'badge badge-neutral'} style={{ fontSize: '0.725rem' }}>
                      {s.role}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--gray-700)' }}>
                    {s.birth_place ? `${s.birth_place}, ` : ''}{s.birth_date || '-'}
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--gray-700)' }}>{s.email || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button onClick={() => handleOpenEdit(s)} className="btn-icon" style={{ padding: '0.35rem' }} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setDeleteId(s.id)} className="btn-icon" style={{ color: 'var(--danger-main)', padding: '0.35rem' }} title="Hapus">
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

      {/* Add / Edit Member Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMember ? 'Edit Data Anggota' : 'Tambah Anggota Baru'}
        size="md"
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Photo Mapping & Persistent Upload Section */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--primary-50)',
              border: '1px solid var(--primary-200)',
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
                  backgroundColor: 'var(--primary-200)',
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
                  <User size={28} color="var(--primary-600)" />
                )}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--primary-800)' }}>
                <strong>{formData.customPhotoNumber ? 'Foto Kustom Server:' : 'Foto Mapping Otomatis:'}</strong>
                <div style={{ wordBreak: 'break-all', fontSize: '0.75rem', color: 'var(--primary-700)' }}>
                  {formData.customPhotoNumber
                    ? formData.customPhotoNumber
                    : (formData.memberType === 'siswa' && previewPhotoNum
                        ? `/foto-anggota/${previewPhotoNum}.jpg`
                        : 'Foto lokal identitas guru')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label
                className="btn btn-secondary btn-sm"
                style={{ cursor: isUploadingPhoto ? 'not-allowed' : 'pointer', margin: 0, padding: '0.35rem 0.65rem' }}
                title="Upload foto baru ke persistent storage"
              >
                {isUploadingPhoto ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
                <span style={{ fontSize: '0.75rem' }}>{isUploadingPhoto ? 'Uploading...' : 'Upload Foto'}</span>
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
                  title="Kembalikan ke Foto Absen Default"
                  style={{ padding: '0.35rem', color: 'var(--gray-600)' }}
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Jenis Anggota *</label>
              <select
                value={formData.memberType}
                onChange={(e) => setFormData({ ...formData, memberType: e.target.value as any })}
                className="form-select"
                required
              >
                <option value="siswa">Siswa</option>
                <option value="guru">Guru / Tenaga Pendidik</option>
              </select>
            </div>

            {formData.memberType === 'siswa' ? (
              <div className="form-group">
                <label className="form-label">Nomor Absen *</label>
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
                <label className="form-label">Status Pendidik</label>
                <input type="text" value="Guru Aktif" disabled className="form-input" />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Nama Lengkap *</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nama Panggilan</label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Role / Jabatan *</label>
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
                </>
              ) : (
                <>
                  <option value="Siswa">Siswa</option>
                  <option value="Ketua Kelas">Ketua Kelas</option>
                  <option value="Wakil Ketua">Wakil Ketua</option>
                  <option value="Bendahara">Bendahara</option>
                  <option value="Sekretaris">Sekretaris</option>
                </>
              )}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Tempat Lahir</label>
              <input
                type="text"
                value={formData.birthPlace}
                onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tanggal Lahir</label>
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
              <label className="form-label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nomor Telepon</label>
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
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Simpan Anggota
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Anggota"
        message="Apakah Anda yakin ingin menghapus data anggota ini? Semua data terkait di sistem kelas akan dihapus."
        isLoading={isDeleting}
      />
    </div>
  );
};
