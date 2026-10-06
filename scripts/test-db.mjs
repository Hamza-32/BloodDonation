import { spawnSync } from 'node:child_process';
import { unlinkSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
// Reset only this explicitly named disposable database. Never touches dev.db.
for (const name of ['test.db', 'test.db-journal', 'test.db-wal', 'test.db-shm']) {
  const path = resolve('prisma', name);
  if (existsSync(path)) unlinkSync(path);
}
writeFileSync(resolve('prisma', 'test.db'), '');
const env = { ...process.env, DATABASE_URL: 'file:./test.db', DEMO_PASSWORD: 'TestPortal!2026' };
for (const args of [
  ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
  ['node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts'],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
