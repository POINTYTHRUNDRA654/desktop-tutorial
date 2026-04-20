/**
 * BridgeBase.ts
 *
 * Abstract base class for all Mossy bridges.
 *
 * A "bridge" connects an external tool or service to Mossy so she can observe
 * what the user is doing and provide context-aware help.  Examples:
 *   - Blender Bridge  — watches an active Blender session
 *   - Desktop Bridge  — monitors the Windows shell / file watcher
 *   - MO2 Bridge      — tracks Mod Organizer 2 profile/mod-list state
 *   - Any future tool — just extend this class
 *
 * Extending is intentionally simple:
 *
 *   export class MyToolBridge extends MossyBridge {
 *     readonly id          = 'my-tool';
 *     readonly name        = 'My Tool Bridge';
 *     readonly description = 'Monitors My Tool for changes';
 *
 *     async connect() {
 *       this.setStatus('connecting', 'Starting up...');
 *       // ... detect / poll / subscribe to tool ...
 *       this.setStatus('connected');
 *     }
 *
 *     disconnect() {
 *       // ... clean up subscriptions / timers ...
 *       this.setStatus('disconnected');
 *     }
 *   }
 *
 * Then register it in bridges/index.ts:
 *   BridgeRegistry.register(new MyToolBridge());
 */

import { recordActivity } from '../panelActivity';

// ─── Status ──────────────────────────────────────────────────────────────────

export type BridgeStatus =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'error';

// ─── Info snapshot ────────────────────────────────────────────────────────────

export interface BridgeInfo {
    /** Unique identifier — also used as the `source` in panelActivity events. */
    id: string;
    /** Human-readable display name shown in the Bridges tab. */
    name: string;
    /** One-sentence description of what this bridge monitors. */
    description: string;
    /** Optional version string (e.g. the tool's version). */
    version?: string;
    /** Current connection state. */
    status: BridgeStatus;
    /** Optional human-readable status detail (error message, profile name, etc.). */
    statusDetail?: string;
}

// ─── Abstract base ────────────────────────────────────────────────────────────

export abstract class MossyBridge {
    /** Unique identifier — also the `source` reported to panelActivity. */
    abstract readonly id: string;

    /** Human-readable name shown in the Desktop Bridge "Bridges" tab. */
    abstract readonly name: string;

    /** One-sentence description of what this bridge monitors. */
    abstract readonly description: string;

    protected _status: BridgeStatus = 'disconnected';
    protected _statusDetail?: string;
    protected _version?: string;

    get status(): BridgeStatus {
        return this._status;
    }

    get statusDetail(): string | undefined {
        return this._statusDetail;
    }

    get version(): string | undefined {
        return this._version;
    }

    /** Snapshot of this bridge's current state (safe to render in UI). */
    getInfo(): BridgeInfo {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            version: this._version,
            status: this._status,
            statusDetail: this._statusDetail,
        };
    }

    /**
     * Start connecting to the external tool.
     * Call `this.setStatus('connected')` when the connection is established.
     */
    abstract connect(): Promise<void>;

    /**
     * Tear down the connection and any timers/subscriptions.
     * Call `this.setStatus('disconnected')` when done.
     */
    abstract disconnect(): void;

    // ── Helpers available to subclasses ─────────────────────────────────────

    /**
     * Report that the user did something observable through this bridge.
     * Feeds directly into panelActivity.ts so Mossy's context stays current.
     *
     * @param eventType  What happened (e.g. 'file-loaded', 'profile-changed', 'sort-run')
     * @param detail     Optional human-readable detail (e.g. filename, profile name)
     */
    protected reportActivity(eventType: string, detail?: string): void {
        recordActivity(this.id, eventType, detail);
    }

    /**
     * Update the bridge's status and notify listeners.
     * Automatically fires `mossy-bridge-status-changed` on window and calls
     * `reportActivity` for lifecycle transitions (connected / disconnected / error).
     */
    protected setStatus(status: BridgeStatus, detail?: string): void {
        this._status = status;
        this._statusDetail = detail;

        window.dispatchEvent(
            new CustomEvent('mossy-bridge-status-changed', {
                detail: { id: this.id, name: this.name, status, statusDetail: detail },
            }),
        );

        if (status === 'connected') {
            this.reportActivity('session-started', detail);
        } else if (status === 'disconnected') {
            this.reportActivity('session-ended');
        } else if (status === 'error') {
            this.reportActivity('error', detail);
        }
    }
}
