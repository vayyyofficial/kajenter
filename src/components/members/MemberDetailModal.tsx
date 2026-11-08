import React, { useState, useEffect } from 'react';
import { Mail, Calendar, MapPin, Phone } from 'lucide-react';
import { Member } from '../../types';
import { Modal } from '../common/Modal';
import { MemberPhotoModal } from './MemberPhotoModal';
import { getMemberPhotoUrl, getDefaultAvatar } from '../../utils/avatar';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';

interface MemberDetailModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  isOpen,
  onClose,
}) => {
  const { language, t } = useLanguage();
  const { addToast } = useNotifications();
  const [imgError, setImgError] = useState(false);
  const [isFullPhotoOpen, setIsFullPhotoOpen] = useState(false);

  useEffect(() => {
    setIsFullPhotoOpen(false);
    setImgError(false);
  }, [member, isOpen]);

  if (!member) return null;

  const { src: initialPhotoSrc } = getMemberPhotoUrl(member);
  const photoSrc = imgError ? getDefaultAvatar() : initialPhotoSrc;

  const formattedBirthDate = member.birth_date
    ? new Date(member.birth_date).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-';

  // Secure & fallback-safe phone auto-copy
  const handleCopyPhone = async (phone: string) => {
    if (!phone) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(phone);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = phone;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      addToast('success', t.memberDetail.phoneCopied);
    } catch {
      addToast('error', t.memberDetail.phoneCopyFailed);
    }
  };

  const isTeacher = member.member_type === 'guru';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isTeacher ? t.memberDetail.teacherHeader : t.memberDetail.studentHeader}
        size="md"
      >
        <div
          className="member-modal-content"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.75rem',
            alignItems: 'center',
          }}
        >
          {/* Left Side: Avatar, Name, and Role Highlights */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* 
              Requirement #1 & #2:
              Clicking the photo opens the Full Photo Viewer.
              Strictly NO zoom icons, NO buttons, NO overlays, NO "Lihat Foto" text.
              Looks completely natural like a regular profile photo.
            */}
            <div
              onClick={() => setIsFullPhotoOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsFullPhotoOpen(true);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${t.memberDetail.clickToViewFullPhoto} - ${member.full_name}`}
              title={t.memberDetail.clickToViewFullPhoto}
              style={{
                width: 130,
                height: 130,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '4px solid var(--border-color)',
                boxShadow: 'var(--shadow-lg)',
                backgroundColor: 'var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                flexShrink: 0,
                cursor: 'pointer',
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.04)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
            >
              <img
                src={photoSrc}
                alt={member.full_name}
                onError={() => {
                  if (!imgError) setImgError(true);
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  pointerEvents: 'none',
                }}
                draggable={false}
              />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0', lineHeight: 1.25 }}>
              {member.full_name}
            </h3>

            {member.nickname && member.member_type !== 'guru' && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0' }}>
                {t.memberDetail.nickname}: <strong style={{ color: 'var(--text-main)' }}>{member.nickname}</strong>
              </p>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span
                className={
                  isTeacher
                    ? 'badge badge-primary'
                    : member.role === 'Developer'
                    ? 'badge badge-developer'
                    : member.role !== 'Siswa'
                    ? 'badge badge-warning'
                    : 'badge badge-neutral'
                }
                style={{ fontSize: '0.8125rem', padding: '0.35rem 0.85rem', fontWeight: 700 }}
              >
                {isTeacher
                  ? `${t.members.roleHomeroom} • ${member.role}`
                  : member.role === 'Siswa'
                  ? t.members.roleStudent
                  : member.role}
              </span>

              {member.attendance_number && (
                <span className="badge badge-neutral" style={{ fontSize: '0.8125rem', padding: '0.35rem 0.85rem' }}>
                  {t.members.attendanceBadge(member.attendance_number)}
                </span>
              )}
            </div>
          </div>

          {/* Right Side: Detailed Metadata Cards */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              fontSize: '0.875rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(220, 38, 38, 0.12)',
                  color: 'var(--primary-500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MapPin size={18} />
              </div>
              <div>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                  {t.memberDetail.birthPlace}
                </span>
                <strong style={{ color: 'var(--text-main)' }}>{member.birth_place || '-'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(220, 38, 38, 0.12)',
                  color: 'var(--primary-500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Calendar size={18} />
              </div>
              <div>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                  {t.memberDetail.birthDate}
                </span>
                <strong style={{ color: 'var(--text-main)' }}>{formattedBirthDate}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(220, 38, 38, 0.12)',
                  color: 'var(--primary-500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Mail size={18} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                  {t.memberDetail.email}
                </span>
                <strong style={{ color: 'var(--text-main)', wordBreak: 'break-all' }}>{member.email || '-'}</strong>
              </div>
            </div>

            {member.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(220, 38, 38, 0.12)',
                    color: 'var(--primary-500)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Phone size={18} />
                </div>
                <div>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                    {t.memberDetail.phone}
                  </span>
                  {/*
                    Requirement #9 & #10:
                    Clicking the phone number itself copies it automatically.
                    Strictly NO copy buttons, NO clipboard icons, NO emoji, NO "Copy" text.
                  */}
                  <strong
                    onClick={() => handleCopyPhone(member.phone!)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCopyPhone(member.phone!);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    title={language === 'en' ? 'Click to copy phone number' : 'Klik untuk menyalin nomor telepon'}
                    style={{
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      userSelect: 'all',
                      transition: 'color 0.15s ease',
                      outline: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-500)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
                  >
                    {member.phone}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* 
        Dedicated Full Photo Viewer Modal (Photo ONLY, no other info)
      */}
      <MemberPhotoModal
        photoSrc={photoSrc}
        altText={member.full_name}
        isOpen={isFullPhotoOpen}
        onClose={() => setIsFullPhotoOpen(false)}
      />
    </>
  );
};
