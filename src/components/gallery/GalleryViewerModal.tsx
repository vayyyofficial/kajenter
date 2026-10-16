import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  RotateCcw,
  Calendar,
  Tag,
  User,
} from 'lucide-react';
import { GalleryItem } from '../../types';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

interface GalleryViewerModalProps {
  item: GalleryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Architectural Refactor of GalleryViewerModal using React Portal (mounted to document.body).
 * Solves stacking context traps, backdrop color leak, and body scroll lock.
 * Backdrop and Modal Dialog are strictly separate siblings to guarantee the modal content is never blurred.
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

  const imageAreaRef = useRef<HTMLDivElement>(null);
  const touchStartDist = useRef<number | null>(null);
  const initialScale = useRef<number>(1);

  // Reset transform when item or modal state changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [item, isOpen]);

  // Requirements #13, #16, #17: Background website scroll is disabled, restored smoothly on close
  useEffect(() => {
    if (isOpen) {
      lockScroll();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        unlockScroll();
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // Requirement #18: Mouse Wheel zoom exclusively on the PHOTO area
  // Scroll up -> Zoom In, Scroll down -> Zoom Out
  // Event strictly prevented so modal/page does NOT scroll when zooming image
  useEffect(() => {
    const el = imageAreaRef.current;
    if (!el || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const step = 0.12;
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

  // Mobile Touch Gestures: Pinch to zoom & touch pan (Requirement #19)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDist.current = dist;
      initialScale.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDist.current) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchStartDist.current;
      let next = Math.round(initialScale.current * ratio * 100) / 100;
      next = Math.min(Math.max(next, 1.0), 3.0);
      if (next <= 1.05) setPosition({ x: 0, y: 0 });
      setScale(next);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      e.preventDefault();
      const maxBound = (scale - 1) * 320;
      const newX = Math.max(Math.min(e.touches[0].clientX - dragStart.x, maxBound), -maxBound);
      const newY = Math.max(Math.min(e.touches[0].clientY - dragStart.y, maxBound), -maxBound);
      setPosition({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = () => {
    touchStartDist.current = null;
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
      {/* 1. Neutral Dark Blurred Backdrop (Separate sibling, no color extraction or blur leakage) */}
      <div
        className="gallery-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(10, 15, 29, 0.86)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 1,
          animation: 'fadeIn 220ms ease-out',
        }}
        aria-hidden="true"
      />

      {/* 2. Interactive Stage & Dialog Container (Above Backdrop) */}
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
          padding: 'clamp(0.75rem, 2.5vw, 1.75rem)',
          boxSizing: 'border-box',
          overflowY: 'auto',
          pointerEvents: 'auto',
        }}
      >
        <div
          className="gallery-dialog"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '1120px',
            maxHeight: '92vh',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            borderRadius: 'var(--radius-xl, 20px)',
            overflow: 'hidden',
            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            animation: 'scaleUp 240ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* ========================================================= */}
          {/* Left: Interactive Image Area (Wheel = Zoom In/Out)        */}
          {/* ========================================================= */}
          <div
            ref={imageAreaRef}
            style={{
              position: 'relative',
              backgroundColor: '#020617',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              minHeight: '380px',
              maxHeight: '88vh',
              userSelect: 'none',
              cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
              touchAction: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Main Image with Smooth Transform */}
            <img
              src={item.image_path}
              alt={item.title}
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transition: isDragging ? 'none' : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: scale > 1 ? 'auto' : 'none',
              }}
              draggable={false}
            />

            {/* Floating Zoom Indicator & Reset Control (Visible Only When Zoomed) */}
            {scale > 1 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '1rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.35rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  fontSize: '0.75rem',
                  color: '#ffffff',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.45)',
                  zIndex: 10,
                  pointerEvents: 'auto',
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

          {/* ========================================================= */}
          {/* Right: Metadata Panel (Vertical Scroll Enabled)           */}
          {/* ========================================================= */}
          <div
            style={{
              backgroundColor: '#ffffff',
              color: 'var(--gray-900)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            {/* Header with Category & Close Button */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--gray-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                backgroundColor: '#ffffff',
                zIndex: 5,
              }}
            >
              <span
                style={{
                  backgroundColor: 'var(--primary-50)',
                  color: 'var(--primary-700)',
                  padding: '0.3rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                {item.category || 'Dokumentasi'}
              </span>

              <button
                onClick={onClose}
                className="btn-icon"
                style={{
                  color: 'var(--gray-500)',
                  padding: '0.4rem',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Tutup (ESC)"
                aria-label="Tutup Detail Foto"
              >
                <X size={22} />
              </button>
            </div>

            {/* Description & Metadata Content */}
            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1.35, margin: 0 }}>
                  {item.title}
                </h3>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.875rem',
                    color: 'var(--primary-600)',
                    fontWeight: 700,
                    marginTop: '0.45rem',
                  }}
                >
                  <Tag size={15} />
                  <span>{item.event_identity}</span>
                </div>
              </div>

              {/* Event Metadata Information */}
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
                  <span>Tanggal Kegiatan:</span>
                  <strong style={{ color: 'var(--gray-900)' }}>
                    {new Date(item.event_date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--gray-600)' }}>
                  <User size={16} color="var(--primary-600)" />
                  <span>Dokumentator:</span>
                  <strong style={{ color: 'var(--gray-900)' }}>{item.created_by}</strong>
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--gray-800)', marginBottom: '0.5rem' }}>
                  Deskripsi Kegiatan
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', lineHeight: 1.65, whiteSpace: 'pre-line', margin: 0 }}>
                  {item.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
