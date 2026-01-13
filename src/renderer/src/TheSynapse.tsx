import React, { useState } from 'react';
import { Zap, Plus, Trash2, CheckCircle2, AlertCircle, Copy, Play, FileJson, Settings } from 'lucide-react';

// ============================================================================
// MOD EVENT REACTOR - Real Fallout 4 Modding Triggers & Reactions
// ============================================================================

interface EventTrigger {
    id: string;
    name: string;
    category: string;
    description: string;
    icon: React.ReactNode;
    conditions: string[];
}

interface EventReaction {
    id: string;
    name: string;
    category: string;
    description: string;
    actions: string[];
}

interface EventWorkflow {
    id: string;
    name: string;
    trigger: EventTrigger;
    reactions: EventReaction[];
    isActive: boolean;
}

// ============================================================================
// REAL FALLOUT 4 MODDING TRIGGERS
// ============================================================================

const MOD_TRIGGERS: EventTrigger[] = [
    {
        id: 'plugin-load',
        name: 'Plugin Load Complete',
        category: 'Game Events',
        description: 'Fires when F4SE detects all plugins loaded (on game start)',
        icon: '📦',
        conditions: ['Plugin count', 'Specific plugin loaded', 'Load time check'],
    },
    {
        id: 'save-create',
        name: 'New Save Created',
        category: 'Game Events',
        description: 'Triggers when player creates a new save game',
        icon: '💾',
        conditions: ['Save file created', 'Character name detected', 'Location name'],
    },
    {
        id: 'quest-stage',
        name: 'Quest Stage Change',
        category: 'Game Events',
        description: 'Fires when any quest reaches specific stage',
        icon: '📋',
        conditions: ['Quest FormID', 'Stage number', 'NPC dialogue detection'],
    },
    {
        id: 'cell-enter',
        name: 'Enter Cell/Location',
        category: 'Game Events',
        description: 'Player enters a specific cell (interior or exterior)',
        icon: '🚪',
        conditions: ['Cell FormID', 'Location name', 'Coordinate bounds'],
    },
    {
        id: 'script-event',
        name: 'Script Event Fire',
        category: 'Game Events',
        description: 'Custom Papyrus script sends event via SendModEvent',
        icon: '⚡',
        conditions: ['Script name', 'Event string match', 'Argument value'],
    },
    {
        id: 'conflict-detect',
        name: 'Plugin Conflict Detected',
        category: 'Mod Management',
        description: 'The Registry finds overlapping FormIDs during load',
        icon: '⚠️',
        conditions: ['Conflict level', 'Plugin pair', 'Record type'],
    },
    {
        id: 'file-modified',
        name: 'Asset File Changed',
        category: 'Mod Management',
        description: 'Mesh, texture, or script file modified in Data folder',
        icon: '📝',
        conditions: ['File extension (.nif, .dds, .psc)', 'Modified time', 'File size'],
    },
    {
        id: 'build-finish',
        name: 'Build Pipeline Complete',
        category: 'Mod Management',
        description: 'Mod build finishes (Compile → Validate → Package)',
        icon: '✅',
        conditions: ['All steps passed', 'Build time', 'Package size'],
    },
];

// ============================================================================
// REAL FALLOUT 4 MODDING REACTIONS
// ============================================================================

const MOD_REACTIONS: EventReaction[] = [
    {
        id: 'run-xedit',
        name: 'Open xEdit Auto-Check',
        category: 'Validation',
        description: 'Launch xEdit in background to validate plugin',
        actions: ['xEdit.exe -IKM', 'Check errors', 'Generate report'],
    },
    {
        id: 'validate-meshes',
        name: 'Validate All Meshes',
        category: 'Validation',
        description: 'Run Nifskope on all .nif files to check for errors',
        actions: ['Check vertex counts', 'Validate materials', 'Detect corrupted refs'],
    },
    {
        id: 'notify-conflict',
        name: 'Alert: Conflict Found',
        category: 'Notifications',
        description: 'Display warning about plugin conflicts before continuing',
        actions: ['Show conflict list', 'Suggest load order', 'Block game launch'],
    },
    {
        id: 'log-event',
        name: 'Log Event to File',
        category: 'Data Tracking',
        description: 'Write quest/event data to JSON log for analysis',
        actions: ['Create timestamp', 'Log FormIDs', 'Save metadata'],
    },
    {
        id: 'screenshot-save',
        name: 'Capture Screenshot',
        category: 'Documentation',
        description: 'Auto-screenshot at quest completion or location trigger',
        actions: ['Screenshot from F4', 'Tag with location', 'Save to folder'],
    },
    {
        id: 'run-test',
        name: 'Launch Test Game',
        category: 'Testing',
        description: 'Auto-start Fallout 4 with current load order for testing',
        actions: ['Load F4SE', 'Monitor for crashes', 'Log exit code'],
    },
    {
        id: 'backup-plugin',
        name: 'Create Plugin Backup',
        category: 'Safety',
        description: 'Save backup of plugin before making changes',
        actions: ['Copy .esp file', 'Timestamp filename', 'Store in backups folder'],
    },
    {
        id: 'export-json',
        name: 'Export Event Data',
        category: 'Data Export',
        description: 'Save quest/npc/item data to JSON for analysis or sharing',
        actions: ['Serialize FormIDs', 'Include metadata', 'Compress archive'],
    },
];

// ============================================================================
// SAMPLE WORKFLOWS
// ============================================================================

const SAMPLE_WORKFLOWS: EventWorkflow[] = [
    {
        id: 'w1',
        name: 'Quest Testing Automation',
        trigger: MOD_TRIGGERS[2], // Quest Stage Change
        reactions: [
            MOD_REACTIONS[3], // Log Event
            MOD_REACTIONS[4], // Screenshot
            MOD_REACTIONS[7], // Export JSON
        ],
        isActive: true,
    },
    {
        id: 'w2',
        name: 'Build & Validate Pipeline',
        trigger: MOD_TRIGGERS[7], // Build Complete
        reactions: [
            MOD_REACTIONS[1], // Validate Meshes
            MOD_REACTIONS[0], // Open xEdit
            MOD_REACTIONS[6], // Backup Plugin
        ],
        isActive: true,
    },
    {
        id: 'w3',
        name: 'Conflict Detection Safety',
        trigger: MOD_TRIGGERS[5], // Conflict Detected
        reactions: [
            MOD_REACTIONS[2], // Alert Conflict
            MOD_REACTIONS[3], // Log Event
        ],
        isActive: true,
    },
];

const TheSynapse: React.FC = () => {
    const [workflows, setWorkflows] = useState<EventWorkflow[]>(SAMPLE_WORKFLOWS);
    const [selectedWorkflow, setSelectedWorkflow] = useState<EventWorkflow | null>(SAMPLE_WORKFLOWS[0]);
    const [expandedSection, setExpandedSection] = useState<string | null>('workflows');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleToggleWorkflow = (workflowId: string) => {
        setWorkflows(prev => prev.map(w => 
            w.id === workflowId ? { ...w, isActive: !w.isActive } : w
        ));
    };

    const handleDeleteWorkflow = (workflowId: string) => {
        const newWorkflows = workflows.filter(w => w.id !== workflowId);
        setWorkflows(newWorkflows);
        if (selectedWorkflow?.id === workflowId) {
            setSelectedWorkflow(newWorkflows[0] || null);
        }
    };

    const handleCopyWorkflow = (workflow: EventWorkflow) => {
        const workflowJson = JSON.stringify({
            name: workflow.name,
            trigger: workflow.trigger.name,
            reactions: workflow.reactions.map(r => r.name),
        }, null, 2);
        navigator.clipboard.writeText(workflowJson);
        setCopiedId(workflow.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-slate-200 font-sans overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-black bg-[#2d2d2d] flex justify-between items-center shadow-md">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-purple-400" />
                        The Synapse
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Mod Event Reactor v1.3.0</p>
                </div>
                <div className="flex gap-2">
                    <div className="px-3 py-1 bg-black rounded border border-slate-600 font-mono text-xs text-purple-400">
                        Workflows: {workflows.length}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Workflow List */}
                <div className="w-72 bg-[#252526] border-r border-black flex flex-col">
                    <div className="p-3 border-b border-black text-[10px] font-bold text-slate-300 uppercase tracking-wider bg-[#333333]">
                        Event Workflows
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {workflows.map((workflow) => (
                            <div
                                key={workflow.id}
                                onClick={() => setSelectedWorkflow(workflow)}
                                className={`p-3 border-b border-slate-800 cursor-pointer transition-colors ${
                                    selectedWorkflow?.id === workflow.id
                                        ? 'bg-purple-900/30 border-l-4 border-l-purple-400'
                                        : 'hover:bg-[#2d2d30]'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="font-semibold text-slate-200 text-sm">{workflow.name}</div>
                                        <div className="text-[10px] text-slate-500 mt-1">{workflow.trigger.name}</div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleWorkflow(workflow.id);
                                        }}
                                        className={`px-2 py-1 rounded text-[9px] font-semibold transition-colors ${
                                            workflow.isActive
                                                ? 'bg-green-900/40 text-green-300'
                                                : 'bg-slate-800 text-slate-500'
                                        }`}
                                    >
                                        {workflow.isActive ? '●' : '○'}
                                    </button>
                                </div>
                                <div className="text-[9px] text-slate-600 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-purple-400"></span>
                                    {workflow.reactions.length} actions
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center/Right: Workflow Details */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {selectedWorkflow ? (
                        <>
                            {/* Workflow Header */}
                            <div className="p-4 border-b border-black bg-[#252526]">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-bold text-slate-200 text-lg">{selectedWorkflow.name}</h3>
                                        <p className="text-[10px] text-slate-500 mt-1">Event reactor configuration</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleCopyWorkflow(selectedWorkflow)}
                                            className="p-2 hover:bg-slate-700 rounded transition-colors"
                                        >
                                            {copiedId === selectedWorkflow.id ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <Copy className="w-4 h-4 text-slate-400" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteWorkflow(selectedWorkflow.id)}
                                            className="p-2 hover:bg-red-900/30 rounded transition-colors text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-[9px] font-semibold ${
                                        selectedWorkflow.isActive
                                            ? 'bg-green-900/40 text-green-300'
                                            : 'bg-slate-800 text-slate-500'
                                    }`}>
                                        {selectedWorkflow.isActive ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </div>
                            </div>

                            {/* Workflow Content */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {/* TRIGGER SECTION */}
                                <div>
                                    <h4 className="font-semibold text-slate-300 text-sm mb-3 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-yellow-400" />
                                        Trigger Event
                                    </h4>
                                    <div className="bg-[#252526] border border-yellow-700/50 rounded-lg p-4">
                                        <div className="text-2xl mb-2">{selectedWorkflow.trigger.icon}</div>
                                        <div className="font-semibold text-slate-200">{selectedWorkflow.trigger.name}</div>
                                        <p className="text-[10px] text-slate-500 mt-2">{selectedWorkflow.trigger.description}</p>
                                        <div className="mt-3 pt-3 border-t border-slate-700">
                                            <div className="text-[10px] font-semibold text-slate-400 mb-2">Conditions:</div>
                                            <div className="space-y-1">
                                                {selectedWorkflow.trigger.conditions.map((cond, idx) => (
                                                    <div key={idx} className="text-[10px] text-slate-500 flex items-center gap-2">
                                                        <span className="w-1 h-1 rounded-full bg-yellow-400"></span>
                                                        {cond}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* REACTIONS SECTION */}
                                <div>
                                    <h4 className="font-semibold text-slate-300 text-sm mb-3 flex items-center gap-2">
                                        <Play className="w-4 h-4 text-green-400" />
                                        Reactions ({selectedWorkflow.reactions.length})
                                    </h4>
                                    <div className="space-y-3">
                                        {selectedWorkflow.reactions.map((reaction, idx) => (
                                            <div key={idx} className="bg-[#252526] border border-green-700/50 rounded-lg p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="font-semibold text-slate-200 text-sm">{reaction.name}</div>
                                                    <span className="text-[10px] text-slate-500 bg-black/50 px-2 py-1 rounded">
                                                        {reaction.category}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 mb-2">{reaction.description}</p>
                                                <div className="text-[9px] text-slate-600 space-y-1">
                                                    {reaction.actions.map((action, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <span className="w-1 h-1 rounded-full bg-green-400"></span>
                                                            {action}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-600">
                            <div className="text-center">
                                <Zap className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p>No workflow selected</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TheSynapse;