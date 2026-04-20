/**
 * BridgeRegistry.ts
 *
 * Singleton registry for all Mossy bridges.
 *
 * Usage:
 *   BridgeRegistry.register(new MyBridge());
 *   BridgeRegistry.getAll();            // all registered bridges
 *   BridgeRegistry.get('my-bridge');    // by id
 *   BridgeRegistry.getContextSummary(); // formatted string for AI system prompt
 *
 * DOM events fired (listens in DesktopBridge.tsx and MossyObserver.tsx):
 *   'mossy-bridge-registered'       — { id, name }
 *   'mossy-bridge-status-changed'   — { id, name, status, statusDetail }
 *   (both emitted on `window`)
 */

import type { MossyBridge } from './BridgeBase';

const STATUS_LABELS: Record<string, string> = {
    connected: '🟢 Connected',
    connecting: '🟡 Connecting',
    disconnected: '⚫ Disconnected',
    error: '🔴 Error',
};

class BridgeRegistryImpl {
    private static _instance: BridgeRegistryImpl;
    private readonly bridges = new Map<string, MossyBridge>();

    static getInstance(): BridgeRegistryImpl {
        if (!BridgeRegistryImpl._instance) {
            BridgeRegistryImpl._instance = new BridgeRegistryImpl();
        }
        return BridgeRegistryImpl._instance;
    }

    /** Register a bridge. Safe to call multiple times with the same id. */
    register(bridge: MossyBridge): void {
        if (this.bridges.has(bridge.id)) return;
        this.bridges.set(bridge.id, bridge);
        window.dispatchEvent(
            new CustomEvent('mossy-bridge-registered', {
                detail: { id: bridge.id, name: bridge.name },
            }),
        );
    }

    /** Disconnect and remove a bridge by id. */
    unregister(id: string): void {
        const bridge = this.bridges.get(id);
        if (!bridge) return;
        bridge.disconnect();
        this.bridges.delete(id);
    }

    /** Retrieve a single bridge by id. */
    get(id: string): MossyBridge | undefined {
        return this.bridges.get(id);
    }

    /** All registered bridges in registration order. */
    getAll(): MossyBridge[] {
        return Array.from(this.bridges.values());
    }

    /**
     * Formatted block for Mossy's AI system prompt.
     * Returns an empty string when no bridges are registered.
     */
    getContextSummary(): string {
        const all = this.getAll();
        if (!all.length) return '';

        const lines = all.map((b) => {
            const info = b.getInfo();
            const label = STATUS_LABELS[info.status] ?? info.status;
            const detail = info.statusDetail ? ` — ${info.statusDetail}` : '';
            const version = info.version ? ` v${info.version}` : '';
            return `- ${info.name}${version} [${info.id}]: ${label}${detail}`;
        });

        return `\n**REGISTERED BRIDGES (external tool connections):**\n${lines.join('\n')}`;
    }
}

/** The global BridgeRegistry singleton. */
export const BridgeRegistry = BridgeRegistryImpl.getInstance();
