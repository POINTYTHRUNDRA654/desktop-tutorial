/**
 * Persistent Memory Store Service
 * 
 * Manages Mossy's cross-session memory: facts, decisions, and context.
 * Persists to {userData}/mossy-memory.json for durability.
 * Provides semantic ranking for memory retrieval.
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { MemoryFact } from './types';

interface MemoryStore {
    facts: MemoryFact[];
    version: string;
    createdAt: string;
    updatedAt: string;
}

const DEFAULT_STORE: MemoryStore = {
    facts: [],
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

let memoryStoreInstance: MemoryStore | null = null;
let memoryStorePath: string;

/**
 * Initialize and load memory store from disk
 */
export function getMemoryStore(): MemoryStore {
    if (memoryStoreInstance) {
        return memoryStoreInstance;
    }

    const userDataPath = app.getPath('userData');
    memoryStorePath = path.join(userDataPath, 'mossy-memory.json');

    try {
        if (fs.existsSync(memoryStorePath)) {
            const data = fs.readFileSync(memoryStorePath, 'utf-8');
            const parsed = JSON.parse(data);
            memoryStoreInstance = {
                facts: parsed.facts || [],
                version: parsed.version || DEFAULT_STORE.version,
                createdAt: parsed.createdAt || DEFAULT_STORE.createdAt,
                updatedAt: new Date().toISOString(),
            };
        } else {
            memoryStoreInstance = {
                ...DEFAULT_STORE,
                createdAt: new Date().toISOString(),
            };
        }
    } catch (error) {
        console.error('[MemoryStore] Failed to load:', error);
        memoryStoreInstance = { ...DEFAULT_STORE };
    }

    return memoryStoreInstance;
}

/**
 * Persist store to disk
 */
export function saveMemoryStore(): boolean {
    if (!memoryStoreInstance) {
        return false;
    }

    try {
        memoryStoreInstance.updatedAt = new Date().toISOString();
        const data = JSON.stringify(memoryStoreInstance, null, 2);
        fs.writeFileSync(memoryStorePath, data, 'utf-8');
        return true;
    } catch (error) {
        console.error('[MemoryStore] Failed to save:', error);
        return false;
    }
}

/**
 * Add a new fact to memory
 */
export function addMemoryFact(req: {
    fact: string;
    context: string;
    tags?: string[];
}): { ok: boolean; factId?: string; error?: string } {
    try {
        const store = getMemoryStore();
        const factId = `fact_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        const newFact: MemoryFact = {
            id: factId,
            fact: req.fact,
            context: req.context,
            tags: req.tags || [],
            confidence: 1.0, // New facts start at high confidence
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
        };

        store.facts.push(newFact);
        saveMemoryStore();

        console.log(`[MemoryStore] Added fact: ${factId}`);
        return { ok: true, factId };
    } catch (error) {
        console.error('[MemoryStore] Failed to add fact:', error);
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Query facts by semantic similarity (simple keyword matching for now)
 * In production, use vector embeddings via semantic-search.ts
 */
export function queryMemoryFacts(req: {
    query: string;
    topK?: number;
}): { ok: boolean; facts?: MemoryFact[]; error?: string } {
    try {
        const store = getMemoryStore();
        const topK = req.topK || 5;
        const queryLower = req.query.toLowerCase();

        // Simple keyword-based ranking
        const ranked = store.facts
            .map((fact) => {
                const factLower = fact.fact.toLowerCase();
                const contextLower = fact.context.toLowerCase();

                // Count keyword matches
                let score = 0;
                if (factLower.includes(queryLower)) score += 10;
                if (contextLower.includes(queryLower)) score += 5;

                // Boost by confidence
                score *= fact.confidence;

                // Boost recent facts slightly
                const daysSince = (Date.now() - new Date(fact.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
                score *= Math.max(0.8, 1 - daysSince * 0.05);

                return { fact, score };
            })
            .filter((r) => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
            .map((r) => {
                // Update lastUsed on retrieval
                r.fact.lastUsed = new Date().toISOString();
                return r.fact;
            });

        saveMemoryStore();
        return { ok: true, facts: ranked };
    } catch (error) {
        console.error('[MemoryStore] Failed to query:', error);
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get all facts
 */
export function getAllMemoryFacts(): { ok: boolean; facts?: MemoryFact[]; error?: string } {
    try {
        const store = getMemoryStore();
        return { ok: true, facts: store.facts };
    } catch (error) {
        console.error('[MemoryStore] Failed to get all facts:', error);
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Delete a fact by ID
 */
export function deleteMemoryFact(factId: string): { ok: boolean; error?: string } {
    try {
        const store = getMemoryStore();
        const initialLength = store.facts.length;
        store.facts = store.facts.filter((f) => f.id !== factId);

        if (store.facts.length < initialLength) {
            saveMemoryStore();
            console.log(`[MemoryStore] Deleted fact: ${factId}`);
            return { ok: true };
        } else {
            return { ok: false, error: 'Fact not found' };
        }
    } catch (error) {
        console.error('[MemoryStore] Failed to delete fact:', error);
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Update a fact
 */
export function updateMemoryFact(
    factId: string,
    updates: Partial<MemoryFact>
): { ok: boolean; error?: string } {
    try {
        const store = getMemoryStore();
        const fact = store.facts.find((f) => f.id === factId);

        if (!fact) {
            return { ok: false, error: 'Fact not found' };
        }

        Object.assign(fact, updates, {
            lastUsed: new Date().toISOString(),
        });

        saveMemoryStore();
        console.log(`[MemoryStore] Updated fact: ${factId}`);
        return { ok: true };
    } catch (error) {
        console.error('[MemoryStore] Failed to update fact:', error);
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Clear all facts (use cautiously!)
 */
export function clearMemoryStore(): { ok: boolean; error?: string } {
    try {
        if (memoryStoreInstance) {
            memoryStoreInstance.facts = [];
            saveMemoryStore();
            console.log('[MemoryStore] Cleared all facts');
            return { ok: true };
        }
        return { ok: false, error: 'Memory store not initialized' };
    } catch (error) {
        console.error('[MemoryStore] Failed to clear:', error);
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get statistics about memory store
 */
export function getMemoryStoreStats(): {
    totalFacts: number;
    topTags: Array<{ tag: string; count: number }>;
    oldestFact: string | null;
    newestFact: string | null;
} {
    const store = getMemoryStore();

    // Count tags
    const tagCounts: Record<string, number> = {};
    store.facts.forEach((f) => {
        f.tags?.forEach((tag) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    const topTags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const dates = store.facts.map((f) => new Date(f.createdAt).getTime());
    const oldestFact = dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : null;
    const newestFact = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null;

    return {
        totalFacts: store.facts.length,
        topTags,
        oldestFact,
        newestFact,
    };
}
