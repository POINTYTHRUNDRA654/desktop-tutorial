/**
 * VaultTecOverseerBridge.ts
 *
 * Monitors the Vault-Tec Companion/Overseer server (port 8080).
 * This is the Vault-Tec modding assistant companion service integrated into
 * Mossy's server stack - providing 3D asset tools, mesh validation, and
 * Blender integration for the Vault-Tec modding suite.
 */

import { MossyBridge } from './BridgeBase';

export class VaultTecOverseerBridge extends MossyBridge {
    readonly id          = 'vaulttec-overseer';
    readonly name        = 'Vault-Tec Modding Companion';
    readonly description = '3D asset creation, mesh validation, and Blender integration server (port 8080)';

    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private _up = false;
    private _appVersion: string | null = null;

    async connect(): Promise<void> {
        this.setStatus('connecting', 'Probing Vault-Tec companion on port 8080...');
        try { await this._probe(); } catch { /* non-fatal */ }
        this.setStatus(this._up ? 'connected' : 'connecting', this._detail());
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
        const prev = this._up;
        try { await this._probe(); } catch { this._up = false; }
        if (this._up !== prev) {
            this.reportActivity(
                this._up ? 'overseer-online' : 'overseer-offline',
                this._up ? 'Vault-Tec companion server online (port 8080)' : 'Companion server went offline',
            );
        }
        this.setStatus(this._up ? 'connected' : 'connecting', this._detail());
    }

    private async _probe(): Promise<void> {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 2500);
        try {
            const res = await fetch('http://127.0.0.1:8080/status', { signal: controller.signal });
            clearTimeout(tid);
            if (res.ok) {
                this._up = true;
                try {
                    const json = await res.json();
                    if (json?.version) this._appVersion = String(json.version);
                } catch { /* ignore parse errors */ }
            } else {
                this._up = false;
            }
        } catch {
            clearTimeout(tid);
            this._up = false;
        }
    }

    private _detail(): string {
        if (!this._up) return 'Offline - companion server not running';
        return this._appVersion
            ? ('Online v' + this._appVersion + ' - Blender bridge active')
            : 'Online - 3D asset tools ready';
    }
}
