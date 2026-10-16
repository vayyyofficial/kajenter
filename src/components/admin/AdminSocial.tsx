import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Globe, ExternalLink, Check, X } from 'lucide-react';
import { SocialMedia } from '../../types';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useNotifications } from '../../context/NotificationContext';
import { useRealtimeSync } from '../../context/SyncContext';

export const AdminSocial: React.FC = () => {
  const { addToast } = useNotifications();
  const [socials, setSocials] = useState<SocialMedia[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SocialMedia | null>(null);
  const [formData, setFormData] = useState({
    platform: 'Instagram',
    username: '',
    url: '',
    icon: 'Instagram',
    isActive: true,
  });

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSocials = async () => {
    try {
      setLoading(true);
      const res = await api.social.getAll();
      if (res.success) setSocials(res.data);
    } catch (err: any) {
      addToast('error', err.message || 'Gagal memuat media sosial.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocials();
  }, []);

  // Multi-user real-time sync for social media updates
  useRealtimeSync(['social'], () => {
    fetchSocials();
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      platform: 'Instagram',
      username: '@xicp.tkj',
      url: 'https://instagram.com/xicp.tkj',
      icon: 'Instagram',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: SocialMedia) => {
    setEditingItem(item);
    setFormData({
      platform: item.platform,
      username: item.username,
      url: item.url,
      icon: item.icon,
      isActive: item.is_active === 1,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.platform || !formData.username || !formData.url) {
      addToast('error', 'Platform, username, dan URL wajib diisi.');
      return;
    }

    try {
      if (editingItem) {
        await api.social.update(editingItem.id, formData);
        addToast('success', 'Media sosial berhasil diperbarui.');
      } else {
        await api.social.create(formData);
        addToast('success', 'Media sosial baru berhasil ditambahkan.');
      }
      setIsModalOpen(false);
      fetchSocials();
    } catch (err: any) {
      addToast('error', err.message || 'Gagal menyimpan media sosial.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await api.social.delete(deleteId);
      addToast('success', 'Media sosial berhasil dihapus.');
      setDeleteId(null);
      fetchSocials();
    } catch (err: any) {
      addToast('error', err.message || 'Gagal menghapus media sosial.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900)' }}>Kelola Kontak Media Sosial Kelas</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', margin: 0 }}>
            Atur platform resmi kelas X ICP TKJ (Instagram, TikTok, dll.)
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Tambah Platform Baru</span>
        </button>
      </div>

      <div className="card" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Username / Handle</th>
                <th>Tautan Resmi (URL)</th>
                <th>Status Tampil</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Memuat media sosial...</td>
                </tr>
              ) : socials.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                    Belum ada platform media sosial.
                  </td>
                </tr>
              ) : (
                socials.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong style={{ color: 'var(--gray-900)' }}>{s.platform}</strong>
                    </td>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                        {s.username}
                      </span>
                    </td>
                    <td>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}
                      >
                        <span>{s.url}</span>
                        <ExternalLink size={13} />
                      </a>
                    </td>
                    <td>
                      {s.is_active === 1 ? (
                        <span className="badge badge-success">Aktif</span>
                      ) : (
                        <span className="badge badge-neutral">Nonaktif</span>
                      )}
                    </td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Media Sosial' : 'Tambah Media Sosial Baru'}
        size="sm"
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Platform Sosial Media *</label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              className="form-select"
              required
            >
              <option value="Instagram">Instagram</option>
              <option value="TikTok">TikTok</option>
              <option value="GitHub">GitHub</option>
              <option value="Discord">Discord</option>
              <option value="Twitter / X">Twitter / X</option>
              <option value="Email Resmi">Email Resmi</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Username / Akun *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="form-input"
              placeholder="@xicp.tkj"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tautan Web / URL Lengkap *</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="form-input"
              placeholder="https://instagram.com/xicp.tkj"
              required
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: 'var(--primary-600)' }}
            />
            <label htmlFor="isActiveCheck" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', cursor: 'pointer' }}>
              Aktifkan dan tampilkan di halaman kontak publik
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Simpan Media Sosial
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Media Sosial"
        message="Apakah Anda yakin ingin menghapus tautan media sosial ini?"
        isLoading={isDeleting}
      />
    </div>
  );
};
