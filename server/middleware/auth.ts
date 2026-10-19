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

export interface MemberTokenPayload {
  memberId: number | string;
  email: string;
  role: string;
  type: 'member';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedAdminRequest extends Request {
  admin?: AdminTokenPayload;
}

export interface AuthenticatedMemberRequest extends Request {
  memberUser?: MemberTokenPayload;
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
  } catch {
    res.status(401).json({
      success: false,
      error: 'Sesi admin telah kedaluwarsa atau tidak sah. Silakan masukkan password kembali.',
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * Server-side protection for Portal Kelas Member access
 */
export async function requireMemberAuth(req: AuthenticatedMemberRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Akses ditolak. Sesi login anggota kelas diperlukan.',
      code: 'UNAUTHORIZED_MEMBER'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as MemberTokenPayload;
    if (decoded.type !== 'member' || !decoded.memberId) {
      res.status(403).json({
        success: false,
        error: 'Token bukan merupakan token anggota kelas.',
        code: 'FORBIDDEN'
      });
      return;
    }

    // Verify member still exists in database and get fresh role
    const currentMember = await dbService.members.getById(decoded.memberId);
    if (!currentMember) {
      res.status(401).json({
        success: false,
        error: 'Data anggota tidak ditemukan di database.',
        code: 'MEMBER_NOT_FOUND'
      });
      return;
    }

    // Update role in request to live database role
    req.memberUser = {
      ...decoded,
      email: currentMember.email,
      role: currentMember.role,
    };
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: 'Sesi login telah kedaluwarsa. Silakan login kembali.',
      code: 'EXPIRED_SESSION'
    });
  }
}

/**
 * Centralized Permission Calculator for X ICP TKJ Portal Kelas
 * Directly derived from live member role stored in members table.
 * Hierarchy:
 * - Developer: Supreme access (all permissions, member & user management, role editing, kas, tasks, schedules, piket)
 * - Ketua / Wakil Ketua: Tasks, Schedules, Piket, Class Overview
 * - Sekretaris: Tasks, Schedules, Piket
 * - Bendahara: Kas management & recording
 * - Siswa: Viewing allowed content only
 */
export function getMemberPermissions(roleName?: string | null) {
  const r = (roleName || '').trim().toLowerCase();
  const isDev = r === 'developer';
  const isKetua = r === 'ketua kelas' || r === 'ketua';
  const isWakil = r === 'wakil ketua' || r === 'wakil ketua kelas' || r === 'wakil';
  const isSekretaris = r === 'sekretaris';
  const isBendahara = r === 'bendahara';

  return {
    isDeveloper: isDev,
    canManageMembers: isDev,
    canManageUsers: isDev,
    canManageRoles: isDev,
    canManageKas: isDev || isBendahara || isKetua || isWakil,
    canManageWeeks: isDev || isBendahara || isKetua || isWakil,
    canViewAllKas: true,
    canManageTasks: isDev || isKetua || isWakil || isSekretaris,
    canManageSchedules: isDev || isKetua || isWakil || isSekretaris,
    canManagePiket: isDev || isKetua || isWakil || isSekretaris,
    canViewPortal: true,
  };
}

/**
 * Combined guard: Allows Secret Admin OR Member with Developer role
 */
export function requireAdminOrDeveloper(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Akses ditolak. Sesi otentikasi admin atau developer diperlukan.',
      code: 'UNAUTHORIZED'
    });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, CONFIG.JWT_SECRET);
    const roleLower = String(decoded.role || '').toLowerCase();
    if ((decoded.role === 'admin' && decoded.type === 'secret_admin') || (decoded.type === 'member' && roleLower === 'developer')) {
      (req as any).admin = decoded;
      (req as any).memberUser = decoded;
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: 'Aksi ini hanya dapat dilakukan oleh Admin atau Developer.',
      code: 'FORBIDDEN'
    });
  } catch {
    res.status(401).json({
      success: false,
      error: 'Sesi telah kedaluwarsa atau tidak sah. Silakan login kembali.',
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * Role-based permission guard for Portal features
 */
export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedMemberRequest, res: Response, next: NextFunction): void => {
    if (!req.memberUser) {
      res.status(401).json({ success: false, error: 'Otentikasi diperlukan.' });
      return;
    }

    const currentRole = (req.memberUser.role || '').trim();
    // 'Developer' always has full class permissions
    const isDev = currentRole.toLowerCase() === 'developer';
    const isAllowed =
      isDev ||
      allowedRoles.some(
        (r) => r.trim().toLowerCase() === currentRole.toLowerCase()
      );

    if (!isAllowed) {
      res.status(403).json({
        success: false,
        error: `Aksi ini hanya dapat dilakukan oleh role: ${allowedRoles.join(', ')} atau Developer.`,
        code: 'PERMISSION_DENIED',
      });
      return;
    }

    next();
  };
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

