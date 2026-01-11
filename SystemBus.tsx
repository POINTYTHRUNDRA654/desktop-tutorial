import React, { useEffect, useRef } from 'react';

const SystemBus: React.FC = () => {
    // We use a ref to prevent overlapping polls if one takes too long
    const isPolling = useRef(false);

    useEffect(() => {
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
        // Polls the local python server every 2 seconds to check if it's alive.
        // This allows Chat, Lens, and Sidebar to know the real status.
        const heartbeat = setInterval(async () => {
            if (isPolling.current) return;
            isPolling.current = true;

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout
                
                // USE 127.0.0.1 to avoid localhost IPv6 issues
                const response = await fetch('http://127.0.0.1:21337/health', { 
                    signal: controller.signal,
                    method: 'GET',
                    mode: 'cors' // Important for local dev
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
                // IMPORTANT: If we fail to fetch, it might be PNA/CORS block even if server is running.
                // If it was previously active, we give it a grace period or assume it's just blocked by browser
                // UNLESS the user explicitly disconnected or we want to be strict.
                
                // Current strict mode:
                const wasUp = localStorage.getItem('mossy_bridge_active') === 'true';
                
                // Only mark as down if we are certain it's not just a transient network hiccup
                // But for now, we must be honest with the UI state.
                if (e.name !== 'AbortError') {
                     localStorage.setItem('mossy_bridge_active', 'false');
                     if (wasUp) {
                        window.dispatchEvent(new Event('storage')); // Force UI updates
                     }
                }
            } finally {
                isPolling.current = false;
            }
        }, 2000);

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