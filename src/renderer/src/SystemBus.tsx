import React, { useEffect, useRef } from 'react';

const SystemBus: React.FC = () => {
    // We use a ref to prevent overlapping polls if one takes too long
    const isPolling = useRef(false);
    const hasLoggedInfo = useRef(false);

    useEffect(() => {
        // Inform user once about bridge status on first load
        if (!hasLoggedInfo.current) {
            hasLoggedInfo.current = true;
            const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
            if (!bridgeActive) {
                console.info(
                    '%c🔌 Desktop Bridge Offline',
                    'color: #3b82f6; font-weight: bold; font-size: 12px;',
                    '\n\nThe Desktop Bridge (optional) connects Mossy to Blender and local files.',
                    '\nTo enable: Go to Desktop Bridge in the sidebar and follow setup instructions.',
                    '\n\nMossy works perfectly without it - all core features are available!\n'
                );
            }
        }

        const handleLog = (source: string, event: string, status: 'ok' | 'warn' | 'err' | 'success') => {
            const newLog = {
                id: Date.now().toString() + Math.random(),
                timestamp: new Date().toLocaleTimeString(),
                source,
                event,
                status
            };
            
            try {
                let existing: any[] = [];
                try {
                    existing = JSON.parse(localStorage.getItem('mossy_bridge_logs') || '[]');
                } catch (parseErr) {
                    console.warn('[SystemBus] Clearing corrupted mossy_bridge_logs:', parseErr);
                    existing = [];
                }
                const updated = [...existing.slice(-49), newLog]; // Keep last 50
                localStorage.setItem('mossy_bridge_logs', JSON.stringify(updated));
                // Dispatch storage event for other tabs/components
                window.dispatchEvent(new Event('storage'));
            } catch (e) {
                console.error(e);
            }
        };

        const handleBlenderCmd = (e: CustomEvent) => {
            handleLog('Blender', `Remote CMD Sent: ${e.detail.description}`, 'ok');
        };

        const handleShortcut = (e: CustomEvent) => {
            handleLog('Blender', `Keystroke Sent: [ ${e.detail.keys} ] - ${e.detail.description}`, 'ok');
        };

        // Standard Control Event Handler
        const handleControl = (e: CustomEvent) => {
            if (e.detail.action === 'execute_script') {
                handleLog('System', `Executed internal script: ${e.detail.payload}`, 'ok');
            }
        };

        window.addEventListener('mossy-blender-command', handleBlenderCmd as EventListener);
        window.addEventListener('mossy-blender-shortcut', handleShortcut as EventListener);
        window.addEventListener('mossy-control', handleControl as EventListener);

        // --- GLOBAL BRIDGE HEARTBEAT ---
        // Polls the local python server every 5 seconds to check if it's alive.
        // Reduced frequency to minimize console noise when bridge is offline.
        const heartbeat = setInterval(async () => {
            if (isPolling.current) return;
            isPolling.current = true;

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

                // Helper: true when the error is an OS-level network suspension
                // (sleep/wake, background throttle). Not a real bridge failure.
                const isNetworkSuspended = (e: any): boolean => {
                    const msg: string = e?.message || '';
                    return msg.includes('NETWORK_IO_SUSPENDED') ||
                           msg.includes('net::ERR_NETWORK_IO_SUSPENDED') ||
                           msg.includes('NetworkError');
                };

                // Try IP first, then localhost if it fails for a non-suspension reason
                let response;
                try {
                    response = await fetch('http://127.0.0.1:21337/health', {
                        signal: controller.signal,
                        method: 'GET',
                        mode: 'cors'
                    });
                } catch (e) {
                    // Don't try the fallback if the network stack is suspended —
                    // localhost will fail identically and generate a second DevTools error.
                    if (isNetworkSuspended(e)) throw e;
                    // Fallback to localhost for IPv6/DNS resolution differences
                    response = await fetch('http://localhost:21337/health', {
                        signal: controller.signal,
                        method: 'GET',
                        mode: 'cors'
                    });
                }

                clearTimeout(timeoutId);

                if (response && response.ok) {
                    const data = await response.json();
                    if (data.status === 'online') {
                        // Bridge is UP
                        const wasDown = localStorage.getItem('mossy_bridge_active') !== 'true';
                        localStorage.setItem('mossy_bridge_active', 'true');

                        // VERSION CHECK
                        if (data.version) {
                            localStorage.setItem('mossy_bridge_version', data.version);
                        } else {
                            localStorage.setItem('mossy_bridge_version', '1.0'); // Fallback for ancient versions
                        }

                        if (wasDown) {
                            window.dispatchEvent(new Event('mossy-bridge-connected'));
                            window.dispatchEvent(new Event('storage')); // Force UI updates
                        }
                    }
                } else {
                    throw new Error("Bridge responded with error");
                }
            } catch (e: any) {
                // Silently handle connection failures — expected when bridge isn't running.
                // Do NOT mark the bridge as down for transient OS conditions:
                //   AbortError       = our own 2s timeout, not a real failure
                //   NETWORK_IO_SUSPENDED = OS sleep/wake or Electron background throttle
                const transient = e.name === 'AbortError' ||
                    (e?.message || '').includes('NETWORK_IO_SUSPENDED') ||
                    (e?.message || '').includes('NetworkError');
                if (!transient) {
                    const wasUp = localStorage.getItem('mossy_bridge_active') === 'true';
                    localStorage.setItem('mossy_bridge_active', 'false');
                    if (wasUp) {
                        window.dispatchEvent(new Event('storage')); // Force UI updates
                    }
                }
            } finally {
                isPolling.current = false;
            }
        }, 5000); // Check every 5 seconds instead of 2

        return () => {
            clearInterval(heartbeat);
            window.removeEventListener('mossy-blender-command', handleBlenderCmd as EventListener);
            window.removeEventListener('mossy-blender-shortcut', handleShortcut as EventListener);
            window.removeEventListener('mossy-control', handleControl as EventListener);
        };
    }, []);

    return null;
};

export default SystemBus;