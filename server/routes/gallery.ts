import { Router } from 'express';
import { dbService } from '../db/index.js';
import { requireAdmin, recordAuditLog } from '../middleware/auth.js';
import { broadcastSync } from '../sync.js';

const router = Router();

// 1. GET /api/gallery (Public access)
router.get('/', async (req, res): Promise<void> => {
  try {
    const { category } = req.query;
    const items = await dbService.gallery.getAll(category as string | undefined);
    res.json({ success: true, data: items });
  } catch (err: any) {
    console.error('Get gallery error:', err);
    res.status(500).json({ success: false, error: 'Gagal memuat galeri kegiatan.' });
  }
});

// 2. GET /api/gallery/:id (Public access)
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const item = await dbService.gallery.getById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Foto kegiatan tidak ditemukan.' });
      return;
    }
    res.json({ success: true, data: item });
  } catch (err: any) {
    console.error('Get gallery by ID error:', err);
    res.status(500).json({ success: false, error: 'Gagal memuat detail foto kegiatan.' });
  }
});

// 3. POST /api/gallery (Admin only)
router.post('/', requireAdmin, async (req, res): Promise<void> => {
  try {
    const { title, eventIdentity, category, description, imagePath, eventDate } = req.body;

    if (!title || !eventIdentity || !description || !imagePath || !eventDate) {
      res.status(400).json({
        success: false,
        error: 'Judul, identitas kegiatan, deskripsi, foto, dan tanggal wajib diisi.',
      });
      return;
    }

    const created = await dbService.gallery.create({
      title: title.trim(),
      eventIdentity: eventIdentity.trim(),
      category: category || 'Kegiatan',
      description: description.trim(),
      imagePath: imagePath.trim(),
      eventDate,
      createdBy: 'Admin X ICP TKJ',
    });

    recordAuditLog(
      'Admin',
      'CREATE',
      'GALLERY',
      `Menambahkan dokumentasi: "${title}" (${eventIdentity})`
    );

    // Multi-user real-time broadcast
    broadcastSync('gallery', 'CREATE', { id: (created as any).id });

    res.status(201).json({
      success: true,
      message: 'Foto kegiatan berhasil ditambahkan ke galeri.',
      data: { id: (created as any).id },
    });
  } catch (err: any) {
    console.error('Add gallery error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal menambahkan dokumentasi kegiatan.' });
  }
});

// 4. PUT /api/gallery/:id (Admin only)
router.put('/:id', requireAdmin, async (req, res): Promise<void> => {
  try {
    const { title, eventIdentity, category, description, imagePath, eventDate } = req.body;

    const updated = await dbService.gallery.update(req.params.id, {
      title,
      eventIdentity,
      category,
      description,
      imagePath,
      eventDate,
    });

    recordAuditLog(
      'Admin',
      'UPDATE',
      'GALLERY',
      `Memperbarui dokumentasi: "${title || (updated as any)?.title || 'Foto'}"`
    );

    // Multi-user real-time broadcast
    broadcastSync('gallery', 'UPDATE', { id: req.params.id });

    res.json({ success: true, message: 'Foto kegiatan berhasil diperbarui.', data: updated });
  } catch (err: any) {
    console.error('Update gallery error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memperbarui foto kegiatan.' });
  }
});

// 5. DELETE /api/gallery/:id (Admin only)
router.delete('/:id', requireAdmin, async (req, res): Promise<void> => {
  try {
    const deleted = await dbService.gallery.delete(req.params.id);

    recordAuditLog(
      'Admin',
      'DELETE',
      'GALLERY',
      `Menghapus dokumentasi: "${(deleted as any)?.title || 'Foto'}"`
    );

    // Multi-user real-time broadcast
    broadcastSync('gallery', 'DELETE', { id: req.params.id });

    res.json({ success: true, message: 'Foto kegiatan berhasil dihapus.' });
  } catch (err: any) {
    console.error('Delete gallery error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal menghapus foto kegiatan.' });
  }
});

export default router;
