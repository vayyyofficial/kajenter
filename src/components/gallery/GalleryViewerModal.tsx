import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  RotateCcw,
  Calendar,
  Tag,
  Camera,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { GalleryItem } from '../../types';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

interface GalleryViewerModalProps {
  item: GalleryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Enterprise Responsive Gallery Viewer Modal
 * Supports:
 * - Multi-photo browsing with Previous / Next navigation
 * - Prominent 1 / N counter & thumbnail strip
 * - Keyboard navigation (ArrowLeft, ArrowRight, Escape)
 * - Mobile touch swipe (Left/Right)
 * - Desktop mouse-wheel zoom & pan (subtle & intuitive)
 * - Dedicated mobile-optimized layout with vertical scrolling inside popup
 * - Strict background page scroll-locking (lockScroll)
 */
export const GalleryViewerModal: React.FC<GalleryViewerModalProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const imageAreaRef = useRef<HTMLDivElement>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // Extract all photos from item
  const photos: string[] = item?.photos && item.photos.length > 0
    ? item.photos
    : item?.image_path
    ? [item.image_path]
    : [];

  const totalPhotos = photos.length;
  const currentPhotoUrl = photos[currentIndex] || item?.image_path || '';

  // Reset state when modal opens or item changes
  useEffect(() => {
    setCurrentIndex(0);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [item, isOpen]);

  // Lock background scroll while modal is active
  useEffect(() => {
    if (isOpen) {
      lockScroll();
      return () => {
        unlockScroll();
      };
    }
  }, [isOpen]);

  const goToPrev = useCallback(() => {
    if (totalPhotos <= 1) return;
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalPhotos - 1));
  }, [totalPhotos]);

  const goToNext = useCallback(() => {
    if (totalPhotos <= 1) return;
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setCurrentIndex((prev) => (prev < totalPhotos - 1 ? prev + 1 : 0));
  }, [totalPhotos]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, goToPrev, goToNext]);

  // Mouse Wheel Zoom exclusively on the photo area
  useEffect(() => {
    const el = imageAreaRef.current;
    if (!el || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const step = 0.15;
      const zoomChange = e.deltaY < 0 ? step : -step;

      setScale((prevScale) => {
        let nextScale = Math.round((prevScale + zoomChange) * 100) / 100;
        if (nextScale <= 1.05) {
          setPosition({ x: 0, y: 0 });
          return 1.0;
        }
        if (nextScale >= 3.0) return 3.0;
        return nextScale;
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen]);

  if (!isOpen || !item || typeof document === 'undefined') return null;

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Dragging / Panning when scale > 1
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    const maxBound = (scale - 1) * 320;
    const newX = Math.max(Math.min(e.clientX - dragStart.x, maxBound), -maxBound);
    const newY = Math.max(Math.min(e.clientY - dragStart.y, maxBound), -maxBound);
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Swipe for mobile navigation (when scale === 1)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      if (scale > 1) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (scale > 1 && isDragging && e.touches.length === 1) {
      e.preventDefault();
      const maxBound = (scale - 1) * 320;
      const newX = Math.max(Math.min(e.touches[0].clientX - dragStart.x, maxBound), -maxBound);
      const newY = Math.max(Math.min(e.touches[0].clientY - dragStart.y, maxBound), -maxBound);
      setPosition({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (scale === 1 && touchStartPos.current && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartPos.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartPos.current.y;

      // Horizontal swipe threshold: 40px, and horizontal move must dominate vertical move
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        if (deltaX < 0) {
          goToNext();
        } else {
          goToPrev();
        }
      }
    }
    touchStartPos.current = null;
    setIsDragging(false);
  };

  return createPortal(
    <div
      className="gallery-modal-portal"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseUp={handleMouseUp}
    >
      {/* 1. Neutral Dark Blurred Backdrop */}
      <div
        className="gallery-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(5, 10, 24, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 1,
        }}
        aria-hidden="true"
      />

      {/* 2. Interactive Stage Container */}
      <div
        className="gallery-stage"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(0.5rem, 2vw, 1.5rem)',
          boxSizing: 'border-box',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          className="gallery-dialog-container"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '1180px',
            maxHeight: '92vh',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            borderRadius: 'clamp(14px, 2vw, 24px)',
            overflow: 'hidden',
            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top Bar for Mobile & Desktop (Clean branding + Close Button) */}
          <div
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#090d16',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
              <span
                style={{
                  backgroundColor: 'rgba(220, 38, 38, 0.2)',
                  color: 'var(--primary-400)',
                  border: '1px solid rgba(220, 38, 38, 0.35)',
                  padding: '0.2rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                }}
              >
                {item.category || 'Dokumentasi'}
              </span>

              {totalPhotos > 1 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'rgba(255, 255, 255, 0.75)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    padding: '0.2rem 0.55rem',
                    borderRadius: 'var(--radius-full)',
                    flexShrink: 0,
                  }}
                >
                  <Layers size={12} />
                  <span>{totalPhotos} Foto</span>
                </span>
              )}

              <span
                style={{
                  fontSize: '0.85rem',
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.title}
              </span>
            </div>

            <button
              onClick={onClose}
              style={{
                minWidth: '40px',
                minHeight: '40px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                borderRadius: '50%',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease, transform 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.8)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)')}
              title="Tutup (ESC)"
              aria-label="Tutup Galeri"
            >
              <X size={20} />
            </button>
          </div>

          {/* Main Body: Responsive Layout (Flex-col on Mobile, Side-by-Side on Desktop) */}
          <div
            className="gallery-modal-body"
            style={{
              display: 'flex',
              flex: 1,
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            {/* ========================================================= */}
            {/* Left: Image Viewer Stage with Navigation & Zoom Controls  */}
            {/* ========================================================= */}
            <div
              className="gallery-image-column"
              style={{
                flex: '1 1 65%',
                backgroundColor: '#020617',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                minWidth: 0,
                minHeight: 0,
              }}
            >
              {/* Photo Display Viewport */}
              <div
                ref={imageAreaRef}
                style={{
                  position: 'relative',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  minHeight: 'clamp(240px, 42vh, 560px)',
                  maxHeight: '68vh',
                  userSelect: 'none',
                  cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                  touchAction: scale > 1 ? 'none' : 'pan-y',
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  key={currentPhotoUrl}
                  src={currentPhotoUrl}
                  alt={`${item.title} - Foto ke-${currentIndex + 1}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                    transition: isDragging ? 'none' : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                    pointerEvents: scale > 1 ? 'auto' : 'none',
                  }}
                  draggable={false}
                />

                {/* Desktop Arrow Buttons (Left & Right overlay) */}
                {totalPhotos > 1 && (
                  <>
                    <button
                      onClick={goToPrev}
                      className="gallery-arrow-desktop btn-arrow-left"
                      style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
                        zIndex: 10,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--primary-600)';
                        e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.75)';
                        e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                      }}
                      title="Foto Sebelumnya (Arrow Left)"
                      aria-label="Foto Sebelumnya"
                    >
                      <ChevronLeft size={24} />
                    </button>

                    <button
                      onClick={goToNext}
                      className="gallery-arrow-desktop btn-arrow-right"
                      style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
                        zIndex: 10,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--primary-600)';
                        e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.75)';
                        e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                      }}
                      title="Foto Selanjutnya (Arrow Right)"
                      aria-label="Foto Selanjutnya"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}

                {/* Floating Zoom Indicator & Reset Control */}
                {scale > 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(15, 23, 42, 0.92)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 'var(--radius-full)',
                      padding: '0.35rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      fontSize: '0.75rem',
                      color: '#ffffff',
                      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.5)',
                      zIndex: 20,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontWeight: 800, color: 'var(--primary-400)' }}>
                      {Math.round(scale * 100)}%
                    </span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.35)' }}>•</span>
                    <button
                      onClick={handleResetZoom}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: 'var(--primary-400)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.725rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(220, 38, 38, 0.2)',
                        border: 'none',
                      }}
                      title="Kembalikan ukuran normal"
                    >
                      <RotateCcw size={12} />
                      <span>Reset</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Multi-Photo Bar: Navigation Arrows + Counter (Mobile & Desktop Friendly) */}
              {totalPhotos > 1 && (
                <div
                  style={{
                    backgroundColor: '#090d16',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '0.65rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    zIndex: 5,
                  }}
                >
                  <button
                    onClick={goToPrev}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      padding: '0.45rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      minHeight: '40px',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
                  >
                    <ChevronLeft size={18} />
                    <span>Sebelumnya</span>
                  </button>

                  {/* Prominent Counter e.g. "1 / 5" */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      backgroundColor: 'rgba(220, 38, 38, 0.25)',
                      border: '1px solid rgba(220, 38, 38, 0.45)',
                      padding: '0.35rem 0.95rem',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      color: '#ffffff',
                      letterSpacing: '0.05em',
                    }}
                  >
                    <span style={{ color: 'var(--primary-400)' }}>{currentIndex + 1}</span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>/</span>
                    <span>{totalPhotos}</span>
                  </div>

                  <button
                    onClick={goToNext}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      padding: '0.45rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      minHeight: '40px',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
                  >
                    <span>Selanjutnya</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {/* Thumbnail Strip (Quick Jump between photos) */}
              {totalPhotos > 1 && (
                <div
                  style={{
                    backgroundColor: '#020617',
                    padding: '0.5rem 1rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {photos.map((pUrl, idx) => {
                    const isActive = idx === currentIndex;
                    return (
                      <button
                        key={`${pUrl}-${idx}`}
                        onClick={() => {
                          setScale(1);
                          setPosition({ x: 0, y: 0 });
                          setCurrentIndex(idx);
                        }}
                        style={{
                          width: '52px',
                          height: '38px',
                          padding: 0,
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          border: isActive ? '2px solid var(--primary-500)' : '2px solid transparent',
                          opacity: isActive ? 1 : 0.6,
                          backgroundColor: '#0f172a',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                          transform: isActive ? 'scale(1.05)' : 'none',
                        }}
                        title={`Lihat Foto #${idx + 1}`}
                      >
                        <img
                          src={pUrl}
                          alt={`Thumbnail ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* Right: Metadata Panel (Vertical Scroll Enabled on mobile) */}
            {/* ========================================================= */}
            <div
              className="gallery-metadata-column"
              style={{
                flex: '1 1 35%',
                backgroundColor: '#ffffff',
                color: 'var(--gray-900)',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                maxHeight: '100%',
              }}
            >
              <div
                style={{
                  padding: 'clamp(1rem, 2.5vw, 1.75rem)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  flex: 1,
                }}
              >
                {/* Title & Identity */}
                <div>
                  <h3
                    style={{
                      fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
                      fontWeight: 800,
                      color: 'var(--gray-900)',
                      lineHeight: 1.35,
                      margin: '0 0 0.5rem 0',
                    }}
                  >
                    {item.title}
                  </h3>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.85rem',
                      color: 'var(--primary-600)',
                      fontWeight: 700,
                    }}
                  >
                    <Tag size={15} />
                    <span>{item.event_identity}</span>
                  </div>
                </div>

                {/* Metadata Card: Tanggal & Dokumentator */}
                <div
                  style={{
                    backgroundColor: 'var(--gray-50)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                    fontSize: '0.8125rem',
                    border: '1px solid var(--gray-200)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--gray-600)' }}>
                    <Calendar size={16} color="var(--primary-600)" />
                    <span>Tanggal:</span>
                    <strong style={{ color: 'var(--gray-900)' }}>
                      {new Date(item.event_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--gray-600)' }}>
                    <Camera size={16} color="var(--primary-600)" />
                    <span>Dokumentator:</span>
                    <strong style={{ color: 'var(--gray-900)' }}>
                      {item.dokumentator || item.created_by || 'Tim Dokumentasi'}
                    </strong>
                  </div>

                  {totalPhotos > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--gray-600)' }}>
                      <Layers size={16} color="var(--primary-600)" />
                      <span>Sedang Melihat:</span>
                      <strong style={{ color: 'var(--primary-600)' }}>
                        Foto ke-{currentIndex + 1} dari {totalPhotos}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h4
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      color: 'var(--gray-800)',
                      margin: '0 0 0.5rem 0',
                    }}
                  >
                    Deskripsi Kegiatan
                  </h4>
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--gray-600)',
                      lineHeight: 1.65,
                      whiteSpace: 'pre-line',
                      margin: 0,
                    }}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
