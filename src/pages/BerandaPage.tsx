import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Users,
  Image as ImageIcon,
  Globe,
  Sparkles,
  Server,
  Network,
  ShieldCheck,
  GraduationCap,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';
import { GalleryItem } from '../types';
import { BRANDING } from '../config/branding';
import { GalleryViewerModal } from '../components/gallery/GalleryViewerModal';
import { CountUpNumber } from '../components/common/CountUpNumber';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { Skeleton } from '../components/common/Skeleton';
import { useRealtimeSync } from '../context/SyncContext';

interface BerandaPageProps {
  onNavigate: (route: string) => void;
}

export const BerandaPage: React.FC<BerandaPageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalGuru: 0,
    galleryCount: 0,
    socialCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [featuredGallery, setFeaturedGallery] = useState<GalleryItem[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const fetchStatsAndFeatured = React.useCallback(() => {
    Promise.all([
      api.members.getAll().then((res) => {
        if (res.success) {
          setStats((prev) => ({
            ...prev,
            totalSiswa: res.data.totalSiswa,
            totalGuru: res.data.totalGuru,
          }));
        }
      }),
      api.gallery.getAll().then((res) => {
        if (res.success) {
          setStats((prev) => ({ ...prev, galleryCount: res.data.length }));
          setFeaturedGallery(res.data.slice(0, 3));
        }
      }),
      api.social.getActive().then((res) => {
        if (res.success) {
          setStats((prev) => ({ ...prev, socialCount: res.data.length }));
        }
      }),
    ]).finally(() => setLoading(false));
  }, []);

  // Live database stats initial fetch
  useEffect(() => {
    fetchStatsAndFeatured();
  }, [fetchStatsAndFeatured]);

  // Real-time synchronization across all devices
  useRealtimeSync(['gallery', 'members', 'social'], () => {
    fetchStatsAndFeatured();
  });

  const handleOpenPhoto = (item: GalleryItem) => {
    setSelectedPhoto(item);
    setIsPhotoModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4.5rem' }}>
      {/* ========================================================= */}
      {/* 1. Hero Section with Stagger Animation (Requirement #9)   */}
      {/* Identity: X ICP TKJ — SMK Telkom Malang                   */}
      {/* ========================================================= */}
      <section
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--gray-200)',
          padding: 'clamp(2.5rem, 5vw, 4.5rem) clamp(1.5rem, 4vw, 3.5rem)',
          boxShadow: 'var(--shadow-md)',
          position: 'relative',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          alignItems: 'center',
          gap: '3rem',
        }}
      >
        {/* Subtle decorative background circle */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 420,
            height: 420,
            borderRadius: '50%',
            backgroundColor: 'var(--primary-50)',
            opacity: 0.7,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        {/* Hero Left Content with Stagger Animations */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            className="section-tag"
            style={{
              marginBottom: '1.25rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Sparkles size={14} />
            <span>Portal Resmi Kelas Unggulan</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)',
              fontWeight: 800,
              color: 'var(--gray-900)',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              marginBottom: '0.65rem',
            }}
          >
            {BRANDING.name}
          </h1>

          <div
            style={{
              fontSize: 'clamp(1.15rem, 2.2vw, 1.45rem)',
              color: 'var(--primary-600)',
              fontWeight: 800,
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>{BRANDING.school}</span>
          </div>

          <p
            style={{
              fontSize: '1rem',
              color: 'var(--gray-600)',
              fontWeight: 600,
              marginBottom: '1rem',
              lineHeight: 1.4,
            }}
          >
            {BRANDING.program}
          </p>

          <p
            style={{
              fontSize: '0.975rem',
              color: 'var(--gray-600)',
              lineHeight: 1.65,
              maxWidth: '560px',
              marginBottom: '2rem',
            }}
          >
            Pusat dokumentasi kegiatan kejuruan, direktori resmi guru dan seluruh siswa, serta kanal komunikasi terpadu kelas {BRANDING.name} {BRANDING.school}.
          </p>

          {/* Action CTAs with Interactive Hover */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
            <button
              onClick={() => onNavigate('galeri')}
              className="btn btn-primary btn-lg"
              style={{ fontWeight: 700 }}
            >
              <span>Jelajahi Galeri</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => onNavigate('anggota')}
              className="btn btn-secondary btn-lg"
              style={{ fontWeight: 600 }}
            >
              <Users size={18} />
              <span>Direktori Anggota</span>
            </button>
          </div>
        </div>

        {/* Hero Right Visual: Class Crest with Subtle Ambient Float (Requirement #9) */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            className="animate-float"
            style={{
              position: 'relative',
              padding: '2rem',
              backgroundColor: 'var(--gray-50)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--gray-200)',
              boxShadow: 'var(--shadow-lg)',
              textAlign: 'center',
              width: '100%',
              maxWidth: '380px',
            }}
          >
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: '50%',
                overflow: 'hidden',
                margin: '0 auto 1.5rem auto',
                border: '4px solid #ffffff',
                boxShadow: '0 8px 24px rgba(220, 38, 38, 0.25)',
                backgroundColor: '#ffffff',
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <img
                src={BRANDING.logoUrl}
                alt={BRANDING.fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '0.2rem' }}>
              {BRANDING.name}
            </h3>

            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-700)', marginBottom: '0.85rem' }}>
              {BRANDING.school}
            </div>

            <span
              style={{
                display: 'inline-block',
                backgroundColor: 'var(--primary-100)',
                color: 'var(--primary-800)',
                fontWeight: 700,
                fontSize: '0.78rem',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                marginBottom: '1rem',
              }}
            >
              International Class Program
            </span>

            <div
              style={{
                borderTop: '1px solid var(--gray-200)',
                paddingTop: '1rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                textAlign: 'left',
                fontSize: '0.8rem',
                color: 'var(--gray-600)',
              }}
            >
              <div>
                <span style={{ color: 'var(--gray-400)', display: 'block', fontSize: '0.725rem' }}>Jurusan</span>
                <strong style={{ color: 'var(--gray-900)', lineHeight: 1.25, display: 'block' }}>
                  Teknik Komputer<br />dan Jaringan
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--gray-400)', display: 'block', fontSize: '0.725rem' }}>Tahun Ajaran</span>
                <strong style={{ color: 'var(--gray-900)' }}>2026 / 2027</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. Real Live Statistics Grid with Count-Up (Requirement #27) */}
      {/* ========================================================= */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Siswa */}
        <ScrollReveal delay={0}>
          <div className="card card-hover" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Users size={26} />
            </div>
            <div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1.1 }}>
                {loading ? <Skeleton width="60px" height="36px" /> : <CountUpNumber value={stats.totalSiswa} durationMs={1000} />}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: '0.2rem' }}>
                Siswa Terdaftar
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Guru */}
        <ScrollReveal delay={75}>
          <div className="card card-hover" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <GraduationCap size={26} />
            </div>
            <div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1.1 }}>
                {loading ? <Skeleton width="40px" height="36px" /> : <CountUpNumber value={stats.totalGuru} durationMs={700} />}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: '0.2rem' }}>
                Tenaga Pendidik
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Galeri */}
        <ScrollReveal delay={150}>
          <div className="card card-hover" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ImageIcon size={26} />
            </div>
            <div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1.1 }}>
                {loading ? <Skeleton width="50px" height="36px" /> : <CountUpNumber value={stats.galleryCount} durationMs={1000} />}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: '0.2rem' }}>
                Dokumentasi Kegiatan
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Social */}
        <ScrollReveal delay={225}>
          <div className="card card-hover" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Globe size={26} />
            </div>
            <div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1.1 }}>
                {loading ? <Skeleton width="40px" height="36px" /> : <CountUpNumber value={stats.socialCount} durationMs={800} />}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: '0.2rem' }}>
                Media Sosial Aktif
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ========================================================= */}
      {/* 3. Featured Gallery Section with Scroll Reveal (Req #8 & 11) */}
      {/* ========================================================= */}
      <ScrollReveal>
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div className="section-tag">Dokumentasi Terkini</div>
              <h2 className="section-title">Aktivitas & Praktikum Kelas</h2>
              <p className="section-subtitle">
                Momen penting praktikum jaringan, sertifikasi internasional, dan kegiatan kebersamaan X ICP TKJ di {BRANDING.school}.
              </p>
            </div>

            <button
              onClick={() => onNavigate('galeri')}
              className="btn btn-outline"
              style={{ fontWeight: 700 }}
            >
              <span>Buka Seluruh Galeri</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1.5rem' }}>
              <div className="card"><Skeleton height="200px" /><div style={{ padding: '1.25rem' }}><Skeleton height="20px" width="70%" /><div style={{ marginTop: '0.5rem' }}><Skeleton height="14px" width="40%" /></div></div></div>
              <div className="card"><Skeleton height="200px" /><div style={{ padding: '1.25rem' }}><Skeleton height="20px" width="70%" /><div style={{ marginTop: '0.5rem' }}><Skeleton height="14px" width="40%" /></div></div></div>
              <div className="card"><Skeleton height="200px" /><div style={{ padding: '1.25rem' }}><Skeleton height="20px" width="70%" /><div style={{ marginTop: '0.5rem' }}><Skeleton height="14px" width="40%" /></div></div></div>
            </div>
          ) : featuredGallery.length === 0 ? (
            <div className="empty-state">
              <ImageIcon className="empty-state-icon" />
              <h3 className="empty-state-title">Belum ada dokumentasi kegiatan</h3>
              <p className="empty-state-desc">Foto kegiatan terbaru akan segera diunggah oleh pengurus kelas.</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {featuredGallery.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenPhoto(item)}
                  className="card card-hover"
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }}
                >
                  <div style={{ height: '200px', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--gray-100)' }}>
                    <img
                      src={item.image_path}
                      alt={item.title}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem' }}>
                      <span className="badge badge-primary">{item.category}</span>
                    </div>
                  </div>

                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                      <Calendar size={13} color="var(--primary-600)" />
                      <span>
                        {new Date(item.event_date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1.35, marginBottom: '0.5rem' }}>
                      {item.title}
                    </h3>

                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--gray-600)',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        marginTop: 'auto',
                      }}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </ScrollReveal>

      {/* ========================================================= */}
      {/* 4. Pillars of Expertise (Teknik Komputer & Jaringan)       */}
      {/* ========================================================= */}
      <ScrollReveal>
        <section
          style={{
            backgroundColor: 'var(--gray-50)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--gray-200)',
            padding: 'clamp(2rem, 4vw, 3.5rem)',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 2.5rem auto' }}>
            <div className="section-tag" style={{ margin: '0 auto 0.75rem auto' }}>
              Konsentrasi Kejuruan
            </div>
            <h2 className="section-title">Pilar Kompetensi Teknik Komputer & Jaringan</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              Kurikulum unggulan berbasis standar industri di {BRANDING.school} untuk mencetak tenaga ahli infrastruktur IT yang kompeten.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.5rem',
            }}
          >
            <div className="card card-hover" style={{ padding: '1.75rem', borderTop: '4px solid var(--primary-600)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Network size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
                Computer Networking
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', lineHeight: 1.6 }}>
                Konfigurasi router dan switch enterprise (Cisco & Mikrotik), routing dinamis BGP/OSPF, VLAN trunking, dan manajemen bandwidth.
              </p>
            </div>

            <div className="card card-hover" style={{ padding: '1.75rem', borderTop: '4px solid var(--primary-600)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Server size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
                Server & Cloud Systems
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', lineHeight: 1.6 }}>
                Administrasi Linux Server (Debian/Ubuntu), virtualisasi Proxmox VE, containerization Docker, serta deployment layanan web terdistribusi.
              </p>
            </div>

            <div className="card card-hover" style={{ padding: '1.75rem', borderTop: '4px solid var(--primary-600)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <ShieldCheck size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
                Cyber Security
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', lineHeight: 1.6 }}>
                Analisis traffic jaringan dengan Wireshark, hardening firewall iptables, pertahanan terhadap serangan siber, serta mitigasi insiden keamanan data.
              </p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ========================================================= */}
      {/* 6. Call to Action (Contact Banner with Scroll Reveal)     */}
      {/* ========================================================= */}
      <ScrollReveal>
        <section
          style={{
            background: 'linear-gradient(135deg, var(--primary-700), #991b1b)',
            borderRadius: 'var(--radius-lg)',
            color: '#ffffff',
            padding: 'clamp(2rem, 4vw, 3.5rem)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '2rem',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
              Terhubung Dengan {BRANDING.name}
            </h2>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.95)', marginBottom: '0.5rem' }}>
              {BRANDING.school}
            </div>
            <p style={{ fontSize: '0.925rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.6 }}>
              Ikuti kabar kegiatan, proyek kejuruan, dan dokumentasi eksklusif melalui media sosial resmi kelas kami.
            </p>
          </div>

          <button
            onClick={() => onNavigate('contact')}
            className="btn btn-lg"
            style={{
              backgroundColor: '#ffffff',
              color: 'var(--primary-700)',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <span>Kunjungi Kanal Media Sosial</span>
            <ArrowRight size={18} />
          </button>
        </section>
      </ScrollReveal>

      {/* Interactive Gallery Viewer Modal */}
      <GalleryViewerModal
        item={selectedPhoto}
        isOpen={isPhotoModalOpen}
        onClose={() => {
          setIsPhotoModalOpen(false);
          setSelectedPhoto(null);
        }}
      />
    </div>
  );
};
