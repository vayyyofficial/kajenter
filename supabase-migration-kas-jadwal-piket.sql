-- ==============================================================================
-- MIGRATION SCRIPT: KAS MINGGUAN, JADWAL PELAJARAN, DAN JADWAL PIKET
-- Website Resmi Kelas: X ICP TKJ - 35 (SMK Telkom Malang)
-- Aman & Non-Destruktif (Tidak mengubah / menghapus data existing)
-- Jalankan script ini di Supabase SQL Editor
-- ==============================================================================

-- 1. TABEL: class_kas_records (Pencatatan Pembayaran Kas Mingguan)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS class_kas_records (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
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

-- Index performa kas
CREATE INDEX IF NOT EXISTS idx_kas_member ON class_kas_records(member_id);
CREATE INDEX IF NOT EXISTS idx_kas_period ON class_kas_records(month_year, week_number);

-- 2. TABEL: class_kas_weeks (Konfigurasi Periode Minggu Kas)
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

CREATE INDEX IF NOT EXISTS idx_kas_weeks_order ON class_kas_weeks(order_index, week_number);

-- 3. TABEL: class_schedules (Jadwal Pelajaran)
-- Minimal: hari, jam mulai, jam selesai, mata pelajaran, guru
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

CREATE INDEX IF NOT EXISTS idx_schedules_day ON class_schedules(day);

-- 4. TABEL: piket_schedules (Jadwal Piket Kebersihan)
-- Minimal: hari, nama anggota/petugas
-- ==============================================================================
CREATE TABLE IF NOT EXISTS piket_schedules (
  id BIGSERIAL PRIMARY KEY,
  day TEXT NOT NULL,
  member_id BIGINT NULL REFERENCES members(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  tasks TEXT NOT NULL DEFAULT 'Piket Kebersihan Kelas',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_piket_day ON piket_schedules(day);

-- 5. ROW LEVEL SECURITY (RLS) & POLICIES
-- ==============================================================================
ALTER TABLE class_kas_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_kas_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE piket_schedules ENABLE ROW LEVEL SECURITY;

-- Policy class_kas_records
DROP POLICY IF EXISTS "Full access on class_kas_records" ON class_kas_records;
CREATE POLICY "Full access on class_kas_records" ON class_kas_records FOR ALL USING (true) WITH CHECK (true);

-- Policy class_kas_weeks
DROP POLICY IF EXISTS "Full access on class_kas_weeks" ON class_kas_weeks;
CREATE POLICY "Full access on class_kas_weeks" ON class_kas_weeks FOR ALL USING (true) WITH CHECK (true);

-- Policy class_schedules
DROP POLICY IF EXISTS "Full access on class_schedules" ON class_schedules;
CREATE POLICY "Full access on class_schedules" ON class_schedules FOR ALL USING (true) WITH CHECK (true);

-- Policy piket_schedules
DROP POLICY IF EXISTS "Full access on piket_schedules" ON piket_schedules;
CREATE POLICY "Full access on piket_schedules" ON piket_schedules FOR ALL USING (true) WITH CHECK (true);

-- 6. PENGATURAN KAS DEFAULT PADA website_settings (Jika belum ada)
-- ==============================================================================
INSERT INTO website_settings (key, value, description, updated_at)
VALUES 
  ('kas_nominal', '3000', 'Nominal kas per minggu (Rp)', NOW()),
  ('kas_start_date', '2026-09-01', 'Tanggal mulai periode kas', NOW()),
  ('kas_start_week', '1', 'Nomor minggu awal kas', NOW())
ON CONFLICT (key) DO NOTHING;

-- 7. DEFAULT WEEKS SEED (Hanya jika belum ada minggu sama sekali)
-- ==============================================================================
INSERT INTO class_kas_weeks (week_number, label, date_range, year, order_index, created_at, updated_at)
VALUES
  (1, 'Week 1', '1–7 Sep', 2026, 1, NOW(), NOW()),
  (2, 'Week 2', '8–14 Sep', 2026, 2, NOW(), NOW()),
  (3, 'Week 3', '15–21 Sep', 2026, 3, NOW(), NOW()),
  (4, 'Week 4', '22–28 Sep', 2026, 4, NOW(), NOW())
ON CONFLICT (week_number) DO NOTHING;

-- 8. RELOAD SCHEMA CACHE SUPABASE POSTGREST
-- Memastikan Supabase segera mengenali tabel-tabel baru tanpa restart
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
