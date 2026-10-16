import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Calendar, Tag, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import { GalleryItem } from '../../types';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useNotifications } from '../../context/NotificationContext';
import { useRealtimeSync } from '../../context/SyncContext';

export const AdminGallery: React.FC = () => {
  const { addToast } = useNotifications();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    eventIdentity: '',
    category: 'Kegiatan',
    description: '',
    imagePath: '',
    eventDate: '',
  });

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchGallery = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.gallery.getAll();
      if (res.success) setItems(res.data);
    } catch (err: any) {
      addToast('error', err.message || 'Gagal memuat galeri.');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  // Real-time synchronization: automatically updates when changes occur on any client
  useRealtimeSync(['gallery'], () => {
    fetchGallery();
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      addToast('error', 'Ukuran file gambar maksimal 10MB.');
      return;
    }

    try {
      setIsUploading(true);
      const res = await api.upload.image(file);
      if (res.success && res.data.url) {
        setFormData((prev) => ({ ...prev, imagePath: res.data.url }));
        addToast('success', 'File foto berhasil diunggah ke storage.');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Gagal mengunggah file foto.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      eventIdentity: '',
      category: 'Kegiatan',
      description: '',
      imagePath: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80',
      eventDate: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: GalleryItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      eventIdentity: item.event_identity,
      category: item.category,
      description: item.description,
      imagePath: item.image_path,
      eventDate: item.event_date,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.eventIdentity || !formData.imagePath || !formData.eventDate) {
      addToast('error', 'Semua kolom wajib harus diisi.');
      return;
    }

    try {
      if (editingItem) {
        await api.gallery.update(editingItem.id, formData);
        addToast('success', 'Dokumentasi berhasil diperbarui.');
      } else {
        await api.gallery.create(formData);
        addToast('success', 'Dokumentasi baru berhasil ditambahkan.');
      }
      setIsModalOpen(false);
      fetchGallery();
    } catch (err: any) {
      addToast('error', err.message || 'Gagal menyimpan dokumentasi.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await api.gallery.delete(deleteId);
      addToast('success', 'Dokumentasi foto berhasil dihapus.');
      setDeleteId(null);
      fetchGallery();
    } catch (err: any) {
      addToast('error', err.message || 'Gagal menghapus foto.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900)' }}>Kelola Galeri Foto Kegiatan</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', margin: 0 }}>
            Publikasikan foto kegiatan, proyek TKJ, dan dokumentasi resmi kelas
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Tambah Dokumentasi Baru</span>
        </button>
      </div>

      <div className="card" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Foto</th>
                <th>Judul & Identitas Kegiatan</th>
                <th>Kategori</th>
                <th>Tanggal</th>
                <th>Diunggah Oleh</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Memuat data galeri...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                    Belum ada foto dokumentasi.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div
                        style={{
                          width: 56,
                          height: 42,
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          backgroundColor: 'var(--gray-100)',
                        }}
                      >
                        <img
                          src={item.image_path}
                          alt={item.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '0.9rem' }}>{item.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary-600)', fontWeight: 600 }}>{item.event_identity}</div>
                    </td>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: '0.725rem' }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--gray-700)' }}>
                      {new Date(item.event_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{item.created_by}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="btn-icon"
                          style={{ color: 'var(--gray-600)', padding: '0.35rem' }}
                          title="Edit Foto"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="btn-icon"
                          style={{ color: 'var(--danger-main)', padding: '0.35rem' }}
                          title="Hapus Foto"
                        >
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

      {/* Modal Add/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Dokumentasi Foto' : 'Tambah Dokumentasi Baru'}
        size="md"
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Judul Dokumentasi *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
              placeholder="Contoh: Praktikum Konfigurasi Server Rack & Switch Cisco"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Identitas Kegiatan *</label>
              <input
                type="text"
                value={formData.eventIdentity}
                onChange={(e) => setFormData({ ...formData, eventIdentity: e.target.value })}
                className="form-input"
                placeholder="Contoh: Lab Komputer Jaringan 1"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kategori *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="form-select"
              >
                <option value="Kegiatan">Kegiatan</option>
                <option value="Proyek TKJ">Proyek TKJ</option>
                <option value="Event Sekolah">Event Sekolah</option>
                <option value="Dokumentasi">Dokumentasi</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Foto Dokumentasi Kegiatan *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <label
                  className="btn btn-secondary btn-sm"
                  style={{
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  <span>{isUploading ? 'Mengunggah...' : 'Pilih File Foto dari Perangkat'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    disabled={isUploading}
                  />
                </label>
                <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>
                  Format JPG, PNG, WebP (maks. 10MB) tersimpan ke server storage
                </span>
              </div>

              <input
                type="text"
                value={formData.imagePath}
                onChange={(e) => setFormData({ ...formData, imagePath: e.target.value })}
                className="form-input"
                placeholder="Path storage / URL foto (otomatis terisi saat unggah)"
                required
              />

              {formData.imagePath && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)' }}>
                  <img
                    src={formData.imagePath}
                    alt="Preview"
                    style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-300)' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div style={{ fontSize: '0.78rem', color: 'var(--gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong style={{ color: 'var(--gray-800)', display: 'block' }}>Pratinjau Foto Terpilih</strong>
                    <span>{formData.imagePath}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tanggal Pelaksanaan *</label>
            <input
              type="date"
              value={formData.eventDate}
              onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Deskripsi Foto / Cerita Kegiatan *</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-textarea"
              placeholder="Ceritakan ringkasan aktivitas yang berlangsung pada dokumentasi ini..."
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Simpan Dokumentasi
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Dokumentasi Foto"
        message="Apakah Anda yakin ingin menghapus dokumentasi foto ini dari galeri kelas?"
        isLoading={isDeleting}
      />
    </div>
  );
};
