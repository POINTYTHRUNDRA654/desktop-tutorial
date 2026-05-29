/**
 * FO4 Mod Builder Hub — v2.5.0
 *
 * Unified platform for mod creation workflow:
 * Blueprint (planning) · Workshop (file browser + compile) · Devtools (scripts) · Scribe (docs) · Project Creator
 *
 * KEYBOARD SHORTCUTS: 1–5 switch tabs when the hub has focus.
 * DRAG-TO-REORDER: Tabs can be dragged into any order; order persists in localStorage.
 */

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { DraftingCompass, Hammer, Code, Feather, FolderPlus, GripVertical } from 'lucide-react';

const TheBlueprint = React.lazy(() => import('./TheBlueprint'));
const Workshop = React.lazy(() => import('./Workshop'));
const DevtoolsHub = React.lazy(() => import('./DevtoolsHub'));
const TheScribe = React.lazy(() =>
    import('./TheScribeEnhanced').then((m) => ({ default: m.TheScribe }))
);
const ProjectCreator = React.lazy(() =>
    import('./ProjectCreator').then((m) => ({ default: m.ProjectCreator }))
);

type HubTab = 'blueprint' | 'workshop' | 'devtools' | 'scribe' | 'creator';

const TAB_DEFS: {
    id: HubTab;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    sublabel: string;
    shortcut: string;
}[] = [
    { id: 'blueprint', icon: DraftingCompass, label: 'Blueprint',       sublabel: 'Mod architecture planner',    shortcut: '1' },
    { id: 'workshop',  icon: Hammer,          label: 'Workshop',         sublabel: 'File browser · Compile',      shortcut: '2' },
    { id: 'devtools',  icon: Code,            label: 'Devtools',         sublabel: 'Papyrus · xEdit · Snippets',  shortcut: '3' },
    { id: 'scribe',    icon: Feather,         label: 'Scribe',           sublabel: 'Documentation generator',     shortcut: '4' },
    { id: 'creator',   icon: FolderPlus,      label: 'Project Creator',  sublabel: 'New mod scaffold',            shortcut: '5' },
];

const ALL_TAB_IDS: HubTab[] = TAB_DEFS.map(t => t.id);
const TAB_ORDER_KEY = 'builder_hub_tab_order';
const ACTIVE_TAB_KEY = 'builder_hub_tab';

function loadTabOrder(): HubTab[] {
    try {
        const raw = localStorage.getItem(TAB_ORDER_KEY);
        if (!raw) return ALL_TAB_IDS;
        const parsed: HubTab[] = JSON.parse(raw);
        // Validate: must contain all known IDs (no extras, no missing)
        if (
            parsed.length === ALL_TAB_IDS.length &&
            ALL_TAB_IDS.every(id => parsed.includes(id))
        ) return parsed;
    } catch { /* ignore */ }
    return ALL_TAB_IDS;
}

/**
 * PanelLoader — Suspense wrapper for lazy-loaded tabs.
 */
const PanelLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Suspense
        fallback={
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm font-mono">
                Loading…
            </div>
        }
    >
        {children}
    </Suspense>
);

const ModBuilderHub: React.FC = () => {
    const [activeTab, setActiveTab] = useState<HubTab>('blueprint');
    const [tabOrder, setTabOrder] = useState<HubTab[]>(loadTabOrder);

    // Drag state — stored in a ref to avoid re-renders during drag
    const dragSrcIdx = useRef<number | null>(null);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

    // Persist active tab across navigation
    useEffect(() => {
        const saved = sessionStorage.getItem(ACTIVE_TAB_KEY) as HubTab | null;
        if (saved && ALL_TAB_IDS.includes(saved)) setActiveTab(saved);
    }, []);

    useEffect(() => {
        sessionStorage.setItem(ACTIVE_TAB_KEY, activeTab);
    }, [activeTab]);

    // Persist tab order
    useEffect(() => {
        try { localStorage.setItem(TAB_ORDER_KEY, JSON.stringify(tabOrder)); } catch { /* ignore */ }
    }, [tabOrder]);

    // Keyboard shortcuts 1–5 (based on visual position, not original order)
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const tag = (document.activeElement?.tagName ?? '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < tabOrder.length) {
            setActiveTab(tabOrder[idx]);
        }
    }, [tabOrder]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // ── Drag handlers ──────────────────────────────────────────────────────────

    const handleDragStart = (e: React.DragEvent, idx: number) => {
        dragSrcIdx.current = idx;
        e.dataTransfer.effectAllowed = 'move';
        // Ghost image: use a transparent 1×1 pixel so the tab itself is the drag preview
        const ghost = document.createElement('div');
        ghost.style.position = 'absolute';
        ghost.style.top = '-9999px';
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 0, 0);
        setTimeout(() => document.body.removeChild(ghost), 0);
    };

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIdx(idx);
    };

    const handleDrop = (e: React.DragEvent, dropIdx: number) => {
        e.preventDefault();
        const src = dragSrcIdx.current;
        if (src === null || src === dropIdx) { setDragOverIdx(null); return; }
        const next = [...tabOrder];
        const [moved] = next.splice(src, 1);
        next.splice(dropIdx, 0, moved);
        setTabOrder(next);
        dragSrcIdx.current = null;
        setDragOverIdx(null);
    };

    const handleDragEnd = () => {
        dragSrcIdx.current = null;
        setDragOverIdx(null);
    };

    // Ordered tab definitions (preserves all metadata)
    const orderedTabs = tabOrder.map(id => TAB_DEFS.find(t => t.id === id)!);

    return (
        <div className="h-full flex flex-col bg-[#0a0e0a] overflow-hidden">
            {/* Hub Header */}
            <div className="flex-shrink-0 px-6 pt-5 pb-0 border-b border-slate-800/60">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-2">
                            <Hammer className="h-5 w-5 text-amber-300" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight">FO4 Mod Builder Hub</h1>
                            <p className="text-xs text-slate-400">
                                Blueprint · Workshop · Devtools · Scribe — complete Fallout 4 mod creation workflow
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="hidden md:block text-[10px] text-slate-600 font-mono">Keys 1–5 · drag tabs to reorder</span>
                        <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-amber-400 font-mono">v2.5.0</span>
                    </div>
                </div>

                {/* Tab Bar — draggable */}
                <div className="flex gap-0.5 overflow-x-auto select-none">
                    {orderedTabs.map((tab, idx) => {
                        const isActive = activeTab === tab.id;
                        const isDragTarget = dragOverIdx === idx && dragSrcIdx.current !== idx;
                        return (
                            <button
                                key={tab.id}
                                draggable
                                onDragStart={e => handleDragStart(e, idx)}
                                onDragOver={e => handleDragOver(e, idx)}
                                onDrop={e => handleDrop(e, idx)}
                                onDragEnd={handleDragEnd}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    group flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap
                                    transition-all rounded-t-lg border-t border-x cursor-grab active:cursor-grabbing
                                    ${isActive
                                        ? 'bg-[#0a0e0a] text-amber-300 border-slate-700 border-b-[#0a0e0a] -mb-px z-10'
                                        : 'bg-slate-900/40 text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/70'
                                    }
                                    ${isDragTarget ? 'ring-2 ring-amber-400/60 ring-inset' : ''}
                                `}
                                title={`${tab.label} (key ${idx + 1}) — drag to reorder`}
                            >
                                <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-30 transition-opacity shrink-0" />
                                <tab.icon className="h-3.5 w-3.5" />
                                {tab.label}
                                <span className={`text-[9px] hidden xl:inline ${isActive ? 'text-amber-500/70' : 'text-slate-700'}`}>
                                    [{idx + 1}]
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'blueprint' && (
                    <PanelLoader><TheBlueprint /></PanelLoader>
                )}
                {activeTab === 'workshop' && (
                    <PanelLoader><Workshop /></PanelLoader>
                )}
                {activeTab === 'devtools' && (
                    <PanelLoader><DevtoolsHub /></PanelLoader>
                )}
                {activeTab === 'scribe' && (
                    <PanelLoader><TheScribe /></PanelLoader>
                )}
                {activeTab === 'creator' && (
                    <div className="h-full overflow-y-auto">
                        <PanelLoader><ProjectCreator /></PanelLoader>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModBuilderHub;
