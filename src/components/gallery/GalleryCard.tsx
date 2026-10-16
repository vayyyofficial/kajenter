import React, { useState } from 'react';
import { Calendar, Tag, ZoomIn, Camera } from 'lucide-react';
import { GalleryItem } from '../../types';

interface GalleryCardProps {
  item: GalleryItem;
  onClick: (item: GalleryItem) => void;
}

export const GalleryCard: React.FC<GalleryCardProps> = ({ item, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div
      onClick={() => onClick(item)}
      className="card card-hover"
      style={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}
    >
      {/* Thumbnail Container */}
      <div
        style={{
          position: 'relative',
          paddingTop: '62.5%', // 16:10 aspect ratio
          backgroundColor: 'var(--gray-100)',
          overflow: 'hidden',
        }}
      >
        <img
          src={item.image_path}
          alt={item.title}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease, transform 300ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        />

        {/* Category Badge overlay */}
        <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 2 }}>
          <span
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              color: '#ffffff',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {item.category || 'Dokumentasi'}
          </span>
        </div>

        {/* Multi-Photo Count Badge */}
        {item.photos && item.photos.length > 1 && (
          <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 2 }}>
            <span
              style={{
                backgroundColor: 'rgba(220, 38, 38, 0.85)',
                color: '#ffffff',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span>{item.photos.length} Foto</span>
            </span>
          </div>
        )}

        {/* Hover zoom indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: '0.75rem',
            right: '0.75rem',
            backgroundColor: 'rgba(220, 38, 38, 0.9)',
            color: '#ffffff',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)',
            zIndex: 2,
          }}
        >
          <ZoomIn size={16} />
        </div>
      </div>

      {/* Card Info */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.75rem',
            color: 'var(--primary-600)',
            fontWeight: 700,
            marginBottom: '0.35rem',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          }}
        >
          <Tag size={13} />
          <span>{item.event_identity}</span>
        </div>

        <h3
          style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--gray-900)',
            lineHeight: 1.35,
            marginBottom: '0.5rem',
          }}
        >
          {item.title}
        </h3>

        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--gray-500)',
            lineHeight: 1.5,
            marginBottom: '1rem',
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.description}
        </p>

        <div
          style={{
            borderTop: '1px solid var(--gray-100)',
            paddingTop: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--gray-500)',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={13} color="var(--primary-600)" />
            <span>
              {new Date(item.event_date).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 600,
              color: 'var(--gray-700)',
            }}
            title={`Dokumentator: ${item.created_by}`}
          >
            <Camera size={13} color="var(--primary-600)" />
            <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.created_by}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
