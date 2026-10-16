import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'x_icp_tkj_super_secret_jwt_2026',
  SUPERADMIN_EMAIL: process.env.SUPERADMIN_EMAIL || 'fairuzziachmad@gmail.com',
  SUPERADMIN_PASSWORD: process.env.SUPERADMIN_PASSWORD || 'Admin#XICPTKJ2026',
  SUPERADMIN_NAME: process.env.SUPERADMIN_NAME || 'Fairuzzi Achmad',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_PATH: path.join(__dirname, 'data', 'database.sqlite'),
  PUBLIC_DIR: path.join(__dirname, '..', 'public'),
  FOTO_ANGGOTA_DIR: path.join(__dirname, '..', 'public', 'foto-anggota'),
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'uploads',
  get IS_SUPABASE_CONFIGURED(): boolean {
    return Boolean(this.SUPABASE_URL && (this.SUPABASE_SERVICE_ROLE_KEY || this.SUPABASE_ANON_KEY));
  },
};

