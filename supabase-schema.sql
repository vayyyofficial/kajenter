-- ==============================================================================
-- DATABASE MIGRATION SCRIPT FOR SUPABASE (POSTGRESQL)
-- Website Resmi Kelas: X ICP TKJ - 35 (SMK Telkom Malang)
-- Target: GitHub -> Vercel -> Custom Domain
-- ==============================================================================

-- 1. Create Tables
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'User',
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles_permissions (
  id BIGSERIAL PRIMARY KEY,
  role_name TEXT UNIQUE NOT NULL,
  can_manage_gallery INTEGER NOT NULL DEFAULT 0,
  can_manage_members INTEGER NOT NULL DEFAULT 0,
  can_manage_social INTEGER NOT NULL DEFAULT 0,
  can_manage_settings INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  attendance_number INTEGER NULL,
  full_name TEXT NOT NULL,
  nickname TEXT,
  birth_place TEXT,
  birth_date TEXT,
  email TEXT,
  role TEXT NOT NULL,
  member_type TEXT NOT NULL, -- 'guru' or 'siswa'
  photo_number TEXT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gallery (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  event_identity TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Kegiatan',
  description TEXT NOT NULL,
  image_path TEXT NOT NULL,
  event_date TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_media (
  id BIGSERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Globe',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_auth_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ NULL,
  last_failed_at TIMESTAMPTZ NULL,
  last_password_change TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for Performance
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_members_type ON members(member_type);
CREATE INDEX IF NOT EXISTS idx_members_attendance ON members(attendance_number);
CREATE INDEX IF NOT EXISTS idx_gallery_date ON gallery(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(created_at DESC);

-- 3. Row Level Security (RLS)
-- ==============================================================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_auth_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Public Read Policies
DROP POLICY IF EXISTS "Public can view members" ON members;
CREATE POLICY "Public can view members" ON members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view gallery" ON gallery;
CREATE POLICY "Public can view gallery" ON gallery FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view social_media" ON social_media;
CREATE POLICY "Public can view social_media" ON social_media FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view website_settings" ON website_settings;
CREATE POLICY "Public can view website_settings" ON website_settings FOR SELECT USING (true);

-- Service Role (Backend API) Full CRUD Policies
DROP POLICY IF EXISTS "Service role full access on members" ON members;
CREATE POLICY "Service role full access on members" ON members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on gallery" ON gallery;
CREATE POLICY "Service role full access on gallery" ON gallery FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on social_media" ON social_media;
CREATE POLICY "Service role full access on social_media" ON social_media FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on website_settings" ON website_settings;
CREATE POLICY "Service role full access on website_settings" ON website_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on admin_auth_state" ON admin_auth_state;
CREATE POLICY "Service role full access on admin_auth_state" ON admin_auth_state FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on activity_logs" ON activity_logs;
CREATE POLICY "Service role full access on activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on users" ON users;
CREATE POLICY "Service role full access on users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on roles_permissions" ON roles_permissions;
CREATE POLICY "Service role full access on roles_permissions" ON roles_permissions FOR ALL USING (true) WITH CHECK (true);

-- 4. Supabase Storage Bucket Setup
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access to uploaded images in storage
DROP POLICY IF EXISTS "Public read storage images" ON storage.objects;
CREATE POLICY "Public read storage images"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads');

-- Allow backend service role to insert/update/delete storage objects
DROP POLICY IF EXISTS "Service role upload storage images" ON storage.objects;
CREATE POLICY "Service role upload storage images"
ON storage.objects FOR ALL
USING (bucket_id = 'uploads')
WITH CHECK (bucket_id = 'uploads');

-- 5. Seed Data
-- ==============================================================================

-- Secret Admin Auth State (Default password: icptkj35)
INSERT INTO admin_auth_state (id, password_hash, failed_attempts, locked_until, last_failed_at, last_password_change, updated_at)
VALUES (1, '$2b$10$V5bfzU6c6vcYdOaOAx2.PeSutOwbisNFsL5NZrcOYMtxsZ.pnuF3S', 0, NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Roles & Permissions
INSERT INTO roles_permissions (role_name, can_manage_gallery, can_manage_members, can_manage_social, can_manage_settings, updated_at)
VALUES
  ('Admin', 1, 1, 1, 1, NOW()),
  ('Ketua Kelas', 1, 1, 1, 0, NOW()),
  ('Wakil Ketua', 1, 1, 1, 0, NOW()),
  ('Bendahara', 1, 1, 0, 0, NOW()),
  ('Sekretaris', 1, 1, 0, 0, NOW()),
  ('User', 0, 0, 0, 0, NOW())
ON CONFLICT (role_name) DO NOTHING;

-- Default Admin User
INSERT INTO users (username, password_hash, role, full_name, email, created_at, updated_at)
VALUES ('admin', '$2b$10$V5bfzU6c6vcYdOaOAx2.PeSutOwbisNFsL5NZrcOYMtxsZ.pnuF3S', 'Admin', 'Administrator X ICP TKJ', 'admin@smktelkom-mlg.sch.id', NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- Website Settings
INSERT INTO website_settings (key, value, description, updated_at)
VALUES
  ('class_name', 'X ICP TKJ', 'Nama kelas', NOW()),
  ('school_name', 'SMK Telkom Malang', 'Nama sekolah', NOW()),
  ('school_program', 'SMK Telkom Malang — International Class Program (TKJ)', 'Program kejuruan', NOW()),
  ('logo_url', '/assets/Logo-Kelas.png', 'Path logo utama kelas', NOW()),
  ('class_description', 'Portal digital resmi kelas X ICP TKJ — SMK Telkom Malang. Menampilkan galeri kegiatan kejuruan, direktori tenaga pendidik dan seluruh siswa terpadu.', 'Deskripsi kelas', NOW())
ON CONFLICT (key) DO UPDATE SET updated_at = NOW();

-- Members: 1 Guru & 20 Siswa
INSERT INTO members (attendance_number, full_name, nickname, birth_place, birth_date, email, role, member_type, photo_number, phone, created_at, updated_at)
VALUES
  (NULL, 'Budi Santoso, S.Kom., M.T.', 'Pak Budi', 'Surabaya', '1985-05-12', 'budi.santoso@tkj.sch.id', 'Wali Kelas', 'guru', 'guru_01', '+628123456701', NOW(), NOW()),
  (1, 'Ahmad Fairuzzi', 'Fairuz', 'Surabaya', '2008-01-14', 'ketua@tkj.sch.id', 'Ketua Kelas', 'siswa', '01', '+628123456701', NOW(), NOW()),
  (2, 'Alya Salsabila', 'Alya', 'Gresik', '2008-03-22', 'alya.salsa@tkj.sch.id', 'Wakil Ketua', 'siswa', '02', '+628123456702', NOW(), NOW()),
  (3, 'Bayu Pratama', 'Bayu', 'Sidoarjo', '2008-04-10', 'sekretaris@tkj.sch.id', 'Sekretaris', 'siswa', '03', '+628123456703', NOW(), NOW()),
  (4, 'Citra Dewi Maharani', 'Citra', 'Surabaya', '2008-02-18', 'bendahara@tkj.sch.id', 'Bendahara', 'siswa', '04', '+628123456704', NOW(), NOW()),
  (5, 'Danendra Arya', 'Danen', 'Malang', '2008-05-05', 'danendra@tkj.sch.id', 'Siswa', 'siswa', '05', '+628123456705', NOW(), NOW()),
  (6, 'Dinda Ayu Kirana', 'Dinda', 'Mojokerto', '2008-06-12', 'dinda.ayu@tkj.sch.id', 'Siswa', 'siswa', '06', '+628123456706', NOW(), NOW()),
  (7, 'Farhan Maulana', 'Farhan', 'Surabaya', '2008-07-29', 'farhan.m@tkj.sch.id', 'Siswa', 'siswa', '07', '+628123456707', NOW(), NOW()),
  (8, 'Ghaitsa Zahira', 'Ghaitsa', 'Pasuruan', '2008-08-15', 'ghaitsa.z@tkj.sch.id', 'Siswa', 'siswa', '08', '+628123456708', NOW(), NOW()),
  (9, 'Haikal Rahman', 'Haikal', 'Surabaya', '2008-09-03', 'haikal.r@tkj.sch.id', 'Siswa', 'siswa', '09', '+628123456709', NOW(), NOW()),
  (10, 'Intan Permata', 'Intan', 'Sidoarjo', '2008-10-21', 'intan.p@tkj.sch.id', 'Siswa', 'siswa', '10', '+628123456710', NOW(), NOW()),
  (11, 'Jonathan Kevin', 'Kevin', 'Surabaya', '2008-11-11', 'jonathan.k@tkj.sch.id', 'Siswa', 'siswa', '11', '+628123456711', NOW(), NOW()),
  (12, 'Kayla Putri', 'Kayla', 'Gresik', '2008-12-04', 'kayla.p@tkj.sch.id', 'Siswa', 'siswa', '12', '+628123456712', NOW(), NOW()),
  (13, 'Luqman Hakim', 'Luqman', 'Surabaya', '2008-01-30', 'luqman.h@tkj.sch.id', 'Siswa', 'siswa', '13', '+628123456713', NOW(), NOW()),
  (14, 'Michelle Angeline', 'Michelle', 'Surabaya', '2008-02-14', 'michelle.a@tkj.sch.id', 'Siswa', 'siswa', '14', '+628123456714', NOW(), NOW()),
  (15, 'Naufal Rizky', 'Naufal', 'Lamongan', '2008-03-09', 'naufal.r@tkj.sch.id', 'Siswa', 'siswa', '15', '+628123456715', NOW(), NOW()),
  (16, 'Olivia Febriana', 'Olivia', 'Sidoarjo', '2008-04-27', 'olivia.f@tkj.sch.id', 'Siswa', 'siswa', '16', '+628123456716', NOW(), NOW()),
  (17, 'Pandu Wijaya', 'Pandu', 'Surabaya', '2008-05-19', 'pandu.w@tkj.sch.id', 'Siswa', 'siswa', '17', '+628123456717', NOW(), NOW()),
  (18, 'Rania Azzahra', 'Rania', 'Malang', '2008-06-25', 'rania.a@tkj.sch.id', 'Siswa', 'siswa', '18', '+628123456718', NOW(), NOW()),
  (19, 'Satria Bagus', 'Satria', 'Surabaya', '2008-07-08', 'satria.b@tkj.sch.id', 'Siswa', 'siswa', '19', '+628123456719', NOW(), NOW()),
(20, 'Tiara Maharani', 'Tiara', 'Gresik', '2008-08-31', 'tiara.m@tkj.sch.id', 'Siswa', 'siswa', '20', '+628123456720', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Gallery Items
INSERT INTO gallery (title, event_identity, category, description, image_path, event_date, created_by, created_at, updated_at)
VALUES
  (
    'Praktikum Konfigurasi Server Rack & Switch Cisco',
    'Lab Komputer Jaringan 1',
    'Proyek TKJ',
    'Sesi praktikum cabling UTP Cat6, patch panel punch down, dan instalasi switch Cisco Catalyst 2960 di rack server kelas X ICP TKJ.',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80',
    '2026-09-28',
    'Ahmad Fairuzzi',
    NOW(),
    NOW()
  ),
  (
    'Kunjungan Industri & Eksplorasi Data Center Tier-3',
    'Kunjungan Industri TKJ',
    'Event Sekolah',
    'Siswa kelas X ICP TKJ melihat secara langsung operasional server cloud, cooling system precision air conditioning, dan redundancy power supply UPS.',
    'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&q=80',
    '2026-09-15',
    'Budi Santoso',
    NOW(),
    NOW()
  ),
  (
    'Workshop Cyber Security & Ethical Hacking',
    'Seminar Nasional Keamanan Siber',
    'Kegiatan',
    'Pelatihan dasar penetration testing, network sniffing Wireshark, dan kesadaran pertahanan terhadap serangan phishing dan brute force.',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80',
    '2026-10-02',
    'Bayu Pratama',
    NOW(),
    NOW()
  ),
  (
    'Class Meeting & E-Sports Valorant Championship',
    'Class Meeting Semester Ganjil',
    'Kegiatan',
    'Keseruan kekompakan tim X ICP TKJ dalam turnamen e-sports antar kelas kejuruan, meraih juara 1 se-sekolah.',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&q=80',
    '2026-10-08',
    'Citra Dewi',
    NOW(),
    NOW()
  ),
  (
    'Peringatan Hari Guru & Apresiasi Wali Kelas',
    'Apresiasi Guru',
    'Dokumentasi',
    'Momen penuh kehangatan saat seluruh siswa X ICP TKJ memberikan cinderamata dan kue ucapan terima kasih kepada Bapak Budi Santoso.',
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80',
    '2026-10-10',
    'Alya Salsabila',
    NOW(),
    NOW()
  ),
  (
    'Karantina Persiapan Sertifikasi Mikrotik MTCNA',
    'Sertifikasi Internasional TKJ',
    'Proyek TKJ',
    'Simulasi lab intensif pengenalan RouterOS, firewall filtering, NAT masquerade, dan bandwidth management queue tree.',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80',
    '2026-10-12',
    'Budi Santoso',
    NOW(),
    NOW()
  )
ON CONFLICT DO NOTHING;

-- Social Media Accounts (Instagram, TikTok, Discord)
INSERT INTO social_media (platform, username, url, icon, is_active, created_at, updated_at)
VALUES
  ('Instagram', '@kaje.nter', 'https://instagram.com/kaje.nter', 'Instagram', 1, NOW(), NOW()),
  ('TikTok', '@kaje.nter', 'https://tiktok.com/@kaje.nter', 'Video', 1, NOW(), NOW()),
  ('Discord', 'X ICP TKJ Community', 'https://discord.gg/xicptkj', 'Discord', 1, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Initial Activity Log
INSERT INTO activity_logs (user_name, action, entity_type, details, created_at)
VALUES ('System', 'INITIALIZE', 'SYSTEM', 'Inisialisasi sistem database portal digital X ICP TKJ di Supabase PostgreSQL', NOW())
ON CONFLICT DO NOTHING;
