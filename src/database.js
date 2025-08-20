// src/database.js
export async function initDatabase(config) {
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
}

export async function insertFile(config, fileData) {
    return await config.database.prepare(`
    INSERT INTO files (url, fileId, message_id, created_at, file_name, file_size, mime_type) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
        fileData.url,
        fileData.fileId,
        fileData.messageId,
        fileData.timestamp,
        fileData.fileName,
        fileData.fileSize,
        fileData.mimeType
    ).run();
}

export async function getAllFiles(config) {
    return await config.database.prepare(
    `SELECT url, fileId, message_id, created_at, file_name, file_size, mime_type
    FROM files
    ORDER BY created_at DESC`
    ).all();
}

export async function searchFiles(config, searchPattern) {
    return await config.database.prepare(
    `SELECT url, fileId, message_id, created_at, file_name, file_size, mime_type
    FROM files 
    WHERE file_name LIKE ? ESCAPE '!'
    COLLATE NOCASE
    ORDER BY created_at DESC`
    ).bind(searchPattern).all();
}

export async function getFileByUrl(config, url) {
    return await config.database.prepare(
    `SELECT fileId, message_id, file_name, mime_type
    FROM files WHERE url = ?`
    ).bind(url).first();
}

export async function deleteFile(config, url) {
    return await config.database.prepare('DELETE FROM files WHERE url = ?').bind(url).run();
}
