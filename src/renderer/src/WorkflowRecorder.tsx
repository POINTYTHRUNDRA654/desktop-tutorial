import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WorkflowMacro, WorkflowSession } from './WorkflowAutomationService';
import { getWorkflowAutomationService } from './WorkflowAutomationService';
import { Play, Square, Circle, Trash2, ArrowDownToLine, Upload, Settings, Clock, CheckCircle, XCircle } from 'lucide-react';

export const WorkflowRecorder: React.FC = () => {
    const [macros, setMacros] = useState<WorkflowMacro[]>([]);
    const [currentSession, setCurrentSession] = useState<WorkflowSession | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newMacroName, setNewMacroName] = useState('');
    const [newMacroDescription, setNewMacroDescription] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    useEffect(() => {
        // Load macros
        setMacros(getWorkflowAutomationService().getAllMacros());

        // Listen to workflow service events
        const handleMacroCreated = (macro: WorkflowMacro) => {
            setMacros(prev => [...prev, macro]);
        };

        const handleMacroUpdated = (macro: WorkflowMacro) => {
            setMacros(prev => prev.map(m => m.id === macro.id ? macro : m));
        };

        const handleMacroDeleted = (macroId: string) => {
            setMacros(prev => prev.filter(m => m.id !== macroId));
        };

        const handleRecordingStarted = (session: WorkflowSession) => {
            setCurrentSession(session);
            setIsRecording(true);
        };

        const handleRecordingStopped = (data: { session: WorkflowSession; macro: WorkflowMacro }) => {
            setCurrentSession(null);
            setIsRecording(false);
            setMacros(prev => prev.map(m => m.id === data.macro.id ? data.macro : m));
        };

        const handlePlaybackStarted = (session: WorkflowSession) => {
            setCurrentSession(session);
        };

        const handlePlaybackCompleted = (session: WorkflowSession) => {
            setCurrentSession(null);
        };

        const handlePlaybackFailed = (data: { session: WorkflowSession; error: any }) => {
            setCurrentSession(null);
            console.error('Playback failed:', data.error);
        };

        const handleEvent = (event: string, data: any) => {
            switch (event) {
                case 'macroCreated':
                    handleMacroCreated(data);
                    break;
                case 'macroUpdated':
                    handleMacroUpdated(data);
                    break;
                case 'macroDeleted':
                    handleMacroDeleted(data);
                    break;
                case 'recordingStarted':
                    handleRecordingStarted(data);
                    break;
                case 'recordingStopped':
                    handleRecordingStopped(data);
                    break;
                case 'playbackStarted':
                    handlePlaybackStarted(data);
                    break;
                case 'playbackCompleted':
                    handlePlaybackCompleted(data);
                    break;
                case 'playbackFailed':
                    handlePlaybackFailed(data);
                    break;
            }
        };

        getWorkflowAutomationService().addListener(handleEvent);

        return () => {
            getWorkflowAutomationService().removeListener(handleEvent);
        };
    }, []);

    const handleCreateMacro = async () => {
        if (!newMacroName.trim()) return;

        try {
            await getWorkflowAutomationService().createMacro(newMacroName, newMacroDescription, selectedTags);
            setNewMacroName('');
            setNewMacroDescription('');
            setSelectedTags([]);
            setShowCreateDialog(false);
        } catch (error) {
            console.error('Failed to create macro:', error);
        }
    };

    const handleStartRecording = (macroId: string) => {
        try {
            getWorkflowAutomationService().startRecording(macroId);
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    };

    const handleStopRecording = () => {
        const macro = getWorkflowAutomationService().stopRecording();
        if (macro) {
            console.log('Recording completed:', macro.name);
        }
    };

    const handlePlayMacro = async (macroId: string) => {
        try {
            await getWorkflowAutomationService().playMacro(macroId);
        } catch (error) {
            console.error('Failed to play macro:', error);
        }
    };

    const handleDeleteMacro = async (macroId: string) => {
        if (confirm('Are you sure you want to delete this macro?')) {
            try {
                await getWorkflowAutomationService().deleteMacro(macroId);
            } catch (error) {
                console.error('Failed to delete macro:', error);
            }
        }
    };

    const handleExportMacro = (macroId: string) => {
        const json = getWorkflowAutomationService().exportMacro(macroId);
        if (json) {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${macros.find(m => m.id === macroId)?.name || 'macro'}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleImportMacro = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = e.target?.result as string;
                const macroId = await getWorkflowAutomationService().importMacro(json);
                console.log('Macro imported:', macroId);
            } catch (error) {
                console.error('Failed to import macro:', error);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const getStatusIcon = (macro: WorkflowMacro) => {
        if (currentSession?.macroId === macro.id) {
            if (currentSession.status === 'recording') {
                return <Circle className="w-4 h-4 text-red-500 animate-pulse" />;
            } else if (currentSession.status === 'playing') {
                return <Play className="w-4 h-4 text-blue-500 animate-pulse" />;
            }
        }
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    };

    const getStatusText = (macro: WorkflowMacro) => {
        if (currentSession?.macroId === macro.id) {
            return currentSession.status;
        }
        return macro.steps.length ? `${macro.steps.length} steps` : 'Empty';
    };

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-emerald-400" />
                        Workflow Automation
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Record and replay common workflows</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        to="/reference"
                        className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/30 transition-colors"
                        title="Open help"
                    >
                        Help
                    </Link>
                    <button
                        onClick={() => setShowCreateDialog(true)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
                    >
                        New Macro
                    </button>
                    <label className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg cursor-pointer transition-colors">
                        Import
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleImportMacro}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            {/* Recording Status */}
            {isRecording && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400">
                        <Circle className="w-4 h-4 animate-pulse" />
                        <span className="text-sm font-medium">Recording in progress...</span>
                        <button
                            onClick={handleStopRecording}
                            className="ml-auto px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                        >
                            Stop
                        </button>
                    </div>
                </div>
            )}

            {/* Macros List */}
            <div className="space-y-3">
                {macros.map(macro => (
                    <div key={macro.id} className="bg-slate-800 border border-slate-600 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    {getStatusIcon(macro)}
                                    <h4 className="text-white font-medium">{macro.name}</h4>
                                    <span className="text-xs text-slate-400">
                                        {getStatusText(macro)}
                                    </span>
                                </div>
                                {macro.description && (
                                    <p className="text-sm text-slate-400 mb-2">{macro.description}</p>
                                )}
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    {new Date(macro.lastModified).toLocaleDateString()}
                                    {macro.tags.length > 0 && (
                                        <div className="flex gap-1">
                                            {macro.tags.map(tag => (
                                                <span key={tag} className="px-2 py-0.5 bg-slate-700 rounded text-xs">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-1 ml-4">
                                {!isRecording && (
                                    <button
                                        onClick={() => handleStartRecording(macro.id)}
                                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                                        title="Start Recording"
                                    >
                                        <Circle className="w-4 h-4" />
                                    </button>
                                )}
                                {macro.steps.length > 0 && !isRecording && (
                                    <button
                                        onClick={() => handlePlayMacro(macro.id)}
                                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                        title="Play Macro"
                                    >
                                        <Play className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleExportMacro(macro.id)}
                                    className="p-2 bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors"
                                    title="Export Macro"
                                >
                                    <ArrowDownToLine className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteMacro(macro.id)}
                                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                                    title="Delete Macro"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {macros.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                        <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No macros created yet</p>
                        <p className="text-sm">Create your first macro to start automating workflows</p>
                    </div>
                )}
            </div>

            {/* Create Macro Dialog */}
            {showCreateDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4">Create New Macro</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newMacroName}
                                    onChange={(e) => setNewMacroName(e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                                    placeholder="Macro name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                                <textarea
                                    value={newMacroDescription}
                                    onChange={(e) => setNewMacroDescription(e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none resize-none"
                                    rows={3}
                                    placeholder="Optional description"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Tags</label>
                                <input
                                    type="text"
                                    placeholder="Add tags (comma separated)"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ',') {
                                            e.preventDefault();
                                            const tag = e.currentTarget.value.trim();
                                            if (tag && !selectedTags.includes(tag)) {
                                                setSelectedTags(prev => [...prev, tag]);
                                                e.currentTarget.value = '';
                                            }
                                        }
                                    }}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                                />
                                {selectedTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {selectedTags.map(tag => (
                                            <span key={tag} className="px-2 py-1 bg-emerald-600 text-white text-xs rounded flex items-center gap-1">
                                                {tag}
                                                <button
                                                    onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                                                    className="hover:text-red-300"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateDialog(false)}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateMacro}
                                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};