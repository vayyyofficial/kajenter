/**
 * Helper utility for Member Avatars.
 * Consistent across all devices and browsers (iOS, Android, Windows, Mac, Linux).
 * 
 * Rules:
 * - If member has custom photo from database/storage: display the custom photo.
 * - If member has NO custom photo: display the consistent modern OUTLINE vector 👤 avatar.
 * - Style: Outline / Line Icon in brand theme red (#dc2626) with soft background (#fef2f2).
 * - Never use random human faces or native OS emojis.
 */

const DEFAULT_AVATAR_RAW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="256" height="256" fill="none">
  <circle cx="12" cy="12" r="11" fill="#fef2f2" stroke="#fecaca" stroke-width="1.2"/>
  <circle cx="12" cy="8" r="3.75" stroke="#dc2626" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M5.5 19.25c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" stroke="#dc2626" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const DEFAULT_AVATAR_URL = `data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_AVATAR_RAW_SVG)}`;

/**
 * Returns the default outline vector avatar URL in theme red.
 */
export function getDefaultAvatar(): string {
  return DEFAULT_AVATAR_URL;
}

/**
 * Resolves the photo URL for a member.
 * Logic:
 * IF custom photo exists -> tampilkan custom photo
 * ELSE -> tampilkan default avatar outline vector
 */
export function getMemberPhotoUrl(member: {
  photo_number?: string | null;
  attendance_number?: number | null;
  full_name?: string;
}): { src: string; isCustom: boolean } {
  // 1. If explicit custom URL or path uploaded (Supabase Storage / local persistent uploads)
  if (member.photo_number) {
    const trimmed = member.photo_number.trim();
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('data:')
    ) {
      return { src: trimmed, isCustom: true };
    }
    // Teacher local identity photo
    if (trimmed.startsWith('guru_')) {
      return { src: `/foto-anggota/${trimmed}.jpg`, isCustom: true };
    }
  }

  // 2. Otherwise member does NOT have a custom photo -> use modern outline vector default avatar
  return {
    src: DEFAULT_AVATAR_URL,
    isCustom: false,
  };
}
