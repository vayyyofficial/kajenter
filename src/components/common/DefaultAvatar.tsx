import React from 'react';

export interface DefaultAvatarProps {
  size?: number | string;
  className?: string;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  alt?: string;
}

/**
 * Modern, clean, minimal line-art outline vector avatar for Members (Siswa & Guru).
 * Consistent with Simple Icons / modern minimalist design systems.
 * Uses no native OS emoji and no realistic human photos.
 */
export const DefaultAvatar: React.FC<DefaultAvatarProps> = ({
  size = '100%',
  className = '',
  color = 'var(--primary-600, #dc2626)',
  strokeWidth = 1.6,
  style,
  alt = 'Default Silhouette Avatar',
}) => {
  return (
    <svg
      role="img"
      aria-label={alt}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`default-avatar-vector ${className}`}
      style={{
        display: 'block',
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        ...style,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="8" r="4.25" />
      <path d="M4.5 20.25c0-3.75 3.35-6.75 7.5-6.75s7.5 3 7.5 6.75" />
    </svg>
  );
};

export default DefaultAvatar;
