import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const dbDir = path.dirname(config.database.path);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  logger.info(`Opening SQLite database at ${config.database.path}`);
  dbInstance = new DatabaseSync(config.database.path);
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA foreign_keys = ON;');

  return dbInstance;
}

export function queryAll<T = any>(sql: string, ...params: any[]): T[] {
  const db = getDatabase();
  return (db.prepare(sql) as any).all(...params) as T[];
}

export function queryGet<T = any>(sql: string, ...params: any[]): T | undefined {
  const db = getDatabase();
  return (db.prepare(sql) as any).get(...params) as T | undefined;
}

export function execute(sql: string, ...params: any[]): any {
  const db = getDatabase();
  return (db.prepare(sql) as any).run(...params);
}

export function runTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN TRANSACTION;');
  try {
    const res = fn();
    db.exec('COMMIT;');
    return res;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('Closed database connection');
  }
}
