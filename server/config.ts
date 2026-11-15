import dotenv from 'dotenv';
import path from 'path';
import { randomBytes } from 'crypto';

dotenv.config();

const projectRoot = process.cwd();

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || (nodeEnv === 'production' ? '' : randomBytes(32).toString('hex'));
if (nodeEnv === 'production' && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters in production.');
}
if (nodeEnv === 'production' && (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production.');
}

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  JWT_SECRET: jwtSecret,
  ADMIN_INITIAL_PASSWORD: process.env.ADMIN_INITIAL_PASSWORD || '',
  NODE_ENV: nodeEnv,
  DB_PATH: process.env.DB_PATH || path.join(projectRoot, 'server', 'data', 'database.sqlite'),
  PUBLIC_DIR: path.join(projectRoot, 'public'),
  FOTO_ANGGOTA_DIR: path.join(projectRoot, 'public', 'foto-anggota'),
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean),
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || process.env.VITE_SUPABASE_STORAGE_BUCKET || 'uploads',
  get IS_SUPABASE_CONFIGURED(): boolean {
    return Boolean(this.SUPABASE_URL && this.SUPABASE_SERVICE_ROLE_KEY);
  },
};

