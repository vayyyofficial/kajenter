import { Router } from 'express';
import { dbService } from '../db/index.js';
import { requireAdmin, recordAuditLog } from '../middleware/auth.js';
import { broadcastSync } from '../sync.js';

const router = Router();

// 1. GET /api/members (Public)
// Returns separated guru and siswa lists (Requirement #22 & #23)
router.get('/', async (_req, res): Promise<void> => {
  try {
    const data = await dbService.members.getAll();
    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('Get members error:', err);
    res.status(500).json({ success: false, error: 'Gagal memuat data anggota kelas.' });
  }
});

// 2. GET /api/members/:id (Public)
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const member = await dbService.members.getById(req.params.id);
    if (!member) {
      res.status(404).json({ success: false, error: 'Anggota tidak ditemukan.' });
      return;
    }
    res.json({ success: true, data: member });
  } catch (err: any) {
    console.error('Get member by ID error:', err);
    res.status(500).json({ success: false, error: 'Gagal memuat detail anggota.' });
  }
});

// 3. POST /api/members (Admin only)
router.post('/', requireAdmin, async (req, res): Promise<void> => {
  try {
    const {
      fullName,
      nickname,
      birthPlace,
      birthDate,
      email,
      role,
      memberType,
      attendanceNumber,
      phone,
      customPhotoNumber,
    } = req.body;

    if (!fullName || !role || !memberType) {
      res.status(400).json({ success: false, error: 'Nama lengkap, role, dan jenis anggota wajib diisi.' });
      return;
    }

    let photoNumber: string | null = null;
    let attNum: number | null = null;

    if (memberType === 'siswa') {
      if (!attendanceNumber) {
        res.status(400).json({ success: false, error: 'Nomor absen wajib diisi untuk siswa.' });
        return;
      }
      attNum = parseInt(attendanceNumber, 10);
      photoNumber = customPhotoNumber?.trim() || null;

      // Check unique attendance number for siswa
      const isDuplicate = await dbService.members.checkDuplicateAttendance(attNum);
      if (isDuplicate) {
        res.status(400).json({
          success: false,
          error: `Nomor absen ${String(attNum).padStart(2, '0')} sudah digunakan oleh siswa lain.`,
        });
        return;
      }
    } else {
      // Guru: Admin can add multiple teachers without artificial limits
      photoNumber = customPhotoNumber?.trim() || null;
    }

    const created = await dbService.members.create({
      attendanceNumber: attNum,
      fullName: fullName.trim(),
      nickname: nickname?.trim() || null,
      birthPlace: birthPlace?.trim() || null,
      birthDate: birthDate || null,
      email: email?.trim() || null,
      role: role.trim(),
      memberType,
      photoNumber,
      phone: phone?.trim() || null,
    });

    recordAuditLog(
      'Admin',
      'CREATE',
      'MEMBER',
      `Menambahkan anggota baru: ${fullName} (${role}, Absen: ${photoNumber})`
    );

    // Multi-user real-time broadcast
    broadcastSync('members', 'CREATE', { id: (created as any).id });

    res.status(201).json({
      success: true,
      message: `${memberType === 'guru' ? 'Guru' : 'Siswa'} berhasil ditambahkan.`,
      data: {
        id: (created as any).id,
        photoNumber,
        mappedPhotoPath: photoNumber
          ? (photoNumber.startsWith('http') || photoNumber.startsWith('/')
              ? photoNumber
              : `/foto-anggota/${photoNumber}.jpg`)
          : null,
      },
    });
  } catch (err: any) {
    console.error('Add member error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal menambahkan anggota.' });
  }
});

// 4. PUT /api/members/:id (Admin only)
router.put('/:id', requireAdmin, async (req, res): Promise<void> => {
  try {
    const memberId = req.params.id;
    const existing = await dbService.members.getById(memberId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Anggota tidak ditemukan.' });
      return;
    }

    const {
      fullName,
      nickname,
      birthPlace,
      birthDate,
      email,
      role,
      memberType,
      attendanceNumber,
      phone,
      customPhotoNumber,
    } = req.body;

    let attNum = existing.attendance_number;
    let photoNumber = existing.photo_number;

    if (memberType === 'siswa') {
      if (attendanceNumber !== undefined) {
        attNum = parseInt(attendanceNumber, 10);
        // Check unique attendance number excluding self
        const isDuplicate = await dbService.members.checkDuplicateAttendance(attNum, memberId);
        if (isDuplicate) {
          res.status(400).json({
            success: false,
            error: `Nomor absen ${String(attNum).padStart(2, '0')} sudah digunakan siswa lain.`,
          });
          return;
        }
      }
      if (customPhotoNumber !== undefined) {
        photoNumber = customPhotoNumber.trim() || null;
      }
    } else if (memberType === 'guru') {
      attNum = null;
      if (customPhotoNumber !== undefined) {
        photoNumber = customPhotoNumber.trim() || null;
      }
    }

    const updated = await dbService.members.update(memberId, {
      fullName: fullName !== undefined ? fullName.trim() : existing.full_name,
      nickname: nickname !== undefined ? nickname?.trim() : existing.nickname,
      birthPlace: birthPlace !== undefined ? birthPlace?.trim() : existing.birth_place,
      birthDate: birthDate !== undefined ? birthDate : existing.birth_date,
      email: email !== undefined ? email?.trim() : existing.email,
      role: role !== undefined ? role.trim() : existing.role,
      memberType: memberType || existing.member_type,
      attendanceNumber: attNum,
      photoNumber,
      phone: phone !== undefined ? phone?.trim() : existing.phone,
    });

    recordAuditLog(
      'Admin',
      'UPDATE',
      'MEMBER',
      `Memperbarui profil anggota: ${fullName || existing.full_name}`
    );

    // Multi-user real-time broadcast
    broadcastSync('members', 'UPDATE', { id: memberId });

    res.json({ success: true, message: 'Data anggota berhasil diperbarui.', data: updated });
  } catch (err: any) {
    console.error('Update member error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memperbarui data anggota.' });
  }
});

// 5. DELETE /api/members/:id (Admin only)
router.delete('/:id', requireAdmin, async (req, res): Promise<void> => {
  try {
    const deleted = await dbService.members.delete(req.params.id);

    recordAuditLog(
      'Admin',
      'DELETE',
      'MEMBER',
      `Menghapus anggota: ${(deleted as any)?.full_name || 'Anggota'}`
    );

    // Multi-user real-time broadcast
    broadcastSync('members', 'DELETE', { id: req.params.id });

    res.json({ success: true, message: 'Anggota berhasil dihapus.' });
  } catch (err: any) {
    console.error('Delete member error:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal menghapus anggota.' });
  }
});

export default router;
