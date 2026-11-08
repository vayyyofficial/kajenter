import app from './app.js';
import { CONFIG } from './config.js';
import { initializeDatabase } from './db/schema.js';
import { seedDatabase } from './db/seed.js';

// Initialize DB and Seed, then Start Server
async function startServer() {
  try {
    if (!CONFIG.IS_SUPABASE_CONFIGURED) {
      // Local development mode with SQLite
      initializeDatabase();
      await seedDatabase();
      console.log('💾 Running in Local SQLite Database mode.');
    } else {
      console.log('⚡ Running in Production Supabase Database & Storage mode.');
    }

    app.listen(CONFIG.PORT, () => {
      console.log(`🚀 X ICP TKJ Backend Server running on port http://localhost:${CONFIG.PORT}`);
      console.log(`📁 Foto Anggota Directory: ${CONFIG.FOTO_ANGGOTA_DIR}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
