/**
 * useNemotronConnection Hook
 * Automatically connects to Nemotron on app load
 * Provides real-time status updates to React components
 */

import { useEffect, useState, useCallback } from 'react';

export interface NemotronConnectionStatus {
    isConnected: boolean;
    isConnecting: boolean;
    lastConnectAttempt: Date | null;
    errorMessage?: string;
    modelStatus?: 'loading' | 'ready' | 'error';
    serviceHealthy?: boolean;
}

const useNemotronConnection = () => {
    const [status, setStatus] = useState<NemotronConnectionStatus>({
        isConnected: false,
        isConnecting: false,
        lastConnectAttempt: null,
    });
    const [isLoading, setIsLoading] = useState(true);

    // Listen for connection status updates from IPC
    useEffect(() => {
        if (!window.electron?.api) {
            console.warn('Electron API not available');
            setIsLoading(false);
            return;
        }

        // Get initial status
        window.electron.api
            .invoke('nemotron:get-status')
            .then((initialStatus: NemotronConnectionStatus) => {
                setStatus(initialStatus);
                setIsLoading(false);
            })
            .catch((error: Error) => {
                console.error('Failed to get initial Nemotron status:', error);
                setIsLoading(false);
            });

        // Listen for updates from main process
        const unsubscribe = window.electron?.api?.on(
            'nemotron:connection-status',
            (connectionStatus: NemotronConnectionStatus) => {
                setStatus(connectionStatus);
            }
        );

        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, []);

    // Method to manually reconnect
    const reconnect = useCallback(async () => {
        if (!window.electron?.api) return false;

        try {
            setStatus(prev => ({ ...prev, isConnecting: true }));
            const result = await window.electron.api.invoke('nemotron:reconnect');
            return result;
        } catch (error) {
            console.error('Reconnect failed:', error);
            return false;
        }
    }, []);

    // Method to wait for connection (blocks until ready)
    const waitForConnection = useCallback(async (timeoutMs = 60000) => {
        if (!window.electron?.api) return false;

        try {
            const result = await window.electron.api.invoke(
                'nemotron:wait-for-connection',
                timeoutMs
            );
            return result.connected;
        } catch (error) {
            console.error('Wait for connection failed:', error);
            return false;
        }
    }, []);

    // Method to get diagnostics
    const getDiagnostics = useCallback(async () => {
        if (!window.electron?.api) return null;

        try {
            return await window.electron.api.invoke('nemotron:get-diagnostics');
        } catch (error) {
            console.error('Get diagnostics failed:', error);
            return null;
        }
    }, []);

    return {
        status,
        isLoading,
        isConnected: status.isConnected,
        isConnecting: status.isConnecting,
        isReady: status.isConnected && !status.isConnecting,
        errorMessage: status.errorMessage,
        modelStatus: status.modelStatus,
        serviceHealthy: status.serviceHealthy,
        reconnect,
        waitForConnection,
        getDiagnostics,
    };
};

export default useNemotronConnection;

/**
 * Higher-order component wrapper for components that need Nemotron connection
 */
export function withNemotronConnection<P extends object>(
    Component: React.ComponentType<P & { nemotron: ReturnType<typeof useNemotronConnection> }>
) {
    return function NemotronConnectedComponent(props: P) {
        const nemotron = useNemotronConnection();
        return <Component {...props} nemotron={nemotron} />;
    };
}

/**
 * Component that displays connection status
 */
export function NemotronConnectionStatus() {
    const nemotron = useNemotronConnection();

    return (
        <div className="nemotron-status">
            {nemotron.isLoading ? (
                <div className="status-loading">Initializing Nemotron...</div>
            ) : nemotron.isConnected ? (
                <div className="status-connected">
                    <span className="status-indicator connected" />
                    {nemotron.modelStatus === 'loading' ? (
                        <span>Model loading...</span>
                    ) : nemotron.modelStatus === 'ready' ? (
                        <span>Nemotron ready</span>
                    ) : (
                        <span>Connected</span>
                    )}
                </div>
            ) : nemotron.isConnecting ? (
                <div className="status-connecting">
                    <span className="status-indicator connecting" />
                    Connecting to Nemotron...
                </div>
            ) : (
                <div className="status-disconnected">
                    <span className="status-indicator disconnected" />
                    {nemotron.errorMessage || 'Nemotron offline'}
                </div>
            )}
        </div>
    );
}

/**
 * Hook for components that must wait for Nemotron to be ready
 */
export function useNemotronReady(timeoutMs = 60000) {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const nemotron = useNemotronConnection();

    useEffect(() => {
        if (!nemotron.isLoading) {
            if (nemotron.isConnected && nemotron.modelStatus === 'ready') {
                setIsReady(true);
                setError(null);
            } else if (nemotron.isConnecting || nemotron.modelStatus === 'loading') {
                // Wait for connection
                nemotron.waitForConnection(timeoutMs).then(connected => {
                    if (connected) {
                        setIsReady(true);
                        setError(null);
                    } else {
                        setIsReady(false);
                        setError('Nemotron connection timeout');
                    }
                });
            } else {
                setIsReady(false);
                setError(nemotron.errorMessage || 'Nemotron not available');
            }
        }
    }, [nemotron.isLoading, nemotron.isConnected, nemotron.modelStatus, nemotron.errorMessage, nemotron, timeoutMs]);

    return { isReady, error };
}
