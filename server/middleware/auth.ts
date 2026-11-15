import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config.js';
import { dbService } from '../db/index.js';
import { broadcastSync } from '../sync.js';

export interface AdminTokenPayload {
  role: 'admin';
  type: 'secret_admin';
  credentialVersion: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedAdminRequest extends Request {
  admin?: AdminTokenPayload;
}

/** Only the current admin session can access privileged server operations. */
export async function requireAdmin(req: AuthenticatedAdminRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Akses ditolak. Sesi otentikasi admin diperlukan.',
      code: 'UNAUTHORIZED_ADMIN',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as AdminTokenPayload;
    if (decoded.role !== 'admin' || decoded.type !== 'secret_admin') {
      res.status(403).json({ success: false, error: 'Token tidak memiliki hak akses administratif.', code: 'FORBIDDEN' });
      return;
    }

    const authState = await dbService.auth.getAuthState();
    if (!decoded.credentialVersion || decoded.credentialVersion !== authState.last_password_change) {
      res.status(401).json({ success: false, error: 'Password admin telah berubah. Silakan login kembali.', code: 'INVALID_TOKEN' });
      return;
    }

    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: 'Sesi admin telah kedaluwarsa atau tidak sah. Silakan masukkan password kembali.',
      code: 'INVALID_TOKEN',
    });
  }
}

export interface AuditLogPayload {
  message: string;
  role?: string;
  identifier?: string;
  target?: string;
  status?: 'SUCCESS' | 'FAILED' | 'INFO';
  device?: string;
}

/** Record action to the database audit log. */
export function recordAuditLog(userName: string, action: string, entityType: string, details: string | AuditLogPayload): void {
  try {
    const detailString = typeof details === 'string' ? details : JSON.stringify(details);
    void dbService.admin.recordAuditLog(userName, action, entityType, detailString);
    broadcastSync('logs', 'CREATE', { userName, action, entityType });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
