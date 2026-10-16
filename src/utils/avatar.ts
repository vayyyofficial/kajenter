/**
 * Helper utility for Member Avatars.
 * Guarantees that if a member has no photo or if their photo fails to load,
 * a clean, neutral, professional avatar generated via Imgix is displayed.
 * (Uses initials on a sleek slate/dark background — never a random human photo).
 */

export function getMemberInitials(fullName: string = ''): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TKJ';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Returns a high-resolution, neutral Imgix avatar placeholder.
 * Safe, professional, and consistent with the X ICP TKJ branding.
 */
export function getDefaultImgixAvatar(fullName: string = '', size = 300): string {
  const initials = getMemberInitials(fullName);
  // Imgix Typesetting endpoint: Generates clean typography on high-contrast dark slate
  return `https://assets.imgix.net/~text?txt=${encodeURIComponent(initials)}&w=${size}&h=${size}&bg=0f172a&txtclr=f8fafc&txt-align=middle,center&txt-size=${Math.round(size * 0.38)}&txt-font=Helvetica,Bold&fit=crop`;
}

/**
 * Resolves the photo URL for a member.
 * If the member has an uploaded photo or a mapped local photo, uses it.
 * Otherwise, returns the neutral Imgix avatar.
 */
export function getMemberPhotoUrl(member: {
  photo_number?: string | null;
  attendance_number?: number | null;
  full_name: string;
}): { src: string; isDefault: boolean } {
  if (member.photo_number) {
    const trimmed = member.photo_number.trim();
    if (trimmed.startsWith('http') || trimmed.startsWith('/')) {
      return { src: trimmed, isDefault: false };
    }
    return { src: `/foto-anggota/${trimmed}.jpg`, isDefault: false };
  }

  if (
    member.attendance_number !== null &&
    member.attendance_number !== undefined &&
    member.attendance_number >= 1 &&
    member.attendance_number <= 20
  ) {
    return {
      src: `/foto-anggota/${String(member.attendance_number).padStart(2, '0')}.jpg`,
      isDefault: false,
    };
  }

  return {
    src: getDefaultImgixAvatar(member.full_name),
    isDefault: true,
  };
}
