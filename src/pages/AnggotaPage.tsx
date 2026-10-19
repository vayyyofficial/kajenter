import React, { useState, useEffect, useCallback } from 'react';
import { Search, GraduationCap, Users } from 'lucide-react';
import { Member, MemberStory } from '../types';
import { dataCache } from '../services/dataCache';
import { api } from '../services/api';
import { BRANDING } from '../config/branding';
import { MemberCard } from '../components/members/MemberCard';
import { MemberDetailModal } from '../components/members/MemberDetailModal';
import { StoryViewerModal } from '../components/members/StoryViewerModal';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { Skeleton } from '../components/common/Skeleton';
import { useRealtimeSync } from '../context/SyncContext';
import { useLanguage } from '../context/LanguageContext';

export const AnggotaPage: React.FC = () => {
  const { t } = useLanguage();
  const cached = dataCache.getMembers();
  const [guruList, setGuruList] = useState<Member[]>(() => cached?.guru || []);
  const [siswaList, setSiswaList] = useState<Member[]>(() => cached?.siswa || []);
  const [loading, setLoading] = useState<boolean>(() => !cached);
  const [search, setSearch] = useState<string>('');

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Member Stories (Public Active Stories - Requirement #11 & #12)
  const [storiesByMember, setStoriesByMember] = useState<Record<number, MemberStory[]>>({});
  const [activeStoryMember, setActiveStoryMember] = useState<{ member: Member; stories: MemberStory[] } | null>(null);

  const fetchMembers = useCallback(async (force = false) => {
    try {
      const cachedData = dataCache.getMembers();
      if (!cachedData) {
        setLoading(true);
      } else {
        setGuruList(cachedData.guru);
        setSiswaList(cachedData.siswa);
      }
      const data = await dataCache.getOrFetchMembers(force);
      if (data) {
        setGuruList(data.guru || []);
        setSiswaList(data.siswa || []);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPublicStories = useCallback(async (force = false) => {
    try {
      const cachedStories = dataCache.getPublicStories();
      if (cachedStories) {
        const map: Record<number, MemberStory[]> = {};
        cachedStories.forEach((st) => {
          if (!map[st.member_id]) map[st.member_id] = [];
          map[st.member_id].push(st);
        });
        setStoriesByMember(map);
      }

      const stories = await dataCache.getOrFetchPublicStories(force);
      if (stories) {
        const map: Record<number, MemberStory[]> = {};
        stories.forEach((st) => {
          if (!map[st.member_id]) map[st.member_id] = [];
          map[st.member_id].push(st);
        });
        setStoriesByMember(map);
      }
    } catch (err) {
      console.error('Failed to load public stories:', err);
    }
  }, []);

  useEffect(() => {
    fetchMembers(false);
    fetchPublicStories(false);
  }, [fetchMembers, fetchPublicStories]);

  // Real-time synchronization for members and stories across all devices
  useRealtimeSync(['members', 'stories'], () => {
    dataCache.invalidate('members');
    dataCache.invalidate('stories');
    fetchMembers(true);
    fetchPublicStories(true);
  });

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const filteredGuru = guruList.filter((g) =>
    g.full_name.toLowerCase().includes(search.toLowerCase()) ||
    g.role.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSiswa = siswaList.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.nickname && s.nickname.toLowerCase().includes(search.toLowerCase())) ||
    String(s.attendance_number).includes(search) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* Header & Search */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div className="section-tag">{t.members.tag}</div>
          <h1 className="section-title">{t.members.title}</h1>
          <p className="section-subtitle">
            {t.members.subtitle(BRANDING.name, BRANDING.school)}
          </p>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder={t.members.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem', height: '42px' }}
          />
        </div>
      </div>

      {loading && guruList.length === 0 && siswaList.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <Skeleton width="220px" height="28px" style={{ marginBottom: '1.5rem' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}><Skeleton height="100px" borderRadius="50%" width="100px" style={{ margin: '0 auto 1rem auto' }} /><Skeleton height="20px" width="60%" style={{ margin: '0 auto' }} /></div>
            </div>
          </div>
          <div>
            <Skeleton width="260px" height="28px" style={{ marginBottom: '1.5rem' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}><Skeleton height="100px" borderRadius="50%" width="100px" style={{ margin: '0 auto 1rem auto' }} /><Skeleton height="20px" width="60%" style={{ margin: '0 auto' }} /></div>
              <div className="card" style={{ padding: '1.5rem' }}><Skeleton height="100px" borderRadius="50%" width="100px" style={{ margin: '0 auto 1rem auto' }} /><Skeleton height="20px" width="60%" style={{ margin: '0 auto' }} /></div>
              <div className="card" style={{ padding: '1.5rem' }}><Skeleton height="100px" borderRadius="50%" width="100px" style={{ margin: '0 auto 1rem auto' }} /><Skeleton height="20px" width="60%" style={{ margin: '0 auto' }} /></div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Section 1: GURU (Requirement #22: Guru ditampilkan terlebih dahulu) */}
          <section style={{ marginBottom: '2.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                borderBottom: '2px solid var(--primary-600)',
                paddingBottom: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <GraduationCap size={22} color="var(--primary-600)" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {t.members.teachersTitle}
              </h2>
              <span className="badge badge-primary" style={{ marginLeft: '0.5rem' }}>
                {t.members.teachersCount(filteredGuru.length)}
              </span>
            </div>

            {filteredGuru.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {t.members.noTeachersFound}
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                {filteredGuru.map((guru, idx) => (
                  <ScrollReveal key={guru.id} delay={(idx % 4) * 40} once>
                    <MemberCard
                      member={guru}
                      onClick={handleMemberClick}
                      stories={storiesByMember[guru.id]}
                      onOpenStory={(m, st) => setActiveStoryMember({ member: m, stories: st })}
                    />
                  </ScrollReveal>
                ))}
              </div>
            )}
          </section>

          {/* Section 2: SISWA (Requirement #23: Setelah bagian guru, terurut nomor absen) */}
          <section>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                borderBottom: '2px solid var(--border-color)',
                paddingBottom: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <Users size={22} color="var(--primary-600)" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {t.members.studentsTitle(BRANDING.name)}
              </h2>
              <span className="badge badge-neutral" style={{ marginLeft: '0.5rem' }}>
                {t.members.studentsCount(filteredSiswa.length)}
              </span>
            </div>

            {filteredSiswa.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {t.members.noStudentsFound(search)}
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                {filteredSiswa.map((siswa, idx) => (
                  <ScrollReveal key={siswa.id} delay={(idx % 6) * 35} once>
                    <MemberCard
                      member={siswa}
                      onClick={handleMemberClick}
                      stories={storiesByMember[siswa.id]}
                      onOpenStory={(m, st) => setActiveStoryMember({ member: m, stories: st })}
                    />
                  </ScrollReveal>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Member Details Modal */}
      <MemberDetailModal
        member={selectedMember}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Story Viewer Modal (Requirement #12 & #13: Public Story Viewer) */}
      {activeStoryMember && (
        <StoryViewerModal
          member={activeStoryMember.member}
          stories={activeStoryMember.stories}
          isOpen={Boolean(activeStoryMember)}
          onClose={() => setActiveStoryMember(null)}
        />
      )}
    </div>
  );
};
