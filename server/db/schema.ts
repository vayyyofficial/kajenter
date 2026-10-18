import { db, query } from './index.js';

export function initializeDatabase() {
  db.exec(`

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'User', -- 'Admin', 'Ketua Kelas', 'Wakil Ketua', 'Bendahara', 'Sekretaris', 'User'
      full_name TEXT,
      email TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS roles_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT UNIQUE NOT NULL,
      can_manage_gallery INTEGER NOT NULL DEFAULT 0,
      can_manage_members INTEGER NOT NULL DEFAULT 0,
      can_manage_social INTEGER NOT NULL DEFAULT 0,
      can_manage_settings INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      attendance_number INTEGER NULL,
      full_name TEXT NOT NULL,
      nickname TEXT,
      birth_place TEXT,
      birth_date TEXT,
      email TEXT,
      role TEXT NOT NULL, -- e.g. 'Wali Kelas', 'Ketua Kelas', 'Wakil Ketua', 'Bendahara', 'Sekretaris', 'Siswa'
      member_type TEXT NOT NULL, -- 'guru' or 'siswa'
      photo_number TEXT NULL, -- e.g. '01', '04', 'guru_01'
      phone TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      event_identity TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Kegiatan',
      description TEXT NOT NULL,
      image_path TEXT NOT NULL,
      event_date TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS social_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      username TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'Globe',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS website_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_auth_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      password_hash TEXT NOT NULL,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT NULL,
      last_failed_at TEXT NULL,
      last_password_change TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Portal: Member Accounts for Student/Teacher Login
    CREATE TABLE IF NOT EXISTS member_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      has_changed_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Portal: Kas Records (Weekly payments)
    CREATE TABLE IF NOT EXISTS class_kas_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      month_year TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 3000,
      status TEXT NOT NULL DEFAULT 'paid', -- 'paid' | 'unpaid'
      paid_at TEXT,
      recorded_by TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Portal: Tugas (Class assignments with deadline dates)
    CREATE TABLE IF NOT EXISTS class_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      teacher_name TEXT,
      deadline TEXT NOT NULL,
      description TEXT,
      notes TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Portal: Jadwal Pelajaran (Subject schedules)
    CREATE TABLE IF NOT EXISTS class_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      subject TEXT NOT NULL,
      teacher_name TEXT NOT NULL,
      room TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Portal: Jadwal Piket (Duty rosters)
    CREATE TABLE IF NOT EXISTS piket_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day TEXT NOT NULL,
      member_id INTEGER NULL REFERENCES members(id) ON DELETE SET NULL,
      member_name TEXT NOT NULL,
      tasks TEXT NOT NULL DEFAULT 'Membersihkan kelas dan merapikan perlengkapan',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Portal: 6-digit Verification Codes (Password and Email changes)
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL, -- 'change_password' | 'change_email'
      new_email TEXT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_members_type ON members(member_type);
    CREATE INDEX IF NOT EXISTS idx_members_attendance ON members(attendance_number);
    CREATE INDEX IF NOT EXISTS idx_gallery_date ON gallery(event_date);
    CREATE INDEX IF NOT EXISTS idx_member_accounts_email ON member_accounts(email);
    CREATE INDEX IF NOT EXISTS idx_member_accounts_member ON member_accounts(member_id);
    CREATE INDEX IF NOT EXISTS idx_kas_member ON class_kas_records(member_id);
    CREATE INDEX IF NOT EXISTS idx_kas_period ON class_kas_records(month_year, week_number);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON class_tasks(deadline);
    CREATE INDEX IF NOT EXISTS idx_schedules_day ON class_schedules(day);
    CREATE INDEX IF NOT EXISTS idx_piket_day ON piket_schedules(day);
    CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_codes(email, code);
  `);

  // Safe Additive Migrations:
  // 1. Ensure Developer role exists in roles_permissions
  try {
    db.exec(`
      INSERT OR IGNORE INTO roles_permissions (role_name, can_manage_gallery, can_manage_members, can_manage_social, can_manage_settings, updated_at)
      VALUES ('Developer', 1, 1, 1, 1, datetime('now'));
    `);
  } catch {
    // ignore
  }

  // 2. Ensure fairuzziachmad@gmail.com is registered in members table (Attendance 02, Role Developer)
  // Strictly additive: Never deletes, resets, or overwrites existing data
  try {
    const existingDev = query.get('SELECT id FROM members WHERE LOWER(TRIM(email)) = ?', 'fairuzziachmad@gmail.com');
    if (!existingDev) {
      const now = new Date().toISOString();
      query.run(
        `INSERT INTO members (attendance_number, full_name, nickname, birth_place, birth_date, email, role, member_type, photo_number, phone, created_at, updated_at)
         VALUES (2, 'Fairuzzi Achmad', 'Fairuz', 'Surabaya', '2008-01-14', 'fairuzziachmad@gmail.com', 'Developer', 'siswa', '02', '+628123456702', ?, ?)`,
        now,
        now
      );
    }
  } catch {
    // ignore
  }
}
