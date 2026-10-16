import { Router } from 'express';
import { dbService } from '../db/index.js';
import { requireAdmin, recordAuditLog } from '../middleware/auth.js';
import { broadcastSync } from '../sync.js';

const router = Router();

// 1. GET /api/social (Public access per Requirement #1: Contact is accessible without login)
router.get('/', async (_req, res): Promise<void> => {
  try {
    const socials = await dbService.social.getActive();
    res.json({ success: true, data: socials });
  } catch (err: any) {
    console.error('Get active social error:', err);
    res.status(500).json({ success: false, error: 'Gagal memuat kontak sosial media kelas.' });
  }
});

// Admin-only social routes require Admin authentication
router.use(requireAdmin);

// 2. GET /api/social/all (Admin - includes inactive)
router.get('/all', async (_req, res): Promise<void> => {
  try {
    const socials = await dbService.social.getAll();
    res.json({ success: true, data: socials });
  } catch (err: any) {
    console.error('Get all social error:', err);
    res.status(500).json({ success: false, error: 'Gagal memuat daftar media sosial.' });
  }
});

// 3. POST /api/social (Admin)
router.post('/', async (req, res): Promise<void> => {
  try {
    const { platform, username, url, icon } = req.body;

    if (!platform || !username || !url) {
      res.status(400).json({ success: false, error: 'Platform, username, dan URL wajib diisi.' });
      return;
    }

    const created = await dbService.social.create({
      platform: platform.trim(),
      username: username.trim(),
      url: url.trim(),
      icon: icon || 'Globe',
    });

    recordAuditLog(
      'Admin',
      'CREATE',
      'SOCIAL',
      `Menambahkan media sosial: ${platform} (${username})`
    );

    // Multi-user real-time broadcast
    broadcastSync('social', 'CREATE', { id: (created as any).id });

    res.status(201).json({
      success: true,
      message: 'Kontak media sosial berhasil ditambahkan.',
      data: { id: (created as any).id },
    });
  } catch (err: any) {
    console.error('Add social error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal menambahkan media sosial.' });
  }
});

// 4. PUT /api/social/:id (Admin)
router.put('/:id', async (req, res): Promise<void> => {
  try {
    const { platform, username, url, icon, isActive } = req.body;

    const updated = await dbService.social.update(req.params.id, {
      platform,
      username,
      url,
      icon,
      isActive,
    });

    recordAuditLog(
      'Admin',
      'UPDATE',
      'SOCIAL',
      `Memperbarui media sosial: ${platform || (updated as any)?.platform || 'Akun'}`
    );

    // Multi-user real-time broadcast
    broadcastSync('social', 'UPDATE', { id: req.params.id });

    res.json({ success: true, message: 'Media sosial berhasil diperbarui.', data: updated });
  } catch (err: any) {
    console.error('Update social error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memperbarui media sosial.' });
  }
});

// 5. DELETE /api/social/:id (Admin)
router.delete('/:id', async (req, res): Promise<void> => {
  try {
    const deleted = await dbService.social.delete(req.params.id);

    recordAuditLog(
      'Admin',
      'DELETE',
      'SOCIAL',
      `Menghapus media sosial: ${(deleted as any)?.platform || ''} (${(deleted as any)?.username || ''})`
    );

    // Multi-user real-time broadcast
    broadcastSync('social', 'DELETE', { id: req.params.id });

    res.json({ success: true, message: 'Media sosial berhasil dihapus.' });
  } catch (err: any) {
    console.error('Delete social error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal menghapus media sosial.' });
  }
});

export default router;
