import { Router } from 'express';
import { registerSyncClient } from '../sync.js';

const router = Router();

// GET /api/sync/stream — Server-Sent Events stream for real-time multi-user data synchronization
router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  registerSyncClient(res);

  // Send periodic keep-alive comment so proxy/browser connections remain active
  const interval = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(interval);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

export default router;
