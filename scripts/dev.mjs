import { execSync, spawn } from 'node:child_process';

function npmCmd() {
  return 'npm';
}

function spawnNpm(args, { name }) {
  const child = spawn(npmCmd(), args, {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  child.on('error', (err) => {
    console.error(`[dev] Failed to start ${name}:`, err?.message || err);
  });

  return child;
}

function killProcessTree(child) {
  if (!child || !child.pid) return;

  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // Best-effort; process may have already exited.
    }
    return;
  }

  try {
    child.kill('SIGTERM');
  } catch {
    // ignore
  }
}

async function waitForHttpOk(url, { timeoutMs }) {
  const start = Date.now();
  // Use dynamic import so this script stays dependency-free.
  const http = await import('node:http');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const elapsed = Date.now() - start;
    if (elapsed > timeoutMs) {
      throw new Error(`Timed out waiting for ${url}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 250));

    try {
      await new Promise((resolve, reject) => {
        const req = http.request(url, { method: 'GET' }, (res) => {
          res.resume();
          resolve();
        });
        req.on('error', reject);
        req.end();
      });
      return;
    } catch {
      // keep retrying
    }
  }
}

async function main() {
  const port = Number(process.env.VITE_DEV_SERVER_PORT || 5174);
  const url = `http://127.0.0.1:${port}/`;

  console.log('[dev] Starting Vite + tsc watch...');
  const vite = spawnNpm(['run', 'dev:vite'], { name: 'dev:vite' });
  const tsc = spawnNpm(['run', 'dev:tsc'], { name: 'dev:tsc' });

  const children = [vite, tsc];

  const shutdown = (code = 0) => {
    for (const child of children) {
      if (!child.killed) killProcessTree(child);
    }
    process.exit(code);
  };

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  for (const child of children) {
    child.on('exit', (code) => {
      // If any watcher dies, stop the whole dev stack.
      if (code && code !== 0) shutdown(code);
    });
  }

  console.log('[dev] Waiting for', url);
  await waitForHttpOk(url, { timeoutMs: 60_000 });

  console.log('[dev] Starting Electron...');
  const electronEnv = { ...process.env, ELECTRON_START_URL: url };
  const electron = spawn(
    'npx',
    ['electron', '.'],
    {
      stdio: 'inherit',
      env: electronEnv,
      shell: process.platform === 'win32',
    },
  );

  children.push(electron);

  electron.on('exit', (code) => shutdown(code || 0));
  electron.on('error', (err) => {
    console.error('[dev] Electron failed to start:', err?.message || err);
    shutdown(1);
  });
}

main().catch((err) => {
  console.error('[dev] Fatal:', err?.message || err);
  process.exit(1);
});
