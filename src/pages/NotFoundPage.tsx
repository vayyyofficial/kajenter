import React from 'react';
import { ArrowLeft, Compass } from 'lucide-react';
import { BRANDING } from '../config/branding';

interface NotFoundPageProps {
  onNavigate: (route: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '3rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '540px',
          width: '100%',
          padding: ' clamp(2rem, 5vw, 3.5rem) clamp(1.5rem, 4vw, 2.5rem)',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--gray-200)',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Class Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: 'var(--primary-50)',
            color: 'var(--primary-700)',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
            border: '1px solid var(--primary-100)',
          }}
        >
          <Compass size={15} />
          <span>{BRANDING.name} — {BRANDING.school}</span>
        </div>

        {/* 404 Large Display */}
        <div
          style={{
            fontSize: 'clamp(4rem, 10vw, 6.5rem)',
            fontWeight: 800,
            lineHeight: 1,
            color: 'var(--primary-600)',
            letterSpacing: '-0.04em',
            marginBottom: '0.75rem',
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: 'clamp(1.25rem, 3vw, 1.65rem)',
            fontWeight: 800,
            color: 'var(--gray-900)',
            marginBottom: '0.65rem',
            lineHeight: 1.3,
          }}
        >
          Halaman tidak ditemukan.
        </h1>

        <p
          style={{
            fontSize: '0.925rem',
            color: 'var(--gray-600)',
            lineHeight: 1.6,
            maxWidth: '420px',
            marginBottom: '2rem',
          }}
        >
          Tautan yang Anda tuju tidak tersedia atau telah dipindahkan. Silakan kembali ke halaman utama {BRANDING.name}.
        </p>

        {/* CTA Back to Home */}
        <button
          onClick={() => onNavigate('/beranda')}
          className="btn btn-primary btn-lg"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 700,
            borderRadius: 'var(--radius-full)',
            padding: '0.75rem 1.75rem',
          }}
        >
          <ArrowLeft size={18} />
          <span>Kembali ke Beranda</span>
        </button>
      </div>
    </div>
  );
};
