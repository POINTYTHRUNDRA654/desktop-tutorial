// Mossy Web Ingestion Agent for Fallout 4 Tutorials
// Integrates with Memory Vault and Knowledge Search

import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';

export interface TutorialSource {
    url: string;
    title: string;
    author?: string;
    tags?: string[];
    trustLevel?: 'Personal' | 'Community' | 'Official';
    content: string;
}

// NOTE: nexusmods.com and forums.nexusmods.com URLs are intentionally excluded.
// Scraping Nexus Mods HTML violates their Terms of Service (no text/data mining or
// web scraping). Use the official Nexus Mods API (nexus-mods-integration.ts) instead.
//
// NOTE: youtube.com is excluded — YouTube's ToS (§5.B.3) prohibits automated
// scraping or data mining of their service.
//
// NOTE: reddit.com HTML scraping is excluded. Reddit's ToS (§5.4) and API terms
// prohibit scraping. Use Reddit's public JSON API endpoints (/r/sub.json) if needed.
const SOURCES = [
    'https://www.creationkit.com/fallout4/index.php',
    'https://www.darkfox127.co.uk/',
    // Add more sources here — avoid platforms that prohibit web scraping in their ToS
];

export async function crawlAndIngestTutorials() {
    for (const url of SOURCES) {
        try {
            const resp = await fetch(url, {
                headers: {
                    'User-Agent': 'Mossy-Modding-Assistant/1.0 (Fallout 4 tutorial ingestion; +https://github.com/POINTYTHRUNDRA654/mossy-ai)',
                },
            });
            const html = await resp.text();
            const dom = new JSDOM(html);
            const title = dom.window.document.title || 'Fallout 4 Tutorial';
            const content = dom.window.document.body.textContent || '';
            const tutorial: TutorialSource = {
                url,
                title,
                content,
                tags: ['fallout4', 'modding', 'tutorial'],
                trustLevel: 'Community',
            };
            // Write to Memory Vault localStorage
            const vaultKey = 'mossy_knowledge_vault';
            const prev = typeof window !== 'undefined' ? window.localStorage.getItem(vaultKey) : null;
            let memories = [];
            try { memories = prev ? JSON.parse(prev) : []; } catch { /* ignore malformed JSON; start fresh */ }
            memories.push({
                title: tutorial.title,
                content: tutorial.content,
                source: tutorial.url,
                tags: tutorial.tags,
                trustLevel: tutorial.trustLevel,
                date: new Date().toISOString(),
            });
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(vaultKey, JSON.stringify(memories));
            }
        } catch (err) {
            console.warn(`[WebIngestionAgent] Failed to ingest from ${url}:`, err);
        }
    }
}

// Manual trigger — call this explicitly; do not run on import.
export async function triggerManualIngestion() {
    await crawlAndIngestTutorials();
}

/**
 * Start periodic background ingestion (every 24 h).
 * Called explicitly by the main process — not run automatically on module load.
 */
export function startPeriodicIngestion(): ReturnType<typeof setInterval> {
    return setInterval(crawlAndIngestTutorials, 24 * 60 * 60 * 1000);
}
