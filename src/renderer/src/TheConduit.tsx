import React, { useState, useEffect, useRef } from 'react';
import { Satellite, Github, Radio, Music, Home, Server, Link, Power, RefreshCw, Activity, ArrowUpRight, Lock, CheckCircle2, MessageCircle, GitCommit, PlayCircle, ToggleRight, ToggleLeft } from 'lucide-react';

interface Integration {
    id: string;
    name: string;
    icon: React.ElementType;
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    category: 'Dev' | 'Social' | 'Media' | 'IoT';
    lastSync?: string;
    meta?: any;
}

interface WebhookEvent {
    id: string;
    source: string;
    event: string;
    time: string;
    payload: string;
}

const TheConduit: React.FC = () => {
    // --- State ---
    const [integrations, setIntegrations] = useState<Integration[]>([
        { id: 'github', name: 'GitHub', icon: Github, status: 'disconnected', category: 'Dev' },
        { id: 'discord', name: 'Discord', icon: MessageCircle, status: 'disconnected', category: 'Social' },
        { id: 'nexus', name: 'NexusMods', icon: Server, status: 'disconnected', category: 'Dev' },
        { id: 'spotify', name: 'Spotify', icon: Music, status: 'disconnected', category: 'Media' },
        { id: 'hass', name: 'Home Assistant', icon: Home, status: 'disconnected', category: 'IoT' },
    ]);

    const [events, setEvents] = useState<WebhookEvent[]>([]);
    const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
    const eventLogRef = useRef<HTMLDivElement>(null);

    // --- Simulation Effects ---
    useEffect(() => {
        // Auto-scroll event log
        if (eventLogRef.current) {
            eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
        }
    }, [events]);

    useEffect(() => {
        // Simulate background chatter/events from connected services
        const interval = setInterval(() => {
            const connected = integrations.filter(i => i.status === 'connected');
            if (connected.length === 0) return;

            if (Math.random() > 0.7) {
                const source = connected[Math.floor(Math.random() * connected.length)];
                let eventName = "PING";
                let payload = "Heartbeat OK";

                if (source.id === 'github') {
                    const actions = ['Push', 'PullRequest', 'IssueComment', 'WorkflowRun'];
                    eventName = actions[Math.floor(Math.random() * actions.length)];
                    payload = `Repo: mossy-core | Branch: main | User: dev_bot`;
                } else if (source.id === 'discord') {
                    eventName = "MessageCreate";
                    payload = "Channel: #general | User: NeonSamurai: 'Can you fix the mesh?'";
                } else if (source.id === 'spotify') {
                    eventName = "TrackChange";
                    payload = "Now Playing: 'Magnolia - Train Train'";
                } else if (source.id === 'hass') {
                    eventName = "StateChange";
                    payload = "Entity: light.studio_main | State: ON | Brightness: 80%";
                }

                addEvent(source.name, eventName, payload);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [integrations]);

    const addEvent = (source: string, event: string, payload: string) => {
        setEvents(prev => [...prev.slice(-19), {
            id: Date.now().toString(),
            source,
            event,
            time: new Date().toLocaleTimeString(),
            payload
        }]);
    };

    const toggleConnection = (id: string) => {
        setIntegrations(prev => prev.map(i => {
            if (i.id !== id) return i;
            if (i.status === 'connected') return { ...i, status: 'disconnected' };
            return { ...i, status: 'connecting' };
        }));

        // Simulate Auth Flow
        const target = integrations.find(i => i.id === id);
        if (target && target.status === 'disconnected') {
            setTimeout(() => {
                setIntegrations(prev => prev.map(i => {
                    if (i.id === id) return { 
                        ...i, 
                        status: 'connected', 
                        lastSync: 'Just now',
                        meta: i.id === 'github' ? { repos: 12, issues: 3 } : 
                              i.id === 'spotify' ? { track: 'Paused' } : {}
                    };
                    return i;
                }));
                addEvent('System', 'AUTH_SUCCESS', `Secure handshake established with ${target.name}.`);
            }, 1500);
        }
    };

    return (
        <div className="h-full flex flex-col bg-forge-dark text-slate-200 font-sans">
            {/* Header */}
            <div className="p-6 border-b border-slate-700 bg-forge-panel flex justify-between items-center shadow-md z-10">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Satellite className="w-8 h-8 text-forge-accent" />
                        The Conduit
                    </h1>
                    <p className="text-xs text-slate-400 font-mono mt-1">External Cloud API Gateway & Event Bus</p>
                </div>
                <div className="flex items-center gap-4">
                     <div className="text-right">
                         <div className="text-xs font-bold text-slate-500 uppercase">Total Bandwidth</div>
                         <div className="text-emerald-400 font-mono">24.5 MB/s</div>
                     </div>
                     <div className="w-px h-8 bg-slate-700"></div>
                     <div className="text-right">
                         <div className="text-xs font-bold text-slate-500 uppercase">Active Links</div>
                         <div className="text-blue-400 font-mono">{integrations.filter(i => i.status === 'connected').length} / {integrations.length}</div>
                     </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Integration Grid */}
                <div className="flex-1 p-8 overflow-y-auto">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Link className="w-4 h-4" /> Available Endpoints
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {integrations.map(integration => (
                            <div 
                                key={integration.id}
                                className={`relative overflow-hidden rounded-xl border transition-all duration-300 group ${
                                    integration.status === 'connected' 
                                    ? 'bg-slate-800/80 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                                    : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                                }`}
                            >
                                {/* Background Icon Faded */}
                                <integration.icon className={`absolute -bottom-4 -right-4 w-32 h-32 opacity-5 transition-transform group-hover:scale-110 ${integration.status === 'connected' ? 'text-emerald-500' : 'text-slate-500'}`} />
                                
                                <div className="p-6 relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-lg ${
                                            integration.status === 'connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                                        }`}>
                                            <integration.icon className="w-6 h-6" />
                                        </div>
                                        <button 
                                            onClick={() => toggleConnection(integration.id)}
                                            disabled={integration.status === 'connecting'}
                                            className={`p-2 rounded-full transition-colors ${
                                                integration.status === 'connected' ? 'bg-emerald-500 text-white hover:bg-red-500' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                            }`}
                                        >
                                            {integration.status === 'connecting' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    
                                    <h3 className="text-xl font-bold text-white mb-1">{integration.name}</h3>
                                    
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className={`w-2 h-2 rounded-full ${
                                            integration.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 
                                            integration.status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-slate-600'
                                        }`}></div>
                                        <span className="text-xs font-mono uppercase text-slate-400">
                                            {integration.status === 'connected' ? 'Online' : integration.status === 'connecting' ? 'Handshaking...' : 'Offline'}
                                        </span>
                                    </div>

                                    {integration.status === 'connected' && (
                                        <div className="pt-4 border-t border-slate-700/50 space-y-2">
                                            {integration.id === 'github' && (
                                                <div className="flex justify-between text-xs text-slate-300">
                                                    <span className="flex items-center gap-1"><GitCommit className="w-3 h-3" /> Recent Push</span>
                                                    <span className="text-emerald-400">2m ago</span>
                                                </div>
                                            )}
                                            {integration.id === 'spotify' && (
                                                <div className="flex justify-between text-xs text-slate-300">
                                                    <span className="flex items-center gap-1"><PlayCircle className="w-3 h-3" /> Playback</span>
                                                    <span className="text-emerald-400">Idle</span>
                                                </div>
                                            )}
                                            <div className="text-[10px] text-slate-500 font-mono mt-2">
                                                Latency: 45ms | Sync: {integration.lastSync}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Event Bus Log */}
                <div className="w-96 bg-black border-l border-slate-800 flex flex-col">
                    <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Activity className="w-3 h-3" /> Live Event Bus
                        </h3>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] text-red-500 font-mono">REC</span>
                        </div>
                    </div>
                    
                    <div ref={eventLogRef} className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                        {events.length === 0 && (
                            <div className="text-center text-slate-600 mt-10 italic">
                                Listening for webhooks...
                            </div>
                        )}
                        {events.map(event => (
                            <div key={event.id} className="border-l-2 border-slate-800 pl-3 py-1 hover:border-forge-accent transition-colors group">
                                <div className="flex justify-between text-slate-500 mb-1">
                                    <span className="font-bold text-forge-accent">{event.source}</span>
                                    <span className="text-[10px]">{event.time}</span>
                                </div>
                                <div className="text-slate-300 font-bold mb-0.5">{event.event}</div>
                                <div className="text-[10px] text-slate-500 break-all opacity-70 group-hover:opacity-100">
                                    {event.payload}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-3 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 font-mono text-center">
                         SECURE CHANNEL: TLS 1.3 ENCRYPTED
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TheConduit;