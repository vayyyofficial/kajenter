import React, { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { GalleryItem } from '../types';
import { api } from '../services/api';
import { BRANDING } from '../config/branding';
import { GalleryCard } from '../components/gallery/GalleryCard';
import { GalleryViewerModal } from '../components/gallery/GalleryViewerModal';
import { EmptyState } from '../components/common/EmptyState';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { Skeleton } from '../components/common/Skeleton';
import { useRealtimeSync } from '../context/SyncContext';

export const GaleriPage: React.FC = () => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const categories = ['Semua', 'Kegiatan', 'Proyek TKJ', 'Event Sekolah', 'Dokumentasi'];

  const fetchGallery = useCallback(async (category?: string) => {
    try {
      setLoading(true);
      const res = await api.gallery.getAll(category === 'Semua' ? undefined : category);
      if (res.success) setItems(res.data);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGallery(selectedCategory);
  }, [selectedCategory, fetchGallery]);

  // Real-time synchronization: automatically refetches when admin adds/edits/deletes photos
  useRealtimeSync(['gallery'], () => {
    fetchGallery(selectedCategory);
  });

  const handlePhotoClick = (item: GalleryItem) => {
    setSelectedItem(item);
    setIsViewerOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <div className="section-tag">Dokumentasi Visual</div>
        <h1 className="section-title">Galeri Kegiatan {BRANDING.name}</h1>
        <p className="section-subtitle">
          Kumpulan momen resmi praktikum instalasi jaringan, sertifikasi kejuruan, kunjungan industri, dan kebersamaan kelas di {BRANDING.school}.
        </p>
      </div>

      {/* Category Filter Tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          borderBottom: '1px solid var(--gray-200)',
          paddingBottom: '1rem',
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className="btn btn-sm"
            style={{
              backgroundColor: selectedCategory === cat ? 'var(--primary-600)' : 'var(--gray-100)',
              color: selectedCategory === cat ? '#ffffff' : 'var(--gray-700)',
              fontWeight: selectedCategory === cat ? 700 : 500,
              borderRadius: 'var(--radius-full)',
              padding: '0.4rem 1.15rem',
              transition: 'all var(--transition-fast)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Photos Grid */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="card" style={{ overflow: 'hidden' }}>
              <Skeleton height="200px" borderRadius={0} />
              <div style={{ padding: '1.25rem' }}>
                <Skeleton height="20px" width="75%" style={{ marginBottom: '0.65rem' }} />
                <Skeleton height="14px" width="40%" style={{ marginBottom: '0.75rem' }} />
                <Skeleton height="14px" width="90%" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Belum Ada Dokumentasi"
          description={`Belum ada foto dokumentasi yang dipublikasikan dalam kategori "${selectedCategory}".`}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {items.map((item, idx) => (
            <ScrollReveal key={item.id} delay={idx * 50}>
              <GalleryCard item={item} onClick={handlePhotoClick} />
            </ScrollReveal>
          ))}
        </div>
      )}

      {/* Interactive Modal Viewer with Zoom & Pan */}
      <GalleryViewerModal
        item={selectedItem}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
      />
    </div>
  );
};
