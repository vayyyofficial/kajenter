import { Response } from 'express';

export interface SyncEvent {
  type: 'gallery' | 'members' | 'social' | 'settings' | 'metrics' | 'stories' | 'logs';
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC';
  timestamp: string;
  data?: any;
}

const clients = new Set<Response>();

/**
 * Register a client to the Server-Sent Events (SSE) broadcast stream.
 */
export function registerSyncClient(res: Response): void {
  clients.add(res);

  // Send initial handshake event
  const handshake: SyncEvent = {
    type: 'gallery',
    action: 'SYNC',
    timestamp: new Date().toISOString(),
  };
  res.write(`data: ${JSON.stringify(handshake)}\n\n`);

  res.on('close', () => {
    clients.delete(res);
  });
}

/**
 * Broadcast an event to all connected clients in real-time.
 */
export function broadcastSync(
  type: SyncEvent['type'],
  action: SyncEvent['action'],
  data?: any
): void {
  const event: SyncEvent = {
    type,
    action,
    timestamp: new Date().toISOString(),
    data,
  };

  const payload = `data: ${JSON.stringify(event)}\n\n`;

  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}
