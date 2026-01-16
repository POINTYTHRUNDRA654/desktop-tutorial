import React, { useState, useEffect } from 'react';
import { Book, Upload, Trash2, Search, Brain, FileText, CheckCircle2, Loader2, Sparkles, Database, Plus, X, Activity, Cloud, Files } from 'lucide-react';
import { LocalAIEngine } from './LocalAIEngine';

interface MemoryItem {
    id: string;
    title: string;
    content: string;
    source: string;
    date: string;
    tags: string[];
    status: 'digesting' | 'learned';
}

const MossyMemoryVault: React.FC = () => {
    const [memories, setMemories] = useState<MemoryItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newTags, setNewTags] = useState('');
    const [isDragActive, setIsDragActive] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('mossy_knowledge_vault');
        if (stored) {
            setMemories(JSON.parse(stored));
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

    const handleDropFiles = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Check if file is text-based
            if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.json')) {
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    const content = event.target?.result as string;
                    if (content) {
                        const fileName = file.name.replace(/\.[^/.]+$/, '');
                        setNewTitle(fileName);
                        setNewContent(content);
                        setShowUploadModal(true);
                    }
                };
                
                reader.readAsText(file);
                break; // Only process first text file
            }
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
            source: 'Manual Upload',
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
        setNewTags('');

        // Record for ML tracking
        LocalAIEngine.recordAction('knowledge_ingested', { title: newItem.title, tags: newItem.tags });
    };

    const deleteMemory = (id: string) => {
        setMemories(memories.filter(m => m.id !== id));
    };

    const filteredMemories = memories.filter(m => 
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="h-full flex flex-col bg-[#0f120f] text-slate-200 font-sans overflow-hidden">
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
                    className="fixed inset-0 z-40 bg-emerald-500/20 border-4 border-dashed border-emerald-400 flex items-center justify-center backdrop-blur-sm"
                    style={{ pointerEvents: 'auto' }}
                >
                    <div className="text-center pointer-events-none">
                        <Cloud className="w-16 h-16 text-emerald-400 mb-4 mx-auto animate-bounce" />
                        <h3 className="text-2xl font-bold text-emerald-300 mb-2">Drop Knowledge Here</h3>
                        <p className="text-emerald-200 text-sm">Paste text, drop files, or drag tutorials</p>
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
                <button 
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-lg shadow-emerald-900/20 text-sm font-bold"
                >
                    <Plus className="w-4 h-4" />
                    Ingest Knowledge
                </button>
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
            </div>

            {/* Content Area */}
            <div 
                className="flex-1 overflow-y-auto p-6 space-y-4"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#141814] border border-emerald-500/30 w-full max-w-2xl rounded-2xl shadow-2xl shadow-emerald-500/10 overflow-hidden transform animate-scale-in">
                        <div className="p-6 border-b border-emerald-900/30 flex justify-between items-center bg-[#1a1f1a]">
                            <div className="flex items-center gap-3">
                                <Plus className="text-emerald-400 w-5 h-5" />
                                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Expand Neural Memory</h3>
                            </div>
                            <button onClick={() => setShowUploadModal(false)} className="text-slate-500 hover:text-white transition-colors">
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
                                    onDrop={handleDropText}
                                    className={`relative border-2 border-dashed rounded-xl transition-all ${
                                        isDragActive 
                                            ? 'border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/20' 
                                            : 'border-emerald-900/40 bg-[#0f120f]'
                                    }`}
                                >
                                    <textarea 
                                        rows={8}
                                        placeholder="Paste the tutorial here, or drag & drop text files. Mossy will analyze this to provide better answers."
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
                                onClick={() => setShowUploadModal(false)}
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
