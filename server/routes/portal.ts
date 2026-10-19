import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbService } from '../db/index.js';
import { CONFIG } from '../config.js';
import {
  requireMemberAuth,
  requireRole,
  recordAuditLog,
  getMemberPermissions,
  AuthenticatedMemberRequest,
} from '../middleware/auth.js';
import { broadcastSync } from '../sync.js';

const router = Router();

// ==========================================
// 1. MEMBER LOGIN & AUTH
// ==========================================

/**
 * POST /api/portal/auth/login
 * Validates member email against live database members.
 * Outsider emails are strictly rejected.
 */
router.post('/auth/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !String(email).trim()) {
      res.status(400).json({
        success: false,
        error: 'Masukkan email anggota kelas.',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    if (!password || !String(password).trim()) {
      res.status(400).json({
        success: false,
        error: 'Masukkan password Anda.',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Verify email exists in members table (Requirement #2, #3, #42)
    const member = await dbService.portalAuth.findMemberByEmail(cleanEmail);
    if (!member) {
      res.status(401).json({
        success: false,
        error: 'Akun ini tidak terdaftar sebagai anggota kelas X ICP TKJ.',
        code: 'OUTSIDER_REJECTED',
      });
      return;
    }

    // Determine default password by attendance number (icptkj35_<absen>)
    let expectedDefaultPassword = '';
    if (member.member_type === 'siswa') {
      const parsedNum = parseInt(String(member.attendance_number ?? ''), 10);
      const attNum = !isNaN(parsedNum) ? String(parsedNum).padStart(2, '0') : '00';
      expectedDefaultPassword = `icptkj35_${attNum}`;
    } else {
      expectedDefaultPassword = 'icptkj35_guru';
    }

    // 2. Check if an account already exists in member_accounts
    const account = await dbService.portalAuth.getAccountByMemberId(member.id);

    if (!account) {
      // First Login: Validate against default password (Requirement #4 & #5)
      if (password !== expectedDefaultPassword) {
        res.status(401).json({
          success: false,
          error: 'Password yang Anda masukkan salah.',
          code: 'INVALID_CREDENTIALS',
        });
        return;
      }

      // Hash default password securely (NEVER store plaintext)
      const passwordHash = await bcrypt.hash(password, 10);
      await dbService.portalAuth.createAccount(member.id, cleanEmail, passwordHash);

      // Sign JWT (8 hours session)
      const token = jwt.sign(
        {
          memberId: member.id,
          email: cleanEmail,
          role: member.role,
          type: 'member',
        },
        CONFIG.JWT_SECRET,
        { expiresIn: '8h' }
      );

      recordAuditLog(member.full_name, 'FIRST_LOGIN', 'MEMBER_AUTH', 'Login pertama kali anggota berhasil.');

      const memberWithPermissions = {
        ...member,
        permissions: getMemberPermissions(member.role),
      };

      res.json({
        success: true,
        token,
        member: memberWithPermissions,
        permissions: memberWithPermissions.permissions,
        firstLogin: true,
        hasChangedPassword: false,
        message: 'Selamat datang di Portal Kelas X ICP TKJ - 35.',
      });
      return;
    }

    // Subsequent Login: Compare password with stored hash
    let isMatch = await bcrypt.compare(String(password), account.password_hash);
    if (!isMatch && (account.has_changed_password === 0 || password === expectedDefaultPassword)) {
      // If default password is used, allow login and update hash safely
      if (password === expectedDefaultPassword) {
        isMatch = true;
        try {
          const newHash = await bcrypt.hash(password, 10);
          await dbService.portalAuth.updatePassword(member.id, newHash);
        } catch (e: any) {
          console.warn('Could not update password hash:', e.message);
        }
      }
    }

    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: 'Password yang Anda masukkan salah.',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    // Sign JWT
    const token = jwt.sign(
      {
        memberId: member.id,
        email: cleanEmail,
        role: member.role,
        type: 'member',
      },
      CONFIG.JWT_SECRET,
      { expiresIn: '8h' }
    );

    recordAuditLog(member.full_name, 'LOGIN', 'MEMBER_AUTH', 'Login anggota Portal Kelas berhasil.');

    const memberWithPermissions = {
      ...member,
      permissions: getMemberPermissions(member.role),
    };

    res.json({
      success: true,
      token,
      member: memberWithPermissions,
      permissions: memberWithPermissions.permissions,
      firstLogin: false,
      hasChangedPassword: account.has_changed_password === 1,
      message: 'Login berhasil.',
    });
  } catch (err: any) {
    console.error('Portal login error:', err);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan pada sistem atau database. Silakan coba beberapa saat lagi.' });
  }
});

/**
 * GET /api/portal/auth/me
 * Retrieves current member profile & permissions
 */
router.get('/auth/me', requireMemberAuth, async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
  try {
    const memberId = req.memberUser!.memberId;
    const member = await dbService.members.getById(memberId);
    if (!member) {
      res.status(404).json({ success: false, error: 'Data anggota tidak ditemukan.' });
      return;
    }

    const account = await dbService.portalAuth.getAccountByMemberId(memberId);

    const memberWithPermissions = {
      ...member,
      permissions: getMemberPermissions(member.role),
    };

    res.json({
      success: true,
      member: memberWithPermissions,
      account: {
        email: member.email,
        hasChangedPassword: account ? account.has_changed_password === 1 : false,
      },
    });
  } catch (err: any) {
    console.error('Portal get me error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memuat profil.' });
  }
});

// ==========================================
// 2. CHANGE PASSWORD & EMAIL (6-digit OTP verification)
// ==========================================

/**
 * POST /api/portal/auth/request-code
 * Validates current password and sends 6-digit verification code
 */
router.post('/auth/request-code', requireMemberAuth, async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
  try {
    const memberId = req.memberUser!.memberId;
    const body = req.body || {};
    const rawPurpose = body.purpose || body.type;
    const purpose =
      rawPurpose === 'password' || rawPurpose === 'change_password'
        ? 'change_password'
        : 'change_email';
    const currentPassword = body.currentPassword;
    const newEmail = body.newEmail || body.targetEmail;

    const account = await dbService.portalAuth.getAccountByMemberId(memberId);
    if (!account) {
      res.status(404).json({ success: false, error: 'Akun anggota belum diinisialisasi.' });
      return;
    }

    // Validate current password when requesting password change
    if (purpose === 'change_password') {
      if (!currentPassword) {
        res.status(400).json({ success: false, error: 'Password saat ini wajib dimasukkan.' });
        return;
      }
      const isCurrentValid = await bcrypt.compare(String(currentPassword), account.password_hash);
      if (!isCurrentValid) {
        res.status(400).json({ success: false, error: 'Password saat ini yang Anda masukkan salah.' });
        return;
      }
    }

    // If changing email, validate new email uniqueness
    if (purpose === 'change_email') {
      if (!newEmail || !String(newEmail).includes('@')) {
        res.status(400).json({ success: false, error: 'Format email baru tidak valid.' });
        return;
      }
      const cleanNew = String(newEmail).trim().toLowerCase();
      const existing = await dbService.portalAuth.findMemberByEmail(cleanNew);
      if (existing && String(existing.id) !== String(memberId)) {
        res.status(400).json({ success: false, error: 'Email baru sudah digunakan oleh anggota lain.' });
        return;
      }
    }

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const targetEmail = req.memberUser!.email;

    await dbService.portalAuth.saveVerificationCode(
      targetEmail,
      code,
      purpose,
      newEmail ? String(newEmail).trim().toLowerCase() : undefined
    );

    recordAuditLog(
      req.memberUser!.email,
      'VERIFICATION_REQUESTED',
      'PORTAL_SECURITY',
      `Permintaan kode OTP 6 digit untuk: ${purpose}`
    );

    console.log(`🔑 [PORTAL OTP] Kode verifikasi untuk ${targetEmail} (${purpose}): ${code}`);

    res.json({
      success: true,
      message: `Kode verifikasi 6 digit telah dikirim ke ${targetEmail}. Berlaku selama 10 menit.`,
      expiryMinutes: 10,
      code,
      devVerificationCode: code,
    });
  } catch (err: any) {
    console.error('Request code error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal mengirim kode verifikasi.' });
  }
});

/**
 * Helper handler for changing password with OTP code
 */
async function handleChangePassword(req: AuthenticatedMemberRequest, res: Response): Promise<void> {
  try {
    const memberId = req.memberUser!.memberId;
    const { code, newPassword, confirmPassword } = req.body;

    if (!code) {
      res.status(400).json({ success: false, error: 'Kode verifikasi 6 digit wajib diisi.' });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'Password baru minimal 6 karakter.' });
      return;
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      res.status(400).json({ success: false, error: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    const verifiedRecord = await dbService.portalAuth.verifyCode(
      req.memberUser!.email,
      String(code).trim(),
      'change_password'
    );

    if (!verifiedRecord) {
      res.status(400).json({
        success: false,
        error: 'Kode verifikasi salah atau telah kedaluwarsa. Silakan minta kode baru.',
      });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await dbService.portalAuth.updatePassword(memberId, passwordHash);

    recordAuditLog(req.memberUser!.email, 'PASSWORD_CHANGED', 'PORTAL_SECURITY', 'Anggota berhasil mengganti password akun.');

    res.json({
      success: true,
      message: 'Password berhasil diubah. Gunakan password baru Anda pada login berikutnya.',
    });
  } catch (err: any) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal mengubah password.' });
  }
}

/**
 * Helper handler for changing email with OTP code
 */
async function handleChangeEmail(req: AuthenticatedMemberRequest, res: Response): Promise<void> {
  try {
    const memberId = req.memberUser!.memberId;
    const { code, newEmail } = req.body;

    if (!code) {
      res.status(400).json({ success: false, error: 'Kode verifikasi 6 digit wajib diisi.' });
      return;
    }

    const verifiedRecord = await dbService.portalAuth.verifyCode(
      req.memberUser!.email,
      String(code).trim(),
      'change_email'
    );

    if (!verifiedRecord) {
      res.status(400).json({
        success: false,
        error: 'Kode verifikasi email salah atau telah kedaluwarsa. Silakan minta kode baru.',
      });
      return;
    }

    const emailToApply = (newEmail || verifiedRecord.new_email || '').trim().toLowerCase();
    if (!emailToApply || !emailToApply.includes('@')) {
      res.status(400).json({ success: false, error: 'Alamat email baru tidak valid.' });
      return;
    }

    // Verify uniqueness
    const existing = await dbService.portalAuth.findMemberByEmail(emailToApply);
    if (existing && String(existing.id) !== String(memberId)) {
      res.status(400).json({ success: false, error: 'Email baru sudah digunakan oleh anggota lain.' });
      return;
    }

    await dbService.portalAuth.updateEmail(memberId, emailToApply);
    broadcastSync('members', 'UPDATE', { id: memberId });

    recordAuditLog(
      req.memberUser!.email,
      'EMAIL_CHANGED',
      'PORTAL_SECURITY',
      `Anggota mengubah email login menjadi: ${emailToApply}`
    );

    const freshMember = await dbService.members.getById(memberId);
    const newToken = jwt.sign(
      {
        memberId: freshMember.id,
        email: emailToApply,
        role: freshMember.role,
        type: 'member',
      },
      CONFIG.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const freshMemberWithPerms = {
      ...freshMember,
      email: emailToApply,
      permissions: getMemberPermissions(freshMember.role),
    };

    res.json({
      success: true,
      message: 'Email login berhasil diperbarui dan disinkronkan ke seluruh sistem.',
      newEmail: emailToApply,
      token: newToken,
      member: freshMemberWithPerms,
    });
  } catch (err: any) {
    console.error('Change email error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal mengubah email.' });
  }
}

/**
 * Route aliases to support both REST endpoints and multi-method clients
 */
router.put('/auth/change-password', requireMemberAuth, handleChangePassword);
router.post('/auth/change-password', requireMemberAuth, handleChangePassword);

router.put('/auth/change-email', requireMemberAuth, handleChangeEmail);
router.post('/auth/change-email', requireMemberAuth, handleChangeEmail);

/**
 * POST /api/portal/auth/verify-code
 * Verifies 6-digit code and delegates to password or email change
 */
router.post('/auth/verify-code', requireMemberAuth, async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
  const { purpose } = req.body;
  if (purpose === 'change_password') {
    return handleChangePassword(req, res);
  } else if (purpose === 'change_email') {
    return handleChangeEmail(req, res);
  } else {
    res.status(400).json({ success: false, error: 'Tujuan verifikasi tidak dikenal.' });
  }
});

// ==========================================
// 3. PROFILE EDITING (Sync with main website)
// ==========================================

/**
 * PUT /api/portal/profile
 * Allows logged-in member to update their personal info and profile picture.
 * Role CANNOT be changed by user (Requirement #1 & #10).
 */
router.put('/profile', requireMemberAuth, async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
  try {
    const memberId = req.memberUser!.memberId;
    const existing = await dbService.members.getById(memberId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Anggota tidak ditemukan.' });
      return;
    }

    const fullName = req.body.fullName ?? req.body.full_name;
    const nickname = req.body.nickname;
    const birthPlace = req.body.birthPlace ?? req.body.birth_place;
    const birthDate = req.body.birthDate ?? req.body.birth_date;
    const phone = req.body.phone;
    const photoNumber = req.body.photoNumber ?? req.body.photo_number ?? req.body.customPhotoNumber;

    // Notice: role and member_type are strictly retained from existing record!
    const updated = await dbService.members.update(memberId, {
      fullName: fullName !== undefined ? String(fullName).trim() : existing.full_name,
      nickname: nickname !== undefined ? (nickname ? String(nickname).trim() : null) : existing.nickname,
      birthPlace: birthPlace !== undefined ? (birthPlace ? String(birthPlace).trim() : null) : existing.birth_place,
      birthDate: birthDate !== undefined ? (birthDate ? String(birthDate) : null) : existing.birth_date,
      phone: phone !== undefined ? (phone ? String(phone).trim() : null) : existing.phone,
      photoNumber: photoNumber !== undefined ? (photoNumber ? String(photoNumber).trim() : null) : existing.photo_number,
      // Strictly maintain existing role, attendance number, and member type!
      role: existing.role,
      attendanceNumber: existing.attendance_number,
      memberType: existing.member_type,
    });

    // Real-time multi-device sync
    broadcastSync('members', 'UPDATE', { id: memberId });

    recordAuditLog(existing.full_name, 'UPDATE_PROFILE', 'PORTAL', 'Memperbarui profil diri dari Portal Kelas.');

    const memberWithPerms = {
      ...updated,
      permissions: getMemberPermissions(updated.role),
    };

    res.json({
      success: true,
      message: 'Profil berhasil diperbarui dan disinkronkan.',
      member: memberWithPerms,
      data: memberWithPerms,
    });
  } catch (err: any) {
    console.error('Portal update profile error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memperbarui profil.' });
  }
});

// ==========================================
// 4. KAS MINGGUAN (Weekly cash management)
// ==========================================

/**
 * GET /api/portal/kas
 */
router.get('/kas', requireMemberAuth, async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
  try {
    const { monthYear, year, week, member_id } = req.query;
    const filterPeriod = monthYear ? String(monthYear) : (year ? String(year) : undefined);
    const rawRecords = await dbService.kas.getAll(filterPeriod);
    const summary = await dbService.kas.getSummary();

    let filtered = rawRecords || [];
    if (week) {
      filtered = filtered.filter((r: any) => String(r.week_number) === String(week));
    }
    if (member_id) {
      filtered = filtered.filter((r: any) => String(r.member_id) === String(member_id));
    }

    const records = filtered.map((r: any) => ({
      id: r.id,
      member_id: r.member_id,
      memberId: r.member_id,
      week_number: r.week_number,
      weekNumber: r.week_number,
      month_year: r.month_year,
      monthYear: r.month_year,
      year: parseInt(r.month_year, 10) || new Date().getFullYear(),
      amount: r.amount || 3000,
      status: r.status || 'paid',
      is_paid: r.status === 'paid',
      paid_date: r.paid_at,
      recorded_by_name: r.recorded_by,
      notes: r.notes,
      member_name: r.full_name,
      member_attendance: r.attendance_number,
      member_role: r.role,
    }));

    res.json({
      success: true,
      data: records,
      defaultAmount: summary.weeklyNominal || 3000,
      summary: {
        totalAmount: summary.totalCollected || 0,
        paidCount: records.filter((r: any) => r.is_paid).length,
        unpaidCount: records.filter((r: any) => !r.is_paid).length,
        totalMembers: records.length,
      },
    });
  } catch (err: any) {
    console.error('Get kas error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memuat data kas.' });
  }
});

/**
 * POST /api/portal/kas
 * Only Bendahara or Developer can record kas payments (Requirement #15)
 */
router.post('/kas', requireMemberAuth, requireRole(['Bendahara']), async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
  try {
    const memberId = req.body.memberId ?? req.body.member_id;
    const weekNumber = req.body.weekNumber ?? req.body.week_number;
    const monthYear = req.body.monthYear ?? (req.body.year ? String(req.body.year) : String(new Date().getFullYear()));
    const amount = req.body.amount ? parseInt(req.body.amount, 10) : 3000;
    const status = req.body.status ?? (req.body.is_paid === true || req.body.is_paid === 1 ? 'paid' : (req.body.is_paid === false || req.body.is_paid === 0 ? 'unpaid' : 'paid'));
    const notes = req.body.notes;

    if (!memberId || !weekNumber) {
      res.status(400).json({ success: false, error: 'Member dan minggu wajib diisi.' });
      return;
    }

    const recorded = await dbService.kas.recordPayment({
      memberId,
      weekNumber: parseInt(weekNumber, 10),
      monthYear: String(monthYear).trim(),
      amount,
      status,
      recordedBy: req.memberUser!.role,
      notes,
    });

    broadcastSync('settings', 'UPDATE');
    recordAuditLog(req.memberUser!.role, 'RECORD_KAS', 'KAS', `Mencatat kas minggu ${weekNumber} untuk member ID ${memberId}`);

    res.json({
      success: true,
      message: 'Pembayaran kas berhasil dicatat.',
      data: recorded,
    });
  } catch (err: any) {
    console.error('Record kas error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal mencatat pembayaran kas.' });
  }
});

/**
 * DELETE /api/portal/kas/:id
 * Only Bendahara or Developer can delete payment
 */
router.delete('/kas/:id', requireMemberAuth, requireRole(['Bendahara']), async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
  try {
    const deleted = await dbService.kas.deletePayment(req.params.id);
    broadcastSync('settings', 'UPDATE');
    res.json({ success: true, message: 'Data kas berhasil dihapus.', data: deleted });
  } catch (err: any) {
    console.error('Delete kas error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal menghapus data kas.' });
  }
});

// ==========================================
// 5. TUGAS (Assignments with deadline calendar)
// ==========================================

/**
 * Helper: Get Tomorrow's date in WIB (UTC+7) (Requirement #13)
 */
function getTomorrowDateWIB(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wibTime = new Date(utc + 7 * 3600000);
  wibTime.setDate(wibTime.getDate() + 1);
  const yyyy = wibTime.getFullYear();
  const mm = String(wibTime.getMonth() + 1).padStart(2, '0');
  const dd = String(wibTime.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * GET /api/portal/tasks/due-tomorrow
 * Publicly accessible query for H-1 assignment notification banner (Requirements #13 & #30)
 */
router.get('/tasks/due-tomorrow', async (_req, res: Response): Promise<void> => {
  try {
    const tomorrowWIB = getTomorrowDateWIB();
    const rawTasks = await dbService.tasks.getAll();
    const dueTomorrow = (rawTasks || []).filter(
      (t: any) => String(t.deadline).trim() === tomorrowWIB && t.status !== 'completed'
    ).map((t: any) => ({
      id: t.id,
      title: t.title,
      subject: t.subject,
      teacher_name: t.teacher_name,
      deadline_date: t.deadline,
      deadline: t.deadline,
      description: t.description,
      notes: t.notes,
      status: t.status || 'pending',
    }));

    res.json({
      success: true,
      tomorrowDate: tomorrowWIB,
      count: dueTomorrow.length,
      tasks: dueTomorrow,
    });
  } catch (err: any) {
    console.error('Get due-tomorrow tasks error:', err);
    res.status(500).json({ success: false, error: 'Gagal memuat tugas H-1.' });
  }
});

/**
 * GET /api/portal/tasks
 */
router.get('/tasks', requireMemberAuth, async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
  try {
    const { month } = req.query;
    const rawTasks = await dbService.tasks.getAll();
    let tasks = (rawTasks || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      subject: t.subject,
      teacher_name: t.teacher_name,
      teacherName: t.teacher_name,
      deadline: t.deadline,
      deadline_date: t.deadline,
      description: t.description,
      notes: t.notes,
      created_by: t.created_by,
      status: t.status || 'pending',
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));

    if (month && typeof month === 'string') {
      tasks = tasks.filter((t: any) => String(t.deadline).startsWith(month));
    }

    const deadlineDates = Array.from(new Set(tasks.map((t: any) => t.deadline).filter(Boolean)));

    res.json({ success: true, data: tasks, deadlineDates });
  } catch (err: any) {
    console.error('Get tasks error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memuat tugas.' });
  }
});

/**
 * POST /api/portal/tasks
 * Sekretaris, Ketua Kelas, Wakil Ketua, Developer (Requirements #11 & #12)
 */
router.post(
  '/tasks',
  requireMemberAuth,
  requireRole(['Sekretaris', 'Ketua', 'Ketua Kelas', 'Wakil Ketua']),
  async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
    try {
      const title = req.body.title;
      const subject = req.body.subject;
      const teacherName = req.body.teacherName ?? req.body.teacher_name;
      const deadline = req.body.deadline ?? req.body.deadline_date;
      const description = req.body.description;
      const notes = req.body.notes;

      if (!title || !subject || !deadline) {
        res.status(400).json({ success: false, error: 'Judul, mata pelajaran, dan deadline wajib diisi.' });
        return;
      }

      const created = await dbService.tasks.create({
        title: String(title).trim(),
        subject: String(subject).trim(),
        teacherName: teacherName ? String(teacherName).trim() : undefined,
        deadline: String(deadline).trim(),
        description: description ? String(description).trim() : undefined,
        notes: notes ? String(notes).trim() : undefined,
        createdBy: req.memberUser!.role,
      });

      broadcastSync('settings', 'UPDATE');
      recordAuditLog(req.memberUser!.role, 'CREATE_TASK', 'TASKS', `Menambahkan tugas: ${title}`);

      res.status(201).json({
        success: true,
        message: 'Tugas berhasil ditambahkan.',
        data: created,
      });
    } catch (err: any) {
      console.error('Create task error:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal menambahkan tugas.' });
    }
  }
);

/**
 * PUT /api/portal/tasks/:id
 */
router.put(
  '/tasks/:id',
  requireMemberAuth,
  requireRole(['Sekretaris', 'Ketua', 'Ketua Kelas', 'Wakil Ketua']),
  async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
    try {
      const payload: any = { ...req.body };
      if (req.body.teacher_name && !payload.teacherName) payload.teacherName = req.body.teacher_name;
      if (req.body.deadline_date && !payload.deadline) payload.deadline = req.body.deadline_date;

      const updated = await dbService.tasks.update(req.params.id, payload);
      broadcastSync('settings', 'UPDATE');
      res.json({ success: true, message: 'Tugas berhasil diperbarui.', data: updated });
    } catch (err: any) {
      console.error('Update task error:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal memperbarui tugas.' });
    }
  }
);

/**
 * DELETE /api/portal/tasks/:id
 */
router.delete(
  '/tasks/:id',
  requireMemberAuth,
  requireRole(['Sekretaris', 'Ketua', 'Ketua Kelas', 'Wakil Ketua']),
  async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
    try {
      const deleted = await dbService.tasks.delete(req.params.id);
      broadcastSync('settings', 'UPDATE');
      res.json({ success: true, message: 'Tugas berhasil dihapus.', data: deleted });
    } catch (err: any) {
      console.error('Delete task error:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal menghapus tugas.' });
    }
  }
);

// ==========================================
// 6. JADWAL PELAJARAN (Subject schedules)
// ==========================================

/**
 * GET /api/portal/schedules
 */
router.get('/schedules', requireMemberAuth, async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
  try {
    const { day } = req.query;
    const raw = await dbService.schedules.getAll();
    let schedules = (raw || []).map((s: any) => ({
      id: s.id,
      day: s.day,
      day_of_week: s.day,
      start_time: s.start_time,
      startTime: s.start_time,
      end_time: s.end_time,
      endTime: s.end_time,
      subject: s.subject,
      teacher_name: s.teacher_name,
      teacherName: s.teacher_name,
      room: s.room || null,
      order_index: s.order_index ?? 0,
      orderIndex: s.order_index ?? 0,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));

    if (day && typeof day === 'string') {
      schedules = schedules.filter((s: any) => s.day.toLowerCase() === day.toLowerCase());
    }

    res.json({ success: true, data: schedules });
  } catch (err: any) {
    console.error('Get schedules error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memuat jadwal.' });
  }
});

/**
 * POST /api/portal/schedules (Requirements #14 & #15)
 */
router.post(
  '/schedules',
  requireMemberAuth,
  requireRole(['Ketua', 'Ketua Kelas', 'Wakil Ketua', 'Sekretaris']),
  async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
    try {
      const day = req.body.day ?? req.body.day_of_week;
      const startTime = req.body.startTime ?? req.body.start_time;
      const endTime = req.body.endTime ?? req.body.end_time;
      const subject = req.body.subject;
      const teacherName = req.body.teacherName ?? req.body.teacher_name;
      const room = req.body.room ?? null;
      const orderIndex = req.body.orderIndex ?? req.body.order_index ?? 0;

      if (!day || !startTime || !endTime || !subject || !teacherName) {
        res.status(400).json({ success: false, error: 'Hari, jam mulai, jam selesai, mata pelajaran, dan guru wajib diisi.' });
        return;
      }

      const created = await dbService.schedules.create({
        day: String(day).trim(),
        startTime: String(startTime).trim(),
        endTime: String(endTime).trim(),
        subject: String(subject).trim(),
        teacherName: String(teacherName).trim(),
        room: room ? String(room).trim() : undefined,
        orderIndex: Number(orderIndex) || 0,
      });

      broadcastSync('settings', 'UPDATE');
      res.status(201).json({ success: true, message: 'Jadwal pelajaran berhasil ditambahkan.', data: created });
    } catch (err: any) {
      console.error('Create schedule error:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal menambahkan jadwal.' });
    }
  }
);

/**
 * PUT /api/portal/schedules/:id
 */
router.put(
  '/schedules/:id',
  requireMemberAuth,
  requireRole(['Ketua', 'Ketua Kelas', 'Wakil Ketua', 'Sekretaris']),
  async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
    try {
      const payload: any = { ...req.body };
      if (req.body.day_of_week && !payload.day) payload.day = req.body.day_of_week;
      if (req.body.start_time && !payload.startTime) payload.startTime = req.body.start_time;
      if (req.body.end_time && !payload.endTime) payload.endTime = req.body.end_time;
      if (req.body.teacher_name && !payload.teacherName) payload.teacherName = req.body.teacher_name;
      if (req.body.order_index !== undefined && payload.orderIndex === undefined) payload.orderIndex = req.body.order_index;

      const updated = await dbService.schedules.update(req.params.id, payload);
      broadcastSync('settings', 'UPDATE');
      res.json({ success: true, message: 'Jadwal pelajaran berhasil diperbarui.', data: updated });
    } catch (err: any) {
      console.error('Update schedule error:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal memperbarui jadwal.' });
    }
  }
);

/**
 * DELETE /api/portal/schedules/:id
 */
router.delete(
  '/schedules/:id',
  requireMemberAuth,
  requireRole(['Ketua', 'Ketua Kelas', 'Wakil Ketua', 'Sekretaris']),
  async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
    try {
      const deleted = await dbService.schedules.delete(req.params.id);
      broadcastSync('settings', 'UPDATE');
      res.json({ success: true, message: 'Jadwal berhasil dihapus.', data: deleted });
    } catch (err: any) {
      console.error('Delete schedule error:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal menghapus jadwal.' });
    }
  }
);

// ==========================================
// 7. JADWAL PIKET (Duty roster)
// ==========================================

/**
 * GET /api/portal/piket
 */
router.get('/piket', requireMemberAuth, async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
  try {
    const { day } = req.query;
    const raw = await dbService.piket.getAll();
    let list = (raw || []).map((p: any) => ({
      id: p.id,
      day: p.day,
      day_of_week: p.day,
      member_name: p.member_name,
      memberName: p.member_name,
      member_id: p.member_id,
      tasks: p.tasks,
      order_index: p.id,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

    if (day && typeof day === 'string') {
      list = list.filter((p: any) => p.day.toLowerCase() === day.toLowerCase());
    }

    res.json({ success: true, data: list });
  } catch (err: any) {
    console.error('Get piket error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memuat jadwal piket.' });
  }
});

/**
 * POST /api/portal/piket (Requirements #16)
 */
router.post(
  '/piket',
  requireMemberAuth,
  requireRole(['Ketua', 'Ketua Kelas', 'Wakil Ketua', 'Sekretaris']),
  async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
    try {
      const day = req.body.day ?? req.body.day_of_week;
      const memberName = req.body.memberName ?? req.body.member_name;
      const memberId = req.body.memberId ?? req.body.member_id ?? null;
      const tasks = req.body.tasks || 'Piket Kebersihan Kelas';

      if (!day || !memberName) {
        res.status(400).json({ success: false, error: 'Hari dan nama anggota piket wajib diisi.' });
        return;
      }

      const created = await dbService.piket.create({
        day: String(day).trim(),
        memberId: memberId ? Number(memberId) : null,
        memberName: String(memberName).trim(),
        tasks: String(tasks).trim(),
      });

      broadcastSync('settings', 'UPDATE');
      res.status(201).json({ success: true, message: 'Petugas piket berhasil ditambahkan.', data: created });
    } catch (err: any) {
      console.error('Create piket error:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal menambahkan piket.' });
    }
  }
);

/**
 * PUT /api/portal/piket/:id
 */
router.put(
  '/piket/:id',
  requireMemberAuth,
  requireRole(['Ketua', 'Ketua Kelas', 'Wakil Ketua', 'Sekretaris']),
  async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
    try {
      const updated = await dbService.piket.update(req.params.id, req.body);
      broadcastSync('settings', 'UPDATE');
      res.json({ success: true, message: 'Jadwal piket berhasil diperbarui.', data: updated });
    } catch (err: any) {
      console.error('Update piket error:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal memperbarui jadwal piket.' });
    }
  }
);

/**
 * DELETE /api/portal/piket/:id
 */
router.delete(
  '/piket/:id',
  requireMemberAuth,
  requireRole(['Ketua', 'Ketua Kelas', 'Wakil Ketua', 'Sekretaris']),
  async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
    try {
      const deleted = await dbService.piket.delete(req.params.id);
      broadcastSync('settings', 'UPDATE');
      res.json({ success: true, message: 'Jadwal piket berhasil dihapus.', data: deleted });
    } catch (err: any) {
      console.error('Delete piket error:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal menghapus piket.' });
    }
  }
);

// ==========================================
// 8. USER MANAGEMENT (Developer Only)
// ==========================================

/**
 * GET /api/portal/users
 * Only Developer role can access user management (Requirement #22 & #29)
 */
router.get('/users', requireMemberAuth, requireRole(['Developer']), async (_req, res: Response): Promise<void> => {
  try {
    const allMembers = await dbService.members.getAll();
    const combined = [...allMembers.guru, ...allMembers.siswa];

    res.json({
      success: true,
      data: combined,
    });
  } catch (err: any) {
    console.error('Get portal users error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memuat daftar user.' });
  }
});

/**
 * PUT /api/portal/users/:id/role
 * Only Developer can assign roles to members
 */
router.put(
  '/users/:id/role',
  requireMemberAuth,
  requireRole(['Developer']),
  async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
    try {
      const { role } = req.body;
      if (!role) {
        res.status(400).json({ success: false, error: 'Role baru wajib diisi.' });
        return;
      }

      const member = await dbService.members.getById(req.params.id);
      if (!member) {
        res.status(404).json({ success: false, error: 'Anggota tidak ditemukan.' });
        return;
      }

      const updated = await dbService.members.update(req.params.id, { role: role.trim() });
      broadcastSync('members', 'UPDATE', { id: req.params.id });

      recordAuditLog(
        req.memberUser!.role,
        'ROLE_CHANGE',
        'MEMBERS',
        `Mengubah role ${member.full_name} menjadi ${role}`
      );

      res.json({
        success: true,
        message: `Role untuk ${member.full_name} berhasil diubah menjadi ${role}.`,
        data: updated,
      });
    } catch (err: any) {
      console.error('Update role error:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal mengubah role.' });
    }
  }
);

/**
 * PUT /api/portal/users/:id
 * Only Developer can edit student/teacher data (Requirement #1 & #4)
 */
router.put(
  '/users/:id',
  requireMemberAuth,
  requireRole(['Developer']),
  async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
    try {
      const memberId = req.params.id;
      const existing = await dbService.members.getById(memberId);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Anggota tidak ditemukan.' });
        return;
      }

      const fullName = req.body.fullName ?? req.body.full_name;
      const nickname = req.body.nickname;
      const birthPlace = req.body.birthPlace ?? req.body.birth_place;
      const birthDate = req.body.birthDate ?? req.body.birth_date;
      const email = req.body.email;
      const phone = req.body.phone;
      const photoNumber = req.body.photoNumber ?? req.body.photo_number ?? req.body.customPhotoNumber;
      const role = req.body.role;
      const attendanceNumber = req.body.attendanceNumber ?? req.body.attendance_number;

      const updated = await dbService.members.update(memberId, {
        fullName: fullName !== undefined ? String(fullName).trim() : existing.full_name,
        nickname: nickname !== undefined ? (nickname ? String(nickname).trim() : null) : existing.nickname,
        birthPlace: birthPlace !== undefined ? (birthPlace ? String(birthPlace).trim() : null) : existing.birth_place,
        birthDate: birthDate !== undefined ? (birthDate ? String(birthDate) : null) : existing.birth_date,
        email: email !== undefined ? (email ? String(email).trim().toLowerCase() : null) : existing.email,
        phone: phone !== undefined ? (phone ? String(phone).trim() : null) : existing.phone,
        photoNumber: photoNumber !== undefined ? (photoNumber ? String(photoNumber).trim() : null) : existing.photo_number,
        role: role !== undefined ? String(role).trim() : existing.role,
        attendanceNumber: attendanceNumber !== undefined ? (attendanceNumber ? Number(attendanceNumber) : null) : existing.attendance_number,
        memberType: existing.member_type,
      });

      // Synchronize email in member_accounts if email was changed
      if (email && String(email).trim().toLowerCase() !== String(existing.email || '').trim().toLowerCase()) {
        try {
          await dbService.portalAuth.updateEmail(memberId, String(email).trim().toLowerCase());
        } catch {
          // ignore
        }
      }

      broadcastSync('members', 'UPDATE', { id: memberId });
      recordAuditLog(
        req.memberUser!.role,
        'UPDATE_MEMBER',
        'MEMBERS',
        `Developer memperbarui data anggota ${existing.full_name}`
      );

      res.json({
        success: true,
        message: `Data ${existing.full_name} berhasil diperbarui.`,
        member: updated,
        data: updated,
      });
    } catch (err: any) {
      console.error('Developer update user error:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal memperbarui data anggota.' });
    }
  }
);

export default router;
