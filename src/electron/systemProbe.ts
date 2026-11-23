/**
 * One long-lived PowerShell helper for the Windows questions Mossy asks over and over:
 *   - which program's window is in front (Screen Awareness, every 5 s)
 *   - which modding tools are running, with window titles (MO2 bridge every 5 s, CK Crash Prevention every 3 s, chat)
 *   - a full-screen screenshot (Screen Awareness, when a watched tool is in front)
 *
 * Why (measured on a real user's PC, 2026-11-20): Mossy started ~44 programs every 30 s while idle. Each foreground
 * check was a NEW powershell.exe that compiled C# with Add-Type (csc.exe + cvtres.exe): 0.56 s CPU / 0.72 s wall
 * each, ~400 CPU-s an hour; each `tasklist /V` took 34 s wall and was killed by its own 8 s timeout, so it never
 * even answered; every launch is also scanned by the antivirus. Users reported the whole PC slowing down.
 * This helper starts once, compiles once, and answers each request in milliseconds over stdin/stdout.
 *
 * Callers keep their old way as the fallback: every function here returns null when the helper isn't available
 * (non-Windows, PowerShell missing, too many failures), and the caller then does what it did before.
 * Protocol: one request per line "<id>\t<CMD>\t<arg>", one reply per line "<id>\tOK|ERR\t<base64 utf-8 payload>".
 */
import { spawn, ChildProcess } from 'child_process';

const HELPER_PS = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MossyProbeWin32 {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
function Send($id, $status, $text) {
  $b = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([string]$text))
  [Console]::Out.WriteLine([string]$id + [char]9 + $status + [char]9 + $b)
  [Console]::Out.Flush()
}
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($line -eq $null) { break }
  $parts = $line.Split([char]9)
  $id = $parts[0]; $cmd = $parts[1]; $arg = if ($parts.Length -gt 2) { $parts[2] } else { '' }
  try {
    if ($cmd -eq 'FG') {
      $h = [MossyProbeWin32]::GetForegroundWindow(); $p = [uint32]0
      [void][MossyProbeWin32]::GetWindowThreadProcessId($h, [ref]$p)
      $n = ''
      if ($p -ne 0) { $gp = Get-Process -Id $p -ErrorAction SilentlyContinue; if ($gp) { $n = $gp.ProcessName } }
      Send $id 'OK' $n
    } elseif ($cmd -eq 'PS') {
      $rows = foreach ($q in Get-Process) { '{0}|{1}|{2}|{3}' -f $q.ProcessName, $q.Id, [int64]($q.WorkingSet64 / 1024), ($q.MainWindowTitle -replace '[|\r\n]', ' ') }
      Send $id 'OK' ($rows -join [char]10)
    } elseif ($cmd -eq 'SHOT') {
      $a = $arg.Split('|'); $w = [int]$a[0]; $hh = [int]$a[1]; $path = $a[2]
      $bmp = New-Object System.Drawing.Bitmap($w, $hh)
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.CopyFromScreen(0, 0, 0, 0, [System.Drawing.Size]::new($w, $hh))
      $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
      $g.Dispose(); $bmp.Dispose()
      Send $id 'OK' 'saved'
    } elseif ($cmd -eq 'PING') {
      Send $id 'OK' 'pong'
    } else {
      Send $id 'ERR' ('unknown command ' + $cmd)
    }
  } catch {
    Send $id 'ERR' $_.Exception.Message
  }
}
`;

type Pending = { resolve: (v: string) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

let child: ChildProcess | null = null;
let buffer = '';
let nextId = 1;
let failures = 0;
let disabled = process.platform !== 'win32';
const pending = new Map<number, Pending>();
const MAX_FAILURES = 5;   // after this many helper crashes/timeouts in a row, give up and let callers use their old path

function failAll(err: Error) {
  for (const [, p] of pending) { clearTimeout(p.timer); p.reject(err); }
  pending.clear();
}

function start(): ChildProcess | null {
  if (disabled) return null;
  if (child && !child.killed && child.exitCode === null) return child;
  try {
    const encoded = Buffer.from(HELPER_PS, 'utf16le').toString('base64');
    const c = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], {
      windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    });
    buffer = '';
    c.stdout!.setEncoding('utf8');
    c.stdout!.on('data', (chunk: string) => {
      buffer += chunk;
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).replace(/\r$/, '');
        buffer = buffer.slice(nl + 1);
        const [idStr, status, b64] = line.split('\t');
        const id = Number(idStr);
        const p = pending.get(id);
        if (!p) continue;
        pending.delete(id);
        clearTimeout(p.timer);
        const text = Buffer.from(b64 || '', 'base64').toString('utf8');
        if (status === 'OK') { failures = 0; p.resolve(text); } else p.reject(new Error(text || 'helper error'));
      }
    });
    c.stderr!.on('data', () => { /* PowerShell progress noise; replies come on stdout */ });
    c.on('exit', () => {
      if (child === c) child = null;
      failAll(new Error('system probe helper exited'));
    });
    c.on('error', () => {
      if (child === c) child = null;
      failures++;
      if (failures >= MAX_FAILURES) disabled = true;
      failAll(new Error('system probe helper could not start'));
    });
    child = c;
    return c;
  } catch {
    failures++;
    if (failures >= MAX_FAILURES) disabled = true;
    return null;
  }
}

function request(cmd: string, arg = '', timeoutMs = 4000): Promise<string> {
  const c = start();
  if (!c || !c.stdin) return Promise.reject(new Error('system probe helper unavailable'));
  const id = nextId++;
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      failures++;
      if (failures >= MAX_FAILURES) { disabled = true; try { c.kill(); } catch { /* noop */ } }
      reject(new Error(`system probe ${cmd} timed out`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
    c.stdin!.write(`${id}\t${cmd}\t${arg}\n`);
  });
}

/** Lower-case process name of the foreground window ('' when none), or null if the helper isn't available. */
export async function probeForegroundProcess(): Promise<string | null> {
  if (disabled) return null;
  try { return (await request('FG')).trim().toLowerCase(); } catch { return null; }
}

export interface ProbeProcess { name: string; pid: number; memory: string; windowTitle: string }

/** All processes, shaped like `tasklist /V` rows (name with .exe, memory "123,456 K", window title), or null. */
export async function probeProcessList(): Promise<ProbeProcess[] | null> {
  if (disabled) return null;
  try {
    const text = await request('PS', '', 8000);
    const out: ProbeProcess[] = [];
    for (const row of text.split('\n')) {
      const [name, pid, kb, title] = row.split('|');
      if (!name) continue;
      out.push({ name: `${name}.exe`, pid: Number(pid), memory: `${Number(kb || 0).toLocaleString('en-US')} K`, windowTitle: title === undefined ? '' : title.trim() });
    }
    return out;
  } catch { return null; }
}

/** Saves a full-screen PNG of the given size to `pngPath`; false if the helper isn't available or it failed. */
export async function probeScreenshot(width: number, height: number, pngPath: string): Promise<boolean> {
  if (disabled) return false;
  try { await request('SHOT', `${width}|${height}|${pngPath}`, 10000); return true; } catch { return false; }
}

/** Stops the helper (app quit). */
export function stopSystemProbe(): void {
  disabled = true;
  try { child?.kill(); } catch { /* noop */ }
  child = null;
}
