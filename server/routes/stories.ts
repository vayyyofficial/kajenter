import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { dbService } from '../db/index.js';
import { CONFIG } from '../config.js';
import { requireMemberAuth, AuthenticatedMemberRequest, recordAuditLog, parseClientDevice } from '../middleware/auth.js';
import { uploadToSupabaseStorage } from '../db/supabase.js';
import { broadcastSync } from '../sync.js';

export interface StoryMusicMetadata {
  title: string;
  artist: string;
  url?: string | null;
}

/**
 * Format story caption with optional music metadata into JSON or clean string
 */
export function formatStoryCaption(captionText: string | null | undefined, music?: StoryMusicMetadata | null): string | null {
  const cleanText = captionText ? String(captionText).trim() : '';
  const cleanTitle = music?.title ? String(music.title).trim() : '';
  const cleanArtist = music?.artist ? String(music.artist).trim() : '';
  let cleanUrl = music?.url ? String(music.url).trim() : null;

  if (cleanUrl) {
    if (cleanUrl.startsWith('/') || cleanUrl.startsWith('data:audio/')) {
      // Valid relative or data audio URL
    } else {
      try {
        const parsed = new URL(cleanUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          cleanUrl = null;
        }
      } catch {
        cleanUrl = null;
      }
    }
  }

  if (cleanTitle && cleanArtist) {
    return JSON.stringify({
      text: cleanText,
      music: {
        title: cleanTitle,
        artist: cleanArtist,
        url: cleanUrl || undefined,
      },
    });
  }

  return cleanText || null;
}

/**
 * Parse raw caption string (supports both plain string and JSON with music)
 */
export function parseStoryCaption(rawCaption: string | null | undefined) {
  if (!rawCaption) {
    return {
      caption: null,
      raw_caption: null,
      music: null,
      music_title: null,
      music_artist: null,
      music_url: null,
    };
  }

  const str = String(rawCaption).trim();
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed.music && typeof parsed.music === 'object') {
        const title = String(parsed.music.title || '').trim();
        const artist = String(parsed.music.artist || '').trim();
        const url = parsed.music.url ? String(parsed.music.url).trim() : null;
        const text = parsed.text ? String(parsed.text).trim() : null;
        if (title) {
          return {
            caption: text,
            raw_caption: str,
            music: { title, artist, url },
            music_title: title,
            music_artist: artist,
            music_url: url,
          };
        }
      }
    } catch {
      // not JSON, fallback to raw string
    }
  }

  return {
    caption: str,
    raw_caption: str,
    music: null,
    music_title: null,
    music_artist: null,
    music_url: null,
  };
}

export function enrichStory(story: any) {
  if (!story) return story;
  const parsed = parseStoryCaption(story.caption);
  return {
    ...story,
    caption: parsed.caption,
    raw_caption: parsed.raw_caption,
    music: parsed.music,
    music_title: parsed.music_title,
    music_artist: parsed.music_artist,
    music_url: parsed.music_url,
  };
}

const router = Router();

// Memory storage for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype) || file.mimetype === 'image/svg+xml';
    if (ext || mime) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Harap unggah file gambar (JPG, PNG, WebP, GIF, SVG).'));
    }
  },
});

/**
 * GET /api/stories/public (and GET /api/stories)
 * Public: Visitors can view all active, non-expired member stories
 */
router.get(['/', '/public'], async (_req, res: Response): Promise<void> => {
  try {
    const stories = await dbService.stories.getPublicActive();
    const enriched = (stories || []).map(enrichStory);
    res.json({
      success: true,
      data: enriched,
      total: enriched.length,
    });
  } catch (err: any) {
    console.error('Get public stories error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memuat story anggota.' });
  }
});

/**
 * GET /api/stories/my (also mounted at /api/portal/stories/my)
 * Authenticated: Returns logged-in member's stories & active count
 */
router.get('/my', requireMemberAuth, async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
  try {
    const memberId = req.memberUser!.memberId;
    const stories = await dbService.stories.getAllByMemberId(memberId);
    const activeCount = await dbService.stories.countActiveByMemberId(memberId);
    const enriched = (stories || []).map(enrichStory);

    res.json({
      success: true,
      data: enriched,
      activeCount,
      maxLimit: 5,
      canAddStory: activeCount < 5,
    });
  } catch (err: any) {
    console.error('Get my stories error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memuat story Anda.' });
  }
});

/**
 * POST /api/stories (also mounted at /api/portal/stories)
 * Authenticated: Create a new story (Max 5 active stories per member)
 */
router.post(
  '/',
  requireMemberAuth,
  upload.single('image'),
  async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
    try {
      const memberId = req.memberUser!.memberId;

      // 1. Enforce strict 5 active stories limit per member (Requirement #8)
      const currentActiveCount = await dbService.stories.countActiveByMemberId(memberId);
      if (currentActiveCount >= 5) {
        res.status(400).json({
          success: false,
          error: 'Batas maksimal 5 Story aktif telah tercapai. Silakan hapus salah satu Story Anda untuk menambahkan Story baru.',
          code: 'STORY_LIMIT_REACHED',
        });
        return;
      }

      // 2. Validate image file
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Harap pilih file gambar untuk Story.',
          code: 'FILE_REQUIRED',
        });
        return;
      }

      // 3. Upload image to persistent storage
      const ext = path.extname(req.file.originalname).toLowerCase();
      const cleanName = path
        .basename(req.file.originalname, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 30);
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      const filename = `story-m${memberId}-${cleanName}-${uniqueSuffix}${ext}`;

      let fileUrl: string;

      if (CONFIG.IS_SUPABASE_CONFIGURED) {
        // Upload to Supabase Storage
        const uploadRes = await uploadToSupabaseStorage(
          req.file.buffer,
          filename,
          req.file.mimetype
        );
        fileUrl = uploadRes.url;
      } else {
        // Fallback to local storage
        const uploadDir = path.join(CONFIG.PUBLIC_DIR, 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const targetPath = path.join(uploadDir, filename);
        fs.writeFileSync(targetPath, req.file.buffer);
        fileUrl = `/uploads/${filename}`;
      }

      // 4. Calculate expiration timestamp (Requirement #9)
      const expirationType = (req.body.expirationType || req.body.expiration_type || '24h').toLowerCase();
      let expiresAt: string | null = null;

      if (expirationType === '24h') {
        // Exactly 24 hours from now
        expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } else if (expirationType === 'custom') {
        const rawDate = req.body.customDate || req.body.custom_date;
        if (rawDate) {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) {
            // End of the selected day in UTC/ISO
            parsed.setHours(23, 59, 59, 999);
            expiresAt = parsed.toISOString();
          } else {
            expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          }
        } else {
          expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        }
      } else if (expirationType === 'lifetime') {
        expiresAt = null; // Stays active until deleted by user
      }

      const captionText = req.body.caption ? String(req.body.caption).trim().slice(0, 500) : null;
      const musicTitle = req.body.music_title || req.body.musicTitle;
      const musicArtist = req.body.music_artist || req.body.musicArtist;
      const musicUrl = req.body.music_url || req.body.musicUrl;

      const musicObj = musicTitle && musicArtist ? {
        title: String(musicTitle).trim(),
        artist: String(musicArtist).trim(),
        url: musicUrl ? String(musicUrl).trim() : null,
      } : null;

      const finalCaption = formatStoryCaption(captionText, musicObj);

      // 5. Save metadata to database
      const created = await dbService.stories.create({
        memberId,
        mediaUrl: fileUrl,
        caption: finalCaption,
        expirationType,
        expiresAt,
      });

      const enriched = enrichStory(created);

      // 6. Broadcast Real-time sync
      broadcastSync('stories', 'CREATE', enriched);

      const memberIdentifier = req.memberUser?.email || `Member ${memberId}`;
      recordAuditLog(
        memberIdentifier,
        'CREATE_STORY',
        'STORIES',
        {
          message: `${memberIdentifier} mengupload Story${musicObj ? ` dengan musik "${musicObj.title} - ${musicObj.artist}"` : ''}.`,
          role: req.memberUser?.role || 'Siswa',
          identifier: memberIdentifier,
          target: 'Story Kelas',
          status: 'SUCCESS',
          device: parseClientDevice(req),
        }
      );

      res.status(201).json({
        success: true,
        message: 'Story berhasil dipublikasikan.',
        data: enriched,
      });
    } catch (err: any) {
      console.error('Create story error:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal mempublikasikan story.' });
    }
  }
);

/**
 * GET /api/stories/manage (also mounted at /api/portal/stories/manage)
 * Developer only: Returns all active stories across all members for moderation (Requirement #5, #7, #8)
 */
router.get('/manage', requireMemberAuth, async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
  try {
    const isDeveloper = (req.memberUser!.role || '').toLowerCase() === 'developer';
    if (!isDeveloper) {
      res.status(403).json({
        success: false,
        error: 'Akses ditolak. Fitur moderasi story hanya dapat diakses oleh Developer.',
        code: 'FORBIDDEN',
      });
      return;
    }

    const stories = await dbService.stories.getPublicActive();
    const enriched = (stories || []).map(enrichStory);
    res.json({
      success: true,
      data: enriched,
      total: enriched.length,
    });
  } catch (err: any) {
    console.error('Get manage stories error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memuat story untuk moderasi.' });
  }
});

/**
 * DELETE /api/stories/:id (also mounted at /api/portal/stories/:id)
 * Authenticated: Delete own story (or Developer moderation) (Requirement #5, #6, #7)
 */
router.delete('/:id', requireMemberAuth, async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const existing = await dbService.stories.getById(id);

    if (!existing) {
      res.status(404).json({ success: false, error: 'Story tidak ditemukan atau sudah dihapus.' });
      return;
    }

    // Security Check (Requirement #5, #7): Owner or Developer only!
    const isOwner = Number(existing.member_id) === Number(req.memberUser!.memberId);
    const isDeveloper = (req.memberUser!.role || '').toLowerCase() === 'developer';

    if (!isOwner && !isDeveloper) {
      res.status(403).json({
        success: false,
        error: 'Akses ditolak. Anda hanya dapat menghapus Story milik Anda sendiri.',
        code: 'PERMISSION_DENIED',
      });
      return;
    }

    const deleted = await dbService.stories.delete(id);
    broadcastSync('stories', 'DELETE', { id, memberId: existing.member_id });

    recordAuditLog(
      req.memberUser!.email || 'Developer',
      'DELETE_STORY',
      'STORIES',
      {
        message: isOwner
          ? `Anggota menghapus Story miliknya (ID Story: ${id}).`
          : `Developer memoderasi/menghapus Story milik anggota ID: ${existing.member_id} (ID Story: ${id}).`,
        role: req.memberUser!.role || 'Siswa',
        identifier: req.memberUser!.email,
        target: 'Story Kelas',
        status: 'SUCCESS',
        device: parseClientDevice(req),
      }
    );

    res.json({
      success: true,
      message: 'Story berhasil dihapus.',
      data: deleted,
    });
  } catch (err: any) {
    console.error('Delete story error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal menghapus story.' });
  }
});

/**
 * PUT /api/stories/:id (also mounted at /api/portal/stories/:id)
 * Authenticated: Edit own story or Developer moderation (Requirement #7, #9, #10)
 */
router.put('/:id', requireMemberAuth, async (req: AuthenticatedMemberRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const existing = await dbService.stories.getById(id);

    if (!existing) {
      res.status(404).json({ success: false, error: 'Story tidak ditemukan atau sudah dihapus.' });
      return;
    }

    // Security Check: Owner or Developer only!
    const isOwner = Number(existing.member_id) === Number(req.memberUser!.memberId);
    const isDeveloper = (req.memberUser!.role || '').toLowerCase() === 'developer';

    if (!isOwner && !isDeveloper) {
      res.status(403).json({
        success: false,
        error: 'Akses ditolak. Anda tidak memiliki izin untuk mengedit Story ini.',
        code: 'PERMISSION_DENIED',
      });
      return;
    }

    const { caption, music_title, music_artist, music_url, remove_music, expiration_type, expires_at } = req.body;
    let newExpiresAt = existing.expires_at;

    if (expiration_type) {
      if (expiration_type === 'lifetime') {
        newExpiresAt = null;
      } else if (expiration_type === '24h') {
        newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } else if (expiration_type === 'custom' && expires_at) {
        newExpiresAt = new Date(expires_at).toISOString();
      }
    }

    const existingParsed = parseStoryCaption(existing.caption);
    let targetMusic = existingParsed.music;

    if (remove_music === true || remove_music === 'true') {
      targetMusic = null;
    } else if (music_title !== undefined && music_artist !== undefined) {
      if (String(music_title).trim() && String(music_artist).trim()) {
        targetMusic = {
          title: String(music_title).trim(),
          artist: String(music_artist).trim(),
          url: music_url ? String(music_url).trim() : null,
        };
      } else {
        targetMusic = null;
      }
    }

    const targetText = caption !== undefined ? (caption ? String(caption).trim() : null) : existingParsed.caption;
    const finalCaption = formatStoryCaption(targetText, targetMusic);

    const updated = await dbService.stories.update(id, {
      caption: finalCaption,
      expiration_type: expiration_type || existing.expiration_type,
      expires_at: newExpiresAt,
    });

    const enriched = enrichStory(updated);
    broadcastSync('stories', 'UPDATE', enriched);

    recordAuditLog(
      req.memberUser!.email || 'Developer',
      'UPDATE_STORY',
      'STORIES',
      {
        message: isOwner
          ? `Anggota menyunting Story miliknya (ID Story: ${id}).`
          : `Developer memoderasi/menyunting Story milik anggota ID: ${existing.member_id} (ID Story: ${id}).`,
        role: req.memberUser!.role || 'Siswa',
        identifier: req.memberUser!.email,
        target: 'Story Kelas',
        status: 'SUCCESS',
        device: parseClientDevice(req),
      }
    );

    res.json({
      success: true,
      message: 'Story berhasil diperbarui.',
      data: enriched,
    });
  } catch (err: any) {
    console.error('Update story error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memperbarui story.' });
  }
});

export default router;
