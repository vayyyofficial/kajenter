# Database Documentation — X ICP TKJ Class Portal

> **Project**: Website Resmi Kelas X ICP TKJ — SMK Telkom Malang  
> **Database**: Supabase (PostgreSQL)  
> **Last Audited**: 2026-11-13  
> **File index**: [`database/README.md`](../database/README.md) (SQL files stay at repo root; names unchanged)

---

## 1. Overview

The database serves a **class portal website** for X ICP TKJ — SMK Telkom Malang. It is hosted on Supabase (PostgreSQL) and accessed via two layers:

| Layer | Purpose |
|---|---|
| **Express API server** (`server/`) | Handles admin auth, CRUD, and file uploads via service-role key |
| **Supabase PostgREST / RPC** | Used by the Rolling seating feature directly from the frontend via anon/authenticated key |

The schema covers:
- **Admin & user management** (admin auth state, users, roles/permissions)
- **Class portal** (members, gallery, social media, website settings, activity logs)
- **Student portal** (member accounts, verification codes)
- **Class activities** (kas/treasury, tasks/assignments, schedules, piket/duty roster)
- **Class Rolling** (seating randomizer: students, layouts, seats, periods, assignments, history)

---

## 2. Migration Order

Apply SQL files in this order. Each file is **strictly additive** (uses `IF NOT EXISTS` guards).

| Order | File | Description |
|---|---|---|
| 1 | `supabase-schema.sql` | Full initial schema + seed data |
| 2 | `supabase-migration-kas-jadwal-piket.sql` | Adds kas expenses, stories, jadwal & piket tables; backfills columns |
| 3 | `supabase-migration-rolling.sql` | Adds Class Rolling tables, functions, cron job, seed students |

> [!IMPORTANT]
> `supabase-migration-rolling.sql` requires `uuid-ossp` and `pg_cron` extensions. `pg_cron` must be enabled in the Supabase project dashboard under **Database → Extensions** before running this file.

> [!NOTE]
> `supabase-migration-kas-jadwal-piket.sql` re-creates tables that also appear in `supabase-schema.sql` using `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE … ADD COLUMN IF NOT EXISTS`. Running it after `supabase-schema.sql` is safe — it only adds the `member_stories` and `class_kas_expenses` tables and backfills defaults/constraints.

---

## 3. Schema

### 3.1 Core Admin Tables

#### `users`
Admin/user accounts for the management dashboard.

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY |
| `username` | TEXT | UNIQUE NOT NULL |
| `password_hash` | TEXT | NOT NULL |
| `role` | TEXT | NOT NULL, DEFAULT `'User'` |
| `full_name` | TEXT | nullable |
| `email` | TEXT | nullable |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**RLS**: Enabled — service role full access.

---

#### `roles_permissions`
Role-based access control for admin dashboard capabilities.

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY |
| `role_name` | TEXT | UNIQUE NOT NULL |
| `can_manage_gallery` | INTEGER | NOT NULL, DEFAULT 0 |
| `can_manage_members` | INTEGER | NOT NULL, DEFAULT 0 |
| `can_manage_social` | INTEGER | NOT NULL, DEFAULT 0 |
| `can_manage_settings` | INTEGER | NOT NULL, DEFAULT 0 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Seeded roles**: Admin, Ketua Kelas, Wakil Ketua, Bendahara, Sekretaris, User.

**RLS**: Enabled — service role full access.

---

#### `admin_auth_state`
Singleton row (id = 1) storing the master admin password hash and lockout state.

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PRIMARY KEY, CHECK (id = 1) |
| `password_hash` | TEXT | NOT NULL |
| `failed_attempts` | INTEGER | NOT NULL, DEFAULT 0 |
| `locked_until` | TIMESTAMPTZ | nullable |
| `last_failed_at` | TIMESTAMPTZ | nullable |
| `last_password_change` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Default seeded password**: `icptkj35` (bcrypt hash).

**RLS**: Enabled — service role full access only.

---

#### `activity_logs`
Audit log for admin actions.

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY |
| `user_name` | TEXT | NOT NULL |
| `action` | TEXT | NOT NULL |
| `entity_type` | TEXT | NOT NULL |
| `details` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes**: `idx_activity_logs_date` on `created_at DESC`.

**RLS**: Enabled — service role full access.

---

### 3.2 Class Portal Tables

#### `members`
Master roster of class members (teachers and students).

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY |
| `user_id` | BIGINT | FK → `users(id)` ON DELETE SET NULL, nullable |
| `attendance_number` | INTEGER | nullable |
| `full_name` | TEXT | NOT NULL |
| `nickname` | TEXT | nullable |
| `birth_place` | TEXT | nullable |
| `birth_date` | TEXT | nullable |
| `email` | TEXT | nullable |
| `role` | TEXT | NOT NULL |
| `member_type` | TEXT | NOT NULL — `'guru'` or `'siswa'` |
| `photo_number` | TEXT | nullable |
| `phone` | TEXT | nullable |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes**: `idx_members_type` (member_type), `idx_members_attendance` (attendance_number).

**RLS**: Enabled — public SELECT; service role full access.

---

#### `gallery`
Photo gallery of class events.

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY |
| `title` | TEXT | NOT NULL |
| `event_identity` | TEXT | NOT NULL |
| `category` | TEXT | NOT NULL, DEFAULT `'Kegiatan'` |
| `description` | TEXT | NOT NULL |
| `image_path` | TEXT | NOT NULL |
| `event_date` | TEXT | NOT NULL |
| `created_by` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes**: `idx_gallery_date` on `event_date DESC`.

**RLS**: Enabled — public SELECT; service role full access.

---

#### `social_media`
Class social media links.

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY |
| `platform` | TEXT | NOT NULL |
| `username` | TEXT | NOT NULL |
| `url` | TEXT | NOT NULL |
| `icon` | TEXT | NOT NULL, DEFAULT `'Globe'` |
| `is_active` | INTEGER | NOT NULL, DEFAULT 1 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**RLS**: Enabled — public SELECT; service role full access.

---

#### `website_settings`
Key-value store for site-wide configuration.

| Column | Type | Constraints |
|---|---|---|
| `key` | TEXT | PRIMARY KEY |
| `value` | TEXT | NOT NULL |
| `description` | TEXT | nullable |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Seeded keys**: `class_name`, `school_name`, `school_program`, `logo_url`, `class_description`, `kas_nominal`, `kas_start_date`, `kas_start_week`.

**RLS**: Enabled — public SELECT; service role full access.

---

### 3.3 Student Portal Tables

#### `member_accounts`
Login accounts for students and teachers in the student portal.

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY |
| `member_id` | BIGINT | NOT NULL, FK → `members(id)` ON DELETE CASCADE |
| `email` | TEXT | UNIQUE NOT NULL |
| `password_hash` | TEXT | NOT NULL |
| `has_changed_password` | INTEGER | NOT NULL, DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes**: `idx_member_accounts_email`, `idx_member_accounts_member`.

**RLS**: Enabled — full access (all roles).

---

#### `verification_codes`
6-digit OTP codes for password/email change flows.

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY |
| `email` | TEXT | NOT NULL |
| `code` | TEXT | NOT NULL |
| `purpose` | TEXT | NOT NULL — `'change_password'` or `'change_email'` |
| `new_email` | TEXT | nullable |
| `expires_at` | TIMESTAMPTZ | NOT NULL |
| `used` | INTEGER | NOT NULL, DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes**: `idx_verification_email` on `(email, code)`.

**RLS**: Enabled — full access.

---

### 3.4 Class Activities Tables

#### `class_kas_records`
Weekly class treasury (kas) payment records per student.

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY |
| `member_id` | BIGINT | NOT NULL, FK → `members(id)` ON DELETE CASCADE |
| `week_number` | INTEGER | NOT NULL |
| `month_year` | TEXT | NOT NULL |
| `amount` | INTEGER | NOT NULL, DEFAULT 3000 |
| `status` | TEXT | NOT NULL, DEFAULT `'paid'` — `'paid'` or `'unpaid'` |
| `paid_at` | TIMESTAMPTZ | nullable |
| `recorded_by` | TEXT | NOT NULL, DEFAULT `'Bendahara'` |
| `notes` | TEXT | nullable |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes**: `idx_kas_member`, `idx_kas_period` (month_year, week_number), `idx_kas_status`.

**RLS**: Enabled — full access.

---

#### `class_kas_weeks`
Configuration for each kas week period.

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY |
| `week_number` | INTEGER | UNIQUE NOT NULL |
| `label` | TEXT | NOT NULL |
| `date_range` | TEXT | NOT NULL |
| `year` | INTEGER | NOT NULL, DEFAULT 2026 |
| `order_index` | INTEGER | NOT NULL, DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes**: `idx_kas_weeks_order` (order_index, week_number).

**RLS**: Enabled — full access.

---

#### `class_kas_expenses`
Class expenditure records (added in migration 002).

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY |
| `expense_date` | DATE | NOT NULL, DEFAULT CURRENT_DATE |
| `description` | TEXT | NOT NULL |
| `category` | TEXT | NOT NULL, DEFAULT `'Lain-lain'` |
| `amount` | INTEGER | NOT NULL, CHECK (amount > 0) |
| `recorded_by` | TEXT | DEFAULT `'Bendahara'` |
| `notes` | TEXT | nullable |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes**: `idx_kas_expenses_date` (expense_date DESC), `idx_kas_expenses_category`.

**RLS**: Enabled — full access.

---

#### `class_tasks`
Class assignment / homework records.

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY |
| `title` | TEXT | NOT NULL |
| `subject` | TEXT | NOT NULL |
| `teacher_name` | TEXT | nullable |
| `deadline` | TEXT | NOT NULL (format: YYYY-MM-DD) |
| `description` | TEXT | nullable |
| `notes` | TEXT | nullable |
| `status` | TEXT | DEFAULT `'pending'` — `'pending'`, `'in_progress'`, `'completed'` |
| `created_by` | TEXT | NOT NULL, DEFAULT `'Sekretaris'` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

> [!NOTE]
> `supabase-schema.sql` defined `class_tasks` without the `status` column. Migration 002 adds it via `ALTER TABLE … ADD COLUMN IF NOT EXISTS`.

**Indexes**: `idx_tasks_deadline`, `idx_tasks_status`.

**RLS**: Enabled — full access.

---

#### `class_schedules`
Weekly subject schedule (timetable).

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY |
| `day` | TEXT | NOT NULL |
| `start_time` | TEXT | NOT NULL |
| `end_time` | TEXT | NOT NULL |
| `subject` | TEXT | NOT NULL |
| `teacher_name` | TEXT | (dropped NOT NULL in migration 002) |
| `room` | TEXT | nullable |
| `order_index` | INTEGER | NOT NULL, DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes**: `idx_schedules_day`, `idx_schedules_order`.

**RLS**: Enabled — full access.

---

#### `piket_schedules`
Weekly classroom duty (piket) roster.

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY |
| `day` | TEXT | NOT NULL |
| `member_id` | BIGINT | nullable, FK → `members(id)` ON DELETE SET NULL |
| `member_name` | TEXT | NOT NULL |
| `tasks` | TEXT | DEFAULT `'Piket Kebersihan Kelas'` (dropped NOT NULL in 002) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes**: `idx_piket_day`.

**RLS**: Enabled — full access.

---

#### `member_stories`
Student/teacher stories (Instagram-style, added in migration 002).

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGSERIAL | PRIMARY KEY |
| `member_id` | BIGINT | NOT NULL, FK → `members(id)` ON DELETE CASCADE |
| `media_url` | TEXT | NOT NULL |
| `caption` | TEXT | nullable |
| `expiration_type` | TEXT | NOT NULL, DEFAULT `'24h'` — `'24h'`, `'custom'`, `'lifetime'` |
| `expires_at` | TIMESTAMPTZ | nullable (NULL = lifetime) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes**: `idx_member_stories_member_id`, `idx_member_stories_expires_at`, `idx_member_stories_active`.

**RLS**: Enabled — public SELECT for active stories; full access for writes.

---

### 3.5 Class Rolling Tables

All Rolling tables use **UUID** primary keys (via `gen_random_uuid()`).

#### `students`
The 26 students in the rolling seating system (separate from `members`).

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `number` | INT | UNIQUE NOT NULL, CHECK > 0 |
| `full_name` | TEXT | NOT NULL |
| `nickname` | TEXT | NOT NULL |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes**: `idx_students_active`.

**Grants**: SELECT, INSERT, UPDATE, DELETE to anon, authenticated, postgres, service_role.

**RLS**: Policy `"Public students access"` — FOR ALL USING (true).

> [!WARNING]
> `students` is a **different table** from `members`. It is used only by the Rolling seating feature. The two are not linked by foreign key.

---

#### `classroom_layouts`
Defines named classroom floor plans.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY |
| `name` | TEXT | NOT NULL, DEFAULT `'Denah Standar (3 Blok)'` |
| `teacher_desk_position` | TEXT | NOT NULL, CHECK IN (`'left'`, `'center'`, `'right'`) |
| `teacher_desk_label` | TEXT | NOT NULL, DEFAULT `'Meja Guru'` |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Grants**: SELECT, UPDATE to anon, authenticated, postgres, service_role.

**RLS**: Policy `"Public layouts access"` — FOR ALL USING (true).

---

#### `seats`
Individual seat positions within a layout.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY |
| `layout_id` | UUID | NOT NULL, FK → `classroom_layouts(id)` ON DELETE CASCADE |
| `block_id` | TEXT | NOT NULL |
| `block_name` | TEXT | NOT NULL |
| `seat_code` | TEXT | NOT NULL |
| `row_index` | INT | NOT NULL |
| `col_index` | INT | NOT NULL |
| `is_available` | BOOLEAN | NOT NULL, DEFAULT true |
| `default_empty` | BOOLEAN | NOT NULL, DEFAULT false |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Unique**: `(layout_id, seat_code)`.

**Seeded layout**: 28 seats in 3 blocks (Left 10, Middle 10, Right 8 — seats 27 & 28 are `default_empty=true`), giving 26 usable seats for 26 students.

**Indexes**: `idx_seats_layout`.

**RLS**: Policy `"Public seats access"` — FOR ALL USING (true).

---

#### `seating_periods`
Records each weekly seating cycle.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY |
| `cycle_id` | TEXT | UNIQUE NOT NULL |
| `layout_id` | UUID | NOT NULL, FK → `classroom_layouts(id)` |
| `status` | TEXT | NOT NULL, DEFAULT `'active'` — CHECK IN (`'active'`, `'archived'`) |
| `roll_type` | TEXT | NOT NULL, DEFAULT `'automatic'` — CHECK IN (`'automatic'`, `'manual'`, `'initial'`) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes**: `idx_seating_periods_status`.

**RLS**: Policy `"Public seating_periods access"` — FOR ALL USING (true).

---

#### `seating_assignments`
Maps each student to a seat for a given period.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY |
| `period_id` | UUID | NOT NULL, FK → `seating_periods(id)` ON DELETE CASCADE |
| `seat_id` | UUID | NOT NULL, FK → `seats(id)` ON DELETE CASCADE |
| `student_id` | UUID | NOT NULL, FK → `students(id)` ON DELETE CASCADE |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Unique**: `(period_id, seat_id)` and `(period_id, student_id)` — one student per seat per period.

**Indexes**: `idx_seating_assignments_period`.

**RLS**: Policy `"Public seating_assignments access"` — FOR ALL USING (true).

---

#### `reroll_history`
Audit trail of every seating randomization.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY |
| `period_id` | UUID | nullable, FK → `seating_periods(id)` ON DELETE SET NULL |
| `roll_type` | TEXT | NOT NULL — CHECK IN (`'automatic'`, `'manual'`, `'initial'`) |
| `description` | TEXT | NOT NULL |
| `active_student_count` | INT | NOT NULL, DEFAULT 26 |
| `performed_by` | UUID | nullable |
| `cycle_id` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes**: `idx_reroll_history_created` (created_at DESC).

**RLS**: Policy `"Public reroll_history access"` — FOR ALL USING (true).

---

#### `saved_class_groups`
Saved results from the Group Randomizer utility.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY |
| `category` | TEXT | NOT NULL, DEFAULT `'Tugas Kelompok'` |
| `subject` | TEXT | NOT NULL |
| `submitted_by_student_id` | UUID | nullable, FK → `students(id)` ON DELETE SET NULL |
| `submitted_by_name` | TEXT | NOT NULL |
| `num_groups` | INT | NOT NULL |
| `student_count` | INT | NOT NULL, DEFAULT 26 |
| `groups_data` | JSONB | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes**: `idx_saved_class_groups_created` (created_at DESC).

**RLS**: SELECT, INSERT, DELETE — public; UPDATE — revoked from anon/authenticated.

---

## 4. Functions & RPC

All functions are in the `public` schema and use `SECURITY DEFINER`.

### `cron_execute_weekly_reroll()` → JSONB
**Purpose**: Called by pg_cron every Sunday at 06:00 WIB (23:00 UTC Saturday).  
**Logic**:
1. Acquires an advisory lock (idempotent).
2. Computes `cycle_id` from the current WIB week start date.
3. Skips if that `cycle_id` already exists in `seating_periods`.
4. Archives the current active period.
5. Shuffles active students randomly into available seats.
6. Inserts a `reroll_history` record.

**Returns**: `{ success, skipped, period_id, cycle_id, student_count, roll_type, created_at }`

**Grants**: EXECUTE to `postgres`, `service_role` only. **Not callable from frontend.**

---

### `execute_seating_reroll(p_roll_type TEXT, p_description TEXT)` → JSONB
**Purpose**: Called from the Admin Dashboard for manual or on-demand rerolls.  
**Parameters**:
- `p_roll_type`: `'manual'` (default) | `'automatic'` | `'initial'`
- `p_description`: Human-readable label for the history record.

**Logic**: Same shuffle algorithm as `cron_execute_weekly_reroll()` but always creates a new unique `cycle_id` (appends timestamp + random suffix for manual/automatic types).

**Returns**: `{ success, period_id, cycle_id, student_count, roll_type, created_at }`

**Grants**: EXECUTE to `anon`, `authenticated`, `service_role`.

---

### `get_active_seating()` → JSONB
**Purpose**: Returns the full active seating map for the public Rolling page.  
**Returns**:
```json
{
  "active": true,
  "period_id": "...",
  "cycle_id": "CYCLE-2026-11-09",
  "roll_type": "automatic",
  "created_at": "...",
  "assignments": { "<seat_id>": "<student_id>", ... },
  "empty_seat_ids": ["<seat_id>", ...]
}
```
Returns `{ "active": false }` when no active period exists.

**Grants**: EXECUTE to `anon`, `authenticated`, `service_role`.

> [!WARNING]
> There is a **bug** in `get_active_seating()`: line `'cycle_id', v_cycle_id` references an undeclared variable `v_cycle_id`. It should be `v_period.cycle_id`. This will cause a PostgreSQL runtime error. See Maintenance Notes §9.

---

## 5. Triggers

No explicit `CREATE TRIGGER` statements were found in any SQL file. The `updated_at` timestamps are **not** auto-updated via triggers — they must be set by the application/API layer on each UPDATE.

---

## 6. RLS Policies

### Summary Table

| Table | Public SELECT | Public Write | Service Role |
|---|---|---|---|
| `members` | ✅ | ❌ | ✅ Full |
| `gallery` | ✅ | ❌ | ✅ Full |
| `social_media` | ✅ | ❌ | ✅ Full |
| `website_settings` | ✅ | ❌ | ✅ Full |
| `users` | ❌ | ❌ | ✅ Full |
| `roles_permissions` | ❌ | ❌ | ✅ Full |
| `admin_auth_state` | ❌ | ❌ | ✅ Full |
| `activity_logs` | ❌ | ❌ | ✅ Full |
| `member_accounts` | ✅ Full | ✅ Full | ✅ Full |
| `class_kas_records` | ✅ Full | ✅ Full | ✅ Full |
| `class_kas_weeks` | ✅ Full | ✅ Full | ✅ Full |
| `class_kas_expenses` | ✅ Full | ✅ Full | ✅ Full |
| `class_tasks` | ✅ Full | ✅ Full | ✅ Full |
| `class_schedules` | ✅ Full | ✅ Full | ✅ Full |
| `piket_schedules` | ✅ Full | ✅ Full | ✅ Full |
| `verification_codes` | ✅ Full | ✅ Full | ✅ Full |
| `member_stories` | ✅ SELECT | ✅ Full | ✅ Full |
| `students` (rolling) | ✅ Full | ✅ Full | ✅ Full |
| `classroom_layouts` | ✅ Full | ✅ Full | ✅ Full |
| `seats` | ✅ Full | ✅ Full | ✅ Full |
| `seating_periods` | ✅ Full | ✅ Full | ✅ Full |
| `seating_assignments` | ✅ Full | ✅ Full | ✅ Full |
| `reroll_history` | ✅ Full | ✅ Full | ✅ Full |
| `saved_class_groups` | ✅ SELECT | ✅ INSERT/DELETE | ✅ Full |

> [!CAUTION]
> Portal tables (`member_accounts`, `class_kas_*`, `verification_codes`, etc.) use `USING (true) WITH CHECK (true)` — meaning any anonymous client with the anon key can read and write them. The only protection is the Supabase anon key itself. The Express API server should be the sole writer; direct PostgREST access should be reviewed.

---

## 7. Migration Notes

### File 1: `supabase-schema.sql`
**What it does**:
- Creates all core tables: `users`, `roles_permissions`, `members`, `gallery`, `social_media`, `website_settings`, `admin_auth_state`, `activity_logs`, `member_accounts`, `class_kas_records`, `class_kas_weeks`, `class_tasks`, `class_schedules`, `piket_schedules`, `verification_codes`
- Creates all indexes
- Enables RLS on all tables
- Defines all RLS policies
- Creates `storage.buckets` entry (`uploads`, 10 MB, images only)
- Seeds: admin user, 6 roles, default website settings, 1 teacher + 20 students in `members`, 6 gallery items, 3 social media entries, initial activity log

**Note**: This is the foundation. All subsequent migrations are strictly additive on top of this.

---

### File 2: `supabase-migration-kas-jadwal-piket.sql`
**What it does**:
- Re-creates (safely) `class_tasks`, `class_kas_records`, `class_kas_weeks`, `class_schedules`, `piket_schedules`, `member_accounts`, `verification_codes` with `IF NOT EXISTS` guards + `ADD COLUMN IF NOT EXISTS` backfills
- Adds two **new** tables not in schema.sql: `member_stories`, `class_kas_expenses`
- Adds `status` column to `class_tasks` (DEFAULT `'pending'`)
- Changes default of `recorded_by` in `class_kas_records` to `'Bendahara'`
- Drops NOT NULL from `class_schedules.teacher_name` and `room`
- Drops NOT NULL from `piket_schedules.tasks`
- Adds FK constraints via safe DO blocks (checks for pre-existing constraints)
- Adds kas settings to `website_settings`: `kas_nominal`, `kas_start_date`, `kas_start_week`
- Updates storage bucket to also allow `image/svg+xml`

---

### File 3: `supabase-migration-rolling.sql`
**What it does**:
- Enables `uuid-ossp` and `pg_cron` extensions
- Creates all 7 Rolling tables: `students`, `classroom_layouts`, `seats`, `seating_periods`, `seating_assignments`, `reroll_history`, `saved_class_groups`
- Creates 3 indexes
- Defines 3 PL/pgSQL functions: `cron_execute_weekly_reroll`, `execute_seating_reroll`, `get_active_seating`
- Grants function execute permissions
- Enables RLS on all Rolling tables with permissive policies
- Grants table-level DML permissions
- Adds `seating_periods` and `saved_class_groups` to Supabase Realtime publication
- Seeds 26 students, 1 classroom layout (3-block standard), 28 seats
- Triggers initial seating if no active period exists
- Registers `classrolling-weekly-reroll` pg_cron job (`0 23 * * 6` — 23:00 UTC Sat = 06:00 WIB Sun)

---

## 8. Developer Guide

### Prerequisites
- Supabase project created
- `pg_cron` extension enabled (Dashboard → Database → Extensions → pg_cron)
- Node.js 18+ installed
- Supabase CLI or direct SQL access (e.g., Supabase SQL Editor)

### Step-by-Step Setup

**Step 1 — Enable extensions**
In the Supabase Dashboard SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
```

**Step 2 — Run the initial schema**
In the SQL Editor, paste and execute the contents of:
```
supabase-schema.sql
```
This creates all tables, RLS policies, storage bucket, and seeds default data.

**Step 3 — Run the kas/jadwal/piket migration**
Paste and execute:
```
supabase-migration-kas-jadwal-piket.sql
```
This adds `member_stories`, `class_kas_expenses`, and backfills column defaults.

**Step 4 — Run the rolling migration**
Paste and execute:
```
supabase-migration-rolling.sql
```
This sets up the entire Class Rolling seating system, including the weekly cron job.

**Step 5 — Configure environment variables**

For the Express server (`server/.env`):
```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
JWT_SECRET=<your-secret>
PORT=3001
```

For the frontend (`/.env`):
```
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

**Step 6 — Verify**
```sql
-- Should return 15+ tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Should return 3 functions
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';

-- Should return 1 active seating period
SELECT cycle_id, status FROM seating_periods WHERE status = 'active';
```

---

## 9. Maintenance Notes

### ⚠️ Bug: `get_active_seating()` undefined variable
In `supabase-migration-rolling.sql` line ~383, the function references `v_cycle_id` which is not declared. It should be `v_period.cycle_id`. **Fix this before the function is called in production**:

```sql
CREATE OR REPLACE FUNCTION public.get_active_seating()
RETURNS JSONB ...
-- Change:  'cycle_id', v_cycle_id,
-- To:      'cycle_id', v_period.cycle_id,
```

### ⚠️ Dual student tables
`students` (Rolling) and `members` (portal) are unlinked. If a student is added to `members` they must also be manually added to `students` for the Rolling feature. Consider a sync mechanism or merging these in a future migration.

### ⚠️ Overly permissive portal RLS
Portal tables use `USING (true) WITH CHECK (true)` which grants any anonymous user with the anon key full read/write. For a production school portal, consider adding proper user-based RLS conditions using Supabase Auth JWT claims.

### ⚠️ No `updated_at` triggers
`updated_at` timestamps must be maintained by the application code. Consider adding a `moddatetime` trigger extension:
```sql
CREATE EXTENSION IF NOT EXISTS moddatetime;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);
```

### ⚠️ `has_changed_password` uses INTEGER not BOOLEAN
`member_accounts.has_changed_password` is `INTEGER` (0/1) rather than `BOOLEAN`. Consistent with the rest of the schema style but be careful with truthiness checks in application code.

### ℹ️ pg_cron schedule
The cron job runs at `0 23 * * 6` (UTC) = Sunday 06:00 WIB. If the Supabase project is in a non-UTC timezone, verify this schedule is correct.

### ℹ️ Storage bucket
The `uploads` bucket is public with 10 MB limit. File types allowed: JPEG, PNG, WebP, GIF (and SVG in migration 002). The Express server handles uploads via the service key.
