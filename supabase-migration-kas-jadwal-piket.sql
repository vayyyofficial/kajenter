-- ==============================================================================
-- MASTER ADDITIVE MIGRATION SCRIPT FOR SUPABASE (POSTGRESQL)
-- Website Resmi Kelas: X ICP TKJ - 35 (SMK Telkom Malang)
-- Fitur: Tugas Kelas, Kas Mingguan & Pengeluaran, Jadwal Pelajaran, Jadwal Piket, Story Siswa, & Portal Auth
--
-- ⚠️ JAMINAN KEAMANAN DATABASE EXISTING (STRICTLY ADDITIVE & NON-DESTRUCTIVE):
-- 1. TIDAK ADA DROP TABLE, TRUNCATE, ATAU DELETE PADA TABEL EXISTING.
-- 2. DATA ANGGOTA (MEMBERS), FOTO CUSTOM, EMAIL, ROLE, DAN GALERI TIDAK TERSENTUH SAMA SEKALI.
-- 3. MENGGUNAKAN "CREATE TABLE IF NOT EXISTS" DAN "ADD COLUMN IF NOT EXISTS".
-- 4. AMAN DAN IDEMPOTENT (DAPAT DIJALANKAN BERULANG KALI TANPA MERUSAK DATA).
-- ==============================================================================

-- ==============================================================================
-- 1. TABEL: class_tasks (Tugas Kelas & Notifikasi Deadline H-1)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS class_tasks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher_name TEXT,
  deadline TEXT NOT NULL, -- Format: YYYY-MM-DD
  description TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'in_progress' | 'completed'
  created_by TEXT NOT NULL DEFAULT 'Sekretaris',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kolom penyesuaian jika tabel sudah ada sebelumnya
ALTER TABLE class_tasks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE class_tasks ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE class_tasks ADD COLUMN IF NOT EXISTS teacher_name TEXT;
ALTER TABLE class_tasks ADD COLUMN IF NOT EXISTS deadline TEXT;
ALTER TABLE class_tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE class_tasks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE class_tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE class_tasks ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'Sekretaris';
ALTER TABLE class_tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE class_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$ BEGIN
  ALTER TABLE class_tasks ALTER COLUMN created_by SET DEFAULT 'Sekretaris';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON class_tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON class_tasks(status);

ALTER TABLE class_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access on class_tasks" ON class_tasks;
CREATE POLICY "Full access on class_tasks" ON class_tasks FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- 2. TABEL: member_stories (Story Anggota Kelas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS member_stories (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL,
  media_url TEXT NOT NULL,
  caption TEXT,
  expiration_type TEXT NOT NULL DEFAULT '24h', -- '24h' | 'custom' | 'lifetime'
  expires_at TIMESTAMPTZ, -- NULL jika lifetime
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE member_stories ADD COLUMN IF NOT EXISTS member_id BIGINT;
ALTER TABLE member_stories ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE member_stories ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE member_stories ADD COLUMN IF NOT EXISTS expiration_type TEXT DEFAULT '24h';
ALTER TABLE member_stories ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE member_stories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE member_stories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE member_stories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Foreign key aman ke members jika tabel members tersedia
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'members') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_member_stories_member') THEN
      ALTER TABLE member_stories 
      ADD CONSTRAINT fk_member_stories_member 
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_member_stories_member_id ON member_stories(member_id);
CREATE INDEX IF NOT EXISTS idx_member_stories_expires_at ON member_stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_member_stories_active ON member_stories(is_active);

ALTER TABLE member_stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active member_stories" ON member_stories;
CREATE POLICY "Public read active member_stories" ON member_stories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Full access on member_stories" ON member_stories;
CREATE POLICY "Full access on member_stories" ON member_stories FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- 3. TABEL: class_kas_records (Pencatatan Pembayaran Kas Mingguan Siswa)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS class_kas_records (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL,
  week_number INTEGER NOT NULL,
  month_year TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 3000,
  status TEXT NOT NULL DEFAULT 'paid', -- 'paid' | 'unpaid'
  paid_at TIMESTAMPTZ,
  recorded_by TEXT NOT NULL DEFAULT 'Bendahara',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE class_kas_records ADD COLUMN IF NOT EXISTS member_id BIGINT;
ALTER TABLE class_kas_records ADD COLUMN IF NOT EXISTS week_number INTEGER;
ALTER TABLE class_kas_records ADD COLUMN IF NOT EXISTS month_year TEXT;
ALTER TABLE class_kas_records ADD COLUMN IF NOT EXISTS amount INTEGER DEFAULT 3000;
ALTER TABLE class_kas_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'paid';
ALTER TABLE class_kas_records ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE class_kas_records ADD COLUMN IF NOT EXISTS recorded_by TEXT DEFAULT 'Bendahara';
ALTER TABLE class_kas_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE class_kas_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE class_kas_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$ BEGIN
  ALTER TABLE class_kas_records ALTER COLUMN recorded_by SET DEFAULT 'Bendahara';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'members') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_kas_records_member') THEN
      ALTER TABLE class_kas_records 
      ADD CONSTRAINT fk_kas_records_member 
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_kas_member ON class_kas_records(member_id);
CREATE INDEX IF NOT EXISTS idx_kas_period ON class_kas_records(month_year, week_number);
CREATE INDEX IF NOT EXISTS idx_kas_status ON class_kas_records(status);

ALTER TABLE class_kas_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access on class_kas_records" ON class_kas_records;
CREATE POLICY "Full access on class_kas_records" ON class_kas_records FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- 4. TABEL: class_kas_weeks (Konfigurasi Periode Minggu Kas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS class_kas_weeks (
  id BIGSERIAL PRIMARY KEY,
  week_number INTEGER NOT NULL UNIQUE,
  label TEXT NOT NULL,
  date_range TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT 2026,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE class_kas_weeks ADD COLUMN IF NOT EXISTS week_number INTEGER;
ALTER TABLE class_kas_weeks ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE class_kas_weeks ADD COLUMN IF NOT EXISTS date_range TEXT;
ALTER TABLE class_kas_weeks ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT 2026;
ALTER TABLE class_kas_weeks ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_kas_weeks_order ON class_kas_weeks(order_index, week_number);

ALTER TABLE class_kas_weeks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access on class_kas_weeks" ON class_kas_weeks;
CREATE POLICY "Full access on class_kas_weeks" ON class_kas_weeks FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- 5. TABEL: class_kas_expenses (Pencatatan Pengeluaran Kas Kelas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS class_kas_expenses (
  id BIGSERIAL PRIMARY KEY,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Lain-lain',
  amount INTEGER NOT NULL CHECK (amount > 0),
  recorded_by TEXT DEFAULT 'Bendahara',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE class_kas_expenses ADD COLUMN IF NOT EXISTS expense_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE class_kas_expenses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE class_kas_expenses ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Lain-lain';
ALTER TABLE class_kas_expenses ADD COLUMN IF NOT EXISTS amount INTEGER;
ALTER TABLE class_kas_expenses ADD COLUMN IF NOT EXISTS recorded_by TEXT DEFAULT 'Bendahara';
ALTER TABLE class_kas_expenses ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_kas_expenses_date ON class_kas_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_kas_expenses_category ON class_kas_expenses(category);

ALTER TABLE class_kas_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access on class_kas_expenses" ON class_kas_expenses;
CREATE POLICY "Full access on class_kas_expenses" ON class_kas_expenses FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- 6. TABEL: class_schedules (Jadwal Pelajaran Kelas)
-- Minimal: hari, jam mulai, jam selesai, mata pelajaran, guru (tanpa ruangan)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS class_schedules (
  id BIGSERIAL PRIMARY KEY,
  day TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  room TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE class_schedules ADD COLUMN IF NOT EXISTS day TEXT;
ALTER TABLE class_schedules ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE class_schedules ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE class_schedules ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE class_schedules ADD COLUMN IF NOT EXISTS teacher_name TEXT;
ALTER TABLE class_schedules ADD COLUMN IF NOT EXISTS room TEXT;
ALTER TABLE class_schedules ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE class_schedules ALTER COLUMN room DROP NOT NULL;
  ALTER TABLE class_schedules ALTER COLUMN teacher_name DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_schedules_day ON class_schedules(day);
CREATE INDEX IF NOT EXISTS idx_schedules_order ON class_schedules(order_index);

ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access on class_schedules" ON class_schedules;
CREATE POLICY "Full access on class_schedules" ON class_schedules FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- 7. TABEL: piket_schedules (Jadwal Piket Kebersihan Kelas)
-- Minimal: hari, nama anggota/petugas (tanpa tugas piket)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS piket_schedules (
  id BIGSERIAL PRIMARY KEY,
  day TEXT NOT NULL,
  member_id BIGINT NULL,
  member_name TEXT NOT NULL,
  tasks TEXT DEFAULT 'Piket Kebersihan Kelas',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE piket_schedules ADD COLUMN IF NOT EXISTS day TEXT;
ALTER TABLE piket_schedules ADD COLUMN IF NOT EXISTS member_id BIGINT;
ALTER TABLE piket_schedules ADD COLUMN IF NOT EXISTS member_name TEXT;
ALTER TABLE piket_schedules ADD COLUMN IF NOT EXISTS tasks TEXT DEFAULT 'Piket Kebersihan Kelas';

DO $$ BEGIN
  ALTER TABLE piket_schedules ALTER COLUMN tasks DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'members') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_piket_member') THEN
      ALTER TABLE piket_schedules 
      ADD CONSTRAINT fk_piket_member 
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_piket_day ON piket_schedules(day);

ALTER TABLE piket_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access on piket_schedules" ON piket_schedules;
CREATE POLICY "Full access on piket_schedules" ON piket_schedules FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- 8. TABEL: member_accounts (Akun Login Portal Siswa & Guru)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS member_accounts (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  has_changed_password INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE member_accounts ADD COLUMN IF NOT EXISTS member_id BIGINT;
ALTER TABLE member_accounts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE member_accounts ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE member_accounts ADD COLUMN IF NOT EXISTS has_changed_password INTEGER DEFAULT 0;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'members') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_member_accounts_member') THEN
      ALTER TABLE member_accounts 
      ADD CONSTRAINT fk_member_accounts_member 
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_member_accounts_email ON member_accounts(email);
CREATE INDEX IF NOT EXISTS idx_member_accounts_member ON member_accounts(member_id);

ALTER TABLE member_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access on member_accounts" ON member_accounts;
CREATE POLICY "Full access on member_accounts" ON member_accounts FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- 9. TABEL: verification_codes (Kode Verifikasi 6-Digit Ganti Password & Email)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS verification_codes (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL, -- 'change_password' | 'change_email'
  new_email TEXT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS new_email TEXT;
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS used INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_codes(email, code);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access on verification_codes" ON verification_codes;
CREATE POLICY "Full access on verification_codes" ON verification_codes FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- 10. SUPABASE STORAGE BUCKET: uploads
-- ==============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('uploads', 'uploads', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
    ON CONFLICT (id) DO UPDATE SET public = true;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    DROP POLICY IF EXISTS "Public access to uploads" ON storage.objects;
    CREATE POLICY "Public access to uploads" ON storage.objects
    FOR SELECT USING (bucket_id = 'uploads');

    DROP POLICY IF EXISTS "Full access to uploads" ON storage.objects;
    CREATE POLICY "Full access to uploads" ON storage.objects
    FOR ALL USING (bucket_id = 'uploads') WITH CHECK (bucket_id = 'uploads');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ==============================================================================
-- 11. PENGATURAN KAS DEFAULT PADA website_settings (Jika belum ada)
-- ==============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_settings') THEN
    INSERT INTO website_settings (key, value, description, updated_at)
    VALUES 
      ('kas_nominal', '3000', 'Nominal kas per minggu (Rp)', NOW()),
      ('kas_start_date', '2026-10-01', 'Tanggal mulai periode kas', NOW()),
      ('kas_start_week', '1', 'Nomor minggu awal kas', NOW())
    ON CONFLICT (key) DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ==============================================================================
-- 12. RELOAD SCHEMA CACHE SUPABASE POSTGREST
-- Memastikan seluruh tabel baru langsung aktif di REST API Supabase
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
