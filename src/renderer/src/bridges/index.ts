/**
 * bridges/index.ts  —  Bridge Registration Entry Point
 *
 * ═══════════════════════════════════════════════════════════════
 *  HOW TO ADD A NEW BRIDGE
 * ═══════════════════════════════════════════════════════════════
 *  1. Create your class in this directory, extending MossyBridge.
 *     (copy Mo2Bridge.ts as a starting point)
 *
 *  2. Add two lines below:
 *       import { YourBridge } from './YourBridge';
 *       BridgeRegistry.register(new YourBridge());
 *
 *  That's it.  Your bridge will automatically appear in the
 *  Desktop Bridge → Bridges tab and in Mossy's system context.
 * ═══════════════════════════════════════════════════════════════
 *
 * This file is imported once in App.tsx as a side-effect:
 *   import './bridges';
 */

import { BridgeRegistry } from './BridgeRegistry';
import { HttpPluginBridge } from './HttpPluginBridge';
import { Mo2Bridge } from './Mo2Bridge';
import { F4AIBridge } from './F4AIBridge';
import { VaultTecCreativeDirectorBridge } from './VaultTecCreativeDirectorBridge';
import { VaultTecOverseerBridge } from './VaultTecOverseerBridge';

// ── Register bridges here ────────────────────────────────────────────────────

const _mo2 = new Mo2Bridge();
BridgeRegistry.register(_mo2);
void _mo2.connect();

const _f4ai = new F4AIBridge();
BridgeRegistry.register(_f4ai);
void _f4ai.connect();

// ── Vault-Tec Modding Suite bridges ──────────────────────────────────────────
// Two AI agents from D:\MossyModels\mossy-vault-tec-modding-assistant

const _vtCreative = new VaultTecCreativeDirectorBridge();
BridgeRegistry.register(_vtCreative);
void _vtCreative.connect();

const _vtOverseer = new VaultTecOverseerBridge();
BridgeRegistry.register(_vtOverseer);
void _vtOverseer.connect();

const normalizePluginBridgeConfigs = (plugin: any): any[] => {
    const manifestBridge = plugin?.manifest?.mossyBridge;
    const manifestBridges = Array.isArray(plugin?.manifest?.mossyBridges)
        ? plugin.manifest.mossyBridges
        : [];
    const rootBridge = plugin?.mossyBridge;
    const rootBridges = Array.isArray(plugin?.mossyBridges)
        ? plugin.mossyBridges
        : [];

    return [
        ...manifestBridges,
        ...rootBridges,
        ...(manifestBridge ? [manifestBridge] : []),
        ...(rootBridge ? [rootBridge] : []),
    ].filter((config) => config && typeof config.healthUrl === 'string' && config.healthUrl.length > 0);
};

const registerInstalledPluginBridges = async () => {
    try {
        const api = (window as any).electron?.api;
        const pluginManager = api?.pluginManager;
        if (!pluginManager?.listInstalled) return;

        const plugins = await pluginManager.listInstalled();
        if (!Array.isArray(plugins)) return;

        for (const plugin of plugins) {
            if (plugin?.enabled === false) continue;
            const configs = normalizePluginBridgeConfigs(plugin);
            for (const config of configs) {
                const bridge = new HttpPluginBridge(
                    String(plugin.id || 'community-plugin'),
                    String(plugin.name || plugin.id || 'Community Plugin'),
                    plugin.version ? String(plugin.version) : undefined,
                    config,
                );
                BridgeRegistry.register(bridge);
                void bridge.connect();
            }
        }
    } catch (error) {
        console.warn('[bridges] Failed to auto-register plugin bridges:', error);
    }
};

void registerInstalledPluginBridges();

// Example of adding more:
//   import { XEditBridge } from './XEditBridge';
//   BridgeRegistry.register(new XEditBridge());
//
//   import { NifscopeBridge } from './NifscopeBridge';
//   BridgeRegistry.register(new NifscopeBridge());

// ─────────────────────────────────────────────────────────────────────────────

export { BridgeRegistry } from './BridgeRegistry';
export type { MossyBridge } from './BridgeBase';
export type { BridgeStatus, BridgeInfo } from './BridgeBase';
