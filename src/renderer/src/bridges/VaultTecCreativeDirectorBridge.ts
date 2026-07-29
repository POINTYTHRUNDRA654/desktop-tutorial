/**
 * VaultTecCreativeDirectorBridge.ts
 *
 * Monitors the Vault-Tec Creative Director — the autonomous AI mod-building
 * team running inside the Electron main process.  Status is polled via the
 * `creative-director:get-state` IPC handler and surfaced in Mossy's bridge
 * panel so the user can see whether the team is active, idle, or working on
 * a project.
 */

import { MossyBridge } from './BridgeBase';

export class VaultTecCreativeDirectorBridge extends MossyBridge {
    readonly id          = 'vaulttec-creative-director';
    readonly name        = 'Vault-Tec Creative Director';
    readonly description = 'Autonomous AI mod-building team — story, assets, and scripting';

    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private _enabled    = false;
    private _inFlight   = false;
    private _projectTitle: string | null = null;

    async connect(): Promise<void> {
        this.setStatus('connecting', 'Reading Creative Director state...');
        try { await this._probe(); } catch { /* non-fatal */ }
        this.setStatus(this._statusLevel(), this._detail());
        this._startPolling();
    }

    disconnect(): void {
        this._stopPolling();
        this.setStatus('disconnected');
    }

    // ── Polling ──────────────────────────────────────────────────────────────

    private _startPolling(): void {
        if (this.pollTimer) return;
        this.pollTimer = setInterval(() => { void this._poll(); }, 10_000);
    }

    private _stopPolling(): void {
        if (this.pollTimer !== null) { clearInterval(this.pollTimer); this.pollTimer = null; }
    }

    private async _poll(): Promise<void> {
        const prevEnabled = this._enabled;
        const prevTitle   = this._projectTitle;

        try { await this._probe(); } catch { /* treat as offline */ }

        if (this._enabled !== prevEnabled || this._projectTitle !== prevTitle) {
            this.reportActivity(
                this._enabled ? 'creative-director-active' : 'creative-director-idle',
                this._enabled
                    ? (this._projectTitle
                        ? `Working on: ${this._projectTitle}`
                        : 'Creative Director enabled — awaiting project')
                    : 'Creative Director disabled',
            );
        }

        this.setStatus(this._statusLevel(), this._detail());
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    private async _probe(): Promise<void> {
        const api = (window as any).electron?.api as any;
        try {
            const state = await api?.creativeDirectorTeam?.getState?.();
            this._enabled    = state?.enabled   ?? false;
            this._inFlight   = state?.tickInFlight ?? false;
            this._projectTitle = state?.currentProject?.title ?? null;
        } catch {
            this._enabled  = false;
            this._inFlight = false;
            this._projectTitle = null;
        }
    }

    private _statusLevel(): 'connected' | 'connecting' {
        return this._enabled ? 'connected' : 'connecting';
    }

    private _detail(): string {
        if (!this._enabled) return 'Disabled — enable in Creative Director panel';
        if (this._inFlight)  return this._projectTitle ? `Running: ${this._projectTitle}` : 'Tick in progress...';
        if (this._projectTitle) return `Active project: ${this._projectTitle}`;
        return 'Enabled — awaiting project';
    }
}
