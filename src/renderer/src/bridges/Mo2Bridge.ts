/**
 * Mo2Bridge.ts
 *
 * Mod Organizer 2 Bridge — real detection against the same MO2 install the
 * user configured for MO2Extension.tsx (Settings → mo2Path, or auto-detected
 * via detectPrograms()). Reads the actual ModOrganizer.ini / modlist.txt on
 * disk and checks the live process list rather than assuming success.
 */

import { MossyBridge } from './BridgeBase';

function decodeFileResult(result: any): string | null {
    if (typeof result === 'string') return result;
    if (result?.success && typeof result?.data === 'string') {
        try {
            const bytes = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0));
            return new TextDecoder().decode(bytes);
        } catch { return null; }
    }
    return null;
}

function parseIniValue(text: string, key: string): string | null {
    const m = text.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, 'mi'));
    return m ? m[1].trim() : null;
}

export class Mo2Bridge extends MossyBridge {
    readonly id          = 'mo2-bridge';
    readonly name        = 'Mod Organizer 2 Bridge';
    readonly description = 'Monitors MO2 profile state, mod list changes, and tool launches';

    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private mo2Path: string | null = null;
    private lastProfile: string | null = null;
    private lastRunning: boolean | null = null;

    private bridge(): any {
        return (window as any).electron?.api || (window as any).electronAPI;
    }

    private async resolveMo2Path(): Promise<string | null> {
        const api = this.bridge();
        try {
            const settings = await api?.getSettings?.().catch(() => null);
            if (settings?.mo2Path && typeof settings.mo2Path === 'string') return settings.mo2Path;
        } catch { /* fall through to auto-detect */ }
        try {
            const detected = await api?.detectPrograms?.();
            const list: any[] = Array.isArray(detected) ? detected : (detected?.data ?? []);
            const found = list.find((p) => {
                const name = (p?.displayName || p?.name || '').toLowerCase();
                return name.includes('mod organizer');
            });
            if (found?.path) return found.path;
        } catch { /* no auto-detect available */ }
        return null;
    }

    private async isMo2Running(): Promise<boolean> {
        const api = this.bridge();
        try {
            const result = await api?.getRunningProcesses?.();
            const list: any[] = Array.isArray(result) ? result : (result?.data ?? []);
            return list.some((p) => String(p?.name || p?.processName || '').toLowerCase().includes('modorganizer'));
        } catch {
            return false;
        }
    }

    private async readActiveProfile(mo2Path: string): Promise<string | null> {
        const api = this.bridge();
        try {
            const iniText = decodeFileResult(await api?.readFile?.(`${mo2Path}\\ModOrganizer.ini`));
            if (!iniText) return null;
            return parseIniValue(iniText, 'selected_profile');
        } catch {
            return null;
        }
    }

    async connect(): Promise<void> {
        this.setStatus('connecting', 'Detecting MO2 instance...');

        try {
            const mo2Path = await this.resolveMo2Path();
            if (!mo2Path) {
                this.setStatus('error', 'MO2 not found — configure its install path in Settings or install to a detectable location.');
                return;
            }
            this.mo2Path = mo2Path;

            const [running, profile] = await Promise.all([
                this.isMo2Running(),
                this.readActiveProfile(mo2Path),
            ]);
            this.lastRunning = running;
            this.lastProfile = profile;

            const detail = profile
                ? `${running ? 'Running' : 'Installed (not running)'} — profile: ${profile}`
                : (running ? 'Running' : 'Installed (not currently running)');
            this.setStatus('connected', detail);
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
        if (!this.mo2Path) return;

        let changed = false;
        const running = await this.isMo2Running();
        if (running !== this.lastRunning) {
            this.lastRunning = running;
            this.reportActivity(running ? 'mo2-started' : 'mo2-stopped');
            changed = true;
        }

        const profile = await this.readActiveProfile(this.mo2Path);
        if (profile && profile !== this.lastProfile) {
            this.lastProfile = profile;
            this.reportActivity('profile-active', profile);
            changed = true;
        }

        if (changed) {
            const detail = this.lastProfile
                ? `${this.lastRunning ? 'Running' : 'Installed (not running)'} — profile: ${this.lastProfile}`
                : (this.lastRunning ? 'Running' : 'Installed (not currently running)');
            this.setStatus('connected', detail);
        }
    }
}
