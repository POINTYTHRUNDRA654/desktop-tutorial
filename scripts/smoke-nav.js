const fs = require('fs');
const path = require('path');

(async () => {
  const projectRoot = path.resolve(__dirname, '..');
  const sidebarPath = path.join(projectRoot, 'src', 'renderer', 'src', 'Sidebar.tsx');
  const sidebar = fs.readFileSync(sidebarPath, 'utf8');

  const navPathRe = /\{\s*to:\s*'([^']+)'/g;
  const navs = [];
  let m;
  while ((m = navPathRe.exec(sidebar)) !== null) navs.push(m[1]);

  // Filter out external links
  const internal = navs.filter(n => !/^https?:/.test(n));

  // HashRouter -> use #/path
  const urls = internal.map(p => {
    if (p === '/') return `http://localhost:5174/#/`;
    return `http://localhost:5174/#${p}`;
  });

  console.log(`Will smoke-test ${urls.length} routes (dev server must be running on :5174)`);

  // Try to load playwright dynamically
  let playwright;
  try {
    playwright = require('playwright');
  } catch (err) {
    console.error('Playwright not available in this environment:', err.message);
    process.exit(2);
  }

  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];
  for (const url of urls) {
    const entry = { url, ok: true, errors: [], warnings: [], contentLength: 0, hasMain: false };
    try {
      page.on('console', (msg) => {
        const t = msg.type();
        if (t === 'error') entry.errors.push(msg.text());
        else if (t === 'warning') entry.warnings.push(msg.text());
      });
      page.on('pageerror', (err) => entry.errors.push(String(err)));

      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      // small delay for client-side routing
      await page.waitForTimeout(700);

      const content = await page.content();
      entry.contentLength = content.length;
      const hasMain = await page.$('main, [data-mossy-main]');
      entry.hasMain = !!hasMain;

      if (!resp || resp.status() >= 400) {
        entry.ok = false;
        entry.errors.push(`HTTP status ${resp ? resp.status() : 'no response'}`);
      }

      // Determine 'empty' heuristics
      if (content.length < 2000 || !entry.hasMain) {
        // check if page contains a prominent header or known placeholders
        const hasHeader = /<h1|<h2|class="text-3xl|class="text-3xl/.test(content);
        if (!hasHeader) entry.warnings.push('Possible empty page (small content/no header)');
      }
    } catch (err) {
      entry.ok = false;
      entry.errors.push(String(err));
    } finally {
      results.push(entry);
      // remove listeners to avoid duplicates
      page.removeAllListeners('console');
      page.removeAllListeners('pageerror');
    }
  }

  await browser.close();

  // Print summary
  console.log('\n=== SMOKE NAVIGATION RESULTS ===');
  const failed = results.filter(r => !r.ok || r.errors.length || r.warnings.length);
  if (failed.length === 0) console.log('All routes loaded without console errors and look non-empty.');
  else {
    for (const r of failed) {
      console.log('\n- URL:', r.url);
      console.log('  OK:', r.ok);
      console.log('  contentLength:', r.contentLength, 'hasMain:', r.hasMain);
      if (r.errors.length) {
        console.log('  errors:');
        r.errors.slice(0,10).forEach(e => console.log('    -', e.replace(/\n/g,' ')));
      }
      if (r.warnings.length) {
        console.log('  warnings:');
        r.warnings.slice(0,10).forEach(w => console.log('    -', w.replace(/\n/g,' ')));
      }
    }
  }

  // Exit with non-zero code if any route failed
  const hasCritical = results.some(r => !r.ok || r.errors.length > 0);
  process.exit(hasCritical ? 1 : 0);
})();
