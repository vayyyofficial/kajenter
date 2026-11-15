/**
 * Helper utility for Member Avatars (Siswa & Guru).
 * Consistent across all devices and browsers (iOS, Android, Windows, Mac, Linux).
 * 
 * Rules:
 * - If member has custom photo from database/storage: display the custom photo.
 * - If member has NO custom photo: display the unified modern OUTLINE vector silhouette avatar.
 * - Style: Outline / Line-art icon in theme red (#dc2626 / #ef4444), consistent with Simple Icons.
 * - Never use random human faces or native OS emojis.
 */

const DEFAULT_AVATAR_RAW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="256" height="256" fill="none" stroke="#dc2626" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="8" r="4.25"/>
  <path d="M4.5 20.25c0-3.75 3.35-6.75 7.5-6.75s7.5 3 7.5 6.75"/>
</svg>`;

const DEFAULT_AVATAR_DARK_RAW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="256" height="256" fill="none" stroke="#ef4444" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="8" r="4.25"/>
  <path d="M4.5 20.25c0-3.75 3.35-6.75 7.5-6.75s7.5 3 7.5 6.75"/>
</svg>`;

export const DEFAULT_AVATAR_URL = `data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_AVATAR_RAW_SVG)}`;
export const DEFAULT_AVATAR_DARK_URL = `data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_AVATAR_DARK_RAW_SVG)}`;

/**
 * Returns the default outline vector avatar URL in theme red.
 */
export function getDefaultAvatar(isDark = false): string {
  return isDark ? DEFAULT_AVATAR_DARK_URL : DEFAULT_AVATAR_URL;
}

/**
 * Resolves the photo URL for a member (Siswa or Guru).
 * Logic:
 * IF custom photo exists in database / storage -> tampilkan custom photo
 * ELSE -> tampilkan default avatar outline vector
 */
export function getMemberPhotoUrl(member: {
  photo_number?: string | null;
  attendance_number?: number | null;
  full_name?: string;
  member_type?: string;
}): { src: string; isCustom: boolean } {
  // 1. If explicit custom URL or path uploaded (Supabase Storage / local persistent uploads / base64)
  if (member.photo_number) {
    const trimmed = member.photo_number.trim();
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/uploads/') ||
      trimmed.startsWith('data:image/')
    ) {
      return { src: trimmed, isCustom: true };
    }
  }

  // 2. Otherwise member (Siswa & Guru) does NOT have custom PP -> use unified outline vector default avatar
  return {
    src: DEFAULT_AVATAR_URL,
    isCustom: false,
  };
}
