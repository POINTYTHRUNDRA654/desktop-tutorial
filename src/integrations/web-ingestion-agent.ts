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
const SOURCES = [
    'https://www.creationkit.com/fallout4/index.php',
    'https://www.reddit.com/r/FalloutMods/',
    'https://www.youtube.com/results?search_query=fallout+4+modding+tutorial',
    'https://www.darkfox127.co.uk/',
    // Add more as needed
];

export async function crawlAndIngestTutorials() {
    for (const url of SOURCES) {
        try {
            const resp = await fetch(url);
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

// Schedule regular updates (every 24h)
setInterval(crawlAndIngestTutorials, 24 * 60 * 60 * 1000);

// Manual trigger for immediate ingestion
export async function triggerManualIngestion() {
    await crawlAndIngestTutorials();
}
