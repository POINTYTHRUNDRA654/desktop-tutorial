import { MossyBridge } from './BridgeBase';

export interface HttpPluginBridgeConfig {
    id?: string;
    name?: string;
    description?: string;
    healthUrl: string;
    pollIntervalMs?: number;
}

export class HttpPluginBridge extends MossyBridge {
    readonly id: string;
    readonly name: string;
    readonly description: string;

    private readonly healthUrl: string;
    private readonly pollIntervalMs: number;
    private pollTimer: number | null = null;

    constructor(
        pluginId: string,
        pluginName: string,
        pluginVersion: string | undefined,
        config: HttpPluginBridgeConfig,
    ) {
        super();
        this.id = config.id || `${pluginId}-bridge`;
        this.name = config.name || `${pluginName} Bridge`;
        this.description = config.description || `Monitors ${pluginName}`;
        this.healthUrl = config.healthUrl;
        this.pollIntervalMs = Math.max(2000, config.pollIntervalMs ?? 5000);
        this._version = pluginVersion;
    }

    async connect(): Promise<void> {
        this.setStatus('connecting', 'Probing plugin bridge...');
        const ok = await this.probe();
        if (!ok) return;
        this.startPolling();
    }

    disconnect(): void {
        this.stopPolling();
        this.setStatus('disconnected');
    }

    private startPolling(): void {
        if (this.pollTimer !== null) return;
        this.pollTimer = window.setInterval(() => {
            void this.probe();
        }, this.pollIntervalMs);
    }

    private stopPolling(): void {
        if (this.pollTimer === null) return;
        window.clearInterval(this.pollTimer);
        this.pollTimer = null;
    }

    private async probe(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), 3000);
            const response = await fetch(this.healthUrl, {
                method: 'GET',
                signal: controller.signal,
            });
            window.clearTimeout(timeout);

            if (!response.ok) {
                this.setStatus('error', `Health check failed (${response.status})`);
                return false;
            }

            let detail = 'Bridge online';
            try {
                const payload = await response.json();
                const statusText = typeof payload?.status === 'string' ? payload.status : undefined;
                const messageText = typeof payload?.message === 'string' ? payload.message : undefined;
                const versionText = typeof payload?.version === 'string' ? payload.version : undefined;
                if (versionText) this._version = versionText;
                detail = messageText || statusText || detail;
            } catch {
                // JSON payload is optional for bridge health endpoints.
            }

            this.setStatus('connected', detail);
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.setStatus('error', message);
            return false;
        }
    }
}
