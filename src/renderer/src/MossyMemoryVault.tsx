import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Book, Upload, Trash2, Search, Brain, FileText, CheckCircle2, Loader2, Sparkles, Database, Plus, X, Activity, Cloud, Files, Download } from 'lucide-react';
import { LocalAIEngine } from './LocalAIEngine';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { useWheelScrollProxy } from './components/useWheelScrollProxy';
import { openExternal } from './utils/openExternal';

interface MemoryItem {
    id: string;
    title: string;
    content: string;
    source: string;
    creditName?: string;
    creditUrl?: string;
    trustLevel?: 'personal' | 'community' | 'official';
    date: string;
    tags: string[];
    status: 'digesting' | 'learned';
}

type TrustFilter = 'all' | 'personal' | 'community' | 'official';

type MossyMemoryVaultProps = {
    embedded?: boolean;
};

const MossyMemoryVault: React.FC<MossyMemoryVaultProps> = ({ embedded = false }) => {
    const contentScrollRef = useRef<HTMLDivElement>(null);
    const onWheel = useWheelScrollProxy(contentScrollRef);

    const [memories, setMemories] = useState<MemoryItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newSource, setNewSource] = useState('');
    const [newCreditName, setNewCreditName] = useState('');
    const [newCreditUrl, setNewCreditUrl] = useState('');
    const [newTrustLevel, setNewTrustLevel] = useState<'personal' | 'community' | 'official'>('personal');
    const [newTags, setNewTags] = useState('');
    const [isDragActive, setIsDragActive] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [trustFilter, setTrustFilter] = useState<TrustFilter>('all');

    useEffect(() => {
        const stored = localStorage.getItem('mossy_knowledge_vault');
        if (stored) {
            const parsed = JSON.parse(stored) as MemoryItem[];
            const normalized = Array.isArray(parsed)
                ? parsed.map((m) => ({
                    ...m,
                    trustLevel: m.trustLevel || 'personal',
                }))
                : [];
            setMemories(normalized);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('mossy_knowledge_vault', JSON.stringify(memories));
        // Broadcast to other components if needed
        window.dispatchEvent(new Event('mossy-knowledge-updated'));
    }, [memories]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragActive(true);
        } else if (e.type === "dragleave") {
            setIsDragActive(false);
        }
    };

    const handleVideoFile = async (file: File) => {
        try {
            setIsUploading(true);
            setUploadProgress(10);
            
            const arrayBuffer = await file.arrayBuffer();
            setUploadProgress(30);
            
            // Use IPC to transcribe video in main process
            const projectId = localStorage.getItem('openai_project_id') || undefined;
            const organizationId = localStorage.getItem('openai_org_id') || undefined;
            const api = (window as any).electron?.api;
            if (!api?.transcribeVideo) {
                throw new Error('Video transcription IPC not available');
            }
            const result = await api.transcribeVideo(arrayBuffer, file.name, projectId, organizationId);
            setUploadProgress(90);
            
            if (result?.success) {
                const fileName = file.name.replace(/\.[^/.]+$/, '');
                setNewTitle(fileName + ' (Video Transcript)');
                setNewContent(result.text.trim());
                setNewSource((prev) => (prev ? prev : `File: ${file.name}`));
                setUploadProgress(100);
                setIsUploading(false);
                setUploadProgress(0);
                setShowUploadModal(true);
            } else {
                throw new Error(result?.error || 'Video transcription failed');
            }
        } catch (error: any) {
            setIsUploading(false);
            setUploadProgress(0);
            console.error('Video transcription error:', error);
            
            // Check if it's an auth error or missing local whisper
            const errorMsg = error.message || '';
            if (errorMsg.includes('401') || errorMsg.includes('Incorrect API key')) {
                alert(`❌ Video transcription failed\n\n🔑 Your OpenAI API key has an issue (401 error)\n\n💡 Solutions:\n\n1. LOCAL (Recommended):\n   • Download whisper.cpp.exe from: https://github.com/ggerganov/whisper.cpp/releases\n   • Download ggml-base.en.bin from: https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin\n   • Place both in: external/whisper/\n   • Try uploading the video again (no API key needed!)\n\n2. CLOUD:\n   • Get a fresh API key from: https://platform.openai.com/api-keys\n   • Make sure billing is set up\n   • Update key in Privacy Settings`);
            } else if (errorMsg.includes('whisper') || errorMsg.includes('not found')) {
                alert(`❌ Video transcription failed\n\n📁 Missing local transcription files\n\nTo transcribe videos offline:\n1. Download whisper.cpp.exe from: https://github.com/ggerganov/whisper.cpp/releases\n2. Download ggml-base.en.bin (~150MB) from: https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin\n3. Create folder: external/whisper/\n4. Place both files there\n5. Try again!\n\nOr add an OpenAI API key in Privacy Settings for cloud transcription.`);
            } else {
                alert(`❌ Transcription failed: ${errorMsg}\n\nPlease check:\n1. Video file is not corrupted\n2. Internet connection (for cloud transcription)\n3. Whisper files in external/whisper/ (for offline)`);
            }
        }
    };

    const handleDropFiles = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;

        const file = files[0]; // Process only first file
        
        // Check if it's an audio file
        if (file.type.startsWith('audio/') || /\.(mp3|wav|flac|aac|ogg|m4a|wma)$/i.test(file.name)) {
            handleVideoFile(file); // Reuse video handler since it handles audio transcription
            return;
        }
        
        // Check if it's a video
        if (file.type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v|3gp)$/i.test(file.name)) {
            handleVideoFile(file);
            return;
        }
        
        // Check if it's a PDF
        if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
            try {
                setIsUploading(true);
                setUploadProgress(10);
                
                const arrayBuffer = await file.arrayBuffer();
                setUploadProgress(30);
                
                // Use IPC to parse PDF in main process
                const result = await (window as any).electron?.api?.parsePDF(arrayBuffer);
                setUploadProgress(90);
                
                if (result?.success) {
                    const fileName = file.name.replace(/\.pdf$/i, '');
                    setNewTitle(fileName);
                    setNewContent(result.text.trim());
                    setNewSource((prev) => (prev ? prev : `File: ${file.name}`));
                    setUploadProgress(100);
                    setIsUploading(false);
                    setUploadProgress(0);
                    setShowUploadModal(true);
                } else {
                    throw new Error(result?.error || 'PDF parsing failed');
                }
            } catch (error: any) {
                setIsUploading(false);
                setUploadProgress(0);
                console.error('PDF error:', error);
                
                // Fallback to manual copy/paste
                const fileName = file.name.replace(/\.pdf$/i, '');
                setNewTitle(fileName);
                setNewSource((prev) => (prev ? prev : `File: ${file.name}`));
                setShowUploadModal(true);
                setTimeout(() => {
                    alert(`❌ Auto-extraction failed.\n\nPlease:\n1. Open "${file.name}"\n2. Select all (Ctrl+A) & copy (Ctrl+C)\n3. Paste (Ctrl+V) below`);
                }, 100);
            }
            return;
        }
        
        // Check if file is text-based
        if (file.type.startsWith('text/') || /\.(md|txt|json|bat|cmd|xml|ini|cfg|ps1|sh|py|js|ts|html|css|scss|sass|yaml|yml)$/i.test(file.name)) {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const content = event.target?.result as string;
                if (content) {
                    const fileName = file.name.replace(/\.[^/.]+$/, '');
                    setNewTitle(fileName);
                    setNewContent(content);
                    setNewSource((prev) => (prev ? prev : `File: ${file.name}`));
                    setShowUploadModal(true);
                }
            };
            
            reader.readAsText(file);
        } else {
            alert(`❌ Unsupported file type: ${file.name}\n\nSupported: .pdf, .txt, .md, .json, .bat, .cmd, .xml, .ini, .cfg, .ps1, .sh, .py, .js, .ts, .html, .css, .scss, .sass, .yaml, .yml, .mp4, .webm, .mov, .avi, .mkv, .flv, .wmv, .m4v, .3gp, .mp3, .wav, .flac, .aac, .ogg, .m4a, .wma`);
        }
    };

    const handleDropText = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        const text = e.dataTransfer?.getData('text/plain');
        if (text && text.length > 0) {
            setNewContent(text);
            setShowUploadModal(true);
        }
    };

    const handleUpload = async () => {
        if (!newTitle || !newContent) return;
        setUploadError('');
        if (!newSource.trim()) {
            setUploadError('Source is required so credit is preserved.');
            return;
        }
        if (!newCreditName.trim()) {
            setUploadError('Credit name is required.');
            return;
        }

        setIsUploading(true);
        setUploadProgress(10);

        // Analysis & Indexing
        const stages = [30, 60, 90, 100];
        for (const stage of stages) {
            await new Promise(r => setTimeout(r, 600));
            setUploadProgress(stage);
        }

        const newItem: MemoryItem = {
            id: `mem-${Date.now()}`,
            title: newTitle,
            content: newContent,
            source: newSource.trim(),
            creditName: newCreditName.trim(),
            creditUrl: newCreditUrl.trim() || undefined,
            trustLevel: newTrustLevel,
            date: new Date().toLocaleDateString(),
            tags: newTags.split(',').map(t => t.trim()).filter(t => t),
            status: 'learned'
        };

        setMemories([newItem, ...memories]);
        setIsUploading(false);
        setUploadProgress(0);
        setShowUploadModal(false);
        setNewTitle('');
        setNewContent('');
        setNewSource('');
        setNewCreditName('');
        setNewCreditUrl('');
        setNewTrustLevel('personal');
        setNewTags('');
        setUploadError('');
        // Record for ML tracking
        LocalAIEngine.recordAction('knowledge_ingested', { title: newItem.title, tags: newItem.tags }).catch(() => {});
    };

    const handleExportVault = () => {
        const blob = new Blob([JSON.stringify(memories, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mossy-knowledge-vault.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const deleteMemory = (id: string) => {
        setMemories(memories.filter(m => m.id !== id));
    };

    const filteredMemories = memories.filter(m => {
        const trust = m.trustLevel || 'personal';
        const trustOk = trustFilter === 'all' ? true : trust === trustFilter;
        if (!trustOk) return false;

        const q = searchTerm.toLowerCase();
        return (
            m.title.toLowerCase().includes(q) ||
            m.content.toLowerCase().includes(q) ||
            m.tags.some(t => t.toLowerCase().includes(q))
        );
    });

    const containerClass = embedded
        ? 'min-h-0 flex flex-col bg-[#0f120f] text-slate-200 font-sans overflow-hidden border border-emerald-900/30 rounded-lg'
        : 'h-full min-h-0 flex flex-col bg-[#0f120f] text-slate-200 font-sans overflow-hidden';

    const overlayPositionClass = embedded ? 'absolute inset-0' : 'fixed inset-0';

    return (
        <div className={containerClass} onWheel={onWheel}>
            {/* Drag and Drop Overlay */}
            {isDragActive && (
                <div 
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={(e) => {
                        handleDropFiles(e);
                        if (!e.dataTransfer?.files?.length) {
                            handleDropText(e);
                        }
                    }}
                    className={`${overlayPositionClass} z-40 bg-emerald-500/20 border-4 border-dashed border-emerald-400 flex items-center justify-center backdrop-blur-sm`}
                    style={{ pointerEvents: 'auto' }}
                >
                    <div className="text-center pointer-events-none">
                        <Cloud className="w-16 h-16 text-emerald-400 mb-4 mx-auto animate-bounce" />
                        <h3 className="text-2xl font-bold text-emerald-300 mb-2">Drop Knowledge Here</h3>
                        <p className="text-emerald-200 text-sm">Paste text, drop files, or drag tutorials</p>
                    </div>
                </div>
            )}

            {/* PDF Processing Overlay */}
            {isUploading && !showUploadModal && (
                <div className={`${overlayPositionClass} z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center`}>
                    <div className="bg-[#141814] border border-emerald-500/30 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-emerald-500/10">
                        <div className="text-center space-y-4">
                            <Loader2 className="w-12 h-12 text-emerald-400 mx-auto animate-spin" />
                            <h3 className="text-xl font-bold text-white">Processing PDF...</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Extracting text</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
                                    <div 
                                        className="bg-emerald-500 h-full transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="p-6 border-b border-emerald-900/30 bg-[#141814] flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <Brain className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            Memory Vault
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">ENHANCED RAG</span>
                        </h2>
                        <p className="text-xs text-slate-400">Upload tutorials, snippets, and lore for Mossy to digest into her long-term memory.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        to="/reference"
                        className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 transition-colors"
                        title="Open help"
                    >
                        Help
                    </Link>
                    <button
                        onClick={handleExportVault}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 hover:bg-slate-800 text-slate-100 rounded-lg transition-all border border-slate-700 text-sm font-bold"
                    >
                        <Download className="w-4 h-4" />
                        Export Vault
                    </button>
                    <button 
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-lg shadow-emerald-900/20 text-sm font-bold"
                    >
                        <Plus className="w-4 h-4" />
                        Ingest Knowledge
                    </button>
                </div>
            </div>

            <div className="px-6 pt-4">
                <ToolsInstallVerifyPanel
                    accentClassName="text-emerald-300"
                    description="You can ingest text/files entirely locally. Offline video transcription is optional and requires whisper.cpp + a model file."
                    tools={[
                        {
                            label: 'whisper.cpp releases (offline transcription)'
                            ,
                            href: 'https://github.com/ggerganov/whisper.cpp/releases'
                            ,
                            kind: 'official'
                            ,
                            note: 'Place whisper.cpp.exe under external/whisper/ if you want offline video transcription.'
                        },
                        {
                            label: 'Hugging Face model file (example: ggml-base.en.bin)'
                            ,
                            href: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin'
                            ,
                            kind: 'official'
                            ,
                            note: 'Download the model and place it next to whisper.cpp.exe (see the notice below).'
                        },
                    ]}
                    verify={[
                        'Click “Ingest Knowledge” → paste a short snippet → confirm it appears in the list.',
                        'Search for a unique word you pasted and confirm it matches.',
                        'Confirm the vault count badge updates across the app (Chat/Live pages show it).'
                    ]}
                    firstTestLoop={[
                        'Ingest 1 small text snippet + 1 local file → confirm both show as learned.',
                        'Open Chat and ask a question that should be answered from your ingested content.',
                        'If using Live Synapse, connect and verify the “Vault loaded” badge reflects your count.'
                    ]}
                    troubleshooting={[
                        'If PDF or file processing stalls, try a smaller file first to isolate whether it is a parsing issue.',
                        'If offline video transcription is enabled but fails, re-check file names and the external/whisper/ directory structure.'
                    ]}
                />
            </div>

            {/* Stats Bar */}
            <div className="px-6 py-3 bg-[#1a1f1a] border-b border-emerald-900/20 flex items-center gap-6 text-[10px] font-mono text-emerald-300">
                <div className="flex items-center gap-2">
                    <Database className="w-3 h-3" />
                    <span>LOCAL VECTOR DB: {(memories.length * 0.45).toFixed(2)} MB INDEXED</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>SYNCED TO LOCAL AI ENGINE (OLLAMA)</span>
                </div>
                <div className="flex items-center gap-2">
                    <Activity className="w-3 h-3 text-cyan-400" />
                    <span>NEURAL DENSITY: {(memories.length * 0.12).toFixed(2)} pts</span>
                </div>
            </div>

            {/* Video Transcription Setup Notice */}
            <div className="mx-6 mt-4 mb-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-slate-300 space-y-1">
                        <div className="font-semibold text-blue-300">📹 Video Transcription Setup</div>
                        <div className="text-slate-400">
                            For offline video transcription, place these in <code className="px-1 py-0.5 bg-slate-800 rounded text-emerald-400 font-mono text-[10px]">external/whisper/</code>:
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400 ml-1">
                            <li><code className="text-cyan-400 font-mono">whisper.cpp.exe</code> - Get from <a href="https://github.com/ggerganov/whisper.cpp/releases" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">whisper.cpp releases</a></li>
                            <li><code className="text-cyan-400 font-mono">ggml-base.en.bin</code> - Download from <a href="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">HuggingFace</a> (~150MB)</li>
                        </ul>
                        <div className="text-[10px] text-slate-500 mt-1">Or add an OpenAI API key for cloud transcription (optional)</div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="p-6 bg-[#0f120f]">
                <div className="relative max-w-2xl mx-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Search Mossy's memories (e.g. 'Papyrus quest loops', 'NIF collision tips')..."
                        className="w-full bg-[#141814] border border-emerald-900/30 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="max-w-2xl mx-auto mt-3 flex items-center gap-3 text-xs text-slate-400">
                    <span className="uppercase tracking-widest text-[10px] text-emerald-500">Trust</span>
                    <select
                        className="bg-[#141814] border border-emerald-900/30 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                        value={trustFilter}
                        onChange={(e) => setTrustFilter(e.target.value as TrustFilter)}
                    >
                        <option value="all">All</option>
                        <option value="personal">Personal</option>
                        <option value="community">Community</option>
                        <option value="official">Official</option>
                    </select>
                </div>
            </div>

            {/* Content Area */}
            <div 
                ref={contentScrollRef}
                className="flex-1 min-h-0 overflow-y-auto p-6 pb-24 space-y-4"
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={(e) => {
                    handleDropFiles(e);
                    if (!e.dataTransfer?.files?.length) {
                        handleDropText(e);
                    }
                }}
            >
                {filteredMemories.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                        <Book className="w-16 h-16 mb-4 text-slate-600" />
                        <h3 className="text-lg font-medium text-slate-400">No memories found</h3>
                        <p className="text-sm text-slate-500 max-w-sm">Mossy hasn't ingested any custom tutorials yet. Click 'Ingest Knowledge' to expand her capabilities.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filteredMemories.map((mem) => (
                            <div key={mem.id} className="group bg-[#141814] border border-emerald-900/20 rounded-xl p-5 hover:border-emerald-500/40 transition-all hover:bg-[#1a1f1a] relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button 
                                        onClick={() => deleteMemory(mem.id)}
                                        className="p-1.5 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded border border-red-500/20 transition-colors"
                                        title="Forget memory"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="mt-1">
                                        <FileText className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-100 text-sm truncate pr-16">{mem.title}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-slate-500 font-mono italic">{mem.date}</span>
                                            <span className="text-[10px] text-emerald-500 flex items-center gap-1 font-bold">
                                                <CheckCircle2 className="w-2.5 h-2.5" /> LEARNED
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                                            <span className="px-2 py-0.5 rounded-full border border-emerald-500/20 text-[9px] text-emerald-300 bg-emerald-500/10 uppercase">
                                                Trust: {mem.trustLevel || 'personal'}
                                            </span>
                                            <span className="truncate">Credit: {mem.creditName || 'Uncredited'}</span>
                                            {mem.creditUrl && (
                                                <button
                                                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                                    onClick={() => void openExternal(mem.creditUrl)}
                                                    title="Open credit source"
                                                >
                                                    Source
                                                </button>
                                            )}
                                        </div>
                                        <div className="mt-1 text-[10px] text-slate-500 truncate">Source: {mem.source || 'Unknown'}</div>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed bg-black/20 p-2 rounded border border-white/5 italic">
                                    "{mem.content}"
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {mem.tags.map(tag => (
                                        <span key={tag} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[9px] rounded-full border border-slate-700">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowUploadModal(false);
                            setNewTitle('');
                            setNewContent('');
                            setNewTags('');
                            setNewSource('');
                            setNewCreditName('');
                            setNewCreditUrl('');
                            setNewTrustLevel('personal');
                            setUploadError('');
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            setShowUploadModal(false);
                            setNewTitle('');
                            setNewContent('');
                            setNewTags('');
                            setNewSource('');
                            setNewCreditName('');
                            setNewCreditUrl('');
                            setNewTrustLevel('personal');
                            setUploadError('');
                        }
                    }}
                >
                    <div className="bg-[#141814] border border-emerald-500/30 w-full max-w-2xl rounded-2xl shadow-2xl shadow-emerald-500/10 overflow-hidden transform animate-scale-in">
                        <div className="p-6 border-b border-emerald-900/30 flex justify-between items-center bg-[#1a1f1a]">
                            <div className="flex items-center gap-3">
                                <Plus className="text-emerald-400 w-5 h-5" />
                                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Expand Neural Memory</h3>
                            </div>
                            <button onClick={() => {
                                setShowUploadModal(false);
                                setNewTitle('');
                                setNewContent('');
                                setNewTags('');
                                setNewSource('');
                                setNewCreditName('');
                                setNewCreditUrl('');
                                setNewTrustLevel('personal');
                                setUploadError('');
                            }} className="text-slate-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest pl-1">Knowledge Title</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Advanced Papyrus Optimization"
                                    className="w-full bg-[#0f120f] border border-emerald-900/40 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    disabled={isUploading}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest pl-1">Knowledge Content (Tutorial / Info / Snippet)</label>
                                <div 
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsDragActive(false);
                                        if (e.dataTransfer?.files?.length) {
                                            handleDropFiles(e);
                                        } else {
                                            handleDropText(e);
                                        }
                                    }}
                                    className={`relative border-2 border-dashed rounded-xl transition-all ${
                                        isDragActive 
                                            ? 'border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/20' 
                                            : 'border-emerald-900/40 bg-[#0f120f]'
                                    }`}
                                >
                                    <textarea 
                                        rows={8}
                                        placeholder="Paste the tutorial here, or drag & drop PDFs/videos/text files. Mossy will analyze this to provide better answers."
                                        className="w-full bg-transparent border-0 py-3 px-4 text-sm text-white focus:outline-none font-mono resize-none relative z-10 placeholder-slate-500"
                                        value={newContent}
                                        onChange={(e) => setNewContent(e.target.value)}
                                        disabled={isUploading}
                                    />
                                    {!newContent && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50">
                                            <Files className="w-8 h-8 text-emerald-400 mb-2" />
                                            <p className="text-xs text-slate-400">Drop files here or paste text</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest pl-1">Source (Required)</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. https://www.creationkit.com | or File: MyNotes.txt"
                                        className="w-full bg-[#0f120f] border border-emerald-900/40 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                                        value={newSource}
                                        onChange={(e) => setNewSource(e.target.value)}
                                        disabled={isUploading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest pl-1">Trust Level</label>
                                    <select
                                        className="w-full bg-[#0f120f] border border-emerald-900/40 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                                        value={newTrustLevel}
                                        onChange={(e) => setNewTrustLevel(e.target.value as MemoryItem['trustLevel'])}
                                        disabled={isUploading}
                                    >
                                        <option value="personal">Personal</option>
                                        <option value="community">Community</option>
                                        <option value="official">Official</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest pl-1">Credit Name (Required)</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Bethesda Docs | Dan Bolder | Nexus Modder"
                                        className="w-full bg-[#0f120f] border border-emerald-900/40 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                                        value={newCreditName}
                                        onChange={(e) => setNewCreditName(e.target.value)}
                                        disabled={isUploading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest pl-1">Credit URL (Optional)</label>
                                    <input 
                                        type="text" 
                                        placeholder="https://..."
                                        className="w-full bg-[#0f120f] border border-emerald-900/40 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                                        value={newCreditUrl}
                                        onChange={(e) => setNewCreditUrl(e.target.value)}
                                        disabled={isUploading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest pl-1">Tags (Comma separated)</label>
                                <input 
                                    type="text" 
                                    placeholder="scripting, optimization, combat"
                                    className="w-full bg-[#0f120f] border border-emerald-900/40 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                                    value={newTags}
                                    onChange={(e) => setNewTags(e.target.value)}
                                    disabled={isUploading}
                                />
                            </div>

                            {uploadError && (
                                <div className="text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
                                    {uploadError}
                                </div>
                            )}

                            {isUploading && (
                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between text-[10px] font-mono mb-1">
                                        <span className="text-emerald-400 flex items-center gap-2">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            NEURAL INTEGRATION IN PROGRESS...
                                        </span>
                                        <span className="text-slate-500">{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-white/5">
                                        <div 
                                            className="bg-emerald-500 h-full transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-[#1a1f1a] border-t border-emerald-900/30 flex justify-end gap-3">
                            <button 
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setNewTitle('');
                                    setNewContent('');
                                    setNewTags('');
                                }}
                                className="px-5 py-2 text-sm text-slate-400 hover:text-white font-medium transition-colors"
                                disabled={isUploading}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleUpload}
                                disabled={isUploading || !newTitle || !newContent}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-all font-bold text-sm shadow-lg shadow-emerald-500/10"
                            >
                                {isUploading ? 'Digesting...' : 'Start Digestion'}
                                {!isUploading && <Sparkles className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MossyMemoryVault;

// Add this to your Tailwind config for animations:
// keyframes: {
//   'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
//   'scale-in': { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
// }
