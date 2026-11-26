// One-command project setup: env file, database, dependencies, migrations, seed data.
import { copyFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const backend = join(root, 'backend');
const frontend = join(root, 'frontend');

// Run a command and stop the whole setup if it fails.
function run(label, cmd, args, cwd) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`\nSetup failed at step: ${label}`);
    process.exit(result.status ?? 1);
  }
}

// 1. Create backend/.env from the example (never overwrite an existing one).
const envPath = join(backend, '.env');
if (existsSync(envPath)) {
  console.log('==> backend/.env already exists, keeping it');
} else {
  copyFileSync(join(backend, '.env.example'), envPath);
  console.log('==> Created backend/.env from .env.example');
}

// 2. Start PostgreSQL in Docker and wait until it is healthy.
run('Starting PostgreSQL (Docker)', 'docker', ['compose', 'up', '-d', '--wait'], root);

// 3. Install dependencies.
run('Installing backend dependencies', 'npm', ['install'], backend);
run('Installing frontend dependencies', 'npm', ['install'], frontend);

// 4. Apply migrations and load demo data.
run('Applying database migrations', 'npx', ['prisma', 'migrate', 'deploy'], backend);
run('Seeding demo data', 'npm', ['run', 'db:seed'], backend);

console.log('\nSetup complete. Next: npm run dev   (then open http://localhost:5173)');