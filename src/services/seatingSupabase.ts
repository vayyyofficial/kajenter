import { createClient } from '@supabase/supabase-js';

// The publishable key is intentionally configured per deployment; never ship a
// project URL or key from a source-code fallback.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  typeof supabaseUrl === 'string' &&
  supabaseUrl.startsWith('http')
);

/**
 * Safely create the Supabase client without throwing uncaught exceptions
 * at module evaluation time.
 */
function createSafeSupabaseClient(): any {
  if (isSupabaseConfigured) {
    try {
      return createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (err) {
      console.warn('[seatingSupabase] Initialization failed, using safe fallback client:', err);
    }
  }

  // Safe fallback mock client if Supabase is unavailable, preventing white blank screens
  const mockQuery: any = () => ({
    select: () => mockQuery(),
    insert: () => mockQuery(),
    update: () => mockQuery(),
    delete: () => mockQuery(),
    eq: () => mockQuery(),
    order: () => mockQuery(),
    limit: () => mockQuery(),
    single: async () => ({ data: null, error: new Error('Supabase client not initialized') }),
    then: (resolve: any) => resolve({ data: null, error: new Error('Supabase client not initialized') }),
  });

  return {
    from: () => mockQuery(),
    rpc: async () => ({ data: null, error: new Error('Supabase client not initialized') }),
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
      subscribe: () => ({}),
    }),
    removeChannel: () => {},
  };
}

export const seatingSupabase = createSafeSupabaseClient();
