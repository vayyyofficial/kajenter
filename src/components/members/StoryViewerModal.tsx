import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Clock, Trash2, RefreshCw, Music, Play, Pause } from 'lucide-react';
import { Member, MemberStory } from '../../types';
import { getMemberPhotoUrl, getDefaultAvatar } from '../../utils/avatar';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';
import { useMemberAuth } from '../../context/MemberAuthContext';
import { api } from '../../services/api';

interface StoryViewerModalProps {
  member: Member;
  stories: MemberStory[];
  isOpen: boolean;
  onClose: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  member,
  stories,
  isOpen,
  onClose,
}) => {
  const { member: loggedInUser } = useMemberAuth();
  const isDeveloper = Boolean(
    loggedInUser?.permissions?.isDeveloper ||
    loggedInUser?.role?.toLowerCase() === 'developer'
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeStory = stories[currentIndex];
  const currentMusicUrl = activeStory?.music?.url || activeStory?.music_url || null;
  const currentMusicTitle = activeStory?.music?.title || activeStory?.music_title || null;
  const currentMusicArtist = activeStory?.music?.artist || activeStory?.music_artist || null;

  // Dedicated audio lifecycle: Plays when story opens or changes, cleanly stops on close
  useEffect(() => {
    let isCancelled = false;

    // Helper to safely stop and release audio
    const stopAudio = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
      }
      setIsPlaying(false);
    };

    if (!isOpen || !activeStory) {
      stopAudio();
      return;
    }

    if (!currentMusicUrl) {
      stopAudio();
      setAudioError(false);
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    audio.pause();
    audio.src = currentMusicUrl;
    audio.volume = 0.45;
    audio.loop = true;
    setAudioError(false);

    const onAudioEnd = () => {
      if (!isCancelled) setIsPlaying(false);
    };
    const onAudioError = () => {
      if (!isCancelled) {
        setAudioError(true);
        setIsPlaying(false);
      }
    };

    audio.addEventListener('ended', onAudioEnd);
    audio.addEventListener('error', onAudioError);

    // Attempt playback (works naturally following user click gesture)
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (!isCancelled) {
            setIsPlaying(true);
            setAudioError(false);
          }
        })
        .catch(() => {
          // Autoplay policy prevented automatic playback; wait for user tap
          if (!isCancelled) {
            setIsPlaying(false);
          }
        });
    }

    return () => {
      isCancelled = true;
      audio.removeEventListener('ended', onAudioEnd);
      audio.removeEventListener('error', onAudioError);
      stopAudio();
    };
  }, [isOpen, currentIndex, currentMusicUrl, activeStory]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current || !currentMusicUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.volume = 0.45;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setAudioError(false);
        })
        .catch(() => {
          setAudioError(true);
          setIsPlaying(false);
        });
    }
  };

  const handleCloseModal = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }
    setIsPlaying(false);
    onClose();
  }, [onClose]);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [isOpen]);

  // Reset to first story when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setImgError(false);
    }
  }, [isOpen]);

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setImgError(false);
    } else {
      handleCloseModal();
    }
  }, [currentIndex, stories.length, handleCloseModal]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setImgError(false);
    }
  }, [currentIndex]);

  // Delete story as Developer
  const handleDeleteStory = async () => {
    if (!activeStory) return;
    try {
      setIsDeleting(true);
      const res = await api.portal.stories.delete(activeStory.id);
      if (res.success) {
        setIsConfirmDeleteOpen(false);
        if (stories.length <= 1) {
          handleCloseModal();
        } else if (currentIndex >= stories.length - 1) {
          setCurrentIndex(stories.length - 2);
        }
      } else {
        alert(res.message || 'Gagal menghapus story.');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus story.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseModal();
      if (e.key === 'ArrowRight' || e.key === ' ') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleCloseModal]);

  if (!isOpen || !activeStory || typeof document === 'undefined') return null;

  const { src: avatarSrc } = getMemberPhotoUrl(member);
  const finalAvatar = avatarError ? getDefaultAvatar() : avatarSrc;

  // Format relative time or creation date
  const formatTimeAgo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${Math.max(1, diffMins)}m yang lalu`;
      }
      if (diffHours < 24) return `${diffHours}j yang lalu`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}h yang lalu`;
    } catch {
      return '';
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={handleCloseModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '480px',
          height: '88vh',
          maxHeight: '820px',
          backgroundColor: '#0a0a0a',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* Top Segmented Story Indicators */}
        <div
          style={{
            position: 'absolute',
            top: '0.75rem',
            left: '0.75rem',
            right: '0.75rem',
            zIndex: 30,
            display: 'flex',
            gap: '0.35rem',
          }}
        >
          {stories.map((_, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                height: '3px',
                borderRadius: '2px',
                backgroundColor: idx === currentIndex ? '#ffffff' : idx < currentIndex ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.25)',
                transition: 'background-color 0.2s ease',
              }}
            />
          ))}
        </div>

        {/* Top Header: Member Info & Close Button */}
        <div
          style={{
            position: 'absolute',
            top: '1.25rem',
            left: '0.75rem',
            right: '0.75rem',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.4rem 0.6rem',
            borderRadius: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid var(--primary-500, #ef4444)',
                backgroundColor: '#1f2937',
                flexShrink: 0,
              }}
            >
              <img
                src={finalAvatar}
                alt={member.full_name}
                onError={() => setAvatarError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.875rem', lineHeight: 1.2 }}>
                {member.full_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.72rem', fontWeight: 600 }}>
                  {member.role || 'Siswa'}
                </span>
                <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.65rem' }}>•</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem' }}>
                  <Clock size={11} />
                  <span>{formatTimeAgo(activeStory.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {isDeveloper && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConfirmDeleteOpen(true);
                }}
                type="button"
                aria-label="Hapus Story (Moderasi Developer)"
                title="Hapus Story (Moderasi Developer)"
                style={{
                  background: 'rgba(239, 68, 68, 0.25)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Trash2 size={13} />
                <span>Hapus</span>
              </button>
            )}

            <button
              onClick={handleCloseModal}
              type="button"
              aria-label="Tutup Story"
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '0.35rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transition: 'background-color 0.15s ease',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Minimal Outline Story Music Badge (Requirement #1, #2, #3) */}
        {(currentMusicTitle || currentMusicArtist) && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePlay(e);
            }}
            title={currentMusicUrl && !audioError ? (isPlaying ? 'Jeda Musik' : 'Putar Musik') : 'Audio Tidak Tersedia'}
            style={{
              position: 'absolute',
              top: '4.5rem',
              left: '0.75rem',
              zIndex: 30,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.55rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '24px',
              backgroundColor: 'rgba(10, 10, 10, 0.75)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: `1px solid ${isPlaying ? 'var(--primary-500, #ef4444)' : 'rgba(255, 255, 255, 0.22)'}`,
              color: '#ffffff',
              maxWidth: 'calc(100% - 1.5rem)',
              boxShadow: isPlaying ? '0 4px 16px rgba(239, 68, 68, 0.25)' : '0 4px 12px rgba(0, 0, 0, 0.35)',
              cursor: currentMusicUrl && !audioError ? 'pointer' : 'default',
              userSelect: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            {/* Outline Music Icon with Subtle Playing Pulse */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: isPlaying ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${isPlaying ? 'var(--primary-500, #ef4444)' : 'rgba(255, 255, 255, 0.2)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Music size={12} color={isPlaying ? '#f87171' : 'rgba(255, 255, 255, 0.85)'} strokeWidth={2.2} />
            </div>

            {/* Song Title & Artist Name */}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.25,
                }}
              >
                {currentMusicTitle || 'Musik Story'}
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.2,
                }}
              >
                {currentMusicArtist || 'Artis'}
              </span>
            </div>

            {/* Play/Pause Button or Fallback Status */}
            {currentMusicUrl && !audioError ? (
              <button
                onClick={handleTogglePlay}
                type="button"
                aria-label={isPlaying ? 'Jeda Musik' : 'Putar Musik'}
                style={{
                  marginLeft: '0.2rem',
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  border: `1.5px solid ${isPlaying ? 'var(--primary-500, #ef4444)' : 'rgba(255, 255, 255, 0.4)'}`,
                  backgroundColor: isPlaying ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  padding: 0,
                }}
              >
                {isPlaying ? <Pause size={11} strokeWidth={2.5} /> : <Play size={11} strokeWidth={2.5} style={{ marginLeft: 1 }} />}
              </button>
            ) : (
              <span
                style={{
                  fontSize: '0.625rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontStyle: 'italic',
                  whiteSpace: 'nowrap',
                  marginLeft: '0.2rem',
                }}
              >
                (Audio tidak tersedia)
              </span>
            )}
          </div>
        )}

        {/* Confirmation Dialog for Developer Moderation Delete */}
        {isConfirmDeleteOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 99,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem',
            }}
          >
            <div
              style={{
                backgroundColor: '#171717',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                padding: '1.5rem',
                width: '100%',
                maxWidth: '340px',
                textAlign: 'center',
                color: '#ffffff',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                }}
              >
                <Trash2 size={24} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.4rem 0' }}>
                Hapus story ini?
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 1.25rem 0', lineHeight: 1.45 }}>
                Story milik <strong>{member.full_name}</strong> yang dihapus tidak dapat dikembalikan.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteStory}
                  disabled={isDeleting}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.825rem',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                >
                  {isDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span>{isDeleting ? 'Menghapus...' : 'Hapus Story'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Media Container */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#050505',
            overflow: 'hidden',
          }}
        >
          {imgError ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Gambar Story tidak dapat dimuat.</p>
            </div>
          ) : (
            <img
              src={activeStory.media_url}
              alt={activeStory.caption || `Story dari ${member.full_name}`}
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                maxHeight: '100%',
              }}
            />
          )}

          {/* Left Arrow (Prev Story) */}
          {currentIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              type="button"
              aria-label="Story Sebelumnya"
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 25,
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                width: 40,
                height: 40,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)',
                transition: 'background-color 0.15s ease',
              }}
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Right Arrow (Next Story) */}
          {currentIndex < stories.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              type="button"
              aria-label="Story Berikutnya"
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 25,
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                width: 40,
                height: 40,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)',
                transition: 'background-color 0.15s ease',
              }}
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {/* Bottom Caption Overlay */}
        {activeStory.caption && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 30,
              padding: '1.25rem 1rem 1rem 1rem',
              background: 'linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.5) 70%, transparent 100%)',
            }}
          >
            <p
              style={{
                color: '#ffffff',
                fontSize: '0.875rem',
                margin: 0,
                lineHeight: 1.45,
                fontWeight: 500,
                textAlign: 'center',
              }}
            >
              {activeStory.caption}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
