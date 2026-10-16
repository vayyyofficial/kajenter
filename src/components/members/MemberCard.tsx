import React, { useState } from 'react';
import { Mail, MapPin, ShieldCheck } from 'lucide-react';
import { Member } from '../../types';
import { getMemberPhotoUrl, getDefaultImgixAvatar } from '../../utils/avatar';

interface MemberCardProps {
  member: Member;
  onClick: (member: Member) => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member, onClick }) => {
  const [imgError, setImgError] = useState(false);

  const { src: initialPhotoSrc } = getMemberPhotoUrl(member);
  const photoSrc = imgError ? getDefaultImgixAvatar(member.full_name) : initialPhotoSrc;

  const isTeacher = member.member_type === 'guru';

  return (
    <div
      onClick={() => onClick(member)}
      className="card card-hover"
      style={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        textAlign: 'center',
        padding: '1.5rem',
        position: 'relative',
        borderTop: isTeacher ? '4px solid var(--primary-700)' : '4px solid var(--primary-500)',
      }}
    >
      {/* Attendance / Role Badge */}
      <div style={{ position: 'absolute', top: '0.85rem', right: '0.85rem' }}>
        {member.attendance_number ? (
          <span
            className="badge badge-primary"
            style={{ fontWeight: 800, fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
          >
            Absen #{String(member.attendance_number).padStart(2, '0')}
          </span>
        ) : (
          <span className="badge badge-info" style={{ fontWeight: 700, fontSize: '0.7rem' }}>
            <ShieldCheck size={12} /> Tenaga Pendidik
          </span>
        )}
      </div>

      {/* Avatar Image with Guaranteed Fallback */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '0.75rem 0 1.25rem 0' }}>
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid var(--white)',
            boxShadow: 'var(--shadow-md)',
            backgroundColor: 'var(--primary-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <img
            src={photoSrc}
            alt={member.full_name}
            onError={() => {
              if (!imgError) setImgError(true);
            }}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>
      </div>

      {/* Member Details */}
      <h3
        style={{
          fontSize: '1.1rem',
          fontWeight: 800,
          color: 'var(--gray-900)',
          marginBottom: '0.25rem',
          lineHeight: 1.3,
        }}
      >
        {member.full_name}
      </h3>

      {member.nickname && (
        <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.5rem', display: 'block' }}>
          "{member.nickname}"
        </span>
      )}

      {/* Role Badge */}
      <div style={{ margin: '0.25rem 0 1rem 0' }}>
        <span
          className={
            isTeacher
              ? 'badge badge-primary'
              : member.role !== 'Siswa'
              ? 'badge badge-warning'
              : 'badge badge-neutral'
          }
          style={{ fontSize: '0.75rem', fontWeight: 700 }}
        >
          {member.role}
        </span>
      </div>

      {/* Quick metadata */}
      <div
        style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--gray-100)',
          paddingTop: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          fontSize: '0.78rem',
          color: 'var(--gray-500)',
          textAlign: 'left',
        }}
      >
        {member.birth_place && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MapPin size={13} color="var(--primary-600)" />
            <span>{member.birth_place}</span>
          </div>
        )}

        {member.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Mail size={13} color="var(--primary-600)" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {member.email}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
