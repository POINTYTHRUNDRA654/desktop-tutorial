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
import { Mo2Bridge } from './Mo2Bridge';

// ── Register bridges here ────────────────────────────────────────────────────

BridgeRegistry.register(new Mo2Bridge());

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
