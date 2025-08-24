// worker/utils/database.js
export async function initDatabase(config) {
  try {
    await config.database.prepare(`
      CREATE TABLE IF NOT EXISTS files (
        url TEXT PRIMARY KEY,
        fileId TEXT NOT NULL,
        message_id INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        file_name TEXT,
        file_size INTEGER,
        mime_type TEXT
      )
    `).run();
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw new Response('Database error', { status: 500 });
  }
}