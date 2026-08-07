import fs from 'node:fs/promises';
import path from 'node:path';

export async function runMigrations() {
  const migrationsDir = path.join(process.cwd(), 'src/db/migrations');
  const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  return files;
}
