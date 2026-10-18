import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';

import authRouter from './routes/auth.js';
import membersRouter from './routes/members.js';
import galleryRouter from './routes/gallery.js';
import socialRouter from './routes/social.js';
import adminRouter from './routes/admin.js';
import syncRouter from './routes/sync.js';
import uploadRouter from './routes/upload.js';
import portalRouter from './routes/portal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const uploadsDir = path.join(CONFIG.PUBLIC_DIR, 'uploads');

// Ensure local public directories exist if running locally
try {
  if (!fs.existsSync(CONFIG.PUBLIC_DIR)) {
    fs.mkdirSync(CONFIG.PUBLIC_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.FOTO_ANGGOTA_DIR)) {
    fs.mkdirSync(CONFIG.FOTO_ANGGOTA_DIR, { recursive: true });
  }
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch {
  // Silent fail if in read-only environment (e.g. Vercel Serverless)
}

// Global Middlewares
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static assets when available locally
app.use('/foto-anggota', express.static(CONFIG.FOTO_ANGGOTA_DIR));
app.use('/uploads', express.static(uploadsDir));
app.use('/assets', express.static(path.join(CONFIG.PUBLIC_DIR, 'assets')));
app.use('/public', express.static(CONFIG.PUBLIC_DIR));

// Create combined API Router
const apiRouter = express.Router();

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Website Kelas X ICP TKJ API',
    database: CONFIG.IS_SUPABASE_CONFIGURED ? 'Supabase PostgreSQL (Persistent)' : 'Local SQLite',
    storage: CONFIG.IS_SUPABASE_CONFIGURED ? 'Supabase Cloud Storage' : 'Local Disk',
    timestamp: new Date().toISOString(),
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/members', membersRouter);
apiRouter.use('/gallery', galleryRouter);
apiRouter.use('/social', socialRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/sync', syncRouter);
apiRouter.use('/upload', uploadRouter);
apiRouter.use('/portal', portalRouter);

// Mount router on BOTH /api and root / to support both standalone Express and Vercel serverless rewrites
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Serve Built Frontend (SPA) if dist exists (standalone production server mode)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (
      req.method === 'GET' &&
      !req.path.startsWith('/api') &&
      !req.path.startsWith('/foto-anggota') &&
      !req.path.startsWith('/uploads') &&
      !req.path.startsWith('/assets') &&
      !req.path.startsWith('/public')
    ) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.',
  });
});

export default app;
