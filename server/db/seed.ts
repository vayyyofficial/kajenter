import bcrypt from 'bcryptjs';
import { query } from './index.js';

export async function seedDatabase() {
  const now = new Date().toISOString();

  // 1. Seed or Verify Admin Auth State (Default password: icptkj35 per Requirement #7)
  const existingAdmin = query.get('SELECT * FROM admin_auth_state WHERE id = 1');
  if (!existingAdmin) {
    const initialHash = await bcrypt.hash('icptkj35', 10);
    query.run(
      `INSERT INTO admin_auth_state (id, password_hash, failed_attempts, locked_until, last_failed_at, last_password_change, updated_at)
       VALUES (1, ?, 0, NULL, NULL, ?, ?)`,
      initialHash,
      now,
      now
    );
    console.log('🔒 Secret Admin initial password seeded securely (hashed).');
  }

  // 1b. Seed Roles & Permissions (Requirement #17 & #28)
  const roleCount = query.get<any>('SELECT COUNT(*) as count FROM roles_permissions')?.count || 0;
  if (roleCount === 0) {
    const roles = [
      { name: 'Admin', gallery: 1, members: 1, social: 1, settings: 1 },
      { name: 'Ketua Kelas', gallery: 1, members: 1, social: 1, settings: 0 },
      { name: 'Wakil Ketua', gallery: 1, members: 1, social: 1, settings: 0 },
      { name: 'Bendahara', gallery: 1, members: 1, social: 0, settings: 0 },
      { name: 'Sekretaris', gallery: 1, members: 1, social: 0, settings: 0 },
      { name: 'User', gallery: 0, members: 0, social: 0, settings: 0 },
    ];
    for (const r of roles) {
      query.run(
        `INSERT INTO roles_permissions (role_name, can_manage_gallery, can_manage_members, can_manage_social, can_manage_settings, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        r.name,
        r.gallery,
        r.members,
        r.social,
        r.settings,
        now
      );
    }
  }

  // 1c. Seed Initial Admin User
  const userCount = query.get<any>('SELECT COUNT(*) as count FROM users')?.count || 0;
  if (userCount === 0) {
    const defaultAdminHash = await bcrypt.hash('icptkj35', 10);
    query.run(
      `INSERT INTO users (username, password_hash, role, full_name, email, created_at, updated_at)
       VALUES ('admin', ?, 'Admin', 'Administrator X ICP TKJ', 'admin@smktelkom-mlg.sch.id', ?, ?)`,
      defaultAdminHash,
      now,
      now
    );
  }

  // 2. Seed Website Settings
  const existingSettings = query.get("SELECT * FROM website_settings WHERE key = 'class_name'");
  if (!existingSettings) {
    query.run(
      `INSERT OR REPLACE INTO website_settings (key, value, description, updated_at)
       VALUES ('class_name', 'X ICP TKJ', 'Nama kelas', ?)`,
      now
    );
    query.run(
      `INSERT OR REPLACE INTO website_settings (key, value, description, updated_at)
       VALUES ('school_name', 'SMK Telkom Malang', 'Nama sekolah', ?)`,
      now
    );
    query.run(
      `INSERT OR REPLACE INTO website_settings (key, value, description, updated_at)
       VALUES ('school_program', 'SMK Telkom Malang — International Class Program (TKJ)', 'Program kejuruan', ?)`,
      now
    );
    query.run(
      `INSERT OR REPLACE INTO website_settings (key, value, description, updated_at)
       VALUES ('logo_url', '/assets/Logo-Kelas.png', 'Path logo utama kelas', ?)`,
      now
    );
    query.run(
      `INSERT OR REPLACE INTO website_settings (key, value, description, updated_at)
       VALUES ('class_description', 'Portal digital resmi kelas X ICP TKJ — SMK Telkom Malang. Menampilkan galeri kegiatan kejuruan, direktori tenaga pendidik dan seluruh siswa terpadu.', ?)`,
      now
    );
  }

  // 3. Seed Members if empty
  const memberCount = query.get<any>('SELECT COUNT(*) as count FROM members')?.count || 0;
  if (memberCount === 0) {
    console.log('🌱 Seeding members (1 Guru & 20 Siswa)...');

    // Default 1 Guru (Pak Budi Santoso per Requirement #22)
    query.run(
      `INSERT INTO members (attendance_number, full_name, nickname, birth_place, birth_date, email, role, member_type, photo_number, phone, created_at, updated_at)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, 'guru', 'guru_01', ?, ?, ?)`,
      'Budi Santoso, S.Kom., M.T.',
      'Pak Budi',
      'Surabaya',
      '1985-05-12',
      'budi.santoso@tkj.sch.id',
      'Wali Kelas',
      '+628123456701',
      now,
      now
    );

    // 20 Siswa (Absen 01 - 20 per Requirement #23 & #24)
    const students = [
      { no: 1, name: 'Ahmad Fairuzzi', nick: 'Fairuz', place: 'Surabaya', date: '2008-01-14', email: 'ketua@tkj.sch.id', role: 'Ketua Kelas' },
      { no: 2, name: 'Alya Salsabila', nick: 'Alya', place: 'Gresik', date: '2008-03-22', email: 'alya.salsa@tkj.sch.id', role: 'Wakil Ketua' },
      { no: 3, name: 'Bayu Pratama', nick: 'Bayu', place: 'Sidoarjo', date: '2008-04-10', email: 'sekretaris@tkj.sch.id', role: 'Sekretaris' },
      { no: 4, name: 'Citra Dewi Maharani', nick: 'Citra', place: 'Surabaya', date: '2008-02-18', email: 'bendahara@tkj.sch.id', role: 'Bendahara' },
      { no: 5, name: 'Danendra Arya', nick: 'Danen', place: 'Malang', date: '2008-05-05', email: 'danendra@tkj.sch.id', role: 'Siswa' },
      { no: 6, name: 'Dinda Ayu Kirana', nick: 'Dinda', place: 'Mojokerto', date: '2008-06-12', email: 'dinda.ayu@tkj.sch.id', role: 'Siswa' },
      { no: 7, name: 'Farhan Maulana', nick: 'Farhan', place: 'Surabaya', date: '2008-07-29', email: 'farhan.m@tkj.sch.id', role: 'Siswa' },
      { no: 8, name: 'Ghaitsa Zahira', nick: 'Ghaitsa', place: 'Pasuruan', date: '2008-08-15', email: 'ghaitsa.z@tkj.sch.id', role: 'Siswa' },
      { no: 9, name: 'Haikal Rahman', nick: 'Haikal', place: 'Surabaya', date: '2008-09-03', email: 'haikal.r@tkj.sch.id', role: 'Siswa' },
      { no: 10, name: 'Intan Permata', nick: 'Intan', place: 'Sidoarjo', date: '2008-10-21', email: 'intan.p@tkj.sch.id', role: 'Siswa' },
      { no: 11, name: 'Jonathan Kevin', nick: 'Kevin', place: 'Surabaya', date: '2008-11-11', email: 'jonathan.k@tkj.sch.id', role: 'Siswa' },
      { no: 12, name: 'Kayla Putri', nick: 'Kayla', place: 'Gresik', date: '2008-12-04', email: 'kayla.p@tkj.sch.id', role: 'Siswa' },
      { no: 13, name: 'Luqman Hakim', nick: 'Luqman', place: 'Surabaya', date: '2008-01-30', email: 'luqman.h@tkj.sch.id', role: 'Siswa' },
      { no: 14, name: 'Michelle Angeline', nick: 'Michelle', place: 'Surabaya', date: '2008-02-14', email: 'michelle.a@tkj.sch.id', role: 'Siswa' },
      { no: 15, name: 'Naufal Rizky', nick: 'Naufal', place: 'Lamongan', date: '2008-03-09', email: 'naufal.r@tkj.sch.id', role: 'Siswa' },
      { no: 16, name: 'Olivia Febriana', nick: 'Olivia', place: 'Sidoarjo', date: '2008-04-27', email: 'olivia.f@tkj.sch.id', role: 'Siswa' },
      { no: 17, name: 'Pandu Wijaya', nick: 'Pandu', place: 'Surabaya', date: '2008-05-19', email: 'pandu.w@tkj.sch.id', role: 'Siswa' },
      { no: 18, name: 'Rania Azzahra', nick: 'Rania', place: 'Malang', date: '2008-06-25', email: 'rania.a@tkj.sch.id', role: 'Siswa' },
      { no: 19, name: 'Satria Bagus', nick: 'Satria', place: 'Surabaya', date: '2008-07-08', email: 'satria.b@tkj.sch.id', role: 'Siswa' },
      { no: 20, name: 'Tiara Maharani', nick: 'Tiara', place: 'Gresik', date: '2008-08-31', email: 'tiara.m@tkj.sch.id', role: 'Siswa' },
    ];

    for (const s of students) {
      const photoNumber = String(s.no).padStart(2, '0');
      query.run(
        `INSERT INTO members (attendance_number, full_name, nickname, birth_place, birth_date, email, role, member_type, photo_number, phone, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'siswa', ?, ?, ?, ?)`,
        s.no,
        s.name,
        s.nick,
        s.place,
        s.date,
        s.email,
        s.role,
        photoNumber,
        `+6281234567${photoNumber}`,
        now,
        now
      );
    }
  }

  // 4. Seed Gallery if empty
  const galleryCount = query.get<any>('SELECT COUNT(*) as count FROM gallery')?.count || 0;
  if (galleryCount === 0) {
    console.log('🌱 Seeding gallery items...');
    const galleryItems = [
      {
        title: 'Praktikum Konfigurasi Server Rack & Switch Cisco',
        event: 'Lab Komputer Jaringan 1',
        category: 'Proyek TKJ',
        desc: 'Sesi praktikum cabling UTP Cat6, patch panel punch down, dan instalasi switch Cisco Catalyst 2960 di rack server kelas X ICP TKJ.',
        img: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80',
        date: '2026-09-28',
        author: 'Ahmad Fairuzzi',
      },
      {
        title: 'Kunjungan Industri & Eksplorasi Data Center Tier-3',
        event: 'Kunjungan Industri TKJ',
        category: 'Event Sekolah',
        desc: 'Siswa kelas X ICP TKJ melihat secara langsung operasional server cloud, cooling system precision air conditioning, dan redundancy power supply UPS.',
        img: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&q=80',
        date: '2026-09-15',
        author: 'Budi Santoso',
      },
      {
        title: 'Workshop Cyber Security & Ethical Hacking',
        event: 'Seminar Nasional Keamanan Siber',
        category: 'Kegiatan',
        desc: 'Pelatihan dasar penetration testing, network sniffing Wireshark, dan kesadaran pertahanan terhadap serangan phishing dan brute force.',
        img: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80',
        date: '2026-10-02',
        author: 'Bayu Pratama',
      },
      {
        title: 'Class Meeting & E-Sports Valorant Championship',
        event: 'Class Meeting Semester Ganjil',
        category: 'Kegiatan',
        desc: 'Keseruan kekompakan tim X ICP TKJ dalam turnamen e-sports antar kelas kejuruan, meraih juara 1 se-sekolah.',
        img: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&q=80',
        date: '2026-10-08',
        author: 'Citra Dewi',
      },
      {
        title: 'Peringatan Hari Guru & Apresiasi Wali Kelas',
        event: 'Apresiasi Guru',
        category: 'Dokumentasi',
        desc: 'Momen penuh kehangatan saat seluruh siswa X ICP TKJ memberikan cinderamata dan kue ucapan terima kasih kepada Bapak Budi Santoso.',
        img: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80',
        date: '2026-10-10',
        author: 'Alya Salsabila',
      },
      {
        title: 'Karantina Persiapan Sertifikasi Mikrotik MTCNA',
        event: 'Sertifikasi Internasional TKJ',
        category: 'Proyek TKJ',
        desc: 'Simulasi lab intensif pengenalan RouterOS, firewall filtering, NAT masquerade, dan bandwidth management queue tree.',
        img: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80',
        date: '2026-10-12',
        author: 'Budi Santoso',
      },
    ];

    for (const g of galleryItems) {
      query.run(
        `INSERT INTO gallery (title, event_identity, category, description, image_path, event_date, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        g.title,
        g.event,
        g.category,
        g.desc,
        g.img,
        g.date,
        g.author,
        now,
        now
      );
    }
  }

  // 5. Seed Social Media if empty
  const socialCount = query.get<any>('SELECT COUNT(*) as count FROM social_media')?.count || 0;
  if (socialCount === 0) {
    console.log('🌱 Seeding social media...');
    const socials = [
      { platform: 'Instagram', username: '@xicp.tkj', url: 'https://instagram.com/xicp.tkj', icon: 'Instagram' },
      { platform: 'TikTok', username: '@xicp_tkj.official', url: 'https://tiktok.com/@xicp_tkj.official', icon: 'Video' },
      { platform: 'Discord', username: 'X ICP TKJ Community', url: 'https://discord.gg/xicptkj', icon: 'Discord' },
    ];

    for (const s of socials) {
      query.run(
        `INSERT INTO social_media (platform, username, url, icon, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
        s.platform,
        s.username,
        s.url,
        s.icon,
        now,
        now
      );
    }
  }

  // 6. Seed initial audit log if empty
  const logCount = query.get<any>('SELECT COUNT(*) as count FROM activity_logs')?.count || 0;
  if (logCount === 0) {
    query.run(
      `INSERT INTO activity_logs (user_name, action, entity_type, details, created_at)
       VALUES ('System', 'INITIALIZE', 'SYSTEM', 'Inisialisasi sistem database portal digital X ICP TKJ', ?)`,
      now
    );
  }

  console.log('✅ Database initialization and seed check completed.');
}
