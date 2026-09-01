/**
 * panelActivity.ts
 *
 * Central activity store for Mossy's panel and bridge monitoring.
 *
 * Any source — in-app panels, the Desktop Bridge, the Blender Bridge, the
 * upcoming MO2 Bridge, or any future plugin — calls `recordActivity()` to
 * register what the user is doing.  The store is kept in localStorage so it
 * survives React re-renders and is accessible to the context builders that
 * feed Mossy's AI system prompt.
 *
 * DOM custom event:
 *   window.dispatchEvent(new CustomEvent('mossy-activity-event', { detail: ActivityEvent }))
 * This lets MossyObserver (and any other listener) react immediately without
 * polling localStorage.
 *
 * IPC channel for external bridges (Desktop, Blender, MO2, plugins):
 *   Main process sends:  mainWindow.webContents.send('bridge-activity', ActivityEvent)
 *   MossyObserver listens via  api.on('bridge-activity', handler)  and calls recordActivity().
 */

export type ActivitySource =
    | 'panel'            // in-app route panel
    | 'blender-bridge'   // Mossy Link / Blender add-on
    | 'desktop-bridge'   // Desktop Bridge (Windows Shell / file watcher drivers)
    | 'mo2-bridge'       // Mod Organizer 2 bridge (upcoming)
    | string;            // any future plugin — just pass a descriptive name

export interface ActivityEvent {
    /** Which bridge or panel produced this event. */
    source: ActivitySource;
    /** Route path for in-app panels (e.g. '/tools/auditor'), omit for bridges. */
    panel?: string;
    /** What happened (e.g. 'entered', 'file-loaded', 'tool-run', 'error', 'session-started'). */
    eventType: string;
    /** Human-readable detail Mossy can mention (e.g. 'mymod.esp', 'Compile Papyrus'). */
    detail?: string;
    /** Date.now() timestamp. */
    at: number;
}

const STORAGE_KEY = 'mossy_panel_activity';
const MAX_EVENTS = 25;

/**
 * Record a new activity event from any source.
 * Prepends to the circular buffer in localStorage and fires the DOM event.
 */
export function recordActivity(
    source: ActivitySource,
    eventType: string,
    detail?: string,
    panel?: string,
): void {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const events: ActivityEvent[] = raw ? JSON.parse(raw) : [];

        const event: ActivityEvent = {
            source,
            eventType,
            ...(detail !== undefined && { detail }),
            ...(panel !== undefined && { panel }),
            at: Date.now(),
        };

        events.unshift(event);
        if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(events));

        // Notify observers synchronously via DOM event (no polling needed).
        window.dispatchEvent(new CustomEvent('mossy-activity-event', { detail: event }));
    } catch {
        // localStorage may be unavailable in some environments — fail silently.
    }
}

/** Convenience wrapper for in-app panel navigation events. */
export function recordPanelEntry(panelPath: string): void {
    recordActivity('panel', 'entered', undefined, panelPath);
}

/**
 * Build a formatted context block for Mossy's AI system prompt.
 * Returns an empty string if there is no recorded activity.
 */
export function getPanelActivityContext(): string {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return '';
        const events: ActivityEvent[] = JSON.parse(raw);
        if (!events.length) return '';

        const lines = events.slice(0, 12).map((e) => {
            const ageSec = Math.round((Date.now() - e.at) / 1000);
            const ageStr =
                ageSec < 60 ? `${ageSec}s ago`
                : ageSec < 3600 ? `${Math.round(ageSec / 60)}m ago`
                : `${Math.round(ageSec / 3600)}h ago`;
            const loc = e.panel ? ` [${e.panel}]` : '';
            const det = e.detail ? `: ${e.detail}` : '';
            return `- [${e.source}${loc}] ${e.eventType}${det} (${ageStr})`;
        });

        return `\n**PANEL & BRIDGE ACTIVITY (Mossy is observing — most recent first):**\n${lines.join('\n')}\n(Use this to understand what the user is working on and provide proactive, context-aware help.)`;
    } catch {
        return '';
    }
}
