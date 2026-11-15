import { CONFIG } from '../config.js';
import { supabaseDb } from './supabase.js';
import { sqliteDb, rawQuery } from './sqlite.js';

export const isProductionDb = CONFIG.IS_SUPABASE_CONFIGURED;

/**
 * Single source of truth for the Database Service.
 * Uses persistent online Supabase PostgreSQL when credentials are configured.
 * Automatically falls back to local SQLite in development when credentials are not yet supplied.
 */
export const dbService = isProductionDb ? supabaseDb : sqliteDb;

export const query = rawQuery;
export const db = {
  exec(sql: string) {
    return rawQuery.exec(sql);
  },
};

export { supabaseDb, sqliteDb, rawQuery };

