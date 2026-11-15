import { Router } from 'express';
import { dbService } from '../db/index.js';
import { requireAdmin, recordAuditLog } from '../middleware/auth.js';
import { broadcastSync } from '../sync.js';

const router = Router();

// The public Rolling roster is a read-only view over the canonical member data.
router.get('/students', async (_req, res): Promise<void> => {
  try {
    const data = await dbService.rollingStudents.getAll();
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('Get Rolling students error:', err);
    res.status(500).json({ success: false, error: 'Gagal memuat daftar siswa Rolling.' });
  }
});

// Ensure an existing canonical member has a stable Rolling UUID. This supports
// both the normalized bridge schema and the pre-migration Netlify/Supabase schema.
router.post('/students', requireAdmin, async (req, res): Promise<void> => {
  try {
    const memberId = Number(req.body?.memberId);
    const number = Number(req.body?.number);
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : '';
    const isActive = req.body?.isActive !== false;
    if (!Number.isInteger(memberId) || memberId <= 0 || !Number.isInteger(number) || number <= 0 || !fullName || !nickname) {
      res.status(400).json({ success: false, error: 'Data siswa Rolling tidak valid.' });
      return;
    }
    const data = await dbService.rollingStudents.add({ memberId, number, fullName, nickname, isActive });
    if (!data) {
      res.status(500).json({ success: false, error: 'Gagal membuat tautan siswa Rolling.' });
      return;
    }
    recordAuditLog('Admin', 'CREATE', 'ROLLING_STUDENT', `Menambahkan siswa Rolling: ${data.full_name}`);
    broadcastSync('members', 'CREATE', { id: memberId });
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    console.error('Add Rolling student error:', err);
    res.status(400).json({ success: false, error: err.message || 'Gagal menambahkan siswa Rolling.' });
  }
});

// Removing a Rolling roster entry deletes the canonical member while preserving
// the stable assignment UUID/history through the active database adapter.
router.delete('/students/:id', requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = String(req.params.id);
    const row = await dbService.rollingStudents.getById(id);
    if (!row) {
      res.status(404).json({ success: false, error: 'Siswa Rolling tidak ditemukan.' });
      return;
    }
    await dbService.rollingStudents.remove(id);
    recordAuditLog('Admin', 'DELETE', 'ROLLING_STUDENT', `Menghapus siswa Rolling: ${row.full_name}`);
    broadcastSync('members', 'DELETE', { id: row.member_id });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete Rolling student error:', err);
    res.status(400).json({ success: false, error: err.message || 'Gagal menghapus siswa Rolling.' });
  }
});

// Identity is updated once in members; only the Rolling-specific active flag
// lives in the UUID bridge. The public Supabase key cannot write either table.
router.patch('/students/:id', requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { fullName, nickname, isActive } = req.body || {};
    if (fullName !== undefined && (typeof fullName !== 'string' || !fullName.trim())) {
      res.status(400).json({ success: false, error: 'Nama lengkap tidak boleh kosong.' });
      return;
    }
    if (nickname !== undefined && typeof nickname !== 'string') {
      res.status(400).json({ success: false, error: 'Nama panggilan tidak valid.' });
      return;
    }
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      res.status(400).json({ success: false, error: 'Status Rolling tidak valid.' });
      return;
    }
    if (fullName === undefined && nickname === undefined && isActive === undefined) {
      res.status(400).json({ success: false, error: 'Tidak ada perubahan yang dikirim.' });
      return;
    }

    const updated = await dbService.rollingStudents.update(id, { fullName, nickname, isActive });
    if (!updated) {
      res.status(404).json({ success: false, error: 'Siswa Rolling tidak ditemukan.' });
      return;
    }
    recordAuditLog('Admin', 'UPDATE', 'ROLLING_STUDENT', `Memperbarui data Rolling: ${updated.full_name}`);
    broadcastSync('members', 'UPDATE', { id: updated.member_id });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Update Rolling student error:', err);
    res.status(400).json({ success: false, error: err.message || 'Gagal memperbarui siswa Rolling.' });
  }
});

export default router;
