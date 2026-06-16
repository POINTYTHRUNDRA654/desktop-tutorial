/**
 * VaultTecCreativeDirectorBridge.ts
 *
 * Reports the real status of Mossy's in-process Creative Director team
 * (Creative Director + Quest/Dialogue/World specialists). There is no
 * external server - the team runs entirely inside this app's main process,
 * using Groq cloud if configured or the local KoboldCpp fallback otherwise.
 * This bridge just polls that real state via IPC so it shows up in the
 * Desktop Bridge "Bridges" tab like any other monitored system.
 */

import { MossyBridge } from './BridgeBase';

export class VaultTecCreativeDirectorBridge extends MossyBridge {
    readonly id          = 'vaulttec-creative-director';
    readonly name        = 'Vault-Tec Creative Director';
    readonly description = 'In-house AI team that collaborates on FO4 mod/tool ideas and hands finished work to you';

    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private _enabled = false;
    private _detailText = 'Idle';

    async connect(): Promise<void> {
        this.setStatus('connecting', 'Checking Creative Director team status...');
        try { await this._poll(); } catch { /* non-fatal */ }
        this._startPolling();
    }

    disconnect(): void {
        this._stopPolling();
        this.setStatus('disconnected');
    }

    private _startPolling(): void {
        if (this.pollTimer) return;
        this.pollTimer = setInterval(() => { void this._poll(); }, 8_000);
    }

    private _stopPolling(): void {
        if (this.pollTimer !== null) { clearInterval(this.pollTimer); this.pollTimer = null; }
    }

    private async _poll(): Promise<void> {
        const api = (window as any).electronAPI ?? (window as any).electron?.api;
        try {
            const res = await api?.creativeDirectorTeam?.getState?.();
            const wasEnabled = this._enabled;
            this._enabled = Boolean(res?.enabled);
            if (this._enabled) {
                const proj = res?.currentProject;
                this._detailText = proj ? `Working on: ${proj.title} (turn ${proj.turns?.length ?? 0})` : 'Enabled - starting a new project shortly';
            } else {
                this._detailText = 'Disabled - enable the team from the Creative Director panel';
            }
            if (wasEnabled !== this._enabled) {
                this.reportActivity(this._enabled ? 'creative-director-online' : 'creative-director-offline', this._detailText);
            }
            this.setStatus(this._enabled ? 'connected' : 'disconnected', this._detailText);
        } catch {
            this.setStatus('error', 'Could not reach Creative Director team state');
        }
    }
}
