import { execSync } from 'node:child_process';

const ports = process.argv.slice(2).map((p) => Number(p)).filter((p) => Number.isFinite(p) && p > 0);
const uniquePorts = Array.from(new Set(ports.length ? ports : [5174, 5173, 21337]));

function run(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
}

function killWindows(port) {
  // netstat output columns: Proto Local Address Foreign Address State PID
  const out = run('netstat -ano -p tcp');
  const pids = new Set();

  for (const line of out.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    if (!/^TCP\s+/i.test(s)) continue;
    if (!s.includes('LISTENING')) continue;
    if (!s.includes(`:${port}`)) continue;

    const parts = s.split(/\s+/);
    const pid = Number(parts[parts.length - 1]);
    if (Number.isFinite(pid) && pid > 0) pids.add(pid);
  }

  for (const pid of pids) {
    try {
      process.stdout.write(`[kill-ports] Windows: stopping PID ${pid} on port ${port}\n`);
      run(`taskkill /PID ${pid} /F`);
    } catch (e) {
      process.stdout.write(`[kill-ports] Windows: failed to stop PID ${pid}: ${String(e?.message || e)}\n`);
    }
  }
}

function killUnix(port) {
  // lsof returns PIDs; if not installed, this will throw.
  let out = '';
  try {
    out = run(`lsof -ti tcp:${port}`);
  } catch {
    return;
  }

  const pids = Array.from(new Set(out.split(/\r?\n/).map((x) => Number(x.trim())).filter((n) => Number.isFinite(n) && n > 0)));
  for (const pid of pids) {
    try {
      process.stdout.write(`[kill-ports] Unix: stopping PID ${pid} on port ${port}\n`);
      run(`kill -9 ${pid}`);
    } catch (e) {
      process.stdout.write(`[kill-ports] Unix: failed to stop PID ${pid}: ${String(e?.message || e)}\n`);
    }
  }
}

for (const port of uniquePorts) {
  try {
    if (process.platform === 'win32') killWindows(port);
    else killUnix(port);
  } catch (e) {
    process.stdout.write(`[kill-ports] Failed on port ${port}: ${String(e?.message || e)}\n`);
  }
}
