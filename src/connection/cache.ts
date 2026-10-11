import * as SQLite from 'expo-sqlite';
import type { Track } from '../api/mock';

let database: Promise<SQLite.SQLiteDatabase> | undefined;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  database ??= SQLite.openDatabaseAsync('fablego.db');
  const db = await database;
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS library_cache (id INTEGER PRIMARY KEY CHECK (id = 1), tracks TEXT NOT NULL)',
  );
  return db;
}

export async function saveCachedTracks(tracks: Track[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO library_cache (id, tracks) VALUES (1, ?)',
    JSON.stringify(tracks),
  );
}

export async function getCachedTracks(): Promise<Track[] | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ tracks: string }>(
    'SELECT tracks FROM library_cache WHERE id = 1',
  );
  if (!row) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(row.tracks);
    return Array.isArray(parsed) ? (parsed as Track[]) : null;
  } catch {
    return null;
  }
}
