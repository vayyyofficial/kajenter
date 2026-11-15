import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbService } from '../db/index.js';
import { CONFIG } from '../config.js';
import { requireAdmin, recordAuditLog } from '../middleware/auth.js';

const router = Router();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000;

function lockoutInfo(state: any) {
  const remainingMs = state.locked_until
    ? Math.max(0, new Date(state.locked_until).getTime() - Date.now())
    : 0;
  return {
    locked: remainingMs > 0,
    remainingMs,
    attemptsRemaining: Math.max(0, MAX_FAILED_ATTEMPTS - Number(state.failed_attempts || 0)),
  };
}

router.get('/admin-status', async (_req, res): Promise<void> => {
  try {
    const state = await dbService.auth.getAuthState();
    const info = lockoutInfo(state);
    if (!info.locked && (state.failed_attempts || state.locked_until)) {
      await dbService.auth.resetLockout();
      info.attemptsRemaining = MAX_FAILED_ATTEMPTS;
    }
    res.json({ success: true, ...info });
  } catch (err) {
    console.error('Check admin status error:', err);
    res.status(503).json({ success: false, error: 'Autentikasi admin belum disiapkan. Atur ADMIN_INITIAL_PASSWORD di environment server.' });
  }
});

router.post('/admin-verify', async (req, res): Promise<void> => {
  try {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!password) {
      res.status(400).json({ success: false, error: 'Password wajib dimasukkan.' });
      return;
    }

    const state = await dbService.auth.getAuthState();
    const info = lockoutInfo(state);
    if (info.locked) {
      res.status(429).json({ success: false, error: 'Terlalu banyak percobaan. Coba lagi setelah waktu penguncian berakhir.', ...info });
      return;
    }

    const isMatch = await bcrypt.compare(password, state.password_hash);
    if (!isMatch) {
      const failedAttempts = Number(state.failed_attempts || 0) + 1;
      const lockedUntil = failedAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MS).toISOString()
        : null;
      await dbService.auth.updateAuthState({
        failedAttempts,
        lockedUntil,
        lastFailedAt: new Date().toISOString(),
      });
      recordAuditLog('System', 'FAILED_LOGIN', 'SECURITY', 'Percobaan password admin salah.');
      const nextInfo = lockoutInfo({ failed_attempts: failedAttempts, locked_until: lockedUntil });
      res.status(nextInfo.locked ? 429 : 401).json({
        success: false,
        error: nextInfo.locked ? 'Terlalu banyak percobaan. Login dikunci selama 10 menit.' : 'Password salah. Silakan periksa kembali password Anda.',
        ...nextInfo,
      });
      return;
    }

    await dbService.auth.resetLockout();
    const token = jwt.sign(
      { role: 'admin', type: 'secret_admin', credentialVersion: state.last_password_change },
      CONFIG.JWT_SECRET,
      { expiresIn: '8h' },
    );
    recordAuditLog('Admin', 'LOGIN', 'SECURITY', 'Login admin berhasil.');
    res.json({ success: true, token, message: 'Login berhasil.' });
  } catch (err) {
    console.error('Admin verify error:', err);
    res.status(503).json({ success: false, error: 'Autentikasi admin belum siap. Periksa konfigurasi database dan password awal.' });
  }
});

router.get('/admin-session', requireAdmin, (_req, res): void => {
  res.json({ success: true, valid: true, message: 'Sesi admin aktif.' });
});

router.put('/admin-change-password', requireAdmin, async (req, res): Promise<void> => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (![currentPassword, newPassword, confirmPassword].every((value) => typeof value === 'string' && value.length > 0)) {
      res.status(400).json({ success: false, error: 'Password saat ini, password baru, dan konfirmasi password wajib diisi.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ success: false, error: 'Password baru dan konfirmasi password tidak cocok.' });
      return;
    }
    if (newPassword.length < 10) {
      res.status(400).json({ success: false, error: 'Password baru minimal 10 karakter.' });
      return;
    }

    const state = await dbService.auth.getAuthState();
    if (!(await bcrypt.compare(currentPassword, state.password_hash))) {
      res.status(400).json({ success: false, error: 'Password saat ini yang Anda masukkan salah.' });
      return;
    }

    await dbService.auth.updateAuthState({
      passwordHash: await bcrypt.hash(newPassword, 12),
      lastPasswordChange: new Date().toISOString(),
      failedAttempts: 0,
      lockedUntil: null,
      lastFailedAt: null,
    });
    recordAuditLog('Admin', 'PASSWORD_CHANGED', 'SECURITY', 'Password Admin Panel berhasil diperbarui.');
    res.json({ success: true, message: 'Password admin berhasil diubah. Silakan login kembali.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, error: 'Gagal memperbarui password admin.' });
  }
});

export default router;
