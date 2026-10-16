import React, { useState, useEffect, useCallback } from 'react';
import { Search, GraduationCap, Users } from 'lucide-react';
import { Member } from '../types';
import { dataCache } from '../services/dataCache';
import { BRANDING } from '../config/branding';
import { MemberCard } from '../components/members/MemberCard';
import { MemberDetailModal } from '../components/members/MemberDetailModal';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { Skeleton } from '../components/common/Skeleton';
import { useRealtimeSync } from '../context/SyncContext';

export const AnggotaPage: React.FC = () => {
  const cached = dataCache.getMembers();
  const [guruList, setGuruList] = useState<Member[]>(() => cached?.guru || []);
  const [siswaList, setSiswaList] = useState<Member[]>(() => cached?.siswa || []);
  const [loading, setLoading] = useState<boolean>(() => !cached);
  const [search, setSearch] = useState<string>('');

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const fetchMembers = useCallback(async () => {
    try {
      const cachedData = dataCache.getMembers();
      if (!cachedData) {
        setLoading(true);
      } else {
        setGuruList(cachedData.guru);
        setSiswaList(cachedData.siswa);
      }
      const data = await dataCache.getOrFetchMembers(true);
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

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Real-time synchronization for members across all devices
  useRealtimeSync(['members'], () => {
    fetchMembers();
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
          <div className="section-tag">Direktori Resmi</div>
          <h1 className="section-title">Direktori Guru & Siswa Kelas</h1>
          <p className="section-subtitle">
            Daftar lengkap tenaga pendidik dan seluruh siswa kelas {BRANDING.name} {BRANDING.school} terurut sesuai nomor absen resmi.
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
              color: 'var(--gray-400)',
            }}
          />
          <input
            type="text"
            placeholder="Cari nama, absen, atau role..."
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
          <ScrollReveal>
            <section>
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
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                  Dewan Guru & Tenaga Pendidik
                </h2>
                <span className="badge badge-primary" style={{ marginLeft: '0.5rem' }}>
                  {filteredGuru.length} Pendidik
                </span>
              </div>

              {filteredGuru.length === 0 ? (
                <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                  Tidak ada data guru yang cocok dengan pencarian.
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
                    <ScrollReveal key={guru.id} delay={(idx % 4) * 50}>
                      <MemberCard member={guru} onClick={handleMemberClick} />
                    </ScrollReveal>
                  ))}
                </div>
              )}
            </section>
          </ScrollReveal>

          {/* Section 2: SISWA (Requirement #23: Setelah bagian guru, terurut nomor absen) */}
          <ScrollReveal delay={80}>
            <section>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  borderBottom: '2px solid var(--gray-200)',
                  paddingBottom: '0.75rem',
                  marginBottom: '1.5rem',
                }}
              >
                <Users size={22} color="var(--primary-600)" />
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                  Daftar Siswa {BRANDING.name}
                </h2>
                <span className="badge badge-neutral" style={{ marginLeft: '0.5rem' }}>
                  {filteredSiswa.length} Siswa
                </span>
              </div>

              {filteredSiswa.length === 0 ? (
                <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                  Tidak ada siswa yang cocok dengan kriteria pencarian "{search}".
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
                    <ScrollReveal key={siswa.id} delay={(idx % 6) * 45}>
                      <MemberCard member={siswa} onClick={handleMemberClick} />
                    </ScrollReveal>
                  ))}
                </div>
              )}
            </section>
          </ScrollReveal>
        </>
      )}

      {/* Member Details Modal */}
      <MemberDetailModal
        member={selectedMember}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
