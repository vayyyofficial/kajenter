import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config.js';
import { dbService } from '../db/index.js';
import { broadcastSync } from '../sync.js';

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
  /** Live full name from members table (attached by requireMemberAuth, not stored in JWT) */
  fullName?: string;
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
      fullName: currentMember.full_name,
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
  const isSekretaris = r.includes('sekretaris');
  const isBendahara = r.includes('bendahara');

  return {
    isDeveloper: isDev,
    canManageMembers: isDev,
    canManageUsers: isDev,
    canManageRoles: isDev,
    canManageKas: isDev || isBendahara || isKetua || isWakil,
    canManageExpenses: isDev || isBendahara,
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
 * Strictly verifies Developer role against live database record (Requirement #3)
 */
export async function requireAdminOrDeveloper(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    
    // 1. Secret Admin verification
    if (decoded.role === 'admin' && decoded.type === 'secret_admin') {
      (req as any).admin = decoded;
      next();
      return;
    }

    // 2. Member verification (Must strictly be live Developer in DB)
    if (decoded.type === 'member' && decoded.memberId) {
      const liveMember = await dbService.members.getById(decoded.memberId);
      const liveRole = (liveMember?.role || '').trim().toLowerCase();

      if (liveMember && liveRole === 'developer') {
        (req as any).admin = decoded;
        (req as any).memberUser = {
          ...decoded,
          email: liveMember.email,
          role: liveMember.role,
        };
        next();
        return;
      }

      res.status(403).json({
        success: false,
        error: 'Fitur administratif ini hanya dapat diakses oleh Developer.',
        code: 'FORBIDDEN'
      });
      return;
    }

    res.status(403).json({
      success: false,
      error: 'Akses ditolak.',
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
 * Combined guard: Allows Secret Admin OR Any Authenticated Member
 * Used for operations like uploading profile pictures or story images
 */
export async function requireMemberOrAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Akses ditolak. Sesi otentikasi login diperlukan.',
      code: 'UNAUTHORIZED'
    });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, CONFIG.JWT_SECRET);

    // 1. Secret Admin
    if (decoded.role === 'admin' && decoded.type === 'secret_admin') {
      (req as any).admin = decoded;
      next();
      return;
    }

    // 2. Any Authenticated Member (Siswa, Pengurus, Guru, Developer)
    if (decoded.type === 'member' && decoded.memberId) {
      const liveMember = await dbService.members.getById(decoded.memberId);
      if (!liveMember) {
        res.status(401).json({
          success: false,
          error: 'Data anggota tidak ditemukan.',
          code: 'MEMBER_NOT_FOUND'
        });
        return;
      }

      (req as any).memberUser = {
        ...decoded,
        email: liveMember.email,
        role: liveMember.role,
      };
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: 'Akses tidak diizinkan.',
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

    const currentRole = (req.memberUser.role || '').trim().toLowerCase();
    // 'Developer' always has full class permissions
    const isDev = currentRole === 'developer';
    // NOTE: an empty role must never match (''.includes check would grant every permission)
    const isAllowed =
      isDev ||
      (currentRole.length > 0 &&
        allowedRoles.some((r) => {
          const allowed = r.trim().toLowerCase();
          return currentRole === allowed || currentRole.includes(allowed);
        }));

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
 * Safely parse client device & browser from User-Agent without logging sensitive details
 */
export function parseClientDevice(req?: Request): string {
  if (!req) return 'Web / Browser';
  const ua = req.headers['user-agent'] || '';
  let os = 'Unknown OS';
  if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';

  return `${os} / ${browser}`;
}

/**
 * Human-readable actor label for audit logs, e.g. "NADA ... (Bendahara)".
 * Falls back to role only when the name is unavailable.
 */
export function getActorLabel(req: AuthenticatedMemberRequest): string {
  const u = req.memberUser;
  if (!u) return 'Unknown';
  return u.fullName ? `${u.fullName} (${u.role || 'Siswa'})` : u.role || 'Unknown';
}

export interface AuditLogPayload {
  message: string;
  role?: string;
  identifier?: string;
  target?: string;
  status?: 'SUCCESS' | 'FAILED' | 'INFO';
  device?: string;
}

/**
 * Record action to real activity_logs table in database
 */
export function recordAuditLog(
  userName: string,
  action: string,
  entityType: string,
  details: string | AuditLogPayload
) {
  try {
    const detailString = typeof details === 'string' ? details : JSON.stringify(details);
    dbService.admin.recordAuditLog(userName, action, entityType, detailString);
    broadcastSync('logs', 'CREATE', { userName, action, entityType });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}


