import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { GalleryItem } from '../types';
import { dataCache } from '../services/dataCache';
import { BRANDING } from '../config/branding';
import { GalleryCard } from '../components/gallery/GalleryCard';
import { GalleryViewerModal } from '../components/gallery/GalleryViewerModal';
import { EmptyState } from '../components/common/EmptyState';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { Skeleton } from '../components/common/Skeleton';
import { useRealtimeSync } from '../context/SyncContext';
import { useLanguage } from '../context/LanguageContext';

const STANDARD_CATEGORIES = ['Semua', 'Kegiatan', 'Dokumentasi', 'Prestasi', 'Event Sekolah'];

export const GaleriPage: React.FC = () => {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);

  // Initialize from cache immediately for instant rendering without skeleton flash
  const cachedInitial = dataCache.getGallery(selectedCategory);
  const [items, setItems] = useState<GalleryItem[]>(() => cachedInitial || []);
  const [loading, setLoading] = useState<boolean>(() => !cachedInitial);

  const fetchGallery = useCallback(async (category: string) => {
    try {
      const cached = dataCache.getGallery(category);
      if (!cached) {
        setLoading(true);
      } else {
        setItems(cached);
      }

      // Fetch fresh data in background or foreground
      const data = await dataCache.getOrFetchGallery(category, true);
      setItems(data);
    } catch {
      // Keep displaying existing cached items on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGallery(selectedCategory);
  }, [selectedCategory, fetchGallery]);

  // Real-time synchronization: automatically updates when photos are modified
  useRealtimeSync(['gallery'], () => {
    fetchGallery(selectedCategory);
  });

  const handlePhotoClick = (item: GalleryItem) => {
    setSelectedItem(item);
    setIsViewerOpen(true);
  };

  const getCategoryLabel = (cat: string) => {
    if (cat === 'Semua' || cat === 'All') return t.gallery.all;
    if (cat === 'Kegiatan' || cat === 'Activities') return t.gallery.activities;
    if (cat === 'Dokumentasi' || cat === 'Documentation') return t.gallery.documentation;
    if (cat === 'Prestasi' || cat === 'Achievements') return t.gallery.achievements;
    if (cat === 'Event Sekolah' || cat === 'School Events') return t.gallery.schoolEvents;
    return cat;
  };

  // Ensure any category already in the database is visible in filter tabs
  const categoryTabs = useMemo(() => {
    const presentCategories = new Set<string>();
    items.forEach((item) => {
      if (item.category) presentCategories.add(item.category);
    });
    const combined = [...STANDARD_CATEGORIES];
    presentCategories.forEach((cat) => {
      if (!combined.includes(cat)) {
        combined.push(cat);
      }
    });
    return combined;
  }, [items]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <div className="section-tag">{t.gallery.pageTag}</div>
        <h1 className="section-title">{t.gallery.pageTitle}</h1>
        <p className="section-subtitle">
          {t.gallery.pageSubtitle}
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
        {categoryTabs.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="btn btn-sm"
              style={{
                backgroundColor: isActive ? 'var(--primary-600)' : 'var(--gray-100)',
                color: isActive ? '#ffffff' : 'var(--gray-700)',
                fontWeight: isActive ? 700 : 500,
                borderRadius: 'var(--radius-full)',
                padding: '0.45rem 1.15rem',
                transition: 'all var(--transition-fast)',
                border: '1px solid transparent',
              }}
            >
              {getCategoryLabel(cat)}
            </button>
          );
        })}
      </div>

      {/* Photos Grid */}
      {loading && items.length === 0 ? (
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
          title={t.gallery.noPhotosTitle}
          description={t.gallery.noPhotosDesc}
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
            <ScrollReveal key={item.id} delay={idx * 40}>
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
