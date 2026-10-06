import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
if (existsSync('.env')) process.loadEnvFile('.env');
const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
if (!databaseUrl.startsWith('file:'))
  throw new Error('This schema uses SQLite. DATABASE_URL must start with file:.');
const databasePath = resolve('prisma', databaseUrl.slice(5));
mkdirSync(dirname(databasePath), { recursive: true });
if (!existsSync(databasePath)) writeFileSync(databasePath, '');
for (const args of [
  ['node_modules/prisma/build/index.js', 'generate'],
  ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
  ['node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts'],
]) {
  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
