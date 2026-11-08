import bundledLogo from '../assets/Logo-Kelas.png';

/**
 * Single source of truth for Website Branding & Class Assets
 * Bundled via Vite asset pipeline for 100% production & Vercel reliability,
 * with fallbacks to public static assets.
 */
export const BRANDING = {
  name: 'X ICP TKJ',
  school: 'SMK Telkom Malang',
  fullName: 'X ICP TKJ — SMK Telkom Malang',
  program: 'International Class Program — Teknik Komputer dan Jaringan',
  tagline: 'Portal Resmi Kelas Digital',
  logoUrl: bundledLogo || '/assets/Logo-Kelas.png',
  fallbackLogoUrl: '/assets/Logo-Kelas.png',
  faviconUrl: '/assets/favicon.png',
  svgFaviconUrl: '/favicon.svg',
};
