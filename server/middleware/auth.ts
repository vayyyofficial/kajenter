import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config.js';
import { dbService } from '../db/index.js';

export interface AdminTokenPayload {
  role: 'admin';
  type: 'secret_admin';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedAdminRequest extends Request {
  admin?: AdminTokenPayload;
}

/**
 * Server-side protection for all Admin Panel operations (Requirement #10 & #35)
 * Rejects requests without valid Admin JWT token issued after successful secret password verification.
 */
export function requireAdmin(req: AuthenticatedAdminRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Akses ditolak. Sesi otentikasi admin diperlukan.',
      code: 'UNAUTHORIZED_ADMIN'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as AdminTokenPayload;
    if (decoded.role !== 'admin' || decoded.type !== 'secret_admin') {
      res.status(403).json({
        success: false,
        error: 'Token tidak memiliki hak akses administratif.',
        code: 'FORBIDDEN'
      });
      return;
    }

    req.admin = decoded;
    next();
  } catch (_err) {
    res.status(401).json({
      success: false,
      error: 'Sesi admin telah kedaluwarsa atau tidak sah. Silakan masukkan password kembali.',
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * Record action to real activity_logs table in database
 */
export function recordAuditLog(
  userName: string,
  action: string,
  entityType: string,
  details: string
) {
  try {
    dbService.admin.recordAuditLog(userName, action, entityType, details);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

