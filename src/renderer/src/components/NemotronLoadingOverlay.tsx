/**
 * NemotronLoadingOverlay Component
 * Displays while Nemotron service is connecting
 * Automatically hides when service is ready
 */

import React, { useState, useEffect } from 'react';
import useNemotronConnection from '../hooks/useNemotronConnection';
import './NemotronLoadingOverlay.css';

interface NemotronLoadingOverlayProps {
    /** Show overlay even when connected (for persistent status) */
    persistent?: boolean;
    /** Callback when connection succeeds */
    onConnected?: () => void;
    /** Callback when connection fails */
    onError?: (error: string) => void;
    /** Timeout in milliseconds */
    timeout?: number;
}

const NemotronLoadingOverlay: React.FC<NemotronLoadingOverlayProps> = ({
    persistent = false,
    onConnected,
    onError,
    timeout = 120000,
}) => {
    const nemotron = useNemotronConnection();
    const [showOverlay, setShowOverlay] = useState(true);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Monitor connection status and hide overlay when ready
    useEffect(() => {
        if (nemotron.isLoading) {
            return; // Still initializing
        }

        if (nemotron.isReady) {
            onConnected?.();
            if (!persistent) {
                // Hide after brief delay to show "Ready" message
                const timer = setTimeout(() => {
                    setShowOverlay(false);
                }, 1000);
                return () => clearTimeout(timer);
            }
        } else if (nemotron.errorMessage) {
            onError?.(nemotron.errorMessage);
        }
    }, [nemotron.isReady, nemotron.isLoading, nemotron.errorMessage, persistent, onConnected, onError]);

    // Monitor timeout
    useEffect(() => {
        if (nemotron.isLoading || nemotron.isReady) {
            return;
        }

        const timer = setInterval(() => {
            setElapsedTime(t => t + 1000);
        }, 1000);

        if (elapsedTime > timeout) {
            onError?.('Connection timeout');
        }

        return () => clearInterval(timer);
    }, [nemotron.isLoading, nemotron.isReady, timeout, elapsedTime, onError]);

    const timeoutSeconds = Math.ceil((timeout - elapsedTime) / 1000);
    const showTimeoutWarning = timeoutSeconds < 30 && !nemotron.isReady;

    if (!showOverlay && !persistent) {
        return null;
    }

    return (
        <div className={`nemotron-overlay ${showOverlay ? 'visible' : 'fade-out'}`}>
            <div className="nemotron-content">
                {nemotron.isLoading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <h2>Initializing Mossy AI</h2>
                        <p className="status-text">Starting Nemotron service...</p>
                    </div>
                ) : nemotron.isConnecting ? (
                    <div className="connecting-state">
                        <div className="spinner"></div>
                        <h2>Connecting to Nemotron</h2>
                        <p className="status-text">
                            {nemotron.modelStatus === 'loading'
                                ? 'Loading AI model (~10 minutes on first launch)'
                                : 'Establishing connection...'}
                        </p>
                        {showTimeoutWarning && (
                            <p className="warning-text">⏱️ {timeoutSeconds}s remaining</p>
                        )}
                    </div>
                ) : nemotron.isReady ? (
                    <div className="ready-state">
                        <div className="checkmark">✓</div>
                        <h2>Nemotron Ready</h2>
                        <p className="status-text">AI capabilities loaded and available</p>
                    </div>
                ) : (
                    <div className="error-state">
                        <div className="error-icon">⚠️</div>
                        <h2>Nemotron Unavailable</h2>
                        <p className="status-text">{nemotron.errorMessage || 'Failed to connect'}</p>
                        <button
                            className="retry-btn"
                            onClick={() => {
                                setShowOverlay(true);
                                nemotron.reconnect();
                            }}
                        >
                            Retry Connection
                        </button>
                    </div>
                )}

                {/* Debug info (development only) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="debug-info">
                        <small>
                            Status: {nemotron.isReady ? '✓ Ready' : nemotron.isConnecting ? '⏳ Connecting' : '✗ Error'}
                            {nemotron.serviceHealthy !== undefined && ` | Service: ${nemotron.serviceHealthy ? '✓ Healthy' : '✗ Unhealthy'}`}
                        </small>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NemotronLoadingOverlay;

/**
 * Hook to manage overlay visibility state
 */
export function useNemotronLoadingOverlay() {
    const nemotron = useNemotronConnection();
    return {
        showOverlay: !nemotron.isReady,
        nemotron,
    };
}
