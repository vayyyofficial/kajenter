import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

interface MemberPhotoModalProps {
  photoSrc: string | null;
  altText: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Full Photo Viewer Modal for Members.
 * Strictly focused on displaying the member's profile picture in full resolution.
 * Displays NO metadata (no name, role, email, phone, etc.) as required.
 */
export const MemberPhotoModal: React.FC<MemberPhotoModalProps> = ({
  photoSrc,
  altText,
  isOpen,
  onClose,
}) => {
  // Lock body scroll while full photo viewer is active
  useEffect(() => {
    if (isOpen) {
      lockScroll();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        unlockScroll();
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !photoSrc || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="member-photo-modal-portal"
      role="dialog"
      aria-modal="true"
      aria-label={`Foto Penuh: ${altText}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100005, // Above standard modals (which are 99999)
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(0.75rem, 3vw, 2rem)',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Backdrop Overlay with Smooth Blur */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(5, 10, 24, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 1,
          animation: 'fadeIn 200ms ease-out',
        }}
        aria-hidden="true"
      />

      {/* 2. Photo Stage Container */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        {/* Floating Close Button (Fixed at top-right of viewport for reliable tapping on all devices) */}
        <button
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 'clamp(0.85rem, 2vh, 1.5rem)',
            right: 'clamp(0.85rem, 2vw, 1.5rem)',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease, transform 0.15s ease',
            zIndex: 20,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--primary-600)';
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.18)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Tutup Foto (ESC)"
          aria-label="Tutup Foto"
        >
          <X size={22} />
        </button>

        {/* The Full Photo Image Frame */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            borderRadius: 'clamp(12px, 2vw, 20px)',
            overflow: 'hidden',
            backgroundColor: 'transparent',
            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'scaleUp 220ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <img
            src={photoSrc}
            alt={altText}
            style={{
              display: 'block',
              maxWidth: 'min(90vw, 760px)',
              maxHeight: 'min(80vh, 760px)',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              userSelect: 'none',
            }}
            draggable={false}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};
