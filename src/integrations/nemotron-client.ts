/**
 * Nemotron Integration Module for Mossy
 * Handles communication with local/remote NeMo service
 */

interface NemotronConfig {
    host: string;
    port: number;
    timeout: number;
    enabled: boolean;
}

interface GenerationRequest {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
}

interface GenerationResponse {
    prompt: string;
    response: string;
    tokens: number;
    latency: number;
}

class NemotronClient {
    private config: NemotronConfig;
    private baseUrl: string;
    private isHealthy: boolean = false;
    private lastHealthCheck: number = 0;
    private healthCheckInterval: number = 30000; // 30 seconds

    constructor(config: Partial<NemotronConfig> = {}) {
        this.config = {
            host: config.host || 'localhost',
            port: config.port || 5000,
            timeout: config.timeout || 30000,
            enabled: config.enabled !== false,
        };
        this.baseUrl = `http://${this.config.host}:${this.config.port}`;
        this.startHealthCheck();
    }

    private startHealthCheck(): void {
        setInterval(() => {
            this.checkHealth().catch(err => {
                console.warn('Nemotron health check failed:', err.message);
                this.isHealthy = false;
            });
        }, this.healthCheckInterval);

        // Initial check
        this.checkHealth().catch(err => {
            console.warn('Initial Nemotron health check failed:', err.message);
        });
    }

    async checkHealth(): Promise<boolean> {
        if (!this.config.enabled) return false;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                this.isHealthy = true;
                this.lastHealthCheck = Date.now();
                return true;
            }
        } catch (error) {
            // Service unavailable or timeout
        }

        this.isHealthy = false;
        return false;
    }

    async generate(request: GenerationRequest): Promise<GenerationResponse> {
        if (!this.config.enabled) {
            throw new Error('Nemotron service is disabled');
        }

        if (!this.isHealthy) {
            const healthy = await this.checkHealth();
            if (!healthy) {
                throw new Error('Nemotron service is not available');
            }
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

            const startTime = Date.now();

            const response = await fetch(`${this.baseUrl}/nemotron`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: request.prompt,
                    max_tokens: request.maxTokens || 100,
                    temperature: request.temperature || 0.7,
                    top_p: request.topP || 0.9,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const latency = Date.now() - startTime;

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Generation failed');
            }

            const data = await response.json();

            return {
                prompt: data.prompt,
                response: data.response,
                tokens: data.tokens,
                latency,
            };
        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new Error('Nemotron request timed out');
                }
                throw error;
            }
            throw new Error('Unknown error communicating with Nemotron');
        }
    }

    isAvailable(): boolean {
        return this.config.enabled && this.isHealthy;
    }

    setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
        if (enabled) {
            this.checkHealth().catch(() => {
                console.warn('Nemotron check after enable failed');
            });
        }
    }

    getStatus(): {
        enabled: boolean;
        healthy: boolean;
        lastCheck: number;
        baseUrl: string;
    } {
        return {
            enabled: this.config.enabled,
            healthy: this.isHealthy,
            lastCheck: this.lastHealthCheck,
            baseUrl: this.baseUrl,
        };
    }
}

export default NemotronClient;
export type { NemotronConfig, GenerationRequest, GenerationResponse };
