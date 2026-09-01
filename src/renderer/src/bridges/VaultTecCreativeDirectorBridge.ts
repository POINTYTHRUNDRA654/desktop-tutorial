/**
 * VaultTecCreativeDirectorBridge.ts
 *
 * Monitors the Vault-Tec Creative Director multi-agent system.
 * The Creative Director runs inside the Electron main process and is accessed
 * via IPC — this bridge polls its state and surfaces it in Mossy's Bridge tab.
 */

import { MossyBridge } from './BridgeBase';

export class VaultTecCreativeDirectorBridge extends MossyBridge {
    readonly id          = 'vaulttec-creative-director';
    readonly name        = 'Vault-Tec Creative Director';
    readonly description = 'AI multi-agent system for autonomous Fallout 4 mod concept, design, and asset creation';

    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private _enabled = false;
    private _hasActiveProject = false;
    private _pendingCount = 0;

    async connect(): Promise<void> {
        this.setStatus('connecting', 'Probing Creative Director state...');
        try { await this._probe(); } catch { /* non-fatal */ }
        this.setStatus(this._enabled ? 'connected' : 'connecting', this._detail());
        this._startPolling();
    }

    disconnect(): void {
        this._stopPolling();
        this.setStatus('disconnected');
    }

    private _startPolling(): void {
        if (this.pollTimer) return;
        this.pollTimer = setInterval(() => { void this._poll(); }, 10_000);
    }

    private _stopPolling(): void {
        if (this.pollTimer !== null) { clearInterval(this.pollTimer); this.pollTimer = null; }
    }

    private async _poll(): Promise<void> {
        const prevEnabled = this._enabled;
        const prevActive  = this._hasActiveProject;

        try { await this._probe(); } catch { /* treat as offline */ }

        if (this._enabled !== prevEnabled || this._hasActiveProject !== prevActive) {
            this.reportActivity(
                this._enabled ? 'creative-director-active' : 'creative-director-idle',
                this._detail(),
            );
        }

        this.setStatus(this._enabled ? 'connected' : 'connecting', this._detail());
    }

    private async _probe(): Promise<void> {
        const api = (window as any).electron?.api ?? (window as any).electronAPI;
        try {
            const result = await api?.creativeDirectorTeam?.getState?.();
            if (result?.success) {
                this._enabled          = result.enabled === true;
                this._hasActiveProject = result.currentProject != null;
                this._pendingCount     = Array.isArray(result.pendingQueue) ? result.pendingQueue.length : 0;
            }
        } catch {
            // IPC not yet available — stay in connecting state
        }
    }

    private _detail(): string {
        if (!this._enabled) return 'Disabled — enable in Vault-Tec Creative Director panel';
        if (this._hasActiveProject) {
            return this._pendingCount > 0
                ? `Active project in progress · ${this._pendingCount} queued`
                : 'Active project in progress';
        }
        return this._pendingCount > 0
            ? `Idle · ${this._pendingCount} project(s) queued`
            : 'Enabled — awaiting a project';
    }
}
