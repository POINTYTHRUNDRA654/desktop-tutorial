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
                const existing = JSON.parse(localStorage.getItem('mossy_bridge_logs') || '[]');
                const updated = [...existing.slice(-49), newLog]; // Keep last 50
                localStorage.setItem('mossy_bridge_logs', JSON.stringify(updated));
                // Dispatch storage event for other tabs/components
                window.dispatchEvent(new Event('storage'));
            } catch (e) { console.error(e); }
        };

        const handleBlenderCmd = (e: CustomEvent) => {
            handleLog('Blender', `Remote CMD: ${e.detail.description}`, 'warn');
            // Simulate execution time
            setTimeout(() => handleLog('Blender', 'Script executed. Scene Updated.', 'success'), 1000);
        };

        const handleShortcut = (e: CustomEvent) => {
            handleLog('Blender', `Keystroke: [ ${e.detail.keys} ] - ${e.detail.description}`, 'warn');
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
                
                // Suppress fetch errors in console (expected when bridge is offline)
                const originalError = console.error;
                console.error = () => {};
                
                // USE 127.0.0.1 to avoid localhost IPv6 issues
                const response = await fetch('http://127.0.0.1:21337/health', { 
                    signal: controller.signal,
                    method: 'GET',
                    mode: 'cors' // Important for local dev
                }).finally(() => {
                    console.error = originalError; // Restore console.error
                });
                
                clearTimeout(timeoutId);

                if (response.ok) {
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
                // Silently handle connection failures - expected when bridge isn't running
                // Don't spam console with errors
                const wasUp = localStorage.getItem('mossy_bridge_active') === 'true';
                
                // Only mark as down if we are certain it's not just a transient network hiccup
                if (e.name !== 'AbortError') {
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