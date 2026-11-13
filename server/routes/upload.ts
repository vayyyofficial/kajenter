import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '../config.js';
import { requireAdminOrDeveloper, requireMemberOrAdmin, recordAuditLog } from '../middleware/auth.js';
import { uploadToSupabaseStorage } from '../db/supabase.js';

const router = Router();

const allowedImageTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * Verify the actual file signature instead of trusting the extension or
 * client-supplied MIME type. SVG is intentionally not accepted by this route.
 */
function getVerifiedImageMime(file: Express.Multer.File): string | null {
  const extension = path.extname(file.originalname).toLowerCase();
  const expectedMime = allowedImageTypes[extension];

  if (!expectedMime || file.mimetype.toLowerCase() !== expectedMime) {
    return null;
  }

  const buffer = file.buffer;
  let detectedMime: string | null = null;

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    detectedMime = 'image/jpeg';
  } else if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    detectedMime = 'image/png';
  } else if (
    buffer.length >= 6 &&
    (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
      buffer.subarray(0, 6).toString('ascii') === 'GIF89a')
  ) {
    detectedMime = 'image/gif';
  } else if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    detectedMime = 'image/webp';
  }

  return detectedMime === expectedMime ? detectedMime : null;
}

// Memory storage so the file buffer is accessible for cloud storage upload.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per image
    files: 20,
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const expectedMime = allowedImageTypes[extension];

    if (expectedMime && file.mimetype.toLowerCase() === expectedMime) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Harap unggah file gambar JPG, PNG, WebP, atau GIF yang valid.'));
    }
  },
});

function createSafeFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const cleanName = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 30);
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  return `img-${cleanName || 'upload'}-${uniqueSuffix}${ext}`;
}

async function persistImage(
  file: Express.Multer.File,
  filename: string,
  verifiedMime: string
): Promise<string> {
  if (CONFIG.IS_SUPABASE_CONFIGURED) {
    const uploadRes = await uploadToSupabaseStorage(file.buffer, filename, verifiedMime);
    return uploadRes.url;
  }

  const uploadDir = path.join(CONFIG.PUBLIC_DIR, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
  return `/uploads/${filename}`;
}

// POST /api/upload (Admin or Authenticated Member for profile/images)
router.post('/', requireMemberOrAdmin, upload.single('image'), async (req, res): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Tidak ada file gambar yang dipilih.' });
      return;
    }

    const verifiedMime = getVerifiedImageMime(req.file);
    if (!verifiedMime) {
      res.status(400).json({
        success: false,
        error: 'Isi file tidak sesuai dengan format gambar yang diizinkan (JPG, PNG, WebP, GIF).',
      });
      return;
    }

    const filename = createSafeFilename(req.file.originalname);
    const fileUrl = await persistImage(req.file, filename, verifiedMime);
    const actor = (req as any).admin ? 'Admin' : ((req as any).memberUser?.email || 'Developer');

    recordAuditLog(
      actor,
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
        mimetype: verifiedMime,
      },
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal mengunggah file gambar.' });
  }
});

// POST /api/upload/multiple (Admin or Developer only, up to 20 images)
router.post('/multiple', requireAdminOrDeveloper, upload.array('images', 20), async (req, res): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'Tidak ada file gambar yang dipilih.' });
      return;
    }

    // Validate every file before persisting any of them to avoid partial uploads.
    const verifiedFiles = files.map((file) => ({
      file,
      mime: getVerifiedImageMime(file),
    }));

    if (verifiedFiles.some((item) => !item.mime)) {
      res.status(400).json({
        success: false,
        error: 'Satu atau lebih file tidak memiliki isi gambar yang valid. Tidak ada file yang diunggah.',
      });
      return;
    }

    const uploadedResults: Array<{ filename: string; url: string; size: number; mimetype: string }> = [];

    for (const item of verifiedFiles) {
      const filename = createSafeFilename(item.file.originalname);
      const fileUrl = await persistImage(item.file, filename, item.mime!);

      uploadedResults.push({
        filename,
        url: fileUrl,
        size: item.file.size,
        mimetype: item.mime!,
      });
    }

    recordAuditLog(
      'Admin',
      'UPLOAD',
      'STORAGE',
      `Mengunggah ${uploadedResults.length} foto ke persistent storage`
    );

    res.status(201).json({
      success: true,
      message: `${uploadedResults.length} file berhasil diunggah ke persistent storage.`,
      data: uploadedResults,
    });
  } catch (err: any) {
    console.error('Multiple upload error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal mengunggah file gambar.' });
  }
});

export default router;
