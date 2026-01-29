import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const OUT_DIR = path.resolve(process.cwd(), 'external', 'vcredist');
const FILES = [
  {
    url: 'https://aka.ms/vs/17/release/vc_redist.x64.exe',
    name: 'vc_redist.x64.exe',
  },
  {
    url: 'https://aka.ms/vs/17/release/vc_redist.x86.exe',
    name: 'vc_redist.x86.exe',
  },
];

function downloadFile(url, destinationPath) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (res) => {
      // Handle redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(downloadFile(res.headers.location, destinationPath));
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
      }

      const fileStream = fs.createWriteStream(destinationPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => fileStream.close(resolve));
      fileStream.on('error', (err) => {
        try { fs.unlinkSync(destinationPath); } catch { /* ignore */ }
        reject(err);
      });
    });

    request.on('error', reject);
  });
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const f of FILES) {
    const outPath = path.join(OUT_DIR, f.name);
    if (fs.existsSync(outPath)) {
      const stat = fs.statSync(outPath);
      if (stat.size > 1024 * 1024) {
        console.log(`[vcredist] OK: ${f.name} (${Math.round(stat.size / 1024 / 1024)} MB)`);
        continue;
      }
      try { fs.unlinkSync(outPath); } catch { /* ignore */ }
    }

    console.log(`[vcredist] Downloading ${f.name}...`);
    await downloadFile(f.url, outPath);
    const stat = fs.statSync(outPath);
    console.log(`[vcredist] Saved ${f.name} (${Math.round(stat.size / 1024 / 1024)} MB)`);
  }

  console.log('[vcredist] Done');
})().catch((err) => {
  console.error('[vcredist] Failed:', err?.message || err);
  process.exit(1);
});
