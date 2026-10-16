import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '../config.js';
import { requireAdmin, recordAuditLog } from '../middleware/auth.js';
import { uploadToSupabaseStorage } from '../db/supabase.js';

const router = Router();

// Memory storage so the file buffer is accessible for cloud storage upload
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Harap unggah file gambar (JPG, PNG, WebP, GIF).'));
    }
  },
});

// POST /api/upload (Admin only)
router.post('/', requireAdmin, upload.single('image'), async (req, res): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Tidak ada file gambar yang dipilih.' });
      return;
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const cleanName = path
      .basename(req.file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const filename = `img-${cleanName}-${uniqueSuffix}${ext}`;

    let fileUrl: string;

    if (CONFIG.IS_SUPABASE_CONFIGURED) {
      // 1. Production Mode: Upload to Supabase Storage (Persistent Cloud Storage)
      const uploadRes = await uploadToSupabaseStorage(
        req.file.buffer,
        filename,
        req.file.mimetype
      );
      fileUrl = uploadRes.url;
    } else {
      // 2. Local Fallback Mode: Save to local public/uploads directory
      const uploadDir = path.join(CONFIG.PUBLIC_DIR, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const targetPath = path.join(uploadDir, filename);
      fs.writeFileSync(targetPath, req.file.buffer);
      fileUrl = `/uploads/${filename}`;
    }

    recordAuditLog(
      'Admin',
      'UPLOAD',
      'STORAGE',
      `Mengunggah file gambar: ${filename} (${Math.round(req.file.size / 1024)} KB)`
    );

    res.status(201).json({
      success: true,
      message: 'File berhasil diunggah ke persistent storage.',
      data: {
        filename,
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal mengunggah file gambar.' });
  }
});

export default router;
