#!/usr/bin/env node
/**
 * test-web-search.mjs — Live internet access diagnostic for Mossy
 *
 * Usage:  node scripts/test-web-search.mjs
 *    or:  npm run test-web-search
 *
 * Tests every web search provider Mossy uses, in the same priority order
 * as the in-app web-search IPC handler:
 *
 *   Wiki queries (Fallout 4 topic):
 *     1. fallout.wiki  (The Vault — independent Fallout wiki)
 *     2. fallout.fandom.com  (Fandom MediaWiki)
 *
 *   General queries:
 *     1. api.duckduckgo.com  (DuckDuckGo Instant Answer API)
 *     2. en.wikipedia.org    (Wikipedia search + intro extract)
 *
 * Exit code 0 = at least one provider per query type responded.
 * Exit code 1 = all providers failed for at least one query type.
 */

import https from 'https';

// ─── ANSI colours ────────────────────────────────────────────────────────────
const G = '\x1b[32m'; // green
const R = '\x1b[31m'; // red
const Y = '\x1b[33m'; // yellow
const B = '\x1b[36m'; // cyan
const D = '\x1b[90m'; // dim
const Z = '\x1b[0m';  // reset

const ok   = (msg) => console.log(`  ${G}✓${Z}  ${msg}`);
const fail = (msg) => console.log(`  ${R}✗${Z}  ${msg}`);
const warn = (msg) => console.log(`  ${Y}⚠${Z}  ${msg}`);
const info = (msg) => console.log(`  ${B}ℹ${Z}  ${msg}`);

// ─── HTTP helper ─────────────────────────────────────────────────────────────
const TIMEOUT_MS = 10_000;

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
    https.get(url, { headers: { 'User-Agent': 'Mossy-Desktop-Diagnostic/1.0' } }, (res) => {
      clearTimeout(timer);
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`HTTP ${res.statusCode} ${res.statusMessage}`));
        }
      });
    }).on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

function stripHtml(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script[^>]*>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─── Providers ───────────────────────────────────────────────────────────────
const WIKI_QUERY = 'Papyrus scripting Fallout 4';
const GENERAL_QUERY = 'Fallout 4 modding guide';

const wikiProviders = [
  {
    name: 'fallout.wiki (The Vault)',
    url: `https://fallout.wiki/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(WIKI_QUERY)}&format=json&srlimit=2&srwhat=text`,
    parse: (body) => {
      const json = JSON.parse(body);
      const results = json?.query?.search || [];
      if (results.length === 0) return null;
      return results.map((r) => `• ${r.title}: ${stripHtml(r.snippet || '').slice(0, 120)}`).join('\n');
    },
  },
  {
    name: 'fallout.fandom.com',
    url: `https://fallout.fandom.com/api.php?action=query&list=search&srsearch=${encodeURIComponent(WIKI_QUERY)}&format=json&srlimit=2&srwhat=text`,
    parse: (body) => {
      const json = JSON.parse(body);
      const results = json?.query?.search || [];
      if (results.length === 0) return null;
      return results.map((r) => `• ${r.title}: ${stripHtml(r.snippet || '').slice(0, 120)}`).join('\n');
    },
  },
];

const generalProviders = [
  {
    name: 'DuckDuckGo Instant Answer API',
    url: `https://api.duckduckgo.com/?q=${encodeURIComponent(GENERAL_QUERY)}&format=json&no_html=1&skip_disambig=1`,
    parse: (body) => {
      const json = JSON.parse(body);
      const text = json.AbstractText || json.Abstract || '';
      if (!text.trim()) return null; // empty is treated as no result
      return text.slice(0, 300);
    },
  },
  {
    name: 'Wikipedia API (en.wikipedia.org)',
    url: `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(GENERAL_QUERY)}&format=json&srlimit=2&srwhat=text`,
    parse: (body) => {
      const json = JSON.parse(body);
      const results = json?.query?.search || [];
      if (results.length === 0) return null;
      return results.map((r) => `• ${r.title}: ${stripHtml(r.snippet || '').slice(0, 120)}`).join('\n');
    },
  },
];

// ─── Test runner ─────────────────────────────────────────────────────────────
async function testProviders(label, query, providers) {
  console.log(`\n${B}▶ ${label}${Z}  ${D}(query: "${query}")${Z}`);
  let anyPassed = false;
  for (const provider of providers) {
    try {
      const body = await httpsGet(provider.url);
      const result = provider.parse(body);
      if (result) {
        ok(`${provider.name}  — SUCCESS`);
        console.log(`     ${D}${result.replace(/\n/g, '\n     ')}${Z}`);
        anyPassed = true;
        break; // first success is enough — mirrors app behaviour
      } else {
        warn(`${provider.name}  — Connected but returned empty result; trying next provider`);
      }
    } catch (err) {
      fail(`${provider.name}  — FAILED: ${err.message}`);
    }
  }
  if (!anyPassed) {
    fail(`All ${label} providers failed.`);
  }
  return anyPassed;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '═'.repeat(62));
  console.log('  Mossy — Web Search Provider Diagnostic');
  console.log('═'.repeat(62));
  info('Testing each search provider in the same priority order');
  info('as the in-app web-search IPC handler.');

  const wikiOk    = await testProviders('Wiki Providers   (Fallout 4 topics)', WIKI_QUERY,    wikiProviders);
  const generalOk = await testProviders('General Providers (any topic)',        GENERAL_QUERY, generalProviders);

  console.log('\n' + '─'.repeat(62));
  console.log('  Summary');
  console.log('─'.repeat(62));
  if (wikiOk && generalOk) {
    console.log(`  ${G}✓ All provider groups returned results — internet access is working.${Z}`);
    console.log(`\n  ${D}Mossy will be able to go online when you ask her to.${Z}`);
  } else {
    if (!wikiOk)    fail('Wiki providers: all failed — Fallout 4 wiki searches will not work.');
    if (!generalOk) fail('General providers: all failed — DuckDuckGo / Wikipedia searches will not work.');
    console.log(`\n  ${Y}Possible causes:${Z}`);
    console.log(`  ${D}  • No outbound internet access in this environment${Z}`);
    console.log(`  ${D}  • DNS resolution blocked (firewall / proxy)${Z}`);
    console.log(`  ${D}  • The target domains are rate-limiting or temporarily down${Z}`);
    console.log(`\n  ${D}Try running: nslookup fallout.wiki 8.8.8.8${Z}`);
    console.log(`  ${D}         or: nslookup api.duckduckgo.com 8.8.8.8${Z}`);
  }
  console.log('');

  if (!wikiOk || !generalOk) process.exit(1);
}

main().catch((err) => {
  console.error('\n[test-web-search] Unexpected error:', err?.message || err);
  process.exit(1);
});
