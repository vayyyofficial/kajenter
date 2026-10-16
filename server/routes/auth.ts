import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbService } from '../db/index.js';
import { CONFIG } from '../config.js';
import { requireAdmin, recordAuditLog } from '../middleware/auth.js';

const router = Router();

// 1. GET /api/auth/admin-status
// Checks if admin access is currently locked out
router.get('/admin-status', async (_req, res): Promise<void> => {
  try {
    const state = await dbService.auth.getAuthState();
    const now = Date.now();

    if (state.locked_until) {
      const lockExpiry = new Date(state.locked_until).getTime();
      if (lockExpiry > now) {
        const remainingMs = lockExpiry - now;
        res.json({
          success: true,
          locked: true,
          remainingMs,
          message: 'Too many failed attempts. Admin access has been temporarily locked. Please try again later.',
        });
        return;
      } else {
        // Lockout expired, reset automatically
        await dbService.auth.resetLockout();
      }
    }

    res.json({
      success: true,
      locked: false,
      remainingMs: 0,
      attemptsRemaining: Math.max(0, 3 - (state.failed_attempts || 0)),
    });
  } catch (err: any) {
    console.error('Check admin status error:', err);
    res.status(500).json({ success: false, error: 'Gagal memeriksa status keamanan admin.' });
  }
});

// 2. POST /api/auth/admin-verify
// Secret Admin Password Verification with 3-attempt 12-hour lockout
router.post('/admin-verify', async (req, res): Promise<void> => {
  try {
    const { password } = req.body;
    const now = Date.now();
    const nowIso = new Date().toISOString();
    const state = await dbService.auth.getAuthState();

    // Check if lockout is currently active
    if (state.locked_until) {
      const lockExpiry = new Date(state.locked_until).getTime();
      if (lockExpiry > now) {
        const remainingMs = lockExpiry - now;
        res.status(429).json({
          success: false,
          locked: true,
          remainingMs,
          error: 'Too many failed attempts. Admin access has been temporarily locked. Please try again later.',
        });
        return;
      } else {
        // Lockout expired, reset attempts
        await dbService.auth.resetLockout();
        state.failed_attempts = 0;
        state.locked_until = null;
      }
    }

    if (!password) {
      res.status(400).json({
        success: false,
        error: 'Password wajib dimasukkan.',
        locked: false,
      });
      return;
    }

    // Compare with hashed password in database (NEVER plaintext)
    const isMatch = await bcrypt.compare(String(password), state.password_hash);

    if (isMatch) {
      // Reset failed attempts on success
      await dbService.auth.resetLockout();

      // Sign secure JWT for Admin (8 hours expiry)
      const token = jwt.sign(
        { role: 'admin', type: 'secret_admin' },
        CONFIG.JWT_SECRET,
        { expiresIn: '8h' }
      );

      recordAuditLog('Admin', 'LOGIN', 'SECURITY', 'Akses Secret Admin Panel berhasil diverifikasi.');

      res.json({
        success: true,
        token,
        message: 'Akses disetujui. Membuka Secret Admin Panel...',
      });
      return;
    }

    // Password incorrect: Increment failed attempts
    const newFailedCount = (state.failed_attempts || 0) + 1;

    if (newFailedCount >= 3) {
      // 12-HOUR LOCKOUT (Requirement #9)
      const twelveHoursMs = 12 * 60 * 60 * 1000;
      const lockedUntilIso = new Date(now + twelveHoursMs).toISOString();

      await dbService.auth.updateAuthState({
        failedAttempts: newFailedCount,
        lockedUntil: lockedUntilIso,
        lastFailedAt: nowIso,
      });

      recordAuditLog(
        'System',
        'SECURITY_LOCKOUT',
        'SECURITY',
        '3 kali percobaan password salah. Akses Admin dikunci selama 12 jam.'
      );

      res.status(429).json({
        success: false,
        locked: true,
        remainingMs: twelveHoursMs,
        attemptsLeft: 0,
        error: 'Too many failed attempts. Admin access has been temporarily locked. Please try again later.',
      });
      return;
    }

    // Percobaan 1 atau 2 gagal
    await dbService.auth.updateAuthState({
      failedAttempts: newFailedCount,
      lastFailedAt: nowIso,
    });

    const attemptsLeft = 3 - newFailedCount;
    const message =
      attemptsLeft === 1
        ? 'Incorrect password. 1 attempt remaining before 12-hour lockout.'
        : 'Incorrect password. Please try again.';

    res.status(401).json({
      success: false,
      locked: false,
      attemptsLeft,
      error: message,
    });
  } catch (err: any) {
    console.error('Admin verify error:', err);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan sistem saat memverifikasi password.' });
  }
});

// 3. GET /api/auth/admin-session
// Verify if existing admin token is valid
router.get('/admin-session', requireAdmin, (_req, res): void => {
  res.json({
    success: true,
    valid: true,
    message: 'Sesi admin aktif.',
  });
});

// 4. PUT /api/auth/admin-change-password
// Change Admin Password strictly inside authenticated Admin Panel
router.put('/admin-change-password', requireAdmin, async (req, res): Promise<void> => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({
        success: false,
        error: 'Password saat ini, password baru, dan konfirmasi password wajib diisi.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({
        success: false,
        error: 'Password baru dan konfirmasi password tidak cocok.',
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: 'Password baru minimal 6 karakter.',
      });
      return;
    }

    const state = await dbService.auth.getAuthState();

    // Verify current password first
    const isCurrentValid = await bcrypt.compare(String(currentPassword), state.password_hash);
    if (!isCurrentValid) {
      res.status(400).json({
        success: false,
        error: 'Password saat ini yang Anda masukkan salah.',
      });
      return;
    }

    // Hash new password and save securely
    const newHash = await bcrypt.hash(String(newPassword), 10);
    const nowIso = new Date().toISOString();

    await dbService.auth.updateAuthState({
      passwordHash: newHash,
      lastPasswordChange: nowIso,
    });

    recordAuditLog('Admin', 'PASSWORD_CHANGED', 'SECURITY', 'Password Admin Panel berhasil diperbarui.');

    res.json({
      success: true,
      message: 'Password Admin Panel berhasil diubah dengan aman.',
    });
  } catch (err: any) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, error: 'Gagal memperbarui password admin.' });
  }
});

export default router;
