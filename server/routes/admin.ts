import { Router } from 'express';
import { dbService } from '../db/index.js';
import { requireAdmin, recordAuditLog } from '../middleware/auth.js';
import { broadcastSync } from '../sync.js';

const router = Router();

// Base protection: All admin endpoints strictly require Admin JWT (Requirement #10 & #35)
router.use(requireAdmin);

// 1. GET /api/admin/metrics (Real numbers only, no fake stats per Requirement #38)
router.get('/metrics', async (_req, res): Promise<void> => {
  try {
    const metrics = await dbService.admin.getMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (err: any) {
    console.error('Metrics error:', err);
    res.status(500).json({ success: false, error: 'Gagal memuat metrik dashboard admin.' });
  }
});

// 2. GET /api/admin/settings (Website settings & security overview)
router.get('/settings', async (_req, res): Promise<void> => {
  try {
    const data = await dbService.admin.getSettings();
    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('Get settings error:', err);
    res.status(500).json({ success: false, error: 'Gagal memuat pengaturan website.' });
  }
});

// 3. PUT /api/admin/settings (Update website configuration)
router.put('/settings', async (req, res): Promise<void> => {
  try {
    const { className, schoolProgram, logoUrl, classDescription } = req.body;

    if (className) {
      await dbService.admin.updateSetting('class_name', className.trim(), 'Nama kelas');
    }
    if (schoolProgram) {
      await dbService.admin.updateSetting('school_program', schoolProgram.trim(), 'Program sekolah');
    }
    if (logoUrl) {
      await dbService.admin.updateSetting('logo_url', logoUrl.trim(), 'Logo kelas');
    }
    if (classDescription) {
      await dbService.admin.updateSetting('class_description', classDescription.trim(), 'Deskripsi kelas');
    }

    recordAuditLog('Admin', 'UPDATE', 'SETTINGS', 'Memperbarui informasi dan pengaturan website.');

    // Multi-user real-time broadcast
    broadcastSync('settings', 'UPDATE');

    res.json({ success: true, message: 'Pengaturan website berhasil disimpan.' });
  } catch (err: any) {
    console.error('Save settings error:', err);
    res.status(500).json({ success: false, error: 'Gagal menyimpan pengaturan website.' });
  }
});

// 4. GET /api/admin/audit-logs
router.get('/audit-logs', async (req, res): Promise<void> => {
  try {
    const limit = parseInt(String(req.query.limit || '50'), 10);
    const logs = await dbService.admin.getAuditLogs(limit);
    res.json({ success: true, data: logs });
  } catch (err: any) {
    console.error('Get audit logs error:', err);
    res.status(500).json({ success: false, error: 'Gagal memuat log audit aktivitas.' });
  }
});

export default router;
