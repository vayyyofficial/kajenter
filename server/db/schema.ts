import { db } from './index.js';

export function initializeDatabase() {
  db.exec(`
    -- Drop legacy tasks and kas tables if they exist
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS kas_periods;
    DROP TABLE IF EXISTS payments;

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

    CREATE INDEX IF NOT EXISTS idx_members_type ON members(member_type);
    CREATE INDEX IF NOT EXISTS idx_members_attendance ON members(attendance_number);
    CREATE INDEX IF NOT EXISTS idx_gallery_date ON gallery(event_date);
  `);
}
