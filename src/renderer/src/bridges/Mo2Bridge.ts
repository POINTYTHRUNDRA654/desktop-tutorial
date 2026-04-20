/**
 * Mo2Bridge.ts
 *
 * Mod Organizer 2 Bridge — stub implementation ready for wiring up.
 *
 * When fully implemented this bridge will:
 *   - Detect when MO2 is running (process list or IPC)
 *   - Track the active profile name
 *   - Report when the user enables/disables mods
 *   - Report when the user runs a sort (LOOT)
 *   - Report MO2-launched tool sessions (xEdit, CK, etc.)
 *
 * MO2 integration points to implement:
 *   - Process detection:  window.electron.api.invoke('tool-integration:detect-mo2')
 *   - MO2 IPC API:        MO2 exposes a local HTTP API at 127.0.0.1:port when running
 *   - Log watching:       %APPDATA%\ModOrganizer\<instance>\logs\mo_interface.log
 *   - Profile file:       <instance>\profiles\<active>\modlist.txt
 */

import { MossyBridge } from './BridgeBase';

export class Mo2Bridge extends MossyBridge {
    readonly id          = 'mo2-bridge';
    readonly name        = 'Mod Organizer 2 Bridge';
    readonly description = 'Monitors MO2 profile state, mod list changes, and tool launches';

    private pollTimer: ReturnType<typeof setInterval> | null = null;

    async connect(): Promise<void> {
        this.setStatus('connecting', 'Detecting MO2 instance...');

        try {
            // TODO: Replace with real MO2 detection.
            //   const api = window.electron?.api;
            //   const result = await api?.invoke('tool-integration:detect-mo2');
            //   if (!result?.found) throw new Error('MO2 not running');
            //   this._version = result.version;

            this.setStatus('connected', 'Ready — awaiting MO2 activity');
            this.startPolling();
        } catch (err) {
            this.setStatus('error', (err as Error).message);
        }
    }

    disconnect(): void {
        this.stopPolling();
        this.setStatus('disconnected');
    }

    // ── Polling ─────────────────────────────────────────────────────────────

    private startPolling(): void {
        if (this.pollTimer) return;
        this.pollTimer = setInterval(() => { void this.poll(); }, 5000);
    }

    private stopPolling(): void {
        if (this.pollTimer !== null) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    private async poll(): Promise<void> {
        // TODO: Query MO2 state on each tick.
        //
        // Examples of what to report:
        //   const profile = await detectActiveProfile();
        //   this.reportActivity('profile-active', profile);
        //
        //   const modCount = await countEnabledMods();
        //   this.reportActivity('mods-enabled', `${modCount} mods active`);
        //
        //   if (await detectSortRunning()) {
        //     this.reportActivity('sort-started', 'LOOT sort in progress');
        //   }
    }
}
