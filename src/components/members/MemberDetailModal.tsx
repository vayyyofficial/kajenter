import React, { useState } from 'react';
import { Mail, Calendar, MapPin, Phone, User, ShieldCheck } from 'lucide-react';
import { Member } from '../../types';
import { Modal } from '../common/Modal';

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
  const [imgError, setImgError] = useState(false);

  if (!member) return null;

  const photoSrc = member.photo_number
    ? (member.photo_number.startsWith('/') || member.photo_number.startsWith('http')
        ? member.photo_number
        : `/foto-anggota/${member.photo_number}.jpg`)
    : member.attendance_number
    ? `/foto-anggota/${String(member.attendance_number).padStart(2, '0')}.jpg`
    : null;

  const initials = member.full_name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const formattedBirthDate = member.birth_date
    ? new Date(member.birth_date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={member.member_type === 'guru' ? 'Profil Pendidik & Wali Kelas' : 'Profil Siswa X ICP TKJ'}
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
          <div
            style={{
              width: 130,
              height: 130,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid #ffffff',
              boxShadow: 'var(--shadow-lg)',
              backgroundColor: 'var(--primary-100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              flexShrink: 0,
            }}
          >
            {photoSrc && !imgError ? (
              <img
                src={photoSrc}
                alt={member.full_name}
                onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'var(--primary-50)',
                  color: 'var(--primary-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '2.2rem',
                }}
              >
                {initials || <User size={48} />}
              </div>
            )}
          </div>

          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--gray-900)', margin: '0 0 0.25rem 0', lineHeight: 1.25 }}>
            {member.full_name}
          </h3>

          {member.nickname && member.member_type !== 'guru' && (
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', margin: '0 0 0.75rem 0' }}>
              Nama Panggilan: <strong style={{ color: 'var(--gray-800)' }}>{member.nickname}</strong>
            </p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span className="badge badge-primary" style={{ fontSize: '0.8125rem', padding: '0.35rem 0.85rem' }}>
              {member.member_type === 'guru' ? `Wali Kelas • ${member.role}` : member.role}
            </span>
            {member.attendance_number && (
              <span className="badge badge-neutral" style={{ fontSize: '0.8125rem', padding: '0.35rem 0.85rem' }}>
                Absen #{String(member.attendance_number).padStart(2, '0')}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Detailed Metadata Cards */}
        <div
          style={{
            backgroundColor: 'var(--gray-50)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--gray-200)',
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
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MapPin size={18} />
            </div>
            <div>
              <span style={{ fontSize: '0.725rem', color: 'var(--gray-500)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                Tempat Lahir
              </span>
              <strong style={{ color: 'var(--gray-900)' }}>{member.birth_place || '-'}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Calendar size={18} />
            </div>
            <div>
              <span style={{ fontSize: '0.725rem', color: 'var(--gray-500)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                Tanggal Lahir
              </span>
              <strong style={{ color: 'var(--gray-900)' }}>{formattedBirthDate}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Mail size={18} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <span style={{ fontSize: '0.725rem', color: 'var(--gray-500)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                Email Resmi
              </span>
              <strong style={{ color: 'var(--gray-900)', wordBreak: 'break-all' }}>{member.email || '-'}</strong>
            </div>
          </div>

          {member.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--primary-50)',
                  color: 'var(--primary-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Phone size={18} />
              </div>
              <div>
                <span style={{ fontSize: '0.725rem', color: 'var(--gray-500)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                  Kontak / Telepon
                </span>
                <strong style={{ color: 'var(--gray-900)' }}>{member.phone}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
