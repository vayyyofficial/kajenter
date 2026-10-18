import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Upload,
  Loader2,
  Camera,
  Layers,
  ArrowUp,
  ArrowDown,
  Star,
  Image as ImageIcon,
} from 'lucide-react';
import { GalleryItem, Member } from '../../types';
import { api } from '../../services/api';
import { dataCache } from '../../services/dataCache';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useNotifications } from '../../context/NotificationContext';
import { useRealtimeSync } from '../../context/SyncContext';
import { useLanguage } from '../../context/LanguageContext';

const STANDARD_CATEGORIES = ['Kegiatan', 'Dokumentasi', 'Prestasi', 'Event Sekolah'];

export const AdminGallery: React.FC = () => {
  const { t, language } = useLanguage();
  const { addToast } = useNotifications();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Real class members list from database for Dokumentator dropdown
  const [membersList, setMembersList] = useState<{ guru: Member[]; siswa: Member[] }>({
    guru: [],
    siswa: [],
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCustomDokumentator, setIsCustomDokumentator] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    eventIdentity: '',
    category: 'Kegiatan',
    dokumentator: '',
    description: '',
    photos: [] as string[],
    eventDate: '',
  });

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await dataCache.getOrFetchMembers();
      if (data) {
        setMembersList({
          guru: data.guru || [],
          siswa: data.siswa || [],
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchGallery = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dataCache.getOrFetchGallery(undefined, true);
      setItems(data);
    } catch (err: any) {
      addToast('error', err.message || 'Gagal memuat galeri.');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchGallery();
    fetchMembers();
  }, [fetchGallery, fetchMembers]);

  // Real-time synchronization
  useRealtimeSync(['gallery', 'members'], () => {
    fetchGallery();
    fetchMembers();
  });

  // Multiple File Upload Handler
  const handleMultipleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);

    // Validate size (max 10MB each)
    for (const f of fileList) {
      if (f.size > 10 * 1024 * 1024) {
        addToast('error', `File ${f.name} melebihi batas 10MB.`);
        return;
      }
    }

    try {
      setIsUploading(true);
      const res = await api.upload.images(fileList);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const newUrls = res.data.map((d) => d.url);
        setFormData((prev) => ({
          ...prev,
          photos: [...prev.photos, ...newUrls],
        }));
        addToast('success', `${newUrls.length} file foto berhasil diunggah ke persistent storage.`);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Gagal mengunggah file foto.');
    } finally {
      setIsUploading(false);
      // Reset input value so same files can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleAddManualPhoto = () => {
    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, ''],
    }));
  };

  const handlePhotoUrlChange = (index: number, val: string) => {
    setFormData((prev) => {
      const next = [...prev.photos];
      next[index] = val;
      return { ...prev, photos: next };
    });
  };

  const handleRemovePhoto = (index: number) => {
    setFormData((prev) => {
      const next = prev.photos.filter((_, i) => i !== index);
      return { ...prev, photos: next };
    });
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    setFormData((prev) => {
      const next = [...prev.photos];
      const [target] = next.splice(index, 1);
      next.unshift(target);
      return { ...prev, photos: next };
    });
    addToast('info', 'Foto dipindahkan menjadi foto sampul utama (#1).');
  };

  const handleMovePhoto = (from: number, to: number) => {
    setFormData((prev) => {
      if (to < 0 || to >= prev.photos.length) return prev;
      const next = [...prev.photos];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...prev, photos: next };
    });
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsCustomDokumentator(false);

    let initialDokumentator = 'Tim Dokumentasi Kelas';
    if (membersList.siswa.length > 0) {
      initialDokumentator = membersList.siswa[0].full_name;
    } else if (membersList.guru.length > 0) {
      initialDokumentator = membersList.guru[0].full_name;
    }

    setFormData({
      title: '',
      eventIdentity: '',
      category: 'Kegiatan',
      dokumentator: initialDokumentator,
      description: '',
      photos: [],
      eventDate: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: GalleryItem) => {
    setEditingItem(item);

    const docName = item.dokumentator || item.created_by || '';
    const allNames = [
      ...membersList.siswa.map((s) => s.full_name),
      ...membersList.guru.map((g) => g.full_name),
      'Tim Dokumentasi Kelas',
    ];
    const isCustom = Boolean(docName && !allNames.includes(docName));
    setIsCustomDokumentator(isCustom);

    const initialPhotos = item.photos && item.photos.length > 0
      ? [...item.photos]
      : (item.image_path ? [item.image_path] : []);

    setFormData({
      title: item.title,
      eventIdentity: item.event_identity,
      category: item.category,
      dokumentator: docName,
      description: item.description,
      photos: initialPhotos,
      eventDate: item.event_date,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhotos = formData.photos.map((p) => p.trim()).filter(Boolean);

    if (cleanPhotos.length === 0) {
      addToast('error', 'Setidaknya harus ada satu foto dokumentasi dalam kegiatan ini.');
      return;
    }

    if (!formData.title.trim() || !formData.eventIdentity.trim() || !formData.eventDate || !formData.dokumentator.trim()) {
      addToast('error', 'Semua kolom wajib termasuk Dokumentator harus diisi.');
      return;
    }

    try {
      const payload = {
        title: formData.title.trim(),
        eventIdentity: formData.eventIdentity.trim(),
        category: formData.category,
        dokumentator: formData.dokumentator.trim(),
        description: formData.description.trim(),
        photos: cleanPhotos,
        imagePath: cleanPhotos[0],
        eventDate: formData.eventDate,
      };

      if (editingItem) {
        await api.gallery.update(editingItem.id, payload);
        addToast('success', 'Dokumentasi berhasil diperbarui.');
      } else {
        await api.gallery.create(payload);
        addToast('success', 'Dokumentasi baru berhasil ditambahkan.');
      }

      dataCache.invalidate('gallery');
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
      dataCache.invalidate('gallery');
      addToast('success', 'Dokumentasi foto berhasil dihapus.');
      setDeleteId(null);
      fetchGallery();
    } catch (err: any) {
      addToast('error', err.message || 'Gagal menghapus foto.');
    } finally {
      setIsDeleting(false);
    }
  };

  const categoryOptions = Array.from(
    new Set([...STANDARD_CATEGORIES, formData.category])
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {language === 'en' ? 'Manage Activity Gallery Photos' : 'Kelola Galeri Foto Kegiatan'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            {language === 'en'
              ? 'Publish photos of activities, documentation, achievements, and events (Multi-photo supported)'
              : 'Publikasikan foto kegiatan, dokumentasi, prestasi, dan event resmi kelas (1 Kegiatan dapat memiliki banyak foto)'}
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>{t.admin.addGalleryBtn}</span>
        </button>
      </div>

      <div className="card" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>{t.admin.colPhoto}</th>
                <th>{t.admin.colTitle}</th>
                <th>{t.admin.colCategory}</th>
                <th>{t.admin.colEventDate}</th>
                <th>{t.admin.colDoc}</th>
                <th style={{ textAlign: 'center' }}>{t.admin.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t.common.loading}</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    {t.gallery.noPhotosDesc}
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const photoCount = item.photos?.length || (item.image_path ? 1 : 0);
                  return (
                    <tr key={item.id}>
                      <td>
                        <div
                          style={{
                            width: 64,
                            height: 48,
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden',
                            backgroundColor: 'var(--gray-100)',
                            position: 'relative',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                          }}
                        >
                          <img
                            src={item.image_path}
                            alt={item.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                          />
                          {photoCount > 1 && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                backgroundColor: 'rgba(220, 38, 38, 0.9)',
                                color: '#ffffff',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                padding: '0.1rem 0.35rem',
                                borderTopLeftRadius: '4px',
                              }}
                              title={`${photoCount} foto dalam kegiatan ini`}
                            >
                              {photoCount}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '0.9rem' }}>{item.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary-600)', fontWeight: 600 }}>
                          {item.event_identity}
                          {photoCount > 1 && (
                            <span style={{ color: 'var(--gray-500)', fontWeight: 500, marginLeft: '0.5rem' }}>
                              • {photoCount} Foto
                            </span>
                          )}
                        </div>
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
                      <td style={{ fontSize: '0.8125rem', color: 'var(--gray-800)', fontWeight: 600 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Camera size={13} color="var(--primary-600)" />
                          <span>{item.dokumentator || item.created_by}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="btn-icon"
                            style={{ color: 'var(--gray-600)', padding: '0.35rem' }}
                            title="Edit Foto & Kegiatan"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteId(item.id)}
                            className="btn-icon"
                            style={{ color: 'var(--danger-main)', padding: '0.35rem' }}
                            title="Hapus Kegiatan"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? (language === 'en' ? 'Edit Activity Documentation' : 'Edit Dokumentasi Kegiatan') : (language === 'en' ? 'Add Activity Documentation' : 'Tambah Dokumentasi Baru')}
        size="lg"
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">{language === 'en' ? 'Activity Title *' : 'Judul Dokumentasi *'}</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
              placeholder={language === 'en' ? 'e.g., Server Configuration & Switch Practical Exam' : 'Contoh: Praktikum Konfigurasi Server Rack & Switch Cisco'}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{language === 'en' ? 'Event Identity / Location *' : 'Identitas Kegiatan / Lokasi *'}</label>
              <input
                type="text"
                value={formData.eventIdentity}
                onChange={(e) => setFormData({ ...formData, eventIdentity: e.target.value })}
                className="form-input"
                placeholder={language === 'en' ? 'e.g., Network Computer Lab 1' : 'Contoh: Lab Komputer Jaringan 1'}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{language === 'en' ? 'Gallery Category *' : 'Kategori Galeri *'}</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="form-select"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dokumentator Galeri */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ margin: 0 }}>{language === 'en' ? 'Photographer / Contributor *' : 'Dokumentator *'}</label>
              <button
                type="button"
                onClick={() => setIsCustomDokumentator(!isCustomDokumentator)}
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--primary-600)',
                  fontWeight: 600,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                {isCustomDokumentator ? (language === 'en' ? 'Select from Member List' : 'Pilih dari Daftar Anggota') : (language === 'en' ? 'Type Custom Name' : 'Ketik Manual / Nama Kustom')}
              </button>
            </div>

            {!isCustomDokumentator ? (
              <select
                value={formData.dokumentator}
                onChange={(e) => {
                  if (e.target.value === '__CUSTOM__') {
                    setIsCustomDokumentator(true);
                  } else {
                    setFormData({ ...formData, dokumentator: e.target.value });
                  }
                }}
                className="form-select"
                required
              >
                <option value="" disabled>{language === 'en' ? '-- Select Contributor from Class Members --' : '-- Pilih Dokumentator dari Anggota Kelas --'}</option>

                {membersList.siswa.length > 0 && (
                  <optgroup label={language === 'en' ? 'Students of X ICP TKJ' : 'Siswa Kelas X ICP TKJ'}>
                    {membersList.siswa.map((s) => (
                      <option key={s.id} value={s.full_name}>
                        {s.attendance_number !== null && s.attendance_number !== undefined
                          ? `#${String(s.attendance_number).padStart(2, '0')} ${s.full_name}`
                          : s.full_name}
                      </option>
                    ))}
                  </optgroup>
                )}

                {membersList.guru.length > 0 && (
                  <optgroup label={language === 'en' ? 'Faculty Teachers & Staff' : 'Dewan Guru & Tenaga Pendidik'}>
                    {membersList.guru.map((g) => (
                      <option key={g.id} value={g.full_name}>
                        {g.full_name} ({g.role})
                      </option>
                    ))}
                  </optgroup>
                )}

                <optgroup label={language === 'en' ? 'Other' : 'Lainnya'}>
                  <option value="Tim Dokumentasi Kelas">{language === 'en' ? 'Class Documentation Team' : 'Tim Dokumentasi Kelas'}</option>
                  {Boolean(formData.dokumentator &&
                    !membersList.siswa.some((s) => s.full_name === formData.dokumentator) &&
                    !membersList.guru.some((g) => g.full_name === formData.dokumentator) &&
                    formData.dokumentator !== 'Tim Dokumentasi Kelas') && (
                    <option value={formData.dokumentator}>
                      {formData.dokumentator} ({language === 'en' ? 'Saved' : 'Tersimpan'})
                    </option>
                  )}
                  <option value="__CUSTOM__">✍️ {language === 'en' ? 'Type Custom Name / Other...' : 'Ketik Nama Kustom / Lainnya...'}</option>
                </optgroup>
              </select>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={formData.dokumentator}
                  onChange={(e) => setFormData({ ...formData, dokumentator: e.target.value })}
                  className="form-input"
                  placeholder={language === 'en' ? 'Type contributor full name...' : 'Ketik nama lengkap dokumentator...'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsCustomDokumentator(false)}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  {t.common.cancel}
                </button>
              </div>
            )}
          </div>

          {/* MULTI-PHOTO MANAGEMENT SECTION */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                  <Layers size={18} color="var(--primary-500)" />
                  <span>
                    {language === 'en'
                      ? `Activity Documentation Photos (${formData.photos.length} Photos)`
                      : `Foto Dokumentasi Kegiatan (${formData.photos.length} Foto)`}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  {language === 'en'
                    ? 'One activity can hold multiple documentation photos. The first photo (#1) serves as the main cover.'
                    : 'Satu kegiatan dapat memiliki banyak foto dokumentasi. Foto pertama (#1) menjadi sampul utama.'}
                </p>
              </div>

              {/* Upload & Add Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <label
                  className="btn btn-primary btn-sm"
                  style={{
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    margin: 0,
                  }}
                >
                  {isUploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  <span>{isUploading ? t.common.loading : (language === 'en' ? '+ Upload Photos from Device' : '+ Unggah Foto dari Perangkat')}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleMultipleFileUpload}
                    style={{ display: 'none' }}
                    disabled={isUploading}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleAddManualPhoto}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Plus size={15} />
                  <span>{language === 'en' ? 'Add Manual URL' : 'Tambah URL Manual'}</span>
                </button>
              </div>
            </div>

            {/* List of Photos */}
            {formData.photos.length === 0 ? (
              <div
                style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '2px dashed var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <ImageIcon size={36} color="var(--text-muted)" />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {language === 'en' ? 'No Photos in This Activity Yet' : 'Belum Ada Foto dalam Kegiatan Ini'}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {language === 'en'
                    ? 'Click "+ Upload Photos from Device" above to add documentation images.'
                    : 'Klik tombol + Unggah Foto dari Perangkat di atas untuk memilih foto dokumentasi.'}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {formData.photos.map((photoUrl, idx) => {
                  const isPrimary = idx === 0;
                  return (
                    <div
                      key={`photo-slot-${idx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        backgroundColor: 'var(--bg-card)',
                        border: isPrimary ? '2px solid var(--primary-500)' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem',
                        boxShadow: 'var(--shadow-sm)',
                        flexWrap: 'wrap',
                      }}
                    >
                      {/* Thumbnail Preview */}
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          backgroundColor: 'var(--bg-surface)',
                          flexShrink: 0,
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={`Preview ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <ImageIcon size={24} color="var(--text-muted)" />
                        )}
                      </div>

                      {/* Photo Index / Status Tag */}
                      <div style={{ minWidth: '95px' }}>
                        {isPrimary ? (
                          <span
                            style={{
                              backgroundColor: 'rgba(220, 38, 38, 0.12)',
                              color: 'var(--primary-500)',
                              border: '1px solid rgba(220, 38, 38, 0.3)',
                              borderRadius: 'var(--radius-full)',
                              padding: '0.2rem 0.55rem',
                              fontSize: '0.725rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <Star size={11} fill="currentColor" /> {language === 'en' ? 'Cover #1' : 'Sampul #1'}
                          </span>
                        ) : (
                          <span
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-muted)',
                              borderRadius: 'var(--radius-full)',
                              padding: '0.2rem 0.55rem',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            {language === 'en' ? `Photo #${idx + 1}` : `Foto #${idx + 1}`}
                          </span>
                        )}
                      </div>

                      {/* URL Input */}
                      <div style={{ flex: '1 1 200px' }}>
                        <input
                          type="text"
                          value={photoUrl}
                          onChange={(e) => handlePhotoUrlChange(idx, e.target.value)}
                          className="form-input"
                          style={{ height: '36px', fontSize: '0.8125rem' }}
                          placeholder="Storage path or image URL..."
                          required
                        />
                      </div>

                      {/* Photo Actions: Move, Set Primary, Delete Photo */}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginLeft: 'auto' }}>
                        {!isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(idx)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.725rem' }}
                            title={language === 'en' ? 'Make Cover Photo' : 'Jadikan Foto Sampul Utama'}
                          >
                            <Star size={13} />
                            <span>{language === 'en' ? 'Make Cover' : 'Jadikan Sampul'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleMovePhoto(idx, idx - 1)}
                          disabled={idx === 0}
                          className="btn-icon"
                          style={{ padding: '0.35rem', opacity: idx === 0 ? 0.3 : 1 }}
                          title={language === 'en' ? 'Move Up' : 'Geser ke Atas'}
                        >
                          <ArrowUp size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMovePhoto(idx, idx + 1)}
                          disabled={idx === formData.photos.length - 1}
                          className="btn-icon"
                          style={{ padding: '0.35rem', opacity: idx === formData.photos.length - 1 ? 0.3 : 1 }}
                          title={language === 'en' ? 'Move Down' : 'Geser ke Bawah'}
                        >
                          <ArrowDown size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="btn-icon"
                          style={{ color: 'var(--danger-main)', padding: '0.35rem' }}
                          title={language === 'en' ? 'Delete This Photo' : 'Hapus Foto Ini'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">{language === 'en' ? 'Event Date *' : 'Tanggal Pelaksanaan *'}</label>
            <input
              type="date"
              value={formData.eventDate}
              onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{language === 'en' ? 'Photo Description / Story *' : 'Deskripsi Foto / Cerita Kegiatan *'}</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-textarea"
              placeholder={language === 'en' ? 'Brief summary of the activity captured in this documentation...' : 'Ceritakan ringkasan aktivitas yang berlangsung pada dokumentasi ini...'}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              {t.common.cancel}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isUploading}>
              {editingItem
                ? (language === 'en' ? 'Save Changes' : 'Simpan Perubahan')
                : (language === 'en' ? 'Publish Documentation' : 'Publikasikan Dokumentasi')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t.admin.confirmDeleteTitle}
        message={t.admin.confirmDeleteGalleryMsg}
        confirmLabel={t.admin.yesDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};
