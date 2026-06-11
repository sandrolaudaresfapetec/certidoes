const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = (process.env.DATABASE_URL || '').replace('file:', '');
if (!dbPath) { console.error('DATABASE_URL not set'); process.exit(1); }

console.log('Opening database at:', dbPath);
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Create migrations table if not exists
db.exec(`CREATE TABLE IF NOT EXISTS _prisma_migrations (
  id TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  finished_at TEXT,
  migration_name TEXT NOT NULL,
  logs TEXT,
  rolled_back_at TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  applied_steps_count INTEGER NOT NULL DEFAULT 0
)`);

// Apply pending migrations
const migrationsDir = path.join(__dirname, 'prisma/migrations');
const dirs = fs.readdirSync(migrationsDir).filter(d => {
  const fullPath = path.join(migrationsDir, d);
  return fs.statSync(fullPath).isDirectory();
}).sort();

for (const dir of dirs) {
  const existing = db.prepare('SELECT id FROM _prisma_migrations WHERE migration_name = ?').get(dir);
  if (existing) {
    console.log('Migration already applied:', dir);
    continue;
  }
  const sqlFile = path.join(migrationsDir, dir, 'migration.sql');
  if (!fs.existsSync(sqlFile)) continue;
  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log('Applying migration:', dir);
  try {
    db.exec(sql);
  } catch (e) {
    if (e.message && e.message.includes('already exists')) {
      console.log('Tables already exist, marking migration as applied:', dir);
    } else {
      throw e;
    }
  }
  db.prepare(
    "INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (?, ?, datetime('now'), ?, 1)"
  ).run(
    crypto.randomUUID(),
    crypto.createHash('sha256').update(sql).digest('hex'),
    dir
  );
  console.log('Applied:', dir);
}
db.close();
console.log('Migrations complete');
