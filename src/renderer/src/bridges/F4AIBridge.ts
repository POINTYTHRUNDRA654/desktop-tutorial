/**
 * F4AIBridge.ts
 *
 * Fallout 4 Advanced AI Bridge — monitors the F4AI addon's services and
 * reports NPC AI activity back into Mossy's context.
 *
 * Services tracked:
 *   - Mossy F4AI Bridge   http://127.0.0.1:8765   (Electron HTTP server)
 *   - KoboldCPP           http://127.0.0.1:5001   (local inference runtime)
 *   - F4AI Python Bridge  http://127.0.0.1:28485  (in-game NPC dialogue server)
 *
 * Integration point:
 *   Status is probed via api.f4aiBridgeStatus() IPC (main process probes ports
 *   and returns a composite result including the detected F4AI addon path).
 */

import { MossyBridge } from './BridgeBase';

export class F4AIBridge extends MossyBridge {
    readonly id          = 'f4ai-bridge';
    readonly name        = 'Fallout 4 Advanced AI Bridge';
    readonly description = 'Monitors KoboldCPP, Python bridge, and the Mossy F4AI bridge for the FO4 Advanced AI addon';

    private pollTimer: ReturnType<typeof setInterval> | null = null;

    private _koboldUp   = false;
    private _pyBridgeUp = false;
    private _mossyUp    = false;
    private _f4aiPath: string | null = null;

    async connect(): Promise<void> {
        this.setStatus('connecting', 'Probing F4AI services...');
        try {
            await this._probe();
        } catch {
            // Probe errors are non-fatal — treat as all-offline
        }
        const { status, detail } = this._pipelineStatus();
        this.setStatus(status, detail);
        this._startPolling(); // always poll so we recover automatically when services come up
    }

    disconnect(): void {
        this._stopPolling();
        this.setStatus('disconnected');
    }

    // ── Polling ──────────────────────────────────────────────────────────────

    private _startPolling(): void {
        if (this.pollTimer) return;
        this.pollTimer = setInterval(() => { void this._poll(); }, 5_000);
    }

    private _stopPolling(): void {
        if (this.pollTimer !== null) { clearInterval(this.pollTimer); this.pollTimer = null; }
    }

    private async _poll(): Promise<void> {
        const prevKobold   = this._koboldUp;
        const prevPyBridge = this._pyBridgeUp;
        const prevMossy    = this._mossyUp;

        try { await this._probe(); } catch { /* treat as all-offline */ }

        if (this._koboldUp !== prevKobold) {
            this.reportActivity(
                this._koboldUp ? 'koboldcpp-online' : 'koboldcpp-offline',
                this._koboldUp
                    ? 'KoboldCPP inference server online (port 5001)'
                    : 'KoboldCPP went offline',
            );
        }
        if (this._pyBridgeUp !== prevPyBridge) {
            this.reportActivity(
                this._pyBridgeUp ? 'python-bridge-online' : 'python-bridge-offline',
                this._pyBridgeUp
                    ? 'F4AI Python bridge active (port 28485) — NPC dialogue ready'
                    : 'F4AI Python bridge went offline',
            );
        }
        if (this._mossyUp !== prevMossy) {
            this.reportActivity(
                this._mossyUp ? 'mossy-bridge-online' : 'mossy-bridge-offline',
                this._mossyUp
                    ? 'Mossy F4AI bridge active (port 8765)'
                    : 'Mossy F4AI bridge went offline',
            );
        }

        const { status, detail } = this._pipelineStatus();
        this.setStatus(status, detail);
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    private async _probe(): Promise<void> {
        const api = (window as any).electronAPI as any;
        try {
            const s = await api?.f4aiBridgeStatus?.();
            this._mossyUp   = s?.mossy_bridge?.running  ?? false;
            this._koboldUp  = s?.koboldcpp?.running      ?? false;
            this._pyBridgeUp = s?.python_bridge?.running ?? false;
            this._f4aiPath  = s?.f4ai_base ?? null;
        } catch {
            this._mossyUp = this._koboldUp = this._pyBridgeUp = false;
        }
    }

    /**
     * Derives a granular pipeline status.
     *
     * The Mossy relay (port 8765) is always up — it's our own Electron server.
     * Real "connected" means the in-game inference pipeline is active:
     *   KoboldCPP (5001) + Python bridge (28485) both reachable.
     *
     * Partial states get 'connecting' with a descriptive hint so the user
     * knows exactly what to start next.
     */
    private _pipelineStatus(): { status: 'connected' | 'connecting' | 'error'; detail: string } {
        const pathSuffix = this._f4aiPath ? ` · ${this._f4aiPath}` : '';

        if (this._koboldUp && this._pyBridgeUp) {
            const parts = ['KoboldCPP:5001', 'PythonBridge:28485'];
            if (this._mossyUp) parts.unshift('Bridge:8765');
            return { status: 'connected', detail: parts.join(' · ') + ' active' + pathSuffix };
        }

        if (this._koboldUp && !this._pyBridgeUp) {
            return { status: 'connecting', detail: 'KoboldCPP online — launch FO4 to activate Python bridge' };
        }

        if (!this._koboldUp && this._pyBridgeUp) {
            return { status: 'connecting', detail: 'Python bridge active — KoboldCPP offline (start it in KoboldSetup)' };
        }

        if (this._mossyUp) {
            return { status: 'connecting', detail: 'Mossy relay ready — start KoboldCPP then launch FO4' };
        }

        return { status: 'connecting', detail: 'Ready — awaiting F4AI services' };
    }
}
