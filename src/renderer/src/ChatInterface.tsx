import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { LocalAIEngine } from './LocalAIEngine';
import { getFullSystemInstruction, toGroqTools } from './MossyBrain';
import { formatRelevantFO4KnowledgeBaseForAI } from '../../shared/FO4KnowledgeBase';
import { getCommunityLearningContextForModel } from './communityLearningProfile';
import { getToolPermissionsContextForModel, mergeExistingCheckedState } from './toolPermissions';
import { checkContentGuard } from './Fallout4Guard';
import { Send, Paperclip, Loader2, Bot, BotOff, Leaf, Search, FolderOpen, Save, Trash2, CheckCircle2, HelpCircle, PauseCircle, ChevronRight, FileText, Cpu, X, CheckSquare, Globe, Mic, Volume2, VolumeX, StopCircle, Wifi, Gamepad2, Terminal, Box, Layout, ArrowUpRight, Wrench, Radio, Lock, Square, Map, Scroll, Flag, PenTool, Database, Activity, Clipboard, Brain, Download } from 'lucide-react';
import { Message } from '../../shared/types';
import { useLive } from './LiveContext';
import { speakMossy, stopMossySpeech } from './mossyTts';
import { loadBrowserTtsSettings } from './browserTts';
import { executeMossyTool, sanitizeBlenderScript } from './MossyTools';
import { ModProjectStorage } from './services/ModProjectStorage';
import { useActivityMonitor } from './hooks/useActivityMonitor';
import { SuggestionPanel } from './components/SuggestionPanel';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { SelfImprovementPanel } from './components/SelfImprovementPanel';
import { useHorizontalScroll } from './components/useHorizontalScroll';
import { buildKnowledgeManifestForModel, buildRelevantKnowledgeVaultContext, buildBlenderAddonContext, KnowledgeCitation } from './knowledgeRetrieval';
import { useNavigate, useLocation } from 'react-router-dom';
import { autoSaveManager } from './AutoSaveManager';
import { useAnalytics } from './utils/analytics';
import { openExternal } from './utils/openExternal';
import { getPanelActivityContext } from './panelActivity';


type OnboardingState = 'init' | 'scanning' | 'integrating' | 'ready' | 'project_setup';

// Real native tool-calling for TEXT chat -- mirrors LiveContext.tsx's VOICE_TOOLS,
// scoped narrowly to just scan_fallout4_live for now. Root cause this closes:
// MossyBrain.ts's system prompt unconditionally tells the model on every turn
// that it has scan_fallout4_live and must use it immediately for lookups, but
// until this fix neither text chat NOR voice chat (see VOICE_TOOL_SCOPE's own
// comment listing it under 'declared but never handled') ever actually attached
// it as a real API tool -- so the model was truthfully following its own
// instructions when it tried to call it, and Groq rejected the call outright
// (confirmed live 2026-09-01, the Archive2.exe crash investigation). Kept
// deliberately narrow (one tool, not all 27+ voice tools) since those haven't
// been individually vetted for safety as auto-executed, unconfirmed actions in
// text chat the way voice's existing scope has been -- scan_fallout4_live is a
// pure read-only web search, the lowest-risk tool to wire up first.
const TEXT_TOOL_SCOPE = ['scan_fallout4_live'];
const TEXT_TOOLS = toGroqTools(TEXT_TOOL_SCOPE);


interface DetectedApp {
    id: string;
    name: string;
    displayName?: string;
    category: string;
    checked: boolean;
    path?: string; // Added path to interface
    version?: string;
}

interface ProjectData {
    name: string;
    status: string;
    notes: string;
    timestamp: string;
    lastSessionSummary?: string;
    keyDecisions?: string[];
    categories?: string[];
}

interface SystemProfile {
    os: 'Windows' | 'Linux' | 'MacOS';
    gpu: string;
    ram: number;
    blenderVersion: string;
    isLegacy: boolean;
}

interface ToolExecution {
    id: string;
    toolName: string;
    args: any;
    status: 'pending' | 'running' | 'success' | 'failed';
    result?: string;
    isManualTrigger?: boolean; // New Flag for manual execution
}

// Speech Recognition compatibility shim (avoids conflict with DOM lib types)
type WebkitSpeechRecognition = typeof window extends { webkitSpeechRecognition: infer T } ? T : any;
declare let webkitSpeechRecognition: WebkitSpeechRecognition;



// --- Project Wizard Component ---
const ProjectWizard: React.FC<{ onSubmit: (data: any) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    ProjectWizard.displayName = 'ProjectWizard';
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    const categories = [
        { id: 'quest', label: 'Quest / Story', icon: Scroll },
        { id: 'asset', label: 'Asset Replacer', icon: Box },
        { id: 'script', label: 'Scripting', icon: FileText },
        { id: 'world', label: 'Worldspace', icon: Globe },
        { id: 'gameplay', label: 'Gameplay', icon: Activity },
        { id: 'ui', label: 'Interface', icon: Layout },
    ];

    const toggleCategory = (id: string) => {
        setSelectedCategories(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleSubmit = () => {
        if (!name) return;
        onSubmit({ name, description, categories: selectedCategories });
    };

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl animate-slide-up w-full max-w-2xl mx-auto">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-emerald-400" />
                        Initialize Project
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Configure workspace parameters for new mod.</p>
                </div>
                <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-4 mb-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. 'Project Cobalt', 'Wasteland Flora Overhaul'"
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief overview of the mod's goals..."
                        className="w-full h-20 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none resize-none transition-colors text-sm"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Primary Modules</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => toggleCategory(cat.id)}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all ${selectedCategories.includes(cat.id)
                                    ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400'
                                    : 'bg-slate-800 border-transparent text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <cat.icon className="w-4 h-4" />
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-end gap-3 pt-4 border-t border-slate-800 flex justify-end">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-slate-400 hover:text-white text-sm font-bold transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!name}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    <CheckCircle2 className="w-4 h-4" />
                    Create Workspace
                </button>
            </div>
        </div>
    );
};

// --- Sub-components for Performance ---

type ChatMessage = Message & {
    citations?: KnowledgeCitation[];
    // --- Brain B tutor contract fields (see LocalAIEngine.ts's AIResponse) ---
    // Only ever set on assistant messages Brain B answered; undefined for every
    // other provider and for the user's own messages.
    mode?: 'teach' | 'answer' | 'debug';
    checkQuestion?: string | null;
    abstained?: boolean;
    usedSceneContext?: boolean;
    addonOutdated?: boolean;
    enrichmentUnavailable?: boolean;
    usedLocalFallback?: boolean;
    /** True from the moment this message renders (known synchronously from
     *  `mode === 'teach'`, before /contract has even been called) until
     *  generateResponse()'s onContractReady callback settles it one way or
     *  the other. Reserves the check-question card's space immediately
     *  instead of having it pop in unannounced a beat later — /contract is a
     *  separate, unawaited backend round-trip (see LocalAIEngine.ts), so the
     *  question can genuinely arrive after the answer is already on screen. */
    contractPending?: boolean;
};

/** One-click copy-to-clipboard button with visual confirmation. */
const CopyButton: React.FC<{ content: string }> = ({ content }) => {
    const [copied, setCopied] = React.useState(false);
    const handle = React.useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for environments where clipboard API is restricted
            const el = document.createElement('textarea');
            el.value = content;
            el.style.position = 'fixed';
            el.style.opacity = '0';
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [content]);
    return (
        <button
            type="button"
            onClick={handle}
            title="Copy answer to clipboard"
            aria-label="Copy answer to clipboard"
            className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                copied
                    ? 'bg-emerald-800/60 text-emerald-200 border-emerald-700'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-slate-700'
            }`}
        >
            {copied ? '✓ Copied' : '📋 Copy'}
        </button>
    );
};

/** Quick-prompt chips displayed when no messages exist yet. */
const QUICK_PROMPTS: { label: string; prompt: string; emoji: string }[] = [
    { emoji: '🔧', label: 'Fix dark face bug', prompt: 'How do I fix the dark face bug on a custom NPC in Fallout 4?' },
    { emoji: '📋', label: 'Sort my load order', prompt: 'What is the correct load order structure for a heavily modded Fallout 4? Walk me through it.' },
    { emoji: '🌿', label: 'Generate LOD', prompt: 'What are all the steps to generate LOD for a mod that adds outdoor objects — TexGen and xLODGen (FO4LODGen mode)?' },
    { emoji: '💥', label: 'Analyse a crash', prompt: 'My game crashed and X-Cell made a crash log. How do I read the call stack and use CLASSIC to figure out which mod caused it?' },
    { emoji: '🎯', label: 'ESL-flag a plugin', prompt: 'How do I safely ESL-flag an ESP in xEdit? What are the FormID limits (0x800-0xFFF) and what happens if I go over them?' },
    { emoji: '🏗️', label: 'Precombines explained', prompt: 'Why are precombines important and how do I avoid breaking them in my mod?' },
    { emoji: '🖼️', label: 'DDS texture formats', prompt: 'Which DDS format should I use for each texture type in Fallout 4 — diffuse, normal, specular (_s.dds channels), and height map?' },
    { emoji: '⚙️', label: 'xEdit conflict patch', prompt: 'Two mods conflict on the same NPC record. Walk me through creating a compatibility patch in xEdit.' },
    { emoji: '📦', label: 'Pack a BA2', prompt: 'How do I pack my mod assets into a BA2 archive? What is the difference between BA2 Header V1 (pre-NG) and V2 (NG/AE/1.11.x) and which do I need?' },
    { emoji: '🚫', label: 'Deprecated frameworks', prompt: 'I have AWKCR, Armorsmith Extended, and DEF_UI in my load order. Are these safe on NG/AE (v1.10.984 / 1.11.x) and what modern replacements should I use?' },
    { emoji: '🔧', label: 'Check my game version', prompt: 'How do I find out whether I am running Legacy (1.10.163), Next-Gen (1.10.980-984), or Anniversary Edition (1.11.x)? What changes for each version — F4SE, Address Library, BA2 headers, crash tools?' },
    { emoji: '📝', label: 'FOMOD installer', prompt: 'How do I create a FOMOD installer for my mod so users get options in MO2 and Vortex?' },
    { emoji: '🔊', label: 'Add custom sound', prompt: 'How do I add a custom ambient sound to an interior cell using SNDR and ASPC records in the Creation Kit?' },
    { emoji: '🚀', label: 'Release checklist', prompt: 'What is the complete checklist for releasing a mod on Nexus — packaging, screenshots, description, FOMOD, and versioning?' },
];

const QuickPromptChips: React.FC<{ onSelect: (prompt: string) => void }> = ({ onSelect }) => (
    <div className="flex flex-col items-center gap-4 py-8 px-4 animate-fade-in">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Leaf className="w-4 h-4 text-emerald-400" />
            <span>Ask Mossy anything, or pick a common question:</span>
        </div>
        <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
            {QUICK_PROMPTS.map((q) => (
                <button
                    key={q.label}
                    type="button"
                    onClick={() => onSelect(q.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-700 bg-slate-800/60 text-slate-300 text-xs hover:border-emerald-600/60 hover:bg-emerald-900/20 hover:text-emerald-200 transition-all"
                >
                    <span>{q.emoji}</span>
                    <span>{q.label}</span>
                </button>
            ))}
        </div>
    </div>
);

// Memoized Message Item to prevent re-rendering list on typing
const MessageItem = React.memo(({ msg, onRate, onManualExecute }: { msg: ChatMessage; onRate?: (msgId: string, rating: 'good' | 'bad', editedAnswer?: string) => void; onManualExecute?: (name: string, args: any) => void | Promise<void> }) => {
    MessageItem.displayName = 'MessageItem';
    const [showCitations, setShowCitations] = useState(false);
    const [showReasoning, setShowReasoning] = useState(false);
    const [rating, setRating] = useState<'good' | 'bad' | null>(null);
    const [showEditBox, setShowEditBox] = useState(false);
    const [editedAnswer, setEditedAnswer] = useState('');
    const [runningCommand, setRunningCommand] = useState(false);
    const roleLabel = msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'Mossy' : msg.role;

    // The system prompt tells the AI to say "click Run Command" whenever Blender
    // Link is active — this extracts the Python it proposed so that promise is real.
    const proposedScript = useMemo(() => {
        if (msg.role !== 'assistant' || !msg.content) return null;
        const match = msg.content.match(/```(?:python|py)\s*\n([\s\S]*?)```/);
        const code = match?.[1]?.trim();
        return code && code.length > 0 ? code : null;
    }, [msg.role, msg.content]);

    const savedPath = useMemo(() => {
        const text = msg.content || '';
        // Tool outputs consistently format saved locations like: **Saved:** C:\Path\To\File.ext
        const m = text.match(/\*\*Saved:\*\*\s*(.+)$/m);
        if (!m) return null;
        const raw = (m[1] || '').trim();
        if (!raw || raw.startsWith('(')) return null;
        if (raw.toLowerCase().includes('unable to write')) return null;
        return raw;
    }, [msg.content]);

    const handleOpenSaved = useCallback(async () => {
        if (!savedPath) return;
        const bridge = (window as any).electron?.api || (window as any).electronAPI;
        try {
            if (bridge?.revealInFolder) {
                const res = await bridge.revealInFolder(savedPath);
                if (res && res.success === false) {
                    console.warn('[ChatInterface] revealInFolder failed:', res.error);
                }
                return;
            }

            // Fallback: open the path directly (won't highlight the file)
            if (bridge?.openExternal) {
                await bridge.openExternal(savedPath);
            }
        } catch (e) {
            console.error('[ChatInterface] Failed to open saved path:', e);
        }
    }, [savedPath]);

    return (
        <div data-testid={msg.role === 'user' ? 'user-message' : msg.role === 'assistant' ? 'ai-message' : 'system-message'} className="flex gap-3 items-start py-2">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-emerald-300 border border-slate-700">
                {roleLabel?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{roleLabel}</div>
                {savedPath && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleOpenSaved}
                            className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-slate-800/70 border border-slate-700 text-[11px] text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition-colors"
                            title="Open containing folder"
                            aria-label="Open containing folder"
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
                            Open folder
                        </button>
                        <div className="text-[10px] text-slate-500 truncate" title={savedPath}>{savedPath}</div>
                    </div>
                )}
                {msg.content && (
                    <ReactMarkdown className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
                        {msg.content}
                    </ReactMarkdown>
                )}
                {proposedScript && onManualExecute && (
                    <button
                        type="button"
                        disabled={runningCommand}
                        onClick={async () => {
                            setRunningCommand(true);
                            try {
                                await onManualExecute('execute_blender_script', {
                                    script: proposedScript,
                                    description: 'Chat-proposed Blender script',
                                });
                            } finally {
                                setRunningCommand(false);
                            }
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-orange-900/30 border border-orange-500/50 text-orange-300 text-xs font-bold hover:bg-orange-900/50 disabled:opacity-50 transition-colors"
                    >
                        <Box className="w-3.5 h-3.5" />
                        {runningCommand ? 'Running…' : 'Run Command'}
                    </button>
                )}
                {msg.role === 'assistant' && msg.reasoning && (
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowReasoning((prev) => !prev)}
                            className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-slate-800/70 border border-slate-700 text-[11px] text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition-colors"
                        >
                            <Brain className="w-3.5 h-3.5 text-violet-400" />
                            {showReasoning ? 'Hide reasoning' : 'Show reasoning'}
                        </button>
                        {showReasoning && (
                            <div className="mt-2 bg-slate-900/70 border border-violet-800/40 rounded-lg p-3">
                                <div className="text-[10px] uppercase tracking-wide text-violet-400 mb-1.5">Mossy's pre-answer reasoning</div>
                                <div className="text-[11px] text-slate-300 whitespace-pre-wrap">{msg.reasoning}</div>
                            </div>
                        )}
                    </div>
                )}
                {msg.role === 'assistant' && (msg.citations?.length || 0) > 0 && (
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowCitations((prev) => !prev)}
                            className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-slate-800/70 border border-slate-700 text-[11px] text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition-colors"
                        >
                            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                            {showCitations ? 'Hide sources' : 'Explain why'}
                        </button>
                        {showCitations && (
                            <div className="mt-2 space-y-2 bg-slate-900/70 border border-slate-800 rounded-lg p-3">
                                {msg.citations?.map((c, idx) => (
                                    <div key={`${c.title}-${idx}`} className="border-b border-slate-800 last:border-b-0 pb-2 last:pb-0">
                                        <div className="text-xs text-slate-100 font-semibold">{c.title}</div>
                                        <div className="mt-1 text-[10px] text-slate-400">Credit: {c.creditName || 'Uncredited'}</div>
                                        <div className="text-[10px] text-slate-500 truncate">Source: {c.source || 'Unknown'}</div>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                                            <span className="px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-300 bg-emerald-500/10 uppercase">
                                                Trust: {c.trustLevel || 'personal'}
                                            </span>
                                            {c.creditUrl && (
                                                <button
                                                    type="button"
                                                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                                    onClick={() => void openExternal(c.creditUrl!)}
                                                >
                                                    Open credit
                                                </button>
                                            )}
                                            {c.source && /^https?:/i.test(c.source) && (
                                                <button
                                                    type="button"
                                                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                                    onClick={() => void openExternal(c.source!)}
                                                >
                                                    Open source
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {/* ── Brain B tutor contract: abstention notice, check question, mode badge ── */}
                {msg.role === 'assistant' && msg.abstained && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-700/40 text-amber-300 text-xs">
                        <Database className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Mossy has no documentation covering this — the answer above is an honest "I don't know," not a guess.</span>
                    </div>
                )}
                {msg.role === 'assistant' && msg.checkQuestion && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-violet-950/30 border border-violet-700/40">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-violet-400 mb-1">
                            <Brain className="w-3 h-3" />
                            Check your understanding
                        </div>
                        <div className="text-xs text-violet-200">{msg.checkQuestion}</div>
                    </div>
                )}
                {/* Space reserved from the first render (mode is known synchronously)
                    rather than having the card above pop in unannounced once /contract
                    — a separate, unawaited backend call — settles a beat later. */}
                {msg.role === 'assistant' && msg.contractPending && !msg.checkQuestion && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-violet-950/15 border border-violet-800/25 animate-pulse">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-violet-500">
                            <Brain className="w-3 h-3" />
                            Preparing a check question…
                        </div>
                    </div>
                )}
                {msg.role === 'assistant' && msg.mode && msg.mode !== 'answer' && (
                    <div className="mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 uppercase tracking-wide">
                            {msg.mode} mode
                        </span>
                    </div>
                )}
                {msg.role === 'assistant' && msg.usedSceneContext && (
                    <div className="mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-700/40 text-cyan-300 uppercase tracking-wide">
                            <Box className="w-2.5 h-2.5" />
                            Read your Blender scene
                        </span>
                    </div>
                )}
                {msg.role === 'assistant' && msg.addonOutdated && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-700/40 text-amber-300 text-xs">
                        <Box className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>This question needed your live Blender scene, but your Blender add-on is out of date and doesn't support that yet — update it from the Runtime Hub's Desktop Bridge tab.</span>
                    </div>
                )}
                {/* Distinct from abstained/addonOutdated: this means Brain B itself
                    (retrieval, citations, scene-awareness) wasn't reachable for this
                    turn at all — the answer above may be a generic guess where a
                    grounded one was possible, not because the question was
                    unanswerable but because a background service was down. */}
                {msg.role === 'assistant' && msg.enrichmentUnavailable && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/60 text-slate-400 text-xs">
                        <Database className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Mossy's knowledge/context service (Brain B) wasn't reachable for this answer — no citations or live scene data were used.</span>
                    </div>
                )}
                {/* Mossy's actual primary is cloud generation — this fires only when that
                    was genuinely unavailable (no backend/API key, network failure) and a
                    local model answered instead. Local models are meaningfully weaker at
                    following a system prompt this large, so this is disclosed rather than
                    passed off as a routine answer. */}
                {msg.role === 'assistant' && msg.usedLocalFallback && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/60 text-slate-400 text-xs">
                        <Cpu className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Mossy's main cloud service was unavailable, so this answer came from a local backup model — it may be less reliable than usual.</span>
                    </div>
                )}
                {/* ── Copy button + Training feedback row (assistant messages only) ── */}
                {msg.role === 'assistant' && msg.content && !msg.content.startsWith('**[') && (
                    <div className="pt-1 flex items-center gap-1 flex-wrap">
                        {/* Copy to clipboard */}
                        <CopyButton content={msg.content} />
                        <button
                            type="button"
                            title="Good answer — save to training dataset"
                            aria-label="Rate response good"
                            onClick={() => {
                                if (rating === 'good') return;
                                setRating('good');
                                onRate?.(msg.id, 'good');
                            }}
                            className={`px-2 py-0.5 rounded text-xs transition-colors ${rating === 'good' ? 'bg-emerald-700/60 text-emerald-200 border border-emerald-600' : 'bg-slate-800/60 text-slate-400 hover:text-emerald-300 border border-slate-700'}`}
                        >
                            👍
                        </button>
                        <button
                            type="button"
                            title="Bad answer — save to training dataset to improve"
                            aria-label="Rate response bad"
                            onClick={() => {
                                // `rating` is set immediately for UI feedback (button highlight).
                                // The training-data save is deferred — it happens when the user
                                // confirms via the "Save correction" button below.
                                setRating('bad');
                                setShowEditBox(true);
                            }}
                            className={`px-2 py-0.5 rounded text-xs transition-colors ${rating === 'bad' ? 'bg-red-800/60 text-red-200 border border-red-700' : 'bg-slate-800/60 text-slate-400 hover:text-red-300 border border-slate-700'}`}
                        >
                            👎
                        </button>
                        {rating && <span className="text-[10px] text-slate-500">{rating === 'good' ? 'Saved to training data ✓' : 'Edit the correct answer below and click Save:'}</span>}
                        {showEditBox && (
                            <div className="w-full mt-1 space-y-1">
                                <textarea
                                    value={editedAnswer || msg.content}
                                    onChange={e => setEditedAnswer(e.target.value)}
                                    rows={3}
                                    className="w-full bg-slate-950/70 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 resize-y outline-none"
                                    placeholder="Edit this response to the correct answer…"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onRate?.(msg.id, 'bad', editedAnswer || msg.content);
                                            setShowEditBox(false);
                                        }}
                                        className="text-xs px-2 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white"
                                    >
                                        Save correction
                                    </button>
                                    <button type="button" onClick={() => { setShowEditBox(false); setRating(null); }} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300">Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});
MessageItem.displayName = 'MessageItem';

// Memoized List Container
const MessageList = React.memo(({ messages, onRate, ...props }: any) => {
    const messageListRef = useRef<HTMLDivElement>(null);
    const wheelHandler = useHorizontalScroll(messageListRef);

    return (
        <div
            ref={messageListRef}
            onWheel={wheelHandler}
            className="flex-1 overflow-y-auto overflow-x-auto p-4 space-y-6 scroll-smooth"
            style={{ scrollbarGutter: 'stable' }}
        >
            {messages.length === 0 && <QuickPromptChips onSelect={props.onQuickPrompt ?? (() => {})} />}
            {messages.map((msg: ChatMessage) => (
                <MessageItem key={msg.id} msg={msg} onRate={onRate} {...props} />
            ))}
            {props.children}
        </div>
    );
});
MessageList.displayName = 'MessageList';

export const ChatInterface: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const appliedPrefillRef = useRef(false);
    const voiceStateBeforeLiveRef = useRef<boolean | null>(null);
    const CHAT_PREFILL_KEY = 'mossy_chat_prefill_v1';
    const CHAT_NOTES_SNAPSHOT = 12;
    const CHAT_NOTES_MAX_CHARS = 8000;

    // Global Live State
    const { isActive: isLiveActive, isMuted: isLiveMuted, toggleMute: toggleLiveMute, disconnect: disconnectLive } = useLive();

    // Activity Monitoring Hook
    const { logActivity, suggestions, getTopSuggestions } = useActivityMonitor();
    const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Set<string>>(new Set());

    const handleDismissSuggestion = (id: string) => {
      setDismissedSuggestionIds(prev => new Set([...prev, id]));
    };

    const handleAcceptSuggestion = (id: string) => {
      setDismissedSuggestionIds(prev => new Set([...prev, id]));
    };

    // Analytics Hook
    const { trackEvent, trackPageView } = useAnalytics();

    // State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [workingMemory, setWorkingMemory] = useState<string>("Initializing modding education protocol...");
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Voice State
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => {
        if (isLiveActive) return false;
        const saved = localStorage.getItem('mossy_voice_enabled');
        console.log('[ChatInterface] Voice enabled from localStorage:', saved);
        return saved === 'true' || saved === null; // Default to true if not set
    });

    const [isListening, setIsListening] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0); // Audio meter level (0-100)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    // Bridge State
    const [isBridgeActive, setIsBridgeActive] = useState(false);
    const [activeDrivers, setActiveDrivers] = useState<any[]>([]);
    const [isBlenderLinked, setIsBlenderLinked] = useState(false);
    const [isMonitoringPaused, setIsMonitoringPaused] = useState(() => {
        return localStorage.getItem('mossy_monitoring_paused') === 'true';
    });
    // Conversation pause is intentionally NOT restored from localStorage — it always
    // starts as "active" so Mossy is ready to respond on every app launch.
    const [isConversationPaused, setIsConversationPaused] = useState(false);
    const [liveTools, setLiveTools] = useState<string[]>([]);
    const [liveChecklist, setLiveChecklist] = useState<string[]>([]);

    // Tool Execution State
    const [activeTool, setActiveTool] = useState<ToolExecution | null>(null);

    // Onboarding & Context
    const [onboardingState, setOnboardingState] = useState<OnboardingState>('init');
    const [scanProgress, setScanProgress] = useState(0);
    const [detectedApps, setDetectedApps] = useState<DetectedApp[]>([]);
    const [formalSettings, setFormalSettings] = useState<any>(null);

    // Project Memory
    const [projectContext, setProjectContext] = useState<string | null>(null);
    const [projectData, setProjectData] = useState<ProjectData | null>(null);
    const [showProjectPanel, setShowProjectPanel] = useState(false);

    // Self-Improvement Panel
    const [showSelfImprovementPanel, setShowSelfImprovementPanel] = useState(false);

    // System Profile
    const [profile, setProfile] = useState<SystemProfile | null>(() => {
        try {
            const saved = localStorage.getItem('mossy_system_profile');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });

    // Shared Memory State
    const [scannedFiles, setScannedFiles] = useState<any[]>([]);
    const [scannedMap, setScannedMap] = useState<any>(null);
    const [cortexMemory, setCortexMemory] = useState<any[]>([]);
    const [knowledgeCount, setKnowledgeCount] = useState<number>(() => {
        try {
            const raw = localStorage.getItem('mossy_knowledge_vault');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed.length : 0;
        } catch {
            return 0;
        }

    });

    const deriveModTags = useCallback(() => {
        const tags: string[] = [];
        if (projectData?.categories && Array.isArray(projectData.categories)) {
            projectData.categories.forEach((c) => {
                const v = String(c || '').toLowerCase();
                if (!v) return;
                if (v === 'asset') {
                    tags.push('mesh', 'texture');
                } else if (v === 'world') {
                    tags.push('settlement');
                } else if (v === 'ui') {
                    tags.push('ui');
                } else {
                    tags.push(v);
                }
            });
        }

        const keywordText = `${projectData?.name || ''} ${projectData?.notes || ''}`.toLowerCase();
        if (keywordText.includes('worldspace')) tags.push('worldspace');
        if (keywordText.includes('environment')) tags.push('environment');
        if (keywordText.includes('patch')) tags.push('patching');
        if (keywordText.includes('animation')) tags.push('animation');
        if (keywordText.includes('npc') || keywordText.includes('mpc')) tags.push('npc');
        if (keywordText.includes('creature')) tags.push('creature');
        if (keywordText.includes('quest')) tags.push('quest');

        if (tags.length === 0) {
            try {
                const current = ModProjectStorage.getCurrentMod();
                if (current?.type) tags.push(String(current.type).toLowerCase());
            } catch {
                // ignore
            }
        }

        return Array.from(new Set(tags));
    }, [projectData]);

    const buildLiveChecklist = useCallback((tools: string[], modTags: string[]) => {
        const names = tools.map(t => t.toLowerCase());
        const tags = modTags.map(t => t.toLowerCase());
        const list: string[] = [];
        const pushUnique = (item: string) => {
            if (!list.includes(item)) list.push(item);
        };

        if (names.some(n => n.includes('blender'))) {
            pushUnique('Blender: confirm unit scale 1.0 and FPS 30 for FO4.');
            pushUnique('Blender: apply transforms, triangulate, then export with FO4 NIF profile.');
            pushUnique('Blender: validate normals and smoothing before export.');
        }

        if (names.some(n => n.includes('creation') || n.includes('ck'))) {
            pushUnique('Creation Kit: set the correct plugin as Active File before edits.');
            pushUnique('Creation Kit: avoid deletes; disable refs instead.');
        }

        if (names.some(n => n.includes('xedit') || n.includes('fo4edit'))) {
            pushUnique('xEdit: run conflict filter before edits; check ITMs/UDRs before release.');
        }

        if (names.some(n => n.includes('nifskope'))) {
            pushUnique('NifSkope: open the NIF to verify paths, collision, and shader flags.');
        }

        if (names.some(n => n.includes('bodyslide') || n.includes('outfitstudio'))) {
            pushUnique('BodySlide/Outfit Studio: build with the correct preset and export to Data.');
        }

        if (names.some(n => n.includes('archive2') || n.includes('bae'))) {
            pushUnique('Archive2/BAE: confirm archive paths match Data folder layout.');
        }

        if (names.some(n => n.includes('mo2') || n.includes('mod organizer'))) {
            pushUnique('MO2: deploy and confirm the plugin is enabled in the right order.');
        }

        if (names.some(n => n.includes('vortex'))) {
            pushUnique('Vortex: deploy and confirm the plugin is enabled in the right order.');
        }

        if (tags.includes('weapon')) {
            pushUnique('Weapon: verify attach points and keywords in CK/xEdit.');
        }

        if (tags.includes('armor')) {
            pushUnique('Armor: confirm bone weights and partitions before export.');
        }

        if (tags.includes('quest')) {
            pushUnique('Quest: confirm objectives, stages, and aliases compile without errors.');
            pushUnique('Quest: verify alias fill conditions and script properties.');
            pushUnique('Quest: audit dialogue scenes, conditions, and topic links.');
            pushUnique('Quest: confirm voice assets and lip files (or set silent voice).');
        }

        if (tags.includes('worldspace')) {
            pushUnique('Worldspace: finalize navmesh and precombines after layout changes.');
        }

        if (tags.includes('npc')) {
            pushUnique('NPC: verify AI packages, inventory, and factions in CK.');
        }

        if (tags.includes('creature')) {
            pushUnique('Creature: confirm behavior graph/animation set and attack data.');
        }

        if (tags.includes('animation')) {
            pushUnique('Animation: validate HKX export and in-game playback test.');
        }

        if (tags.includes('patching')) {
            pushUnique('Patching: resolve conflicts and create a compatibility patch.');
        }

        if (tags.includes('environment')) {
            pushUnique('Environment: verify lighting, occlusion, and performance budgets.');
        }

        if (tags.includes('settlement')) {
            pushUnique('Settlement: validate Workshop keywords and precombine safety.');
        }

        if (tags.includes('gameplay')) {
            pushUnique('Gameplay: review balance values and test in game.');
        }

        if (tags.includes('texture')) {
            pushUnique('Texture: verify DDS format and correct _d/_n/_s naming.');
        }

        if (tags.includes('mesh')) {
            pushUnique('Mesh: confirm collision and LOD settings where needed.');
        }

        if (tags.includes('script')) {
            pushUnique('Script: compile Papyrus and review logs for warnings.');
        }

        return list.slice(0, 8);
    }, []);

    useEffect(() => {
        modTagsRef.current = deriveModTags();
        if (!isMonitoringPaused) {
            setLiveChecklist(buildLiveChecklist(liveTools, modTagsRef.current));
        }
    }, [deriveModTags, isMonitoringPaused, liveTools, buildLiveChecklist]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const lastSendTimeRef = useRef<number>(0); // Prevent rapid duplicate sends
    const modTagsRef = useRef<string[]>([]);
    const activeStreamIdRef = useRef<string | null>(null);
    const stoppedStreamIdsRef = useRef<Set<string>>(new Set());
    const generationAbortControllerRef = useRef<AbortController | null>(null);

    const getCurrentProjectStepSummary = () => {
        try {
            const current = ModProjectStorage.getCurrentMod();
            if (!current) return '';
            const inProgress = current.steps.find((step) => step.status === 'in-progress');
            const pending = current.steps.find((step) => step.status === 'pending');
            const nextStep = inProgress || pending;
            if (!nextStep) return '';
            const status = nextStep.status.replace('-', ' ');
            const completed = current.steps.filter(s => s.status === 'completed').length;
            return `Current Step: ${nextStep.title} (${status}) [${completed}/${current.steps.length}]`;
        } catch {
            return '';
        }
    };

    const updateChatWorkingMemory = (history: Array<{ role: 'user' | 'assistant'; content: string }>) => {
        const snapshot = history.slice(-CHAT_NOTES_SNAPSHOT);
        if (snapshot.length === 0) return;

        const blockStart = '--- CHAT SESSION NOTES ---';
        const blockEnd = '--- END CHAT SESSION NOTES ---';
        const stepSummary = getCurrentProjectStepSummary();
        const notes = snapshot
            .map((entry) => `${entry.role === 'user' ? 'User' : 'Mossy'}: ${entry.content}`)
            .join('\n');
        const stepLine = stepSummary ? `\n${stepSummary}` : '';
        const nextBlock = `${blockStart}\n${notes}${stepLine}\n${blockEnd}`;

        try {
            const existing = localStorage.getItem('mossy_working_memory') || '';
            const withoutBlock = existing.replace(new RegExp(`${blockStart}[\\s\\S]*?${blockEnd}`, 'g'), '').trim();
            const merged = [withoutBlock, nextBlock].filter(Boolean).join('\n\n').slice(-CHAT_NOTES_MAX_CHARS);
            localStorage.setItem('mossy_working_memory', merged);
        } catch (e) {
            console.warn('[ChatInterface] Failed to update working memory:', e);
        }
    };

    // Clear any stale "paused" flag left over from a previous session so users
    // are never stuck with Mossy silently refusing to respond on launch.
    useEffect(() => {
        try {
            localStorage.removeItem('mossy_conversation_paused');
        } catch {
            // ignore storage errors
        }
        // Remove any "web-access-failure" entries that a previous agent session
        // incorrectly wrote to the Knowledge Vault. These entries say "Mossy could not
        // reach the internet" and persist across sessions, polluting the AI's context
        // and causing it to report network failures even when connectivity is fine.
        try {
            const raw = localStorage.getItem('mossy_knowledge_vault');
            if (raw) {
                const vault = JSON.parse(raw);
                if (Array.isArray(vault)) {
                    const cleaned = vault.filter(
                        (item: any) => item?.id?.startsWith?.('web-access-failure-') === false
                    );
                    if (cleaned.length !== vault.length) {
                        localStorage.setItem('mossy_knowledge_vault', JSON.stringify(cleaned));
                        console.log('[ChatInterface] Removed stale web-access-failure vault entries');
                    }
                }
            }
        } catch {
            // ignore storage errors — vault cleanup is best-effort
        }
    }, []);

    // Accept a one-time prefill (Install Wizard → Chat handoff, etc.)
    useEffect(() => {
        // Track page view
        trackPageView('chat_interface');

        if (appliedPrefillRef.current) return;

        const statePrefill = (location.state as any)?.prefill;
        const storedPrefill = (() => {
            try {
                return localStorage.getItem(CHAT_PREFILL_KEY);
            } catch {
                return null;
            }
        })();

        const prefill = typeof statePrefill === 'string' ? statePrefill : (storedPrefill || '');
        if (!prefill || inputText.trim()) return;

        setInputText(prefill);
        appliedPrefillRef.current = true;

        try {
            localStorage.removeItem(CHAT_PREFILL_KEY);
        } catch {
            // ignore
        }

        if (typeof statePrefill === 'string') {
            navigate('/chat', { replace: true, state: {} });
        }
    }, [location.state, navigate, inputText]);

    // --- PERSISTENCE LAYER (DEBOUNCED) ---
    useEffect(() => {
        // Save messages with debounce
        const saveTimeout = setTimeout(() => {
            if (messages.length > 0) {
                try {
                    localStorage.setItem('mossy_messages', JSON.stringify(messages));
                    // Also save to auto-save manager
                    autoSaveManager.updateCurrentChatHistory(messages);
                    // Durable file backup — survives reinstalls and localStorage clears
                    window.electron?.api?.saveChatHistory(messages).catch((err: unknown) => {
                        console.error('[ChatInterface] Failed to write chat history backup:', err);
                    });
                } catch (e) {
                    console.error("Failed to save history (Quota Exceeded?)", e);
                }
            }
            localStorage.setItem('mossy_working_memory', workingMemory);
        }, 2000);

        return () => clearTimeout(saveTimeout);
    }, [messages, workingMemory]);

    useEffect(() => {
        const api = (window as any).electron?.api || (window as any).electronAPI;

        const refreshSettings = () => {
            if (api?.getSettings) {
                api.getSettings().then(setFormalSettings).catch(() => { });
            }
        };

        const handleSettingsUpdate = () => {
            console.log('[ChatInterface] Settings updated via broadcast, refreshing...');
            refreshSettings();
        };

        const checkState = () => {
            const active = localStorage.getItem('mossy_bridge_active') === 'true';
            setIsBridgeActive(active);

            try {
                const drivers = JSON.parse(localStorage.getItem('mossy_bridge_drivers') || '[]');
                setActiveDrivers(drivers);
            } catch (e) {
                console.error('Failed to load bridge drivers:', e);
            }

            // CHECK BLENDER ADD-ON STATUS
            const blenderActive = localStorage.getItem('mossy_blender_active') === 'true';
            setIsBlenderLinked(blenderActive);

            const monitoringPaused = localStorage.getItem('mossy_monitoring_paused') === 'true';
            setIsMonitoringPaused(monitoringPaused);

            if (monitoringPaused) {
                setLiveTools([]);
                setLiveChecklist([]);
            } else {
                try {
                    const activeRaw = localStorage.getItem('mossy_active_tools');
                    const active = activeRaw ? JSON.parse(activeRaw) : null;
                    const toolNames = Array.isArray(active?.tools)
                        ? active.tools.map((t: any) => String(t?.name || '')).filter(Boolean)
                        : [];
                    setLiveTools(toolNames);
                    setLiveChecklist(buildLiveChecklist(toolNames, modTagsRef.current));
                } catch {
                    setLiveTools([]);
                    setLiveChecklist([]);
                }
            }

            // IMPORTANT: Do NOT auto-rescan on focus/startup.
            // The user's approved tool permissions should persist between sessions.
            // Scans should only occur when explicitly triggered by the user.

            refreshSettings();

            try {
                const auditorData = localStorage.getItem('mossy_scan_auditor');
                if (auditorData) setScannedFiles(JSON.parse(auditorData));

                const mapData = localStorage.getItem('mossy_scan_cartographer');
                if (mapData) setScannedMap(JSON.parse(mapData));

                const memoryData = localStorage.getItem('mossy_cortex_memory');
                if (memoryData) setCortexMemory(JSON.parse(memoryData));

                const vaultRaw = localStorage.getItem('mossy_knowledge_vault');
                if (vaultRaw) {
                    const vault = JSON.parse(vaultRaw);
                    setKnowledgeCount(Array.isArray(vault) ? vault.length : 0);
                } else {
                    setKnowledgeCount(0);
                }
            } catch (e) {
                console.error('Failed to load cortex data:', e);
            }
        };

        window.addEventListener('mossy-settings-updated', handleSettingsUpdate);
        checkState();
        window.addEventListener('focus', checkState);
        window.addEventListener('mossy-memory-update', checkState);
        window.addEventListener('mossy-bridge-connected', checkState);
        window.addEventListener('mossy-driver-update', checkState);
        window.addEventListener('mossy-blender-linked', checkState);
        window.addEventListener('mossy-monitoring-toggle', checkState);
        window.addEventListener('storage', checkState);
        // Reduced from 2s to 10s — event listeners above already handle all
        // real-time state changes. This is just a safety net for missed events.
        const bridgePoll = setInterval(checkState, 10000);

        // Initial Load
        const loadInitialState = async () => {
            try {
                const savedMessages = localStorage.getItem('mossy_messages');
                const savedState = localStorage.getItem('mossy_state');
                const savedProject = localStorage.getItem('mossy_project');
                const savedApps = localStorage.getItem('mossy_apps');
                const savedIntegratedTools = localStorage.getItem('mossy_integrated_tools');
                const savedVoice = localStorage.getItem('mossy_voice_enabled');
                const savedMemory = localStorage.getItem('mossy_working_memory');

                // Try to load from auto-save manager first
                const recoveredSession = await autoSaveManager.recoverFromCrash();
                if (recoveredSession && recoveredSession.chatHistory && recoveredSession.chatHistory.length > 0) {
                    console.log('[ChatInterface] Recovered chat history from auto-save');
                    setMessages(recoveredSession.chatHistory);
                } else if (savedMessages) {
                    setMessages(JSON.parse(savedMessages));
                } else {
                    // localStorage is empty — try restoring from the durable file backup
                    // so conversations are never lost after a reinstall.
                    try {
                        const fromFile = await window.electron?.api?.loadChatHistoryFromFile?.() ?? [];
                        if (Array.isArray(fromFile) && fromFile.length > 0) {
                            console.info('[ChatInterface] Restored', fromFile.length, 'message(s) from file backup.');
                            localStorage.setItem('mossy_messages', JSON.stringify(fromFile));
                            setMessages(fromFile as any[]);
                        } else {
                            initMossy();
                        }
                    } catch {
                        initMossy();
                    }
                }

                if (savedMemory) setWorkingMemory(savedMemory);

                if (savedState) setOnboardingState(JSON.parse(savedState));
                if (savedProject) {
                    const parsed = JSON.parse(savedProject);
                    setProjectContext(parsed.name);
                    setProjectData(parsed);
                    setShowProjectPanel(true);
                }
                if (savedApps) {
                    setDetectedApps(JSON.parse(savedApps));
                } else if (savedIntegratedTools) {
                    // Back-compat: first-run onboarding stored approvals here.
                    // Promote into mossy_apps so the rest of the app has a single source of truth.
                    const tools = JSON.parse(savedIntegratedTools) as Array<{ name: string; path?: string; category?: string }>;
                    const promoted = tools
                        .filter(t => t?.name)
                        .map((t, idx) => ({
                            id: `integrated-${idx}-${Math.random().toString(36).slice(2, 7)}`,
                            name: t.name,
                            category: t.category || 'Tool',
                            checked: true,
                            path: t.path
                        }));
                    setDetectedApps(promoted);
                    localStorage.setItem('mossy_apps', JSON.stringify(promoted));
                }
                if (savedVoice && !isLiveActive) setIsVoiceEnabled(JSON.parse(savedVoice));

                // Update auto-save manager with current state
                autoSaveManager.updateCurrentChatHistory(savedMessages ? JSON.parse(savedMessages) : []);
                autoSaveManager.updateCurrentSettings({ voiceEnabled: savedVoice ? JSON.parse(savedVoice) : false });
                autoSaveManager.updateCurrentUIState({
                    onboardingState: savedState ? JSON.parse(savedState) : 'init',
                    projectContext: savedProject ? JSON.parse(savedProject) : null
                });

            } catch (e) {
                console.error("Load failed", e);
                initMossy();
            }
        };

        loadInitialState();

        return () => {
            window.removeEventListener('mossy-settings-updated', handleSettingsUpdate);
            window.removeEventListener('focus', checkState);
            window.removeEventListener('mossy-memory-update', checkState);
            window.removeEventListener('mossy-bridge-connected', checkState);
            window.removeEventListener('mossy-driver-update', checkState);
            window.removeEventListener('mossy-blender-linked', checkState);
            window.removeEventListener('mossy-monitoring-toggle', checkState);
            window.removeEventListener('storage', checkState);
            clearInterval(bridgePoll);

            // MEMORY LEAK FIX: Clean up audio resources on unmount
            if (activeSourceRef.current) {
                try {
                    activeSourceRef.current.stop();
                    activeSourceRef.current.disconnect();
                } catch (e) {
                    // Already stopped
                }
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
        };
    }, []);

    // Dedicated listener for vault updates (immediate UI feedback)
    useEffect(() => {
        const handler = () => {
            try {
                const raw = localStorage.getItem('mossy_knowledge_vault');
                const parsed = raw ? JSON.parse(raw) : [];
                setKnowledgeCount(Array.isArray(parsed) ? parsed.length : 0);
            } catch {
                setKnowledgeCount(0);
            }
        };
        window.addEventListener('mossy-knowledge-updated', handler);
        return () => window.removeEventListener('mossy-knowledge-updated', handler);
    }, []);

    // Other state persistence
    useEffect(() => {
        localStorage.setItem('mossy_state', JSON.stringify(onboardingState));
        if (detectedApps.length > 0) localStorage.setItem('mossy_apps', JSON.stringify(detectedApps));
        localStorage.setItem('mossy_voice_enabled', JSON.stringify(isVoiceEnabled));
        if (projectData) localStorage.setItem('mossy_project', JSON.stringify(projectData));
        else localStorage.removeItem('mossy_project');
    }, [onboardingState, detectedApps, projectData, isVoiceEnabled]);

    // Conflict Resolution for Audio
    useEffect(() => {
        if (isLiveActive) {
            // Save current voice state before Live forces it off, so we can restore it later.
            // Guard: only save if not already saved (prevents overwrite on re-entry).
            if (voiceStateBeforeLiveRef.current === null) {
                voiceStateBeforeLiveRef.current = isVoiceEnabled;
            }
            if (isVoiceEnabled) setIsVoiceEnabled(false);
            if (isPlayingAudio) stopAudio();
        } else if (voiceStateBeforeLiveRef.current !== null) {
            // Live session ended — restore the voice state that was active before it started.
            // Note: the voice toggle is disabled while Live is active, so the saved state
            // always reflects the user's last explicit preference.
            setIsVoiceEnabled(voiceStateBeforeLiveRef.current);
            voiceStateBeforeLiveRef.current = null;
        }
    }, [isLiveActive]);

    const initMossy = () => {
        const preferredName = String(formalSettings?.userPreferredName || 'Vault Dweller').trim() || 'Vault Dweller';
        const hasApps = localStorage.getItem('mossy_apps') || localStorage.getItem('mossy_integrated_tools');
        const toolAck = localStorage.getItem('mossy_tool_connection_ack') === 'true';
        if (hasApps) {
            const message = toolAck
                ? `👋 **Welcome back, ${preferredName}!**\n\nWhat are we working on today?`
                : `👋 **Welcome back, ${preferredName}!**\n\nI remember the tools and integrations you approved. I can use those permissions to help teach you workflows and (when the Desktop Bridge is online) interact with supported apps to automate steps.\n\nWhat are we working on today?`;

            setMessages([{
                id: 'init',
                role: 'assistant',
                content: message,
                timestamp: Date.now()
            }]);
            if (!toolAck) {
                localStorage.setItem('mossy_tool_connection_ack', 'true');
            }
            setOnboardingState('ready');
            // Speak the returning-user greeting if TTS is enabled.
            speakMossy(`Welcome back, ${preferredName}! What are we working on today?`, { cancelExisting: true });
            return;
        }

        setMessages([{
            id: 'init',
            role: 'assistant',
            content: `👋 **Hello, ${preferredName}!**\n\nI'm **Mossy**, your dedicated AI assistant for Fallout 4 modding.\n\nTo provide the best assistance, I need to perform a **Deep Scan** to identify your modding tools (Creation Kit, xEdit, Blender, etc.) across all your system drives. I will remember these so we only need to do this once.\n\n**Ready to begin the scan?**`,
            timestamp: Date.now()
        }]);
        setOnboardingState('init');
        // Speak the new-user greeting if TTS is enabled.
        speakMossy("Hello! I'm Mossy, your Fallout 4 modding assistant. Ready to begin the scan?", { cancelExisting: true });
    };

    const resetMemory = async () => {
        const ok = await window.electronAPI?.showConfirm?.(
            'Perform Chat Reset?',
            'This will clear the conversation history and current project state, but keep global settings (Avatar, Bridge, Tutorial) and your scan results.'
        );
        if (ok) {
            // Clear ONLY conversation-related data.
            // Scan results (mossy_all_detected_apps, mossy_scan_summary, etc.) and
            // tool integration choices are kept — they belong to the scan, not the chat.
            localStorage.removeItem('mossy_messages');
            localStorage.removeItem('mossy_state');
            localStorage.removeItem('mossy_project');
            localStorage.removeItem('mossy_cortex_memory');
            localStorage.removeItem('mossy_conversation_paused');
            // Also wipe the durable file backup so the cleared history does not
            // restore itself on the next launch. If this IPC call fails, the file
            // backup remains but localStorage is still cleared — old messages may
            // reappear on the next restart in that unlikely case.
            window.electron?.api?.saveChatHistory([]).catch((err: unknown) => {
                console.warn('[ChatInterface] Failed to clear chat history file backup — old messages may restore on next launch:', err);
            });

            setMessages([]);
            setProjectContext(null);
            setProjectData(null);
            initMossy();
            setShowProjectPanel(false);
        }
    };

    const toggleMonitoring = () => {
        const next = !isMonitoringPaused;
        setIsMonitoringPaused(next);
        try {
            localStorage.setItem('mossy_monitoring_paused', next ? 'true' : 'false');
            if (next) {
                localStorage.setItem('mossy_active_tools', JSON.stringify({ at: Date.now(), tools: [] }));
            }
            window.dispatchEvent(new Event('mossy-monitoring-toggle'));
        } catch {
            // ignore storage errors
        }
    };

    const toggleConversationPause = () => {
        const next = !isConversationPaused;
        setIsConversationPaused(next);
        if (next) {
            // Turning Mossy OFF — stop all speech and audio immediately
            stopMossySpeech();
            stopAudio();
            setIsLoading(false);
            setIsStreaming(false);
            setInputText('');
            console.log('[ChatInterface] Mossy turned OFF - speech and audio stopped');
        } else {
            // Turning Mossy back ON — ready for new messages
            setIsLoading(false);
            setIsStreaming(false);
            setInputText('');
            console.log('[ChatInterface] Mossy turned ON - ready for new messages');
        }
        window.dispatchEvent(new Event('mossy-conversation-toggle'));
        // Force UI update for all listeners
        setTimeout(() => {
            window.dispatchEvent(new Event('mossy-ui-sync'));
        }, 50);
    };

    // --- VOICE LOGIC ---
    const toggleVoiceMode = () => {
        if (isLiveActive) return;
        if (isVoiceEnabled) stopAudio();
        const newVoiceEnabled = !isVoiceEnabled;
        setIsVoiceEnabled(newVoiceEnabled);
        localStorage.setItem('mossy_voice_enabled', newVoiceEnabled.toString());
        console.log('[ChatInterface] Voice mode toggled to:', newVoiceEnabled);

        // Track voice mode toggle
        trackEvent('voice_mode_toggled', {
            enabled: newVoiceEnabled,
            wasLiveActive: isLiveActive
        });

        // Voice button fix: check TTS settings and available voices
        const browserTtsSettings = loadBrowserTtsSettings();
        if (!browserTtsSettings.enabled) {
            console.warn('[ChatInterface] TTS is not enabled. Enable TTS in Voice Settings.');
            return;
        }
        if (!browserTtsSettings.preferredVoiceName) {
            console.warn('[ChatInterface] No preferred voice selected. Select a voice in Voice Settings.');
        }
        if ('speechSynthesis' in window) {
            const voices = window.speechSynthesis.getVoices();
            if (!voices.length) {
                console.warn('[ChatInterface] No voices available. Install Windows voices and restart app.');
                return;
            }
        } else {
            console.warn('[ChatInterface] Browser TTS not available.');
            return;
        }
    };

    const stopAudio = () => {
        // Stop all active speech via the shared mossyTts helper.
        // stopMossySpeech() applies the pause() + cancel() workaround for the
        // Electron/Chromium bug where cancel() alone sometimes fails to stop TTS,
        // and also stops any cloud audio elements via VoiceService.
        try {
            stopMossySpeech();
        } catch (e) {
            // Non-critical — direct speechSynthesis cancel as last resort
            try {
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                }
            } catch { /* ignore */ }
        }

        if (activeSourceRef.current) {
            try {
                activeSourceRef.current.stop();
                activeSourceRef.current.disconnect();
            } catch (e) {
                // Already stopped/disconnected
            }
            activeSourceRef.current = null;
        }
        setIsPlayingAudio(false);
    };

    const startListening = async () => {
        if (isLiveActive) {
            toast.error('Live Voice is currently active. Disconnect Live Voice to use the chat microphone.');
            return;
        }

        // Check if transcription is available
        const api = (window as any).electron?.api || (window as any).electronAPI;
        if (!api?.transcribeAudio) {
            toast.error('Voice transcription is not available. Configure an OpenAI API key in Settings.');
            return;
        }

        // Track voice recording start
        trackEvent('voice_recording_started', {
            hasTranscriptionAPI: !!api?.transcribeAudio
        });

        const audioChunks: Blob[] = [];
        let mediaStream: MediaStream | null = null;
        let meterContext: AudioContext | null = null;
        let silenceTimer: ReturnType<typeof setTimeout> | null = null;
        let silenceDuration = 0;
        const SILENCE_THRESHOLD = 0.05; // More lenient threshold - only stop on actual silence, not quiet parts of speech
        const SILENCE_DURATION_MS = 5000; // 5 seconds of silence before auto-stopping (allows longer natural pauses in speech)
        const MIN_RECORDING_MS = 1000; // Minimum 1 second recording to avoid cutting off start of speech
        // Hard ceiling, NOT reactive to pauses -- unlike the silence detector below
        // (disabled because it cut people off mid-sentence), this can't misfire on a
        // normal thinking pause. Exists only to bound a forgotten/stuck recording (the
        // exact live-reproduced 2026-09-01 bug the toast/label above targets) so it
        // can't sit open indefinitely.
        const MAX_RECORDING_MS = 120000;
        let recordingStartTime = Date.now();

        try {
            console.log('[VoiceInput] Requesting microphone access...');
            setIsListening(true);
            // Reliability sweep (2026-09-01): live-reproduced bug -- recording has no
            // auto-stop (disabled below, see SILENCE_DURATION_MS's comment: it used to cut
            // users off mid-sentence), so a user who doesn't already know to click the mic
            // icon again just sees "Listening..." forever with nothing telling them what to
            // do next. Confirmed live: a recording can sit open indefinitely with zero
            // indication anything is wrong -- it looks identical to a silently broken
            // feature. This toast is the fix: make the required action impossible to miss.
            toast('🎙️ Recording... click the mic icon again when you\'re done talking to send it.', { duration: 6000, id: 'voice-recording-hint' });
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('[VoiceInput] Microphone access granted, starting recording...');
            recordingStartTime = Date.now();

            const mediaRecorder = new MediaRecorder(mediaStream);
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

            mediaRecorder.onstop = async () => {
                setIsListening(false);
                if (silenceTimer) clearTimeout(silenceTimer);
                if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
                if (meterContext) {
                    try {
                        await meterContext.close();
                    } catch {
                        // ignore close errors
                    }
                    meterContext = null;
                }

                // Send to Whisper for transcription
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                if (audioBlob.size < 100) {
                    console.log('[ChatInterface] Audio too small, ignoring');
                    return; // Ignore empty recordings
                }

                let transcript = '';

                // Transcribe via Electron main process (keeps API keys out of renderer)
                try {
                    const api = (window as any).electron?.api || (window as any).electronAPI;
                    if (!api?.transcribeAudio) {
                        console.warn('[VoiceInput] transcribeAudio IPC not available - check if API keys are configured');
                        toast.error('Voice transcription is not available. Configure an OpenAI API key in Settings.');
                        return;
                    } else {
                        console.log('[VoiceInput] Transcribing audio via main process... (size:', audioBlob.size, 'bytes)');
                        const ab = await audioBlob.arrayBuffer();
                        const resp = await api.transcribeAudio(ab, audioBlob.type || 'audio/webm');
                        if (resp?.success) {
                            transcript = String(resp.text || '').trim();
                            console.log('[VoiceInput] Transcript:', transcript);

                            // Track successful transcription
                            trackEvent('voice_transcription_success', {
                                transcriptLength: transcript.length,
                                audioSize: audioBlob.size
                            });
                        } else {
                            console.warn('[VoiceInput] Transcription failed:', resp?.error);

                            // Track failed transcription
                            trackEvent('voice_transcription_failed', {
                                error: resp?.error,
                                audioSize: audioBlob.size
                            });

                            const errorText = String(resp?.error || 'Unknown error');
                            if (/401|incorrect[_\s-]?api[_\s-]?key|unauthorized|invalid[_\s-]?api[_\s-]?key|backend authentication failed/i.test(errorText)) {
                                toast.error('Voice transcription authentication failed. Check the configured token, or switch to local Whisper in Settings.');
                            } else {
                                toast.error(`Voice transcription failed: ${errorText}`);
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[ChatInterface] Transcription failed:', err);
                }

                // Submit the transcript if we got one
                if (transcript) {
                    console.log('[ChatInterface] Got transcript, submitting:', transcript);
                    setInputText(prev => prev + (prev ? ' ' : '') + transcript);
                    // Auto-submit the transcribed text (only once)
                    setTimeout(() => {
                        console.log('[ChatInterface] Auto-submitting transcript');
                        handleSend(transcript);
                    }, 100);

                    // Track voice input submission
                    trackEvent('voice_input_submitted', {
                        transcriptLength: transcript.length,
                        autoSubmitted: true
                    });
                } else {
                    console.error('[ChatInterface] No transcription available from any service');

                    // Track voice input failure
                    trackEvent('voice_input_failed', {
                        reason: 'no_transcription'
                    });

                    toast.error('Voice transcription failed. Configure OpenAI in Desktop settings to use STT.');
                }
            };

            mediaRecorder.start();

            // Setup silence detection
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            meterContext = audioContext;
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            const source = audioContext.createMediaStreamSource(mediaStream);
            source.connect(analyser);

            const buffer = new Uint8Array(analyser.fftSize);
            const checkSilence = () => {
                analyser.getByteTimeDomainData(buffer);
                let sumSquares = 0;
                for (let i = 0; i < buffer.length; i++) {
                    const centered = (buffer[i] - 128) / 128;
                    sumSquares += centered * centered;
                }
                const rms = Math.sqrt(sumSquares / buffer.length);
                const normalized = Math.min(1, rms * 1.6);

                // Update audio level meter
                setAudioLevel(Math.round(normalized * 100));

                // DISABLED: Automatic silence detection was cutting off users mid-sentence
                // Instead, users must click the button again to stop recording
                // This gives them full control over when their message ends

                if (Date.now() - recordingStartTime > MAX_RECORDING_MS) {
                    console.log('[VoiceInput] Max recording duration reached, auto-stopping');
                    toast('Recording auto-stopped after 2 minutes of no one clicking stop -- click the mic to start a new one.', { duration: 5000 });
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                        mediaRecorderRef.current.stop();
                    }
                    return;
                }

                silenceTimer = setTimeout(checkSilence, 50);
            };

            silenceTimer = setTimeout(checkSilence, 50);

        } catch (err) {
            console.error('[VoiceInput] Mic access failed:', err);
            setIsListening(false);
            toast.error(`Microphone access failed: ${err instanceof Error ? err.message : 'Unknown error'}. Check your microphone permissions.`);
        }
    };

    const stopListening = async () => {
        console.log('[VoiceInput] Stopping recording...');
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };

    const speakText = async (textToSpeak: string) => {
        if (!textToSpeak || isLiveActive) {
            console.log('[ChatInterface] speakText skipped - text empty or live active:', { textToSpeak: !!textToSpeak, isLiveActive });
            return;
        }
        console.log('[ChatInterface] speakText called with text length:', textToSpeak.length);
        setIsPlayingAudio(true);

        try {
            // Race TTS against a generous safety timeout so that a hung browser
            // speech-synthesis promise can never block the next user message
            // from being sent (isLoading / isStreaming would stay true forever).
            const ttsTimeoutMs = Math.max(30000, textToSpeak.length * 100); // ~100ms/char, min 30s
            const ttsTimeout = new Promise<void>(resolve => setTimeout(() => {
                console.warn('[ChatInterface] speakText safety timeout reached — releasing send lock');
                resolve();
            }, ttsTimeoutMs));
            await Promise.race([speakMossy(textToSpeak, { cancelExisting: true }), ttsTimeout]);
            console.log('[ChatInterface] speakText completed successfully');
        } catch (err) {
            console.error('[ChatInterface] speakText failed:', err);
        }
        setIsPlayingAudio(false);
    };

    // --- CHAT LOGIC ---
    const generateSystemContext = async (query?: string) => {
        try {
            const guidanceMode = (localStorage.getItem('mossy_guidance_mode') || 'slow').toLowerCase();
            if (!localStorage.getItem('mossy_guidance_mode')) {
                localStorage.setItem('mossy_guidance_mode', guidanceMode);
            }
            const guidanceLine = `**GUIDANCE MODE:** ${guidanceMode.toUpperCase()} (one step at a time; wait for user confirmation)`;
            let hardwareCtx = "Hardware: Unknown";
            if (profile) {
                hardwareCtx = `**Spec:** ${profile.gpu} | ${profile.ram}GB RAM | Blender ${profile.blenderVersion}`;
            }

            // Load Memory Vault knowledge for context
            let knowledgeVaultContext = "";
            try {
                const manifest = buildKnowledgeManifestForModel();
                const relevant = buildRelevantKnowledgeVaultContext(query || '', {
                    maxItems: 10,
                    maxChars: 7000,
                    excludeTerms: formalSettings?.privacySettings?.modContentWhitelist ?? [],
                });
                if (manifest || relevant) {
                    knowledgeVaultContext = `\n**MOSSY'S KNOWLEDGE VAULT (CRITICAL):**${manifest}${relevant}`;
                }
            } catch (e) {
                console.warn('[ChatInterface] Failed to load memory vault:', e);
            }

            // Load vault assets for context
            // Reliability sweep (2026-09-01): was fully uncapped -- every vault asset,
            // every turn, same uncapped-list bug as Cortex Memory (00848ae0) and
            // Knowledge Vault had before its own maxItems/maxChars cap. Capped the
            // same way.
            let vaultContext = "";
            try {
                const vaultAssetsStr = typeof window !== 'undefined' ? window.localStorage.getItem('vault-assets-v1') : null;
                if (vaultAssetsStr) {
                    const vaultAssets = JSON.parse(vaultAssetsStr);
                    if (Array.isArray(vaultAssets) && vaultAssets.length > 0) {
                        const VAULT_ASSETS_MAX = 30;
                        const cappedAssets = vaultAssets.slice(0, VAULT_ASSETS_MAX);
                        const assetSummary = cappedAssets
                            .map((a: any) => `- ${a.name} (${a.type}${a.type === 'script' && (a.name.toLowerCase().endsWith('.bat') || a.name.toLowerCase().endsWith('.cmd')) ? ' - batch script' : ''})`)
                            .join('\n');
                        const omitted = vaultAssets.length - cappedAssets.length;
                        const omittedNote = omitted > 0 ? `\n(+${omitted} more vault asset${omitted === 1 ? '' : 's'} not shown)` : '';
                        vaultContext = `\n**VAULT ASSETS (Ready for Ingestion):**\n${assetSummary}${omittedNote}`;
                    }
                }
            } catch (e) {
                console.warn('[ChatInterface] Failed to load vault assets:', e);
            }

            let scanContext = "";
            // Reliability sweep (2026-09-01): was fully uncapped -- EVERY scanned file
            // and EVERY issue's full technicalDetails, every turn, regardless of how
            // large a scan was or how relevant it still is. Capped to the most recent
            // 20 files and each issue's details to 300 chars, same defensive pattern
            // as the other uncapped blocks found this session (Cortex Memory, vault
            // assets, Knowledge Vault).
            if (scannedFiles && scannedFiles.length > 0) {
                const SCAN_FILES_MAX = 20;
                const DETAIL_MAX_CHARS = 300;
                scanContext += "\n**THE AUDITOR - RECENT SCAN RESULTS:**\n";
                const cappedFiles = scannedFiles.slice(0, SCAN_FILES_MAX);
                cappedFiles.forEach((f: any) => {
                    scanContext += `- File: ${f.name} (Status: ${f.status.toUpperCase()})\n`;
                    if (f.issues && f.issues.length > 0) {
                        f.issues.forEach((issue: any) => {
                            const details = String(issue.technicalDetails || '');
                            const truncated = details.length > DETAIL_MAX_CHARS ? details.slice(0, DETAIL_MAX_CHARS) + '...' : details;
                            scanContext += `  * ERROR: ${issue.message}\n  * DETAILS: ${truncated}\n`;
                        });
                    }
                });
                const omittedFiles = scannedFiles.length - cappedFiles.length;
                if (omittedFiles > 0) scanContext += `(+${omittedFiles} more scanned file${omittedFiles === 1 ? '' : 's'} not shown)\n`;
            }

            let scanHistoryCtx = "";
            try {
                const lastScanRaw = localStorage.getItem('mossy_last_scan');
                const summaryRaw = localStorage.getItem('mossy_scan_summary');
                const summary = summaryRaw ? JSON.parse(summaryRaw) : null;
                const lastScan = lastScanRaw ? new Date(Number(lastScanRaw)) : null;
                const lastScanLine = lastScan && !Number.isNaN(lastScan.getTime())
                    ? `Last scan: ${lastScan.toLocaleString()}`
                    : 'Last scan: unknown';

                const totalPrograms = summary?.totalPrograms ?? 'unknown';
                const nvidiaTools = summary?.nvidiaTools ?? 'unknown';
                const aiTools = summary?.aiTools ?? 'unknown';

                const approved = (detectedApps || []).filter((a: any) => a?.checked !== false);
                const denied = (detectedApps || []).filter((a: any) => a?.checked === false);
                const permissionLine = approved.length === 0 && denied.length === 0
                    ? 'Permissions: not requested'
                    : `Permissions: approved ${approved.length}, denied ${denied.length}`;

                scanHistoryCtx = `\n**SCAN HISTORY & PERMISSIONS:**\n- ${lastScanLine}\n- Programs detected: ${totalPrograms} | NVIDIA tools: ${nvidiaTools} | AI tools: ${aiTools}\n- ${permissionLine}`;
            } catch {
                scanHistoryCtx = "\n**SCAN HISTORY & PERMISSIONS:**\n- Last scan: unknown\n- Permissions: unknown";
            }

            let liveToolCtx = "";
            try {
                const activeRaw = localStorage.getItem('mossy_active_tools');
                if (activeRaw) {
                    const active = JSON.parse(activeRaw);
                    const toolNames = Array.isArray(active?.tools) ? active.tools.map((t: any) => t.name).filter(Boolean) : [];
                    const activeAt = active?.at ? new Date(Number(active.at)) : null;
                    const activeLine = activeAt && !Number.isNaN(activeAt.getTime())
                        ? `Last tool sync: ${activeAt.toLocaleTimeString()}`
                        : 'Last tool sync: unknown';
                    const toolsLine = toolNames.length > 0 ? toolNames.join(', ') : 'None';
                    liveToolCtx = `\n**LIVE TOOL MONITORING:**\n- ${activeLine}\n- Active tools: ${toolsLine}`;
                } else {
                    liveToolCtx = "\n**LIVE TOOL MONITORING:**\n- No active tool context yet.";
                }
            } catch {
                liveToolCtx = "\n**LIVE TOOL MONITORING:**\n- Unavailable";
            }

            // Reliability sweep (2026-09-01): live-measured after the FO4KnowledgeBase
            // filtering fix landed -- systemInstruction dropped from ~614-617K to
            // ~377-397K per real turns in ai-diagnostics.log, a real ~35%+ cut, but that
            // still left a large unaccounted-for gap versus the ~150K static baseline +
            // the now-capped ~60K knowledge-base contribution. This block was the other
            // major uncapped contributor: EVERY ingested tutorial/doc in Cortex Memory,
            // unconditionally, on every single turn, with no item cap and no char budget
            // -- unlike every other context block here (Knowledge Vault: maxItems 10/
            // maxChars 7000; panel activity: capped at 12 events). A user who's ingested
            // a lot of reference material paid for the entire library every turn
            // regardless of relevance. Capped the same way Knowledge Vault already is.
            let learnedCtx = "";
            if (cortexMemory && cortexMemory.length > 0) {
                const LEARNED_MAX_ITEMS = 15;
                const LEARNED_MAX_CHARS = 5000;
                const indexed = cortexMemory.filter((s: any) => s.status === 'indexed');
                const capped = indexed.slice(0, LEARNED_MAX_ITEMS);
                let learnedItems = capped
                    .map((s: any) => `- [${s.type.toUpperCase()}] ${s.name}: ${s.summary || 'Content ingested.'}`)
                    .join('\n');
                if (learnedItems.length > LEARNED_MAX_CHARS) {
                    learnedItems = learnedItems.slice(0, LEARNED_MAX_CHARS) + '\n[...truncated to fit prompt budget...]';
                }
                const omitted = indexed.length - capped.length;
                const omittedNote = omitted > 0 ? `\n(+${omitted} more ingested item${omitted === 1 ? '' : 's'} not shown -- ask about a specific one by name if needed.)` : '';
                if (learnedItems) {
                    learnedCtx = `\n**INGESTED KNOWLEDGE (TUTORIALS & DOCS):**\n${learnedItems}${omittedNote}\n(Use this knowledge to answer user queries accurately based on the provided documents.)`;
                }
            }

            const communityLearningCtx = getCommunityLearningContextForModel();
            const toolPermissionsCtx = getToolPermissionsContextForModel({
                bridgeActive: isBridgeActive,
                blenderLinked: isBlenderLinked,
            });

            // Get current mod project info
            let modContext = "";
            try {
                const currentMod = ModProjectStorage.getCurrentMod();
                if (currentMod) {
                    const stats = ModProjectStorage.getProjectStats(currentMod.id);
                    modContext = `\n**CURRENT MOD PROJECT:** "${currentMod.name}"\n- Type: ${currentMod.type} | Status: ${currentMod.status}\n- Progress: ${currentMod.completionPercentage}% | Steps: ${stats?.completedSteps || 0}/${stats?.totalSteps || 0}\n- Version: ${currentMod.version}\n(Provide context-aware guidance for this specific mod.)`;
                }
            } catch (e) {
                // ModProjectStorage not available, skip
            }

            const bridgeStatus = isBridgeActive ? "ONLINE" : "OFFLINE";
            const blenderAddonKnowledge = isBlenderLinked
                ? (() => { try { return buildBlenderAddonContext(); } catch { return ''; } })()
                : '';
            const blenderContext = isBlenderLinked
                ? `**BLENDER LINK: ACTIVE (Mossy Link v6 — Fallout 4 Edition)**
You are co-piloting the user's live Blender session via the Mossy Link v6 add-on (port 9999).

WHAT YOU CAN DO (Mossy Link v6 capabilities):
- Execute Python scripts directly in Blender — the user clicks "Run Command" in chat to trigger them
- Read and report the user's current scene context (selected objects, modifiers, materials, mesh stats)
- Run FO4 NIF export presets: correct unit scale (1.0), FPS 30, apply transforms, triangulate, export via PyNifly
- Automate mesh cleanup: remove doubles, recalculate normals, fix UV seams, check for non-manifold geometry
- Set up FO4 Blender workflow: correct import settings for vanilla NIFs, skeleton alignment, bone weight display
- Run animation checks: verify armature hierarchy, bone roll, FO4 skeleton compatibility
- Assist with material/texture setup: PBR node setup for FO4 BGSM workflow, DDS texture assignment
- Help with PyNifly operations: import/export FO4 NIFs, handle BSSubIndexTriShape, fix skeleton data

RULES FOR BLENDER LINK ACTIVE:
- ALWAYS offer to run a Python script for any Blender task — don't just explain steps manually
- Tell the user to click the "Run Command" button that appears in chat BEFORE the script executes
- Reference the user's actual scene when context is available (selected mesh name, poly count, etc.)
- For FO4 NIF export, always use PyNifly — never the old Blender NIF plugin (incompatible with FO4)
- The user does NOT have 3DS Max unless they explicitly say so — do not mention it unprompted
${blenderAddonKnowledge ? '\n' + blenderAddonKnowledge : ''}`
                : `**BLENDER LINK: OFFLINE**
The Mossy Link v6 Blender add-on is NOT currently connected to the Desktop Bridge.
IMPORTANT RULES when Blender is detected or the user asks about Blender:
- DO NOT assume the user has 3DS Max, Maya, or any other 3D tool unless they explicitly say so. The knowledge base mentions 3DS Max in animation workflow guides but that does NOT mean the user has it installed.
- Guide the user to connect the Mossy Link v6 add-on: Runtime Hub (/runtime-hub) → Desktop Bridge → install 'Mossy Link v6'.
- Until connected, you can still explain what the Mossy Blender add-on does: it lets Mossy execute Python scripts directly in Blender, sync scene context, run FO4 NIF export presets, and automate mesh/animation workflows without the user copy-pasting code.
- For Blender questions, focus on MOSSY.SPACE-specific workflows (FO4 NIF export, PyNifly, unit scale 1.0, FPS 30, applying transforms before export) rather than generic Blender tutorials.`;
            const toolAck = localStorage.getItem('mossy_tool_connection_ack') === 'true';
            const toolAckLine = `**Tool Connection Notice:** ${toolAck ? 'ACKNOWLEDGED (do not repeat unless asked)' : 'NOT ACKNOWLEDGED'}`;
            const monitoringLine = `**Monitoring Status:** ${isMonitoringPaused ? 'PAUSED' : 'ACTIVE'}`;

            let settingsCtx = "";
            if (formalSettings) {
                const s = formalSettings;
                settingsCtx = "\n**USER OVERRIDE SETTINGS (HIGHEST PRIORITY):**\n" +
                    (s.fallout4Path ? `- **Fallout 4 Game Folder:** ${s.fallout4Path}\n` : "") +
                    (s.mo2Path ? `- MO2/ModOrganizer: ${s.mo2Path}\n` : "") +
                    (s.xeditPath ? `- FO4Edit/XEdit: ${s.xeditPath}\n` : "") +
                    (s.wryeBashPath ? `- Wrye Bash: ${s.wryeBashPath}\n` : "") +
                    (s.vortexPath ? `- Vortex: ${s.vortexPath}\n` : "") +
                    (s.bodySlidePath ? `- BodySlide: ${s.bodySlidePath}\n` : "") +
                    (s.outfitStudioPath ? `- Outfit Studio: ${s.outfitStudioPath}\n` : "") +
                    (s.creationKitPath ? `- Creation Kit: ${s.creationKitPath}\n` : "") +
                    (s.nifSkopePath ? `- NifSkope: ${s.nifSkopePath}\n` : "") +
                    (s.blenderPath ? `- Blender: ${s.blenderPath}\n` : "");

                const whitelist: string[] = s?.privacySettings?.modContentWhitelist ?? [];
                if (whitelist.length > 0) {
                    settingsCtx += `\n**MOD CONTENT WHITELIST (STRICT — DO NOT TOUCH THESE MODS):**\n` +
                        whitelist.map((m: string) => `- ${m}`).join('\n') + '\n' +
                        `(The user has protected these mods. Never mention, recommend, discuss, use them as examples, reference, modify, or interact with them in any way under any circumstances.)`;
                }

                const modBlacklist: { name: string; reason?: string }[] = (s?.privacySettings?.modContentBlacklist ?? []).map((e: any) =>
                    typeof e === 'string' ? { name: e } : e
                );
                if (modBlacklist.length > 0) {
                    settingsCtx += `\n**MOD CONTENT BLACKLIST (WARN AGAINST THESE MODS):**\n` +
                        modBlacklist.map((e) => `- ${e.name}${e.reason ? ` — ${e.reason}` : ''}`).join('\n') + '\n' +
                        `(These mods are known to be problematic, broken, or incompatible. If a user asks about them, warn them about potential issues (citing the reason above when provided) and suggest safer alternatives.)`;
                }

                const programBlacklist: { name: string; reason?: string }[] = (s?.privacySettings?.programBlacklist ?? []).map((e: any) =>
                    typeof e === 'string' ? { name: e } : e
                );
                if (programBlacklist.length > 0) {
                    settingsCtx += `\n**PROGRAM BLACKLIST (WARN AGAINST THESE PROGRAMS):**\n` +
                        programBlacklist.map((e) => `- ${e.name}${e.reason ? ` — ${e.reason}` : ''}`).join('\n') + '\n' +
                        `(These programs are known to cause issues, conflicts, or problems with modding workflows. Actively discourage their use, cite the reason above when provided, and recommend safer alternatives.)`;
                }
            }

            // Extract ALL Fallout 4 game paths from detected apps (user may have multiple installations)
            const fallout4Apps = (detectedApps || []).filter((a: any) =>
                a.name.toLowerCase().includes('fallout 4') ||
                a.displayName?.toLowerCase().includes('fallout 4') ||
                a.path?.toLowerCase().includes('fallout 4')
            );
            const gameFolderInfo = fallout4Apps.length > 0
                ? `\n**FALLOUT 4 INSTALLATIONS (${fallout4Apps.length} found):**\n` +
                fallout4Apps.map((app: any, idx: number) => {
                    const driveLetter = app.path?.charAt(0).toUpperCase() || '?';
                    const installType = app.path?.toLowerCase().includes('steam') ? '[STEAM]' :
                        app.path?.toLowerCase().includes('gog') ? '[GOG]' :
                            app.path?.toLowerCase().includes('xbox') || app.path?.toLowerCase().includes('microsoft') ? '[XBOX/MS STORE]' : '';
                    return `  ${idx + 1}. ${installType} ${driveLetter}: drive - ${app.path}\n     Data folder: ${app.path}\\Data`;
                }).join('\n')
                : "\n**FALLOUT 4 NOT DETECTED** - User may need to manually specify game folder in External Tools Settings.";

            // Expose current hub architecture so Mossy stays aligned — action-oriented so she can tell users what they DO in each platform
            const appFeatures = `\n**MOSSY PLATFORMS — What You Can DO in Each One:**\n` +
                [
                    "• Mossy.Space Home Dashboard (/): See all 23 platforms at a glance, check live health badges (Electron, Storage, Vault, Mic, TTS), view your active project, and jump directly to any hub. Use the 6-step 'Where to Start' guide to orient a brand-new modder. The UPLINK badge tells you whether the Desktop Bridge (local tooling) is connected.",
                    "• AI Chat (/chat): Talk to Mossy about anything FO4-related. Ask step-by-step how-to questions, debug mod issues, get workflow guidance, request Papyrus script help, upload files for analysis, enable voice mode for hands-free chat, and use the Knowledge Vault to store important notes for Mossy to reference in future chats.",
                    "• AI Mod Assistant (/ai-mod-assistant): Get specialized AI help directly tied to your open project. The assistant knows your mod's current state and gives targeted advice — more project-aware than general chat.",
                    "• FO4 Mod Journey Hub (/journey-hub): Start or continue your modding project here. Create a project, follow the First Success walkthrough (the proven beginner path to publishing a real mod), browse Nexus Mods by category, and build your personal modding roadmap step by step.",
                    "• FO4 What's New (/whats-new): Read the latest MOSSY.SPACE release notes and see what changed in the most recent update.",
                    "• FO4 Knowledge Hub (/knowledge-hub): Search the built-in FO4 documentation library, browse the Quick Reference sheet (FormIDs, record types, keywords, common values), look up community guides, and query the RAG Search (AnythingLLM) to search documents you've uploaded.",
                    "• FO4 Memory Vault (/memory-vault): Store, tag, search, and manage your personal modding notes — recipes, references, solutions to problems, workflow steps. Sync entries to AnythingLLM so Mossy can use them as a knowledge source in RAG Search.",
                    "• FO4 Setup Wizards (/wizards): Run guided wizards for first-time setup — configure xEdit, Creation Kit, Blender, LOOT, and other tools; verify your FO4 Data folder; and walk through environment checks so everything is wired correctly before you start modding.",
                    "• FO4 Creation Kit Hub (/ck-tools): Work safely in Creation Kit. Use CK crash prevention tools, the FormID reference panel, quest/dialogue wizards, NPC editor guides, navmesh helpers, and the CK workflow library. This hub prevents the most common CK mistakes (wrong active file, accidental deletes, precombine breaks).",
                    "• FO4 Textures & Materials Hub (/textures): Make DDS format decisions, convert and batch-process textures (DDS Converter), edit BGSM/BGEM material files visually (Material Editor, BGSM Editor), generate textures with AI (Texture Generator), upscale low-res textures (Texture Enhancer), and follow FO4 material pipeline guides.",
                    "• FO4 Packaging & Release (/packaging-release): Pack your mod correctly. Build BA2 archives, create and validate FOMOD installer packages, run pre-release checklists (ITMs, UDRs, conflict scan, file structure), and prepare your mod for Nexus Mods upload.",
                    "• FO4 Guides Hub (/guides-hub): Read in-depth built-in guides — Papyrus scripting, Bodyslide, Blender-to-FO4 NIF pipeline, Quest mod authoring, Sim Settlements 2, animations, and more. Each guide is a full walkthrough, not a stub.",
                    "• FO4 Mod Builder Hub (/mod-builder): The all-in-one mod construction workspace. Use The Blueprint to plan your mod's architecture, The Workshop to assemble assets and scripts, The Scribe to write dialogue and lore, and Dev Tools for advanced scripting and debugging.",
                    "• FO4 Asset Analysis Hub (/asset-analysis): Deep-dive into your mod's assets. Run the Mining Dashboard to extract and index your FO4 Data folder, use Advanced Analysis to inspect meshes/textures/scripts, and run the Asset Deduplicator to find and eliminate redundant files that bloat your mod.",
                    "• FO4 Automation Orchestrator (/orchestrator): Set up type-based asset pipelines (e.g., 'process all NIF files'), monitor pipeline run logs step-by-step, manage the BA2 staging queue, and view storage stats. More powerful than the Automation Runner — handles complex multi-type workflows.",
                    "• FO4 Automation Runner (/workflow-runner): Run individual typed workflow steps manually or in sequence. Import/export workflow JSON to share with other modders. View run history and reuse successful workflows.",
                    "• FO4 Runtime Hub (/runtime-hub): Test your mod live. Use Live Synapse for voice-activated real-time commands while FO4 is running, connect the Desktop Bridge to control Blender and other tools from Mossy, and use the Holodeck to run in-game tests and monitor runtime behavior.",
                    "• FO4 External Integrations Hub (/ext-tools): Configure and launch every external tool from one place — MO2, Vortex, Blender, xEdit, Creation Kit, LOOT, NifSkope, BodySlide, GIMP, BAE, Archive2, ComfyUI, Upscayl. Each integration shows connection status and has a launch button. Also manage MO2 profiles, run ComfyUI image generation workflows, and upscale textures with Upscayl.",
                    "• FO4 Plugin & Load Order Hub (/plugin-tools): Manage your plugin load order safely. Scan for conflicts with xEdit, sort with LOOT, detect ITMs and UDRs, build conflict-resolution patches, manage ESL/ESP/ESM plugin types, and follow PRP-aware patching workflows to avoid breaking precombines.",
                    "• FO4 System & Diagnostics Hub (/system-hub): Diagnose Mossy itself. Run hardware scans, check local AI capabilities (Ollama, KoboldCPP), manage the mod blacklist and whitelist, browse the asset vault, view Mossy's logs, and get support information.",
                    "• Settings (/settings): Configure everything — FO4 game folder, tool paths (xEdit, CK, Blender, etc.), AI engine settings (Groq model, max tokens, voice), AnythingLLM RAG connection, appearance, and all other Mossy preferences.",
                    "• Vault-Tec Creative Director (/creative-director): The AI design team. Enable the autonomous AI team to generate complete Fallout 4 mod concepts with full BUILD_GUIDE documentation — quest design, NPC concepts, dialogue, world-building, art direction, and Papyrus script stubs. Review finished projects in Lab Handoff, score them on buildability, enhance guides with your real asset paths, and generate xEdit setup scripts.",
                ].join('\n');

            // Reliability sweep (2026-09-01): the KB-filtering fix (2f090399) and the
            // Cortex Memory cap (00848ae0) only shaved systemInstruction from ~614-617K
            // down to ~385-390K -- a real cut, but far short of the ~207K expected
            // (147K static MossyBrain.ts baseline + ~60K capped knowledge base). This
            // one-time diagnostic pinpoints exactly which of the many pieces below is
            // still carrying the other ~180K, instead of guessing at each one blind.
            // Remove once the real remaining contributor is found and fixed.
            const detectedToolsStr = (detectedApps || []).filter(a => a.path).map(a => `${a.name} [ID: ${a.id}] (Path: ${a.path})`).join(', ') || "None";
            const panelActivityCtx = getPanelActivityContext();
            const knowledgeBaseCtx = formatRelevantFO4KnowledgeBaseForAI(query || '');

            const contextStr = `
      **DYNAMIC SYSTEM CONTEXT:**
      **Desktop Bridge:** ${bridgeStatus}
      ${blenderContext}
    ${toolAckLine}
    ${guidanceLine}
    ${monitoringLine}
            ${settingsCtx}${gameFolderInfo}
            ${appFeatures}
        ${toolPermissionsCtx}
      **Short-Term Working Memory:** ${workingMemory}
      **Project Status:** ${projectData ? projectData.name : "None"}${modContext}
      ${knowledgeVaultContext}
      ${vaultContext}
      **Detected Tools:** ${detectedToolsStr}
      ${hardwareCtx}
      ${scanContext}
    ${scanHistoryCtx}
    ${liveToolCtx}
    ${panelActivityCtx}
      ${learnedCtx}
            ${communityLearningCtx}
      // Reliability sweep (2026-09-01): this used to be formatFO4KnowledgeBaseForAI()
      // -- the ENTIRE ~85-section, 280K+ char knowledge base, unconditionally, on every
      // turn. That was the single largest contributor to the system prompt's routine
      // 600K-746K character size (see FO4KnowledgeBase.ts and messageBudget.ts's
      // docstrings). Now filtered to the sections actually relevant to this query.
      ${knowledgeBaseCtx}
      `;

            try {
                const apiDiag = (window as any).electron?.api || (window as any).electronAPI;
                void apiDiag?.writeDiagnosticLog?.(
                    `[generateSystemContext-breakdown] settingsCtx=${settingsCtx.length} gameFolderInfo=${gameFolderInfo.length} ` +
                    `appFeatures=${appFeatures.length} toolPermissionsCtx=${toolPermissionsCtx.length} workingMemory=${workingMemory.length} ` +
                    `modContext=${modContext.length} knowledgeVaultContext=${knowledgeVaultContext.length} vaultContext=${vaultContext.length} ` +
                    `hardwareCtx=${hardwareCtx.length} scanContext=${scanContext.length} scanHistoryCtx=${scanHistoryCtx.length} ` +
                    `liveToolCtx=${liveToolCtx.length} learnedCtx=${learnedCtx.length} communityLearningCtx=${communityLearningCtx.length} ` +
                    `blenderContext=${blenderContext.length} detectedToolsStr=${detectedToolsStr.length} panelActivityCtx=${panelActivityCtx.length} ` +
                    `knowledgeBaseCtx=${knowledgeBaseCtx.length} appFeaturesRAW=${appFeatures.length} contextStrTOTAL=${contextStr.length}`
                );
            } catch { /* diagnostics-only, non-critical */ }

            return contextStr;
        } catch (e) {
            console.error("Context Error:", e);
            return "Context: Error gathering system telemetry.";
        }
    };

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(scrollToBottom, [messages, scanProgress, onboardingState, activeTool, isStreaming]);

    const performSystemScan = async (isSilent = false) => {
        if (onboardingState === 'scanning' || onboardingState === 'integrating') return;

        if (!isSilent) {
            setOnboardingState('scanning');
            setScanProgress(0);
        }

        let progress = 0;
        const progressInterval = isSilent ? null : setInterval(() => {
            progress += 2;
            if (progress <= 90) setScanProgress(progress);
        }, 100);

        try {
            const foundApps: DetectedApp[] = [];

            // 0. Pull from manual settings first
            try {
                const api = (window as any).electron?.api || (window as any).electronAPI;
                const settings = await api?.getSettings?.();
                if (!settings) throw new Error('Settings API unavailable');
                const settingTools = [
                    { name: 'xEdit', path: settings.xeditPath, cat: 'Tool' },
                    { name: 'NifSkope', path: settings.nifSkopePath, cat: 'Tool' },
                    { name: 'Creation Kit', path: settings.creationKitPath, cat: 'Official' },
                    { name: 'Blender', path: settings.blenderPath, cat: '3D' },
                    { name: 'LOOT', path: settings.lootPath, cat: 'Manager' },
                    { name: 'Vortex', path: settings.vortexPath, cat: 'Manager' },
                    { name: 'MO2', path: settings.mo2Path, cat: 'Manager' },
                    { name: 'F4SE', path: settings.f4sePath, cat: 'System' },
                    { name: 'BodySlide', path: settings.bodySlidePath, cat: 'Tool' },
                    { name: 'GIMP', path: settings.gimpPath, cat: 'Creative' },
                    { name: 'BAE', path: settings.baePath, cat: 'Archive' },
                    { name: 'Archive2', path: settings.archive2Path, cat: 'Archive' }
                ];

                settingTools.forEach(t => {
                    if (t.path && t.path.length > 3) {
                        foundApps.push({
                            id: `manual-${Math.random().toString(36).substr(2, 5)}`,
                            name: t.name,
                            category: t.cat,
                            checked: true,
                            path: t.path
                        });
                    }
                });
            } catch (e) {
                console.warn("Failed to merge settings into scan", e);
            }

            // 1. Get real installed programs from Electron
            // Map found programs to our app categories
            const moddingKeywords = [
                'blender', 'creationkit', 'fo4edit', 'xedit', 'sseedit', 'tes5edit', 'fnvedit', 'tes4edit',
                'modorganizer', 'vortex', 'nifskope', 'bodyslide', 'f4se', 'loot', 'wryebash', 'outfitstudio',
                'archive2', 'gimp', 'photoshop', 'zedit', 'bae', 'pjm', 'bethini',
                'reshade', 'enb', 'cathedral', 'modsel', 'texconv', 'unpacker',
                'material', 'bgsm', 'facegen', 'lipgen', 'papyrus', 'caprica', 'script',
                'fallout', 'morrowind', 'oblivion', 'skyrim', 'starfield', 'game', 'mod'
            ];

            const bridgeApi = (window as any).electron?.api || (window as any).electronAPI;
            if (typeof bridgeApi?.detectPrograms === 'function') {
                const installed = await bridgeApi.detectPrograms();

                installed.forEach((prog: any) => {
                    const nameLower = prog.name.toLowerCase();
                    const displayNameLower = prog.displayName.toLowerCase();

                    if (moddingKeywords.some(kw => nameLower.includes(kw) || displayNameLower.includes(kw))) {
                        // Improved de-duplication: If we find a better version (e.g. non-C drive), use it.
                        const existingIndex = foundApps.findIndex(app => app.name.toLowerCase() === prog.displayName.toLowerCase());
                        const isNonCDrive = prog.path && !prog.path.startsWith('C:');

                        if (existingIndex === -1) {
                            foundApps.push({
                                id: Math.random().toString(36).substr(2, 9),
                                name: prog.displayName.length > 3 ? prog.displayName : prog.name,
                                displayName: prog.displayName,
                                category: (nameLower + displayNameLower).includes('blender') ? '3D' :
                                    (nameLower + displayNameLower).includes('creation') ? 'Official' :
                                        (nameLower + displayNameLower).includes('modorganizer') || (nameLower + displayNameLower).includes('vortex') || (nameLower + displayNameLower).includes('loot') ? 'Manager' :
                                            (nameLower + displayNameLower).includes('gimp') || (nameLower + displayNameLower).includes('photoshop') ? 'Creative' :
                                                (nameLower + displayNameLower).includes('archive') || (nameLower + displayNameLower).includes('bae') ? 'Archive' : 'Tool',
                                checked: true,
                                path: prog.path,
                                version: prog.version
                            });
                        } else if (isNonCDrive && foundApps[existingIndex].path?.startsWith('C:')) {
                            // Replace stale C: drive entry with the real modding drive entry
                            foundApps[existingIndex].path = prog.path;
                        }
                    }
                });
            }

            // 2. Cross-reference with currently running processes
            if (typeof bridgeApi?.getRunningProcesses === 'function') {
                const running = await bridgeApi.getRunningProcesses();
                running.forEach((p: any) => {
                    const nameLower = p.name.toLowerCase();
                    if (moddingKeywords.some((kw: string) => nameLower.includes(kw))) {
                        if (!foundApps.some(app => app.name.toLowerCase().includes(nameLower) || nameLower.includes(app.name.toLowerCase()))) {
                            foundApps.push({
                                id: `running-${Math.random().toString(36).substr(2, 5)}`,
                                name: p.windowTitle || p.name,
                                category: 'Running',
                                checked: true
                            });
                        }
                    }
                });
            }

            // 3. Fallback to essential message if NOTHING found
            if (foundApps.length === 0 && !isSilent) {
                // No fake apps added here anymore.
                console.log("No tools found during scan.");
            }

            if (progressInterval) clearInterval(progressInterval);
            if (!isSilent) setScanProgress(100);

            // --- IMPROVED MERGE LOGIC ---
            const existingAppsRaw = localStorage.getItem('mossy_apps');
            let finalApps = [...foundApps];

            if (existingAppsRaw) {
                try {
                    const existing = JSON.parse(existingAppsRaw);

                    // Preserve explicit user approvals (checked true/false)
                    finalApps = mergeExistingCheckedState(finalApps as any, existing as any) as any;
                    // Keep any existing apps that aren't in the new found list
                    existing.forEach((ea: any) => {
                        if (!finalApps.some(fa => fa.path === ea.path || fa.name === ea.name)) {
                            finalApps.push(ea);
                        }
                    });

                    // Prioritize non-C drive versions if duplicates exist
                    const driveMap: Record<string, any> = {};
                    finalApps.forEach(app => {
                        const baseName = app.name.split(' - ')[0].toLowerCase();
                        const isNonC = app.path && !app.path.toLowerCase().startsWith('c:');

                        if (!driveMap[baseName] || (isNonC && driveMap[baseName].path.toLowerCase().startsWith('c:'))) {
                            driveMap[baseName] = app;
                        }
                    });
                    finalApps = Object.values(driveMap);
                } catch (e) {
                    console.error('Failed to deduplicate apps:', e);
                }
            }

            setDetectedApps(finalApps);
            localStorage.setItem('mossy_apps', JSON.stringify(finalApps));
            localStorage.setItem('mossy_last_scan', Date.now().toString());

            if (!isSilent) {
                setTimeout(() => {
                    setOnboardingState('integrating');
                    setMessages(prev => [...prev, {
                        id: `scan-done-${Date.now()}`,
                        role: 'assistant',
                        content: foundApps.length > 2
                            ? `**Deep Scan Complete.** I located **${foundApps.length}** modding tools across your drives. I will remember these for future sessions so we don't need to scan every time.`
                            : "**Deep Scan Complete.** I couldn't find many tools automatically. You might need to link them manually in the 'Vault' or 'Bridge' settings.",
                        timestamp: Date.now()
                    }]);
                }, 500);
            }

        } catch (error) {
            console.error('System scan failed:', error);
            if (progressInterval) clearInterval(progressInterval);
            if (!isSilent) setOnboardingState('ready');
        }
    };

    const handleIntegrate = () => {
        setOnboardingState('ready');
        localStorage.setItem('mossy_tool_connection_ack', 'true');
        setMessages(prev => [...prev, {
            id: 'integrated',
            role: 'assistant',
            content: `Tools Linked. Creation Kit telemetry active.\n\n**Ad Victoriam, modder.** What are we building today?`,
            timestamp: Date.now()
        }]);
    };

    // ── Training data: rate a message 👍/👎 ──────────────────────────────────
    const handleRateMessage = React.useCallback(async (msgId: string, rating: 'good' | 'bad', editedAnswer?: string) => {
        const api = (window as any).electron?.api;
        if (!api?.trainingDataAddPair) return;
        // Find the Q&A pair: the user message just before this assistant message
        const idx = messages.findIndex(m => m.id === msgId);
        if (idx < 0) return;
        const assistantMsg = messages[idx];
        const userMsg = messages.slice(0, idx).reverse().find(m => m.role === 'user');
        if (!assistantMsg || !userMsg) return;
        // Auto-detect topic from content
        const content = (assistantMsg.content || '').toLowerCase();
        const topic =
            content.includes('papyrus') || content.includes('.psc') ? 'papyrus' :
            content.includes('nif') || content.includes('mesh') ? 'nif' :
            content.includes('xedit') || content.includes('record') || content.includes('formid') ? 'xedit' :
            content.includes('creation kit') || content.includes('ck ') ? 'ck' :
            content.includes('texture') || content.includes('dds') ? 'textures' :
            content.includes('fomod') ? 'fomod' :
            content.includes('load order') || content.includes('loot') ? 'load-order' :
            'general';
        try {
            await api.trainingDataAddPair({
                question: userMsg.content,
                answer: assistantMsg.content,
                // If the user provided a correction, save it as editedAnswer so the
                // IPC handler writes that text into the training pair instead of the
                // original (possibly wrong) answer.
                editedAnswer: editedAnswer && editedAnswer !== assistantMsg.content ? editedAnswer : undefined,
                rating,
                topic,
            });
        } catch { /* non-critical */ }
    }, [messages]);

    const handleStartProject = () => {
        setOnboardingState('project_setup');
        setMessages(prev => [...prev, { id: 'proj-start', role: 'assistant', content: "Initializing new Workspace configuration protocol...", timestamp: Date.now() }]);
    };

    const createProjectFile = (data: { name: string, description: string, categories: string[] }) => {
        const newProject: ProjectData = {
            name: data.name,
            status: 'Pre-Production',
            notes: data.description,
            timestamp: new Date().toLocaleDateString(),
            keyDecisions: [],
            categories: data.categories
        };
        setProjectData(newProject);
        setProjectContext(data.name);
        setShowProjectPanel(true);

        // Track project creation
        trackEvent('project_created', {
            projectName: data.name,
            descriptionLength: data.description.length,
            categoriesCount: data.categories.length,
            categories: data.categories
        });

        return newProject;
    };

    const executeTool = async (name: string, args: any) => {
        // Record tool usage for Modding Journey
        await LocalAIEngine.recordAction('tool_execution', { tool: name, args });
        try {
            window.electron?.api?.appendMemoryEvent?.({
                type: 'tool_execution_started',
                tool: name,
                args,
                project: projectData?.name || null,
            }).catch(() => { });
        } catch { /* non-critical */ }

        // Track tool execution start
        trackEvent('tool_execution_started', {
            toolName: name,
            argsCount: Object.keys(args || {}).length,
            isBlenderLinked
        });

        setActiveTool({ id: Date.now().toString(), toolName: name, args, status: 'running' });

        // CALL CENTRAL REAL EXECUTION ENGINE
        const result = await executeMossyTool(name, args, {
            isBlenderLinked,
            setProfile: (p) => { },
            setProjectData: (data) => setProjectData(data),
            setProjectContext: (ctx) => setProjectContext(ctx),
            setShowProjectPanel: (val) => { }
        });

        setActiveTool(null);

        // Track tool execution completion
        trackEvent('tool_execution_completed', {
            toolName: name,
            success: !(result as any)?.error,
            hasResult: !!result
        });
        try {
            window.electron?.api?.appendMemoryEvent?.({
                type: 'tool_execution_completed',
                tool: name,
                success: !(result as any)?.error,
                result: String((result as any)?.result || ''),
            }).catch(() => { });
        } catch { /* non-critical */ }

        return result;
    };











    const handleManualExecute = async (name: string, args: any) => {
        // Force write to clipboard for manual override
        if (name === 'execute_blender_script') {
            try {
                // --- APPLY SANITIZER HERE TOO ---
                // This was missing before! Now the manual button uses the robust Data API logic.
                const safeScript = sanitizeBlenderScript(args.script);
                const noncedScript = `${safeScript}\n# ID: ${Date.now()}`;

                await navigator.clipboard.writeText(`MOSSY_CMD:${noncedScript}`);

                // Also trigger the real bridge call
                await executeTool(name, args);
            } catch (e) {
                console.error("Manual execute failed", e);
            }
        } else {
            // For all other tools, just trigger the execution engine again
            await executeTool(name, args);
        }
    };

    const handleStopGeneration = () => {
        const streamId = activeStreamIdRef.current;
        if (streamId) stoppedStreamIdsRef.current.add(streamId);
        generationAbortControllerRef.current?.abort();
        setIsLoading(false);
        setIsStreaming(false);
        setMessages(prev => {
            // Drop the "..Processing.." placeholder for the stopped stream so the
            // real (discarded) response can never land in its place later.
            const withoutPlaceholder = streamId ? prev.filter(m => m.id !== streamId) : prev;
            return [...withoutPlaceholder, { id: Date.now().toString(), role: 'assistant', content: "**[Generation Stopped by User]**", timestamp: Date.now() }];
        });
    };

    const checkWhitelistGuard = (message: string): { blocked: boolean; match?: string } => {
        const whitelist: string[] = (formalSettings?.privacySettings?.modContentWhitelist ?? [])
            .map((entry: unknown) => String(entry || '').trim())
            .filter(Boolean);
        const lower = message.toLowerCase();
        for (const item of whitelist) {
            if (item.length < 2) continue;
            if (lower.includes(item.toLowerCase())) {
                return { blocked: true, match: item };
            }
        }
        return { blocked: false };
    };

    const findBlacklistMatch = (message: string): { kind: 'mod' | 'program'; name: string; reason?: string } | null => {
        const lower = message.toLowerCase();
        const modList = (formalSettings?.privacySettings?.modContentBlacklist ?? []).map((e: any) => typeof e === 'string' ? { name: e } : e);
        for (const item of modList) {
            const name = String(item?.name || '').trim();
            if (name && lower.includes(name.toLowerCase())) return { kind: 'mod', name, reason: item?.reason };
        }
        const progList = (formalSettings?.privacySettings?.programBlacklist ?? []).map((e: any) => typeof e === 'string' ? { name: e } : e);
        for (const item of progList) {
            const name = String(item?.name || '').trim();
            if (name && lower.includes(name.toLowerCase())) return { kind: 'program', name, reason: item?.reason };
        }
        return null;
    };

    // The paperclip attachment let a user attach a file and even send with no text, but
    // the file's contents were never read or included in the AI request — LocalAIEngine
    // had no file parameter at all, so any attached script/image was completely invisible
    // to the response. Text-like files (scripts, logs, configs) get their real content
    // read and appended to the query; binary files (meshes, textures, images) get an
    // honest description instead of silently pretending to "see" them.
    const TEXT_FILE_EXTENSIONS = ['.psc', '.txt', '.log', '.ini', '.json', '.xml', '.pas', '.md', '.cfg', '.yaml', '.yml'];
    const MAX_ATTACHED_FILE_CHARS = 12000;
    const readAttachedFileContent = async (file: File): Promise<string> => {
        const ext = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
        const isText = file.type.startsWith('text/') || TEXT_FILE_EXTENSIONS.includes(ext);
        if (!isText) {
            return `[Attached file: ${file.name} (${file.type || ext}, ${(file.size / 1024).toFixed(1)} KB) — this is a binary file; its contents were not read. Describe what you need help with regarding this file.]`;
        }
        try {
            const raw = await file.text();
            const truncated = raw.length > MAX_ATTACHED_FILE_CHARS;
            const content = truncated ? raw.slice(0, MAX_ATTACHED_FILE_CHARS) : raw;
            return `[Attached file: ${file.name}]\n\`\`\`\n${content}${truncated ? '\n... (truncated)' : ''}\n\`\`\``;
        } catch (err) {
            return `[Attached file: ${file.name} — could not be read: ${err instanceof Error ? err.message : String(err)}]`;
        }
    };

    const handleSend = async (overrideText?: string) => {
        const textToSend = overrideText || inputText;
        if ((!textToSend.trim() && !selectedFile) || isLoading || isStreaming || isConversationPaused) return;
        const now = Date.now();
        if (now - lastSendTimeRef.current < 500) {
            console.log('[ChatInterface] Ignoring duplicate send within 500ms');
            return;
        }
        lastSendTimeRef.current = now;

        if (onboardingState === 'init') {
            if (textToSend.toLowerCase().match(/yes|ok|start|scan/)) {
                setInputText('');
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: textToSend, timestamp: Date.now() }]);
                performSystemScan();
                return;
            }
        }

        // --- FALLOUT 4 CONTENT GUARD ---
        const guard = checkContentGuard(textToSend);
        if (!guard.allowed) {
            setMessages(prev => [...prev,
            { id: Date.now().toString(), role: 'user', content: textToSend, timestamp: Date.now() },
            { id: Date.now().toString() + '-guard', role: 'assistant', content: guard.message || "I am strictly a Fallout 4 modding assistant.", timestamp: Date.now() }
            ]);
            setInputText('');
            return;
        }

        const wlGuard = checkWhitelistGuard(textToSend);
        if (wlGuard.blocked) {
            setMessages(prev => [...prev,
            { id: Date.now().toString(), role: 'user', content: textToSend, timestamp: Date.now() },
            { id: Date.now().toString() + '-whitelist', role: 'assistant', content: `I can't help with "${wlGuard.match}" because it is protected in your do-not-touch list. I can help with a different mod or workflow instead.`, timestamp: Date.now() }
            ]);
            setInputText('');
            return;
        }

        const blacklistHit = findBlacklistMatch(textToSend);
        if (blacklistHit) {
            const warning = blacklistHit.kind === 'mod'
                ? `⚠️ **Safety warning:** "${blacklistHit.name}" is on your mod blacklist${blacklistHit.reason ? ` — ${blacklistHit.reason}` : ''}. I'll warn about risks and suggest safer alternatives.`
                : `⚠️ **Safety warning:** "${blacklistHit.name}" is on your program blacklist${blacklistHit.reason ? ` — ${blacklistHit.reason}` : ''}. I'll discourage usage and suggest safer tools.`;
            setMessages(prev => [...prev, { id: Date.now().toString() + '-blacklist-warning', role: 'assistant', content: warning, timestamp: Date.now() }]);
        }

        // --- DETERMINISTIC XLODGEN CLI-SYNTAX ANSWER ---
        // Prompt-engineering alone proved unreliable here too (same class of
        // problem as the nav guards below): asked for xLODGen's exact
        // command-line flags, the model confidently fabricated a full,
        // plausible-looking command on every one of three different
        // phrasings tried during live QA -- even after (1) a "never
        // fabricate CLI syntax" behavioral rule was added to the system
        // prompt, and (2) xLODGen's real CLI reference plus a literal
        // copy-paste example were grounded directly in the same knowledge
        // passage the model draws from. Each attempt invented a different,
        // internally-consistent-looking set of fake flags (e.g. -lodCount/
        // -lodDist/-texGen/-ddsFormat; then -cull/-scale/-smooth/-uvcull
        // plus an invented Nexus ID; then -i/-o/-p "LOD_"/-nc/--terrain).
        // xLODGen really has no full-featured CLI at all -- it's GUI-driven
        // with only a handful of real flags (game mode, -o:/-m:/-p:/-d:
        // paths, --inputfile/--logfile/--dontGenerateVertexColors/
        // --verbose/--useHDLOD/--gamemode) -- so any "give me the exact
        // command" request sits squarely in the model's confabulation zone.
        // Short-circuiting to a fixed, verified-correct answer removes the
        // LLM from the loop for this one narrow, high-risk question class,
        // the same way the nav guards below removed it from an unreliable
        // routing decision.
        const xLodGenCliIntent = /\bxlodgen\b/i.test(textToSend)
            && /\b(command[\s-]?line|cli|flags?|arguments?|argument|switch(?:es)?|syntax|exact command|full command|-fo4)\b/i.test(textToSend);
        if (xLodGenCliIntent) {
            setInputText('');
            setMessages(prev => [...prev,
            { id: Date.now().toString(), role: 'user', content: textToSend, timestamp: Date.now() },
            {
                id: Date.now().toString() + '-xlodgen-cli',
                role: 'assistant',
                content: "xLODGen is primarily a **GUI-driven tool** -- LOD level counts, poly-count targets, normal-map generation, and swap distances are all set in its dialogs (Object LOD tab, Terrain LOD tab), not passed as command-line flags. It does not take per-mesh input/output NIF paths like a decimation tool -- it scans your whole Fallout 4 `Data` folder as configured in the GUI (or via `-d:`).\n\nIts only real command-line flags are:\n- Game mode (pick one): `-fo4` `-fnv` `-fo3` `-tes5` `-sse` `-tes5vr` `-enderal` `-enderalse`\n- Paths: `-o:\"[path]\"` (output dir), `-m:\"[path]\"` (INI folder), `-p:\"[path]\"` (plugins.txt), `-d:\"[path]\"` (Data folder)\n- Other: `--inputfile`, `--logfile`, `--dontGenerateVertexColors`, `--verbose`, `--useHDLOD`, `--gamemode`\n\nA real, working example (launch it, then set LOD levels/distances/normal maps in the GUI before running):\n```\n\"C:\\Modding\\xLODGen\\xLODGen64.exe\" -fo4 -o:\"C:\\Modding\\xLODGen\\Output\" -d:\"C:\\Games\\Fallout4\\Data\" -p:\"C:\\Games\\Fallout4\\plugins.txt\" --logfile:\"C:\\Modding\\xLODGen\\xLODGen_log.txt\" --verbose\n```\n\nThere is no `-lodCount`, `-lodDist`, `-type`, `-maxTris`, `-autoSmooth`, `-calcNormals`, `-cull`, `-scale`, `-smooth`, `-uvcull`, `-texGen`, `-mode`, `-targetPolyCount`, `-ddsFormat`, `-i`, `-nc`, or `-terrain`/`-t` flag -- those don't exist, no matter how plausible they look. xLODGen also isn't on Nexus under its own mod ID -- get it from the STEP Modding forum or github.com/sheson/xLODGen.\n\nAsk me anything else about setting it up, and I can walk you through the GUI dialogs step by step.",
                timestamp: Date.now(),
            }
            ]);
            return;
        }

        // --- DETERMINISTIC "START A MOD" NAVIGATION ---
        // Prompt-engineering alone proved unreliable here: MossyBrain's own
        // Quick Navigation Decision Guide already said "start a new mod" ->
        // Mod Builder Hub, but the LLM kept asking clarifying questions
        // anyway ("what kind of mod do you want to do?") despite explicit
        // instructions not to — a real, confirmed regression. Project
        // Creator (Mod Builder Hub) is a genuine universal starting point
        // for every mod type (it branches internally by ModType), so this
        // is a safe, unconditional trigger — not something that needs the
        // AI to decide case-by-case. Handled here in code instead, matching
        // the existing early-return guard pattern above (content/whitelist/
        // blacklist checks), so it's guaranteed instead of hoped-for.
        const startModIntent = textToSend.trim().length < 150
            && /\b(start|begin|create|make|build)\b.{0,12}\b(a |my |the |new )?mod\b(?!\s+(organizer|manager|list|folder|order|menu))/i.test(textToSend);
        if (startModIntent) {
            setInputText('');
            sessionStorage.setItem('builder_hub_tab', 'creator');
            navigate('/mod-builder');
            setMessages(prev => [...prev,
            { id: Date.now().toString(), role: 'user', content: textToSend, timestamp: Date.now() },
            {
                id: Date.now().toString() + '-start-mod',
                role: 'assistant',
                content: "Let's get your project set up. I've taken you to the **Mod Builder Hub → Project Creator** — pick a project name and mod type there (quest, settlement, texture, weapon, NPC, worldspace edit, audio, or general) and it'll scaffold the right folder structure for it. Once that's created, come back and tell me what you're building and we'll go from there.",
                timestamp: Date.now(),
            }
            ]);
            return;
        }

        // --- DETERMINISTIC "START AN SS2 PLOT / CITY PLAN" NAVIGATION ---
        // Same failure mode as the "start a mod" guard above: MossyBrain's Nav
        // Guide can say "start a plot" -> the SS2 addon guide, but nothing stops
        // the LLM from asking "what are you gonna do?" instead of just going
        // there — confirmed in practice. Handled deterministically instead of
        // trusting the model to follow the prompt every time.
        const startPlotIntent = textToSend.trim().length < 150
            && /\b(start|begin|create|make|build)\b.{0,15}\b(a |my |the |new )?(city plan|plot)\b(?!\s*(twist|point|hole|line|device|graph|armor|land))/i.test(textToSend);
        if (startPlotIntent) {
            setInputText('');
            navigate('/guides/mods/sim-settlements');
            setMessages(prev => [...prev,
            { id: Date.now().toString(), role: 'user', content: textToSend, timestamp: Date.now() },
            {
                id: Date.now().toString() + '-start-plot',
                role: 'assistant',
                content: "Let's get you building. I've taken you to the **SS2 Addon Creation Guide** — it covers plot scripting with the SS2 API, city plan buildings, ASAM sensors, and addon pack toolkits. Skim the plot-scripting section first if you're making a standalone plot, or the city plan section if you're laying out a settlement. Come back once you've picked a direction and I'll help with the specifics.",
                timestamp: Date.now(),
            }
            ]);
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: textToSend,
            timestamp: Date.now()
        };

        const localHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
            ...messages.filter(m => m.role !== 'system').map((msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
            { role: 'user', content: textToSend }
        ];

        // Prior context to pass to the AI (all previous messages, capped to avoid context overflow)
        const priorHistory = messages
            .filter(m => m.content && m.content.trim() && m.content !== '..Processing..' && m.role !== 'system')
            .slice(-20)
            .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        setMessages(prev => [...prev, userMessage]);
        try {
            window.electron?.api?.appendMemoryEvent?.({
                type: 'chat_message',
                content: textToSend,
                context: {
                    project: projectData?.name || null,
                    onboardingState,
                },
            }).catch(() => { });
        } catch { /* non-critical */ }
        setInputText('');
        setIsLoading(true);
        stopAudio();

        // Track message send event
        trackEvent('chat_message_sent', {
            messageLength: textToSend.length,
            hasFile: !!selectedFile,
            onboardingState: onboardingState
        });

        // Record the chat action for the Modding Journey system (non-critical — must not
        // throw outside the try/finally or isLoading will be left stuck at true permanently).
        try {
            await LocalAIEngine.recordAction('chat_message', {
                length: textToSend.length,
                hasImages: !!selectedFile,
                timestamp: new Date().toISOString()
            });
        } catch (recordErr) {
            console.warn('[ChatInterface] recordAction failed (non-critical):', recordErr);
        }

        if (onboardingState === 'project_setup') {
            createProjectFile({ name: textToSend, description: "Auto-created from chat", categories: [] });
            setOnboardingState('ready');
        }

        try {
            console.log("[Mossy] Initializing AI Session...");
            const dynamicInstruction = getFullSystemInstruction(await generateSystemContext(textToSend));
            setIsStreaming(true);

            const streamId = (Date.now() + 1).toString();
            activeStreamIdRef.current = streamId;
            const abortController = new AbortController();
            generationAbortControllerRef.current = abortController;
            setMessages(prev => [...prev, { id: streamId, role: 'assistant', content: "..Processing..", timestamp: Date.now() }]);

            // Use local engine only (Google Cloud removed)
            const startTime = Date.now();
            const queryForAi = selectedFile
                ? `${textToSend}\n\n${await readAttachedFileContent(selectedFile)}`.trim()
                : textToSend;
            const localResult = await LocalAIEngine.generateResponse(
                queryForAi, dynamicInstruction, priorHistory, false, abortController.signal,
                { preferCloud: true, tools: TEXT_TOOLS },
                (fields) => {
                    // Fires later, off the critical path — see LocalAIEngine.ts's
                    // generateResponse() docstring. Guaranteed to fire exactly once
                    // per turn (success, HTTP failure, or network failure all settle
                    // it), so contractPending never gets stuck true.
                    setMessages(prev => prev.map(m => m.id === streamId ? {
                        ...m, checkQuestion: fields.checkQuestion, contractPending: false,
                    } : m));
                },
            );
            const duration = Date.now() - startTime;

            // The user clicked Stop Generation while this was in flight — discard the
            // late-arriving result instead of overwriting the "[Generation Stopped]" message.
            if (stoppedStreamIdsRef.current.has(streamId)) {
                stoppedStreamIdsRef.current.delete(streamId);
                return;
            }

            // Real native tool call came back (see TEXT_TOOLS above) -- run it and
            // fold the real result into a proper answer, rather than showing the
            // user an empty/error response while the model waits on a tool it
            // can't call again. Read-only web search only (TEXT_TOOL_SCOPE), so
            // this executes automatically with no manual confirmation step, same
            // trust level voice chat already gives it.
            let toolAugmentedContent: string | null = null;
            let toolAugmentedReasoning: string | undefined;
            const rawToolCall = localResult.toolCalls?.[0];
            if (rawToolCall && typeof rawToolCall.args !== 'string') {
                try {
                    trackEvent('tool_execution_started', { toolName: rawToolCall.name, source: 'chat_native_tool_call' });
                    const toolResult: any = await executeMossyTool(rawToolCall.name, rawToolCall.args, {
                        isBlenderLinked,
                        setProfile: () => { },
                        setProjectData: (data) => setProjectData(data),
                        setProjectContext: (ctx) => setProjectContext(ctx),
                        setShowProjectPanel: () => { },
                    });
                    const rawOutcome: string =
                        typeof toolResult === 'string' ? toolResult :
                        (toolResult?.result || toolResult?.error || '');
                    if (rawOutcome.trim()) {
                        // Second pass: turn the raw scan_fallout4_live dump (wiki/DDG/
                        // Wikipedia excerpts) into an actual answer to what was asked,
                        // same principle as LiveContext.tsx's NEEDS_INTERPRETATION_TOOLS
                        // pass -- a raw multi-source text blob standing in for an answer
                        // is not itself a good answer.
                        const synthesisInstruction =
                            'You are Mossy, answering a Fallout 4 modding question using real data a live web search tool just returned -- not your general training knowledge. ' +
                            `The user asked: "${queryForAi}"

Real search results:
${rawOutcome}

` +
                            'Write a clear, complete answer using this real data, citing what it actually says. ' +
                            'If the data does not actually answer what they asked, say so honestly rather than filling the gap from general knowledge.';
                        const synthesis = await LocalAIEngine.generateResponse(queryForAi, synthesisInstruction, [], false, undefined, { preferCloud: true });
                        toolAugmentedContent = synthesis?.content?.trim() || rawOutcome;
                        toolAugmentedReasoning = synthesis?.reasoning;
                    } else if (toolResult?.success === false) {
                        toolAugmentedContent = `I tried searching for that, but it didn't work: ${toolResult?.result || toolResult?.error || 'unknown error'}`;
                    }
                    trackEvent('tool_execution_completed', { toolName: rawToolCall.name, success: !!rawOutcome, source: 'chat_native_tool_call' });
                } catch (toolErr) {
                    console.error('[ChatInterface] Native tool call failed:', rawToolCall.name, toolErr);
                    toolAugmentedContent = `I tried to look that up, but hit an error: ${toolErr instanceof Error ? toolErr.message : String(toolErr)}`;
                }
            }

            const aiResponseText = toolAugmentedContent || localResult.content || "Mossy is in Passive Mode; no cloud model configured.";
            const rawCitations = Array.isArray(localResult.context?.citations) ? localResult.context.citations : [];
            // Brain B's citations are {id, title, source_url, license} (see gemma_service_enhanced.py's
            // _citation_from_result), not the KnowledgeCitation shape the citation UI expects — map them.
            // Other providers' citations (Memory Vault lookups etc.) already arrive pre-shaped and pass
            // through untouched.
            const citations: KnowledgeCitation[] = rawCitations.map((c: any) =>
                c && typeof c === 'object' && 'source_url' in c
                    ? {
                        title: c.title || c.id || 'Untitled',
                        source: c.source_url ? 'Fallout 4 Creation Kit Wiki' : 'Mossy Knowledge Base',
                        // BY-SA requires attribution — surfacing it here means it's not just
                        // satisfied in a repo file nobody using the app will ever open.
                        creditName: c.source_url && c.license ? `UESP (${c.license})` : undefined,
                        creditUrl: c.source_url || undefined,
                        trustLevel: 'official' as const,
                    }
                    : c
            );
            const reasoningTrace = toolAugmentedReasoning || localResult.reasoning || undefined;

            setMessages(prev => prev.map(m => m.id === streamId ? {
                ...m, content: aiResponseText, citations, reasoning: reasoningTrace,
                mode: localResult.mode, checkQuestion: localResult.checkQuestion, abstained: localResult.abstained,
                usedSceneContext: localResult.usedSceneContext, addonOutdated: localResult.addonOutdated,
                enrichmentUnavailable: localResult.enrichmentUnavailable,
                usedLocalFallback: localResult.usedLocalFallback,
                // Known synchronously (mode comes back from /enrich, before /contract
                // has even been called) — reserves the check-question card's space
                // right away rather than having it pop in once /contract resolves.
                // contract_fields() only ever produces a check_question for mode ===
                // 'teach', and never runs at all on an abstained turn.
                contractPending: localResult.mode === 'teach' && !localResult.abstained,
            } : m));

            // Save chat messages to auto-save manager
            const assistantMessage: Message = {
                id: streamId,
                role: 'assistant',
                content: aiResponseText,
                timestamp: Date.now()
            };
            autoSaveManager.saveChatMessage({ role: assistantMessage.role, content: assistantMessage.content });
            updateChatWorkingMemory([...localHistory, { role: 'assistant', content: aiResponseText }]);

            // Record interaction for self-improvement
            const { selfImprovementEngine } = await import('./SelfImprovementEngine');
            selfImprovementEngine.recordInteraction(textToSend, aiResponseText, [], 'success');

            // --- SESSION MEMORY: Save a compact turn summary every 5 exchanges ---
            try {
                const currentMsgCount = messages.length + 2; // +user +assistant
                if (currentMsgCount % 10 === 0) {
                    // Every 10 messages (5 turns) save a rolling one-liner summary
                    const summary = `Topic: "${textToSend.slice(0, 80).trim()}" → ${aiResponseText.slice(0, 120).trim().replace(/\n/g, ' ')}…`;
                    LocalAIEngine.saveSessionSummary(summary);
                }
            } catch {
                // non-critical
            }

            // Release the send-lock now that the text response is in, rather than after
            // TTS finishes speaking it. TTS playback can run many seconds; leaving
            // isLoading/isStreaming true for that whole window silently swallowed any
            // voice message the user sent while Mossy was still talking (handleSend's
            // guard at the top returns with no feedback), making the mic look broken.
            activeStreamIdRef.current = null;
            generationAbortControllerRef.current = null;
            setIsLoading(false);
            setIsStreaming(false);

            console.log('[ChatInterface] Response received, isVoiceEnabled:', isVoiceEnabled, 'isConversationPaused:', isConversationPaused);
            if (isVoiceEnabled && aiResponseText && !isConversationPaused) {
                console.log('[ChatInterface] Speaking response (length:', aiResponseText.length, ')');
                await speakText(aiResponseText);
            } else {
                console.log('[ChatInterface] Not speaking:', { isVoiceEnabled, hasText: !!aiResponseText, isConversationPaused });
            }

            // Log activity AFTER speaking (non-blocking, deferred)
            logActivity('ai_query', 'AI Response Generation', `Query: "${textToSend.substring(0, 50)}..."`, {
                duration,
                success: true,
                metadata: {
                    queryLength: textToSend.length,
                    responseLength: aiResponseText.length,
                    hasImage: !!selectedFile,
                },
                tags: ['ai_chat', 'response'],
            });

            // Notify user when a longer task finishes so they don't have to ask
            if (duration > 2500) {
                toast.success('✓ Mossy is done', { duration: 2500, id: 'mossy-task-done' });
            }

        } catch (error) {
            const streamId = activeStreamIdRef.current;
            if (streamId && stoppedStreamIdsRef.current.has(streamId)) {
                // Expected: aborting the in-flight request throws — the user already
                // saw "[Generation Stopped by User]", so don't also show a System Error.
                stoppedStreamIdsRef.current.delete(streamId);
            } else {
                console.error(error);
                const errText = error instanceof Error ? error.message : 'Unknown error';

                // Log failed activity
                logActivity('ai_query', 'AI Response Generation', `Failed: ${errText}`, {
                    success: false,
                    metadata: { errorMessage: errText },
                    tags: ['ai_chat', 'error'],
                });

                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `**System Error:** ${errText}`, timestamp: Date.now() }]);
            }
        } finally {
            activeStreamIdRef.current = null;
            generationAbortControllerRef.current = null;
            setIsLoading(false);
            setIsStreaming(false);
            setSelectedFile(null);
        }
    };

    return (
        <div data-testid="chat-container" className="flex flex-col h-full bg-forge-dark text-slate-200" style={{ scrollbarGutter: 'stable' }}>
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex flex-wrap justify-between items-center bg-forge-panel gap-y-2">
                <div className="flex items-center gap-3 min-w-0 flex-shrink overflow-hidden">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                        <Leaf className="text-emerald-400" />
                        Mossy <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-emerald-400 border border-emerald-900">FO4 EDITION</span>
                    </h2>
                    {isBridgeActive ? (
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-xs animate-fade-in">
                            <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
                            <span className="text-emerald-300">Connected</span>
                        </div>
                    ) : (
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-xs opacity-50">
                            <Wifi className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-400">Localhost Disconnected</span>
                        </div>
                    )}

                    {isBlenderLinked && (
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-orange-900/20 border border-orange-500/30 rounded-full text-xs text-orange-400 animate-fade-in">
                            <Box className="w-3 h-3" /> Blender Active
                        </div>
                    )}

                    <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs animate-fade-in ${isMonitoringPaused
                        ? 'bg-red-900/20 border-red-500/30 text-red-300'
                        : 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300'
                        }`}>
                        <Activity className="w-3 h-3" />
                        {isMonitoringPaused ? 'Monitoring Paused' : 'Monitoring On'}
                    </div>

                    {isConversationPaused && (
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs animate-fade-in bg-yellow-900/20 border-yellow-500/30 text-yellow-300">
                            <PauseCircle className="w-3 h-3" />
                            Paused — click &quot;Resume Mossy&quot; to continue
                        </div>
                    )}

                    {projectContext && (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-600 text-xs">
                            <FolderOpen className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-100 max-w-[150px] truncate">{projectContext}</span>
                        </div>
                    )}
                </div>
                <div className="flex gap-2 items-center flex-shrink-0 flex-wrap">
                    <button
                        type="button"
                        onClick={() => navigate('/knowledge-hub')}
                        className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all bg-emerald-900/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40"
                        title="Open Help"
                    >
                        <HelpCircle className="w-4 h-4" />
                        Help
                    </button>

                    {/* Context Locked to Fallout 4 */}
                    <div className="hidden xl:flex items-center gap-2 mr-2 bg-slate-900 rounded-lg p-1 border border-slate-700 px-3 opacity-80 cursor-not-allowed" title="Version locked to Fallout 4">
                        <Gamepad2 className="w-4 h-4 text-emerald-500 ml-2" />
                        <span className="text-xs text-slate-200 font-bold">Fallout 4</span>
                        <Lock className="w-3 h-3 text-slate-500 ml-2" />
                    </div>

                    {/* Blender Integration Manual Trigger */}
                    {isBlenderLinked && (
                        <button
                            onClick={() => executeTool('execute_blender_script', {
                                script: "import bpy\n\n# Force Scene Update\nbpy.context.view_layer.update()\nprint('Mossy: Syncing...')",
                                description: "Manual Sync (Blender 4.5.5)"
                            })}
                            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all bg-orange-900/20 border-orange-500/50 text-orange-400 hover:bg-orange-900/40 mr-2"
                            title="Execute Blender Script"
                        >
                            <Box className="w-4 h-4" />
                            <span>Sync</span>
                        </button>
                    )}

                    <button
                        onClick={toggleMonitoring}
                        className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${isMonitoringPaused
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                            : 'bg-emerald-900/20 border-emerald-500/40 text-emerald-300'
                            }`}
                        title={isMonitoringPaused ? 'Resume live tool monitoring' : 'Pause live tool monitoring'}
                    >
                        {isMonitoringPaused ? <PauseCircle className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                        {isMonitoringPaused ? 'Monitor: OFF' : 'Monitor: ON'}
                    </button>

                    {/* Export conversation */}
                    {messages.length > 0 && (
                        <button
                            onClick={() => {
                                const md = messages
                                    .filter(m => m.role !== 'system')
                                    .map(m => `**${m.role === 'user' ? 'You' : 'Mossy'}:** ${m.content}`)
                                    .join('\n\n---\n\n');
                                const blob = new Blob([`# Mossy Chat Export\n_${new Date().toLocaleString()}_\n\n---\n\n${md}`], { type: 'text/markdown' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `mossy-chat-${Date.now()}.md`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
                            title="Export conversation as Markdown"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden xl:inline">Export</span>
                        </button>
                    )}

                    <button
                        onClick={toggleConversationPause}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${isConversationPaused
                            ? 'bg-emerald-900/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
                            }`}
                        title={isConversationPaused ? 'Click to resume — Mossy will start responding again' : 'Click to pause — Mossy will stop responding until you resume'}
                    >
                        {isConversationPaused ? <Bot className="w-4 h-4" /> : <BotOff className="w-4 h-4" />}
                        <span className="hidden sm:inline">{isConversationPaused ? 'Resume Mossy' : 'Pause Mossy'}</span>
                    </button>

                    {isLiveActive ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleLiveMute}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${isLiveMuted
                                    ? 'bg-slate-800 border-slate-700 text-slate-400'
                                    : 'bg-red-900/20 border-red-500/50 text-red-400'
                                    }`}
                                title="Toggle Global Live Voice"
                            >
                                {isLiveMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                {isLiveMuted ? 'Live Muted' : 'Live Active'}
                            </button>
                            <button
                                onClick={() => disconnectLive()}
                                className="p-1.5 rounded-lg border border-red-500/30 hover:bg-red-900/30 text-red-400 transition-colors"
                                title="Stop Live Session"
                            >
                                <StopCircle className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            data-testid="voice-toggle"
                            onClick={toggleVoiceMode}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${isVoiceEnabled ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                        >
                            {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                            {isVoiceEnabled ? 'Voice: ON' : 'Voice: OFF'}
                        </button>
                    )}

                    {isPlayingAudio && !isLiveActive && (
                        <button
                            onClick={stopAudio}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all bg-red-900/30 border-red-500/60 text-red-300 hover:bg-red-900/60 animate-pulse"
                            title="Stop Mossy from speaking"
                        >
                            <StopCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">Stop Speaking</span>
                        </button>
                    )}

                    <button onClick={resetMemory} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors" title="Clear Chat History">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowProjectPanel(!showProjectPanel)} className={`p-2 rounded transition-colors ${showProjectPanel ? 'text-emerald-400 bg-emerald-900/30' : 'text-slate-400 hover:text-white'}`}>
                        <FileText className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowSelfImprovementPanel(!showSelfImprovementPanel)} className={`p-2 rounded transition-colors ${showSelfImprovementPanel ? 'text-purple-400 bg-purple-900/30' : 'text-slate-400 hover:text-white'}`} title="Self-Improvement Center">
                        <Brain className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {!isMonitoringPaused && liveChecklist.length > 0 && (
                <div className="px-4 pt-4">
                    <div className="bg-slate-900/70 border border-emerald-500/20 rounded-xl p-3">
                        <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest mb-2">Live guidance</div>
                        <ul className="text-xs text-slate-300 list-disc pl-4 space-y-1">
                            {liveChecklist.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <div className="px-4 pt-4">
                <ToolsInstallVerifyPanel
                    accentClassName="text-emerald-300"
                    description="AI Chat is your primary command and guidance console for Fallout 4 workflows. Voice, tool execution, and desktop actions depend on Runtime Hub / Desktop Bridge connectivity."
                    tools={[]}
                    verify={[
                        'Send a short message and confirm you receive a response.',
                        'Confirm citations can expand and collapse when sources are present.',
                    ]}
                    firstTestLoop={[
                        'Ask Mossy for a tiny "hello world" FO4 mod plan (one record or one script).',
                        'Execute exactly one action (generate text or analyze a file) and confirm the output is usable.',
                    ]}
                    troubleshooting={[
                        'If responses fail, check Settings for API key/model configuration.',
                        'If desktop actions fail, open Runtime Hub and verify Desktop Bridge is online.',
                    ]}
                    shortcuts={[
                        { label: 'Runtime Hub', to: '/runtime-hub' },
                        { label: 'FO4 Knowledge Hub', to: '/knowledge-hub' },
                        { label: 'FO4 Plugin & Load Order Hub', to: '/plugin-tools' },
                        { label: 'Creation Kit Hub', to: '/ck-tools' },
                        { label: 'FO4 System & Diagnostics Hub', to: '/system-hub' },
                    ]}
                />
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0">

                    <MessageList
                        messages={messages}
                        onRate={handleRateMessage}
                        onQuickPrompt={(prompt: string) => { setInputText(prompt); }}
                        onboardingState={onboardingState}
                        scanProgress={scanProgress}
                        detectedApps={detectedApps}
                        projectContext={projectContext}
                        handleIntegrate={handleIntegrate}
                        handleStartProject={handleStartProject}
                        onManualExecute={handleManualExecute}
                    >
                        {/* Active Tool Status */}
                        {activeTool && (
                            <div className="flex justify-start animate-slide-up">
                                <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl rounded-tl-none p-4 max-w-[85%] shadow-lg">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg"><Terminal className="w-4 h-4 text-emerald-400" /></div>
                                        <div>
                                            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Bridge Command</div>
                                            <div className="text-sm font-mono text-white">{activeTool.toolName}</div>
                                        </div>
                                        {activeTool.status === 'running' && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin ml-auto" />}
                                        {activeTool.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                                    </div>
                                    <div className="bg-black/50 rounded border border-slate-700/50 p-2 font-mono text-xs text-slate-300 overflow-x-auto mb-2">
                                        <span className="text-emerald-500">$</span> {JSON.stringify(activeTool.args)}
                                    </div>
                                    {activeTool.result && <div className="text-xs text-emerald-300/80 border-l-2 border-emerald-500/50 pl-2 mt-2 whitespace-pre-wrap">{'>'} {activeTool.result}</div>}
                                </div>
                            </div>
                        )}

                        {/* Loading / Streaming State */}
                        {(isLoading || isStreaming) && !activeTool && (
                            <div className="flex justify-start">
                                <div className="bg-forge-panel border border-slate-700 rounded-2xl rounded-tl-none p-4 flex items-center gap-3 shadow-sm">
                                    {isStreaming ? <Bot className="w-4 h-4 text-emerald-400 animate-pulse" /> : <Loader2 className="animate-spin text-emerald-400 w-4 h-4" />}
                                    <span className="text-slate-400 text-sm font-medium">{isStreaming ? 'Mossy is typing...' : 'Mossy is thinking… (responses can take 30-60 seconds)'}</span>
                                    <button onClick={handleStopGeneration} className="ml-4 p-1 hover:bg-slate-700 rounded-full text-slate-500 hover:text-white" title="Stop Generation">
                                        <Square className="w-3 h-3 fill-current" />
                                    </button>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </MessageList>

                    <div className="p-4 bg-forge-panel border-t border-slate-700 z-10">
                        {/* Suggestion Panel */}
                        {suggestions.filter(s => !dismissedSuggestionIds.has(s.id)).length > 0 && (
                            <SuggestionPanel
                                suggestions={getTopSuggestions(3).filter(s => !dismissedSuggestionIds.has(s.id))}
                                onDismiss={handleDismissSuggestion}
                                onAccept={handleAcceptSuggestion}
                                showAll={false}
                            />
                        )}

                        {onboardingState === 'project_setup' ? (
                            <ProjectWizard
                                onCancel={() => {
                                    setOnboardingState('ready');
                                    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Project setup cancelled.", timestamp: Date.now() }]);
                                }}
                                onSubmit={(data) => {
                                    createProjectFile(data);
                                    setOnboardingState('ready');
                                    setMessages(prev => [...prev, {
                                        id: Date.now().toString(),
                                        role: 'assistant',
                                        content: `**Project Initialized:** ${data.name}\n\nCategories: ${data.categories.join(', ')}\n\nI've set up your workspace. Ready to begin?`,
                                        timestamp: Date.now()
                                    }]);
                                }}
                            />
                        ) : (
                            <>
                                {selectedFile && (
                                    <div className="flex items-center gap-2 mb-2 bg-slate-800 p-2 rounded-lg w-fit text-sm border border-slate-600">
                                        <div className="bg-slate-700 p-1 rounded"><FileText className="w-4 h-4 text-slate-300" /></div>
                                        <span className="truncate max-w-[200px] text-slate-200">{selectedFile.name}</span>
                                        <button onClick={() => {
                                            // Track file removal
                                            if (selectedFile) {
                                                trackEvent('file_removed', {
                                                    fileName: selectedFile.name,
                                                    fileSize: selectedFile.size,
                                                    fileType: selectedFile.type
                                                });
                                            }
                                            setSelectedFile(null);
                                        }} className="hover:text-red-400 p-1 rounded-full hover:bg-slate-700"><X className="w-3 h-3" /></button>
                                    </div>
                                )}

                                {(isListening || isPlayingAudio) && (
                                    <div className="flex items-center gap-3 mb-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50 w-fit">
                                        {isListening && <span className="flex items-center gap-2 text-xs text-red-400 animate-pulse font-medium"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Listening... (click the mic again to stop &amp; send)</span>}
                                        {isPlayingAudio && <div className="flex items-center gap-2"><span className="flex items-center gap-2 text-xs text-emerald-400 font-medium"><Volume2 className="w-3 h-3" /> Speaking...</span><button onClick={stopAudio} className="p-1 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-400"><StopCircle className="w-3 h-3" /></button></div>}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <label className="p-3 hover:bg-slate-700 rounded-xl cursor-pointer text-slate-400 transition-colors border border-transparent hover:border-slate-600">
                                        <input type="file" className="hidden" onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                const file = e.target.files[0];
                                                setSelectedFile(file);

                                                // Track file selection
                                                trackEvent('file_selected', {
                                                    fileName: file.name,
                                                    fileSize: file.size,
                                                    fileType: file.type,
                                                    fileExtension: file.name.split('.').pop()?.toLowerCase()
                                                });
                                            }
                                        }} accept=".psc,.nif,.dds,image/*,text/*" />
                                        <Paperclip className="w-5 h-5" />
                                    </label>

                                    <button
                                        onClick={isListening ? stopListening : startListening}
                                        disabled={isLiveActive}
                                        className={`p-3 rounded-xl transition-all border ${isListening
                                            ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse hover:bg-red-500/30'
                                            : isLiveActive
                                                ? 'bg-slate-900 text-slate-600 cursor-not-allowed border-transparent'
                                                : 'bg-slate-800 text-slate-400 hover:text-white border-transparent hover:border-slate-600 hover:bg-slate-700'
                                            }`}
                                        title={isLiveActive ? "Microphone in use by Live Interface" : isListening ? "Stop Recording" : "Start Recording"}
                                    >
                                        {isListening ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                    </button>

                                    {isListening && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 rounded-xl border border-slate-700">
                                            <div className="text-xs text-slate-400">Audio:</div>
                                            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${audioLevel > 30 ? 'bg-emerald-500' :
                                                        audioLevel > 10 ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                                        }`}
                                                    style={{ width: `${audioLevel}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-slate-400 w-8 text-right">{audioLevel}%</div>
                                        </div>
                                    )}

                                    {isConversationPaused && (
                                        <div
                                            role="alert"
                                            aria-live="polite"
                                            className="flex items-center gap-2 px-4 py-2 bg-yellow-900/20 border border-yellow-500/30 rounded-xl text-xs text-yellow-300 w-full"
                                        >
                                            <PauseCircle className="w-4 h-4 flex-shrink-0" />
                                            <span>Mossy is paused. Click <strong>Resume Mossy</strong> in the toolbar above to start chatting again.</span>
                                        </div>
                                    )}

                                    {(() => {
                                        const inputClass = [
                                            'flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2',
                                            'focus:outline-none focus:border-emerald-500 transition-colors',
                                            'text-slate-100 placeholder-slate-500',
                                            isConversationPaused ? 'opacity-40 cursor-not-allowed' : '',
                                        ].join(' ');
                                        const inputPlaceholder = isConversationPaused
                                            ? 'Mossy is paused — click Resume Mossy to continue'
                                            : 'Message Mossy...';
                                        return (
                                            <input
                                                type="text"
                                                data-testid="chat-input"
                                                className={inputClass}
                                                placeholder={inputPlaceholder}
                                                value={inputText}
                                                onChange={(e) => setInputText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                                disabled={isConversationPaused}
                                            />
                                        );
                                    })()}
                                    <button
                                        data-testid="send-button"
                                        onClick={() => handleSend()}
                                        disabled={isLoading || isStreaming || (!inputText && !selectedFile) || isConversationPaused}
                                        className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-lg shadow-emerald-900/20"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Self-Improvement Panel */}
            <SelfImprovementPanel
                isVisible={showSelfImprovementPanel}
                onClose={() => setShowSelfImprovementPanel(false)}
            />
        </div>
    );
};

export default ChatInterface;
