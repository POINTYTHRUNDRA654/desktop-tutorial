import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Book, Upload, Trash2, Search, Brain, FileText, CheckCircle2, Loader2, Sparkles, Database, Plus, X, Activity, Cloud, Files, Download, Share2, PackageOpen, RefreshCw, Box, GitBranch, Video, Globe, Info } from 'lucide-react';
import { LocalAIEngine } from './LocalAIEngine';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { useWheelScrollProxy } from './components/useWheelScrollProxy';
import { openExternal } from './utils/openExternal';
import { saveKnowledgeVaultToFile, restoreKnowledgeVaultFromFile } from './knowledgeRetrieval';
import { getPublicAssetUrl } from './utils/publicAssetUrl';

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
    shareWithCommunity?: boolean;
    sharedDate?: string;
}

type TrustFilter = 'all' | 'personal' | 'community' | 'official';

type MossyMemoryVaultProps = {
    embedded?: boolean;
};

const MossyMemoryVault: React.FC<MossyMemoryVaultProps> = ({ embedded = false }) => {
    const whisperModelFileUrl = 'https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-base.en.bin';
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
    
    // Knowledge distribution state
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [communityPacks, setCommunityPacks] = useState<any[]>([]);
    const [shareWithCommunity, setShareWithCommunity] = useState(false);
    const [showCommunityPanel, setShowCommunityPanel] = useState(false);
    const [uploadingFileType, setUploadingFileType] = useState<'pdf' | 'psd' | 'abr' | 'video' | 'audio'>('pdf');
    const [showKnowledgeLibrary, setShowKnowledgeLibrary] = useState(false);
    const [availableKnowledge, setAvailableKnowledge] = useState<any[]>([]);
    const [newKnowledgeCount, setNewKnowledgeCount] = useState(0);

    const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

    // Build tag suggestions from existing vault entries whenever content changes
    useEffect(() => {
        if (!newContent && !newTitle) {
            setTagSuggestions([]);
            return;
        }
        const combined = `${newTitle} ${newContent}`.toLowerCase();
        const allTags = memories.flatMap((m) => m.tags || []);
        const tagFreq: Record<string, number> = {};
        for (const tag of allTags) {
            const t = tag.toLowerCase().trim();
            if (!t) continue;
            // Only suggest tags whose text appears in the new content/title
            if (combined.includes(t.replace(/-/g, ' ')) || combined.includes(t)) {
                tagFreq[tag] = (tagFreq[tag] || 0) + 1;
            }
        }
        const sorted = Object.entries(tagFreq)
            .sort((a, b) => b[1] - a[1])
            .map(([tag]) => tag)
            .slice(0, 8);
        setTagSuggestions(sorted);
    }, [newTitle, newContent, memories]);

    useEffect(() => {
        const initVault = async () => {
            // 1. Load vault from localStorage, or restore from durable file backup if empty
            //    (covers reinstalls, localStorage clears, and first launches).
            // 2. After the vault is populated, run bundled knowledge import so it never
            //    races against the restore path and accidentally overwrites user items.
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
            } else {
                // localStorage is empty — try to restore from the file backup so user data
                // fed to Mossy is never lost after a reinstall or a storage clear.
                const restored = await restoreKnowledgeVaultFromFile();
                if (restored.length > 0) {
                    // restoreKnowledgeVaultFromFile already validates each item has an id;
                    // normalise the remaining optional fields to safe defaults.
                    const normalized: MemoryItem[] = restored.map((m) => ({
                        id: m.id ?? String(Date.now() + Math.random()),
                        title: m.title ?? 'Untitled',
                        content: m.content ?? '',
                        source: m.source ?? '',
                        creditName: m.creditName,
                        creditUrl: m.creditUrl,
                        trustLevel: m.trustLevel ?? 'personal',
                        date: m.date ?? new Date().toISOString(),
                        tags: Array.isArray(m.tags) ? m.tags : [],
                        status: (m.status as MemoryItem['status']) ?? 'learned',
                    }));
                    setMemories(normalized);
                }
            }

            // 2. AFTER vault is loaded, run bundled knowledge import so it reads
            //    the correct localStorage state (including any just-restored data)
            //    and does not accidentally overwrite restored items.
            await importBundledKnowledge().catch(console.error);
        };
        initVault().catch(console.error);

        // Count unimported local knowledge packs for the badge
        checkLocalKnowledgePacks().catch(console.error);
    }, []);

    useEffect(() => {
        localStorage.setItem('mossy_knowledge_vault', JSON.stringify(memories));
        // Also persist to a file in userData so the data survives localStorage clears
        // and app reinstalls. Fire-and-forget — failures are logged but not surfaced.
        saveKnowledgeVaultToFile(memories).catch(console.error);
        // Broadcast to other components if needed
        window.dispatchEvent(new Event('mossy-knowledge-updated'));
    }, [memories]);

    // Check for new local bundled packs (every 6 hours)
    useEffect(() => {
        const checkForUpdates = async () => {
            const lastCheck = localStorage.getItem('mossy_knowledge_last_check');
            const now = Date.now();
            const sixHours = 6 * 60 * 60 * 1000;
            
            if (lastCheck && now - parseInt(lastCheck) < sixHours) {
                return; // Checked recently
            }

            await checkLocalKnowledgePacks();
            localStorage.setItem('mossy_knowledge_last_check', now.toString());
        };

        checkForUpdates();
        const interval = setInterval(checkForUpdates, 6 * 60 * 60 * 1000); // Every 6 hours
        return () => clearInterval(interval);
    }, []);

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
            setUploadingFileType(file.type.startsWith('video/') ? 'video' : 'audio');
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
                toast.error(`Video transcription failed. Your OpenAI API key has an issue (401 error). Solutions: 1. LOCAL (Recommended): Download whisper.cpp.exe and ggml-base.en.bin, place both in: external/whisper/, try uploading the video again (no API key needed!). 2. CLOUD: Get a fresh API key from platform.openai.com/api-keys, make sure billing is set up, update key in Privacy Settings`);
            } else if (errorMsg.includes('whisper') || errorMsg.includes('not found')) {
                toast.error(`Video transcription failed. Missing local transcription files. To transcribe videos offline: 1. Download whisper.cpp.exe. 2. Download ggml-base.en.bin (~150MB). 3. Create folder: external/whisper/. 4. Place both files there. 5. Try again! Or add an OpenAI API key in Privacy Settings for cloud transcription.`);
            } else {
                toast.error(`Transcription failed: ${errorMsg}. Please check: 1. Video file is not corrupted. 2. Internet connection (for cloud transcription). 3. Whisper files in external/whisper/ (for offline)`);
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
        
        // Check if it's a PSD
        if (file.name.endsWith('.psd') || file.type === 'application/x-photoshop' || file.type === 'image/vnd.adobe.photoshop') {
            try {
                setUploadingFileType('psd');
                setIsUploading(true);
                setUploadProgress(10);
                
                const arrayBuffer = await file.arrayBuffer();
                setUploadProgress(30);
                
                // Use IPC to parse PSD in main process
                const result = await (window as any).electron?.api?.parsePSD(arrayBuffer);
                setUploadProgress(90);
                
                if (result?.success) {
                    const fileName = file.name.replace(/\.psd$/i, '');
                    setNewTitle(fileName);
                    // PSD metadata as initial content - user can add tutorial text below
                    setNewContent(`${result.text}\n\n--- Tutorial Content ---\n\n(Paste your tutorial steps here)`);
                    setNewSource((prev) => (prev ? prev : `File: ${file.name}`));
                    setUploadProgress(100);
                    setIsUploading(false);
                    setUploadProgress(0);
                    setShowUploadModal(true);
                } else {
                    throw new Error(result?.error || 'PSD parsing failed');
                }
            } catch (error: any) {
                setIsUploading(false);
                setUploadProgress(0);
                console.error('PSD error:', error);
                
                // Fallback to manual entry
                const fileName = file.name.replace(/\.psd$/i, '');
                setNewTitle(fileName);
                setNewSource((prev) => (prev ? prev : `File: ${file.name}`));
                setShowUploadModal(true);
                setTimeout(() => {
                    toast.error(`Auto-extraction failed. Please describe the PSD tutorial content: 1. What the tutorial covers. 2. Key steps or techniques. 3. Important layers or settings`);
                }, 100);
            }
            return;
        }
        
        // Check if it's an ABR (Adobe Brush)
        if (file.name.endsWith('.abr') || file.type === 'application/x-photoshop-abr') {
            try {
                setUploadingFileType('abr');
                setIsUploading(true);
                setUploadProgress(10);
                
                const arrayBuffer = await file.arrayBuffer();
                setUploadProgress(30);
                
                // Use IPC to parse ABR in main process
                const result = await (window as any).electron?.api?.parseABR(arrayBuffer);
                setUploadProgress(90);
                
                if (result?.success) {
                    const fileName = file.name.replace(/\.abr$/i, '');
                    setNewTitle(fileName);
                    // ABR brush metadata as initial content
                    setNewContent(`${result.text}\n\n--- Tutorial Content ---\n\n(Describe brush usage, techniques, and best practices here)`);
                    setNewSource((prev) => (prev ? prev : `File: ${file.name}`));
                    setUploadProgress(100);
                    setIsUploading(false);
                    setUploadProgress(0);
                    setShowUploadModal(true);
                } else {
                    throw new Error(result?.error || 'ABR parsing failed');
                }
            } catch (error: any) {
                setIsUploading(false);
                setUploadProgress(0);
                console.error('ABR error:', error);
                
                // Fallback to manual entry
                const fileName = file.name.replace(/\.abr$/i, '');
                setNewTitle(fileName);
                setNewSource((prev) => (prev ? prev : `File: ${file.name}`));
                setShowUploadModal(true);
                setTimeout(() => {
                    toast.error(`Auto-extraction failed. Please describe the brush set: 1. What brushes are included. 2. Best use cases (texturing, painting, etc.). 3. Recommended settings`);
                }, 100);
            }
            return;
        }
        
        // Check if it's a PDF
        if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
            try {
                setUploadingFileType('pdf');
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
                    toast.error(`Auto-extraction failed. Please: 1. Open "${file.name}". 2. Select all (Ctrl+A) & copy (Ctrl+C). 3. Paste (Ctrl+V) below`);
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
            toast.error(`Unsupported file type: ${file.name}. Supported: .psd, .abr, .pdf, .txt, .md, .json, .bat, .cmd, .xml, .ini, .cfg, .ps1, .sh, .py, .js, .ts, .html, .css, .scss, .sass, .yaml, .yml, .mp4, .webm, .mov, .avi, .mkv, .flv, .wmv, .m4v, .3gp, .mp3, .wav, .flac, .aac, .ogg, .m4a, .wma`);
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

    // Import bundled knowledge — skips packs already imported at the same version
    // so new packs added in app updates reach existing users without duplicates.
    const importBundledKnowledge = async () => {
        try {
            const manifestRes = await fetch(getPublicAssetUrl('bundled-knowledge/manifest.json'));
            if (!manifestRes.ok) return;
            
            const manifest = await manifestRes.json();

            // Per-pack import tracking: { [packId]: importedVersion }
            // Migration: if the old single-flag is set, seed the tracking object so
            // existing users don't re-import packs they already have.
            const rawPacks = localStorage.getItem('mossy_imported_pack_ids');
            let importedPacks: Record<string, string> | null = rawPacks ? JSON.parse(rawPacks) : null;
            if (importedPacks === null) {
                const oldFlag = localStorage.getItem('mossy_bundled_imported');
                if (oldFlag) {
                    // Treat all current packs as already imported at their current version.
                    importedPacks = {};
                    for (const pack of manifest.packs) {
                        importedPacks[pack.id] = pack.version ?? '1.0.0';
                    }
                    localStorage.setItem('mossy_imported_pack_ids', JSON.stringify(importedPacks));
                    return; // Nothing new to import for existing users
                }
                importedPacks = {};
            }

            const currentMemories: MemoryItem[] = JSON.parse(localStorage.getItem('mossy_knowledge_vault') || '[]');
            let updatedMemories = [...currentMemories];
            let didImport = false;

            for (const pack of manifest.packs) {
                const packId: string = pack.id;
                const packVersion: string = pack.version ?? '1.0.0';
                const alreadyImported = importedPacks[packId] === packVersion;
                const shouldAutoImport = pack.autoImport || pack['auto-import'];

                if (!shouldAutoImport || alreadyImported) continue;

                try {
                    const packRes = await fetch(getPublicAssetUrl(`bundled-knowledge/${pack.file}`));
                    if (!packRes.ok) continue;
                    const packData = await packRes.json();
                    if (!Array.isArray(packData.items)) continue;

                    // Remove any stale items from a previous version of this pack
                    const packPrefix = `bundled-${packId}-`;
                    updatedMemories = updatedMemories.filter(m => !m.id?.startsWith(packPrefix));

                    const newItems: MemoryItem[] = packData.items.map((item: any) => ({
                        ...item,
                        id: `${packPrefix}${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`,
                        trustLevel: item.trustLevel || 'official',
                        status: 'learned',
                        date: new Date().toLocaleDateString(),
                        shareWithCommunity: false,
                    }));

                    updatedMemories = [...newItems, ...updatedMemories];
                    importedPacks[packId] = packVersion;
                    didImport = true;
                } catch (err) {
                    console.error('Failed to import pack:', pack.name, err);
                }
            }

            if (didImport) {
                setMemories(updatedMemories);
                localStorage.setItem('mossy_knowledge_vault', JSON.stringify(updatedMemories));
            }
            // Always persist the tracking object so future runs skip already-imported packs
            localStorage.setItem('mossy_imported_pack_ids', JSON.stringify(importedPacks));
        } catch (error) {
            console.error('Failed to import bundled knowledge:', error);
        }
    };

    // Count unimported packs from the local bundled manifest (no internet needed)
    const checkLocalKnowledgePacks = async () => {
        try {
            const manifestRes = await fetch(getPublicAssetUrl('bundled-knowledge/manifest.json'));
            if (!manifestRes.ok) return;
            const manifest = await manifestRes.json();
            const importedPacks: Record<string, string> = JSON.parse(localStorage.getItem('mossy_imported_pack_ids') || '{}');
            let newCount = 0;
            for (const pack of manifest.packs ?? []) {
                if (!(pack.id in importedPacks)) {
                    newCount++;
                }
            }
            setNewKnowledgeCount(newCount);
        } catch (error) {
            console.error('Failed to check local knowledge packs:', error);
        }
    };

    // Load community knowledge packs from local bundled files (no internet needed)
    const fetchCommunityKnowledge = async () => {
        setIsLoadingLibrary(true);
        try {
            const manifestRes = await fetch(getPublicAssetUrl('bundled-knowledge/manifest.json'));
            if (!manifestRes.ok) {
                setCommunityPacks([]);
                return;
            }
            const manifest = await manifestRes.json();
            const importedPacks: Record<string, string> = JSON.parse(localStorage.getItem('mossy_imported_pack_ids') || '{}');
            const packs = [];
            for (const entry of manifest.packs ?? []) {
                try {
                    const packRes = await fetch(getPublicAssetUrl(`bundled-knowledge/${entry.file}`));
                    if (!packRes.ok) continue;
                    const packData = await packRes.json();
                    const isImported = entry.id in importedPacks;
                    packs.push({ ...packData, isImported });
                } catch (e) {
                    console.error(`Failed to load pack ${entry.file}:`, e);
                }
            }
            setCommunityPacks(packs);
        } catch (error) {
            console.error('Failed to load local knowledge packs:', error);
        } finally {
            setIsLoadingLibrary(false);
        }
    };

    // Import community knowledge pack
    const importCommunityPack = async (pack: any) => {
        try {
            if (!pack?.items || !Array.isArray(pack.items)) {
                toast.error('Invalid community pack format');
                return;
            }
            const currentMemories = [...memories];
            const newItems = pack.items.map((item: any) => ({
                ...item,
                id: `${pack.packId}-${item.id}-${Date.now()}`
            }));
            
            const combinedMemories = [...newItems, ...currentMemories];
            setMemories(combinedMemories);
            localStorage.setItem('mossy_knowledge_vault', JSON.stringify(combinedMemories));
            
            // Mark as imported using the same key as the bundled import system
            const importedPacks: Record<string, string> = JSON.parse(localStorage.getItem('mossy_imported_pack_ids') || '{}');
            importedPacks[pack.packId] = pack.packVersion ?? '1.0.0';
            localStorage.setItem('mossy_imported_pack_ids', JSON.stringify(importedPacks));
            
            // Update pack list
            const updatedPacks = communityPacks.map(p => 
                p.packId === pack.packId ? { ...p, isImported: true } : p
            );
            setCommunityPacks(updatedPacks);
            
            // Update badge count
            setNewKnowledgeCount(prev => Math.max(0, prev - 1));
            
            toast.success(`Imported "${pack.packName}" (${pack.items.length} items)`);
        } catch (error) {
            console.error('Failed to import pack:', error);
            toast.error('Failed to import knowledge pack. Please try again.');
        }
    };

    // Export knowledge for sharing
    const handleExportShared = async () => {
        const sharedItems = memories.filter(m => m.shareWithCommunity);

        if (sharedItems.length === 0) {
            toast.error('No shared items to export. Mark items as "Share with Community" first.');
            return;
        }

        try {
            await handleSyncCommunityKnowledge(sharedItems);
        } catch (error) {
            console.error('Community export error:', error);
            toast.error('Failed to export community knowledge. Please try again.');
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
            status: 'learned',
            shareWithCommunity: shareWithCommunity,
            sharedDate: shareWithCommunity ? new Date().toISOString() : undefined
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
        setShareWithCommunity(false);
        // Record for ML tracking
        LocalAIEngine.recordAction('knowledge_ingested', { title: newItem.title, tags: newItem.tags }).catch(() => {});
        
        // If shared, trigger community sync
        if (newItem.shareWithCommunity) {
            handleSyncCommunityKnowledge([newItem]);
        }
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

    const toggleShare = (id: string) => {
        setMemories(memories.map(m => {
            if (m.id === id) {
                const willShare = !m.shareWithCommunity;
                const updated = {
                    ...m,
                    shareWithCommunity: willShare,
                    sharedDate: willShare ? new Date().toISOString() : undefined
                };
                if (willShare) {
                    handleSyncCommunityKnowledge([updated]);
                }
                return updated;
            }
            return m;
        }));
    };

    const handleSyncCommunityKnowledge = async (items: MemoryItem[]) => {
        // Filter only items approved for sharing
        const sharedItems = items.filter(item => item.shareWithCommunity);
        if (sharedItems.length === 0) return;

        try {
            // Export shared knowledge to JSON
            const exportData = {
                version: '1.0',
                exported: new Date().toISOString(),
                items: sharedItems.map(item => ({
                    ...item,
                    // Remove any private metadata
                    id: undefined, // Will be regenerated on import
                }))
            };

            // Save to downloads folder for manual GitHub upload
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mossy-community-knowledge-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success(`Exported ${sharedItems.length} shared knowledge item(s)! Next steps to share with community: 1. Upload the downloaded JSON to your GitHub repo. 2. Share the link with other Mossy users. 3. They can import it via "Import Community Knowledge"`);
        } catch (error) {
            console.error('Community sync error:', error);
            toast.error('Failed to export community knowledge. Please try again.');
        }
    };

    const handleImportCommunityKnowledge = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                if (!data.items || !Array.isArray(data.items)) {
                    throw new Error('Invalid community knowledge format');
                }

                const imported = data.items.map((item: any) => ({
                    ...item,
                    id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    trustLevel: 'community' as const,
                    status: 'learned' as const,
                    shareWithCommunity: false // Don't auto-share imported content
                }));

                setMemories([...imported, ...memories]);
                toast.success(`Imported ${imported.length} community knowledge item(s)!`);
            } catch (error) {
                console.error('Import error:', error);
                toast.error('Failed to import community knowledge. Please check the file format.');
            }
        };
        input.click();
    };

    const handleBrowseKnowledgeLibrary = async () => {
        setIsLoadingLibrary(true);
        setShowKnowledgeLibrary(true);
        
        try {
            // Try to fetch from GitHub repo (user configurable in settings)
            const repoUrl = 'https://api.github.com/repos/POINTYTHRUNDRA654/mossy-knowledge/contents/community-knowledge';
            const response = await fetch(repoUrl);
            
            if (response.ok) {
                const files = await response.json();
                const jsonFiles = files.filter((f: any) => f.name.endsWith('.json'));
                
                // Fetch metadata for each pack
                const packs = await Promise.all(
                    jsonFiles.map(async (file: any) => {
                        try {
                            const contentResponse = await fetch(file.download_url);
                            const content = await contentResponse.json();
                            return {
                                name: file.name,
                                downloadUrl: file.download_url,
                                packName: content.packName || file.name.replace('.json', ''),
                                description: content.description || 'No description',
                                itemCount: content.items?.length || 0,
                                version: content.version || '1.0.0',
                                author: content.credits?.author || 'Community'
                            };
                        } catch {
                            return null;
                        }
                    })
                );
                
                setAvailableKnowledge(packs.filter(p => p !== null));
            }
        } catch (error) {
            console.error('Failed to fetch knowledge library:', error);
        } finally {
            setIsLoadingLibrary(false);
        }
    };

    const handleDownloadKnowledgePack = async (pack: any) => {
        try {
            const response = await fetch(pack.downloadUrl);
            const data = await response.json();
            
            if (!data.items || !Array.isArray(data.items)) {
                toast.error('Invalid knowledge pack format');
                return;
            }
            
            const imported = data.items.map((item: any) => ({
                ...item,
                id: `community-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                trustLevel: 'community' as const,
                status: 'learned' as const,
                date: new Date().toLocaleDateString(),
                shareWithCommunity: false
            }));
            
            setMemories([...imported, ...memories]);
            
            // Track imported version
            const importedVersions = JSON.parse(localStorage.getItem('mossy_imported_versions') || '{}');
            importedVersions[pack.name] = pack.version;
            localStorage.setItem('mossy_imported_versions', JSON.stringify(importedVersions));
            
            // Decrease new knowledge count
            setNewKnowledgeCount(Math.max(0, newKnowledgeCount - 1));
            
            toast.success(`Imported ${imported.length} knowledge items from "${pack.packName}"!`);
        } catch (error) {
            console.error('Import error:', error);
            toast.error('Failed to import knowledge pack. Please try again.');
        }
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
    const learnedCount = memories.filter((m) => m.status === 'learned').length;
    const sharedCount = memories.filter((m) => m.shareWithCommunity).length;
    const personalCount = memories.filter((m) => (m.trustLevel || 'personal') === 'personal').length;
    const communityCount = memories.filter((m) => m.trustLevel === 'community').length;
    const officialCount = memories.filter((m) => m.trustLevel === 'official').length;

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

            {/* File Processing Overlay */}
            {isUploading && !showUploadModal && (
                <div className={`${overlayPositionClass} z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center`}>
                    <div className="bg-[#141814] border border-emerald-500/30 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-emerald-500/10">
                        <div className="text-center space-y-4">
                            <Loader2 className="w-12 h-12 text-emerald-400 mx-auto animate-spin" />
                            <h3 className="text-xl font-bold text-white">
                                {uploadingFileType === 'psd' && 'Processing PSD...'}
                                {uploadingFileType === 'abr' && 'Processing Brush File...'}
                                {uploadingFileType === 'pdf' && 'Processing PDF...'}
                                {uploadingFileType === 'video' && 'Transcribing Video...'}
                                {uploadingFileType === 'audio' && 'Transcribing Audio...'}
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>
                                        {uploadingFileType === 'psd' && 'Extracting layers & metadata'}
                                        {uploadingFileType === 'abr' && 'Extracting brush presets'}
                                        {uploadingFileType === 'pdf' && 'Extracting text'}
                                        {(uploadingFileType === 'video' || uploadingFileType === 'audio') && 'Extracting audio & text'}
                                    </span>
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
            <div className="p-4 lg:p-6 border-b border-emerald-900/30 bg-[#141814] shadow-lg">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <Brain className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2">
                                FO4 Memory Vault
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">ENHANCED RAG</span>
                            </h2>
                            <p className="text-xs text-slate-400 hidden sm:block">Upload tutorials, snippets, and lore for Mossy to digest into her long-term memory.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/knowledge-hub"
                        className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 transition-colors hidden sm:inline-flex"
                        title="Open help"
                      >
                        Help
                      </Link>

                      <button
                        onClick={() => { setShowLibraryModal(true); fetchCommunityKnowledge(); }}
                        onDoubleClick={handleBrowseKnowledgeLibrary}
                        className="relative flex items-center gap-2 px-4 py-2 bg-blue-900/50 hover:bg-blue-800/50 text-blue-100 rounded-lg transition-all border border-blue-700 text-sm font-bold"
                        title="Browse community knowledge library"
                      >
                        <PackageOpen className="w-4 h-4" />
                        <span className="hidden md:inline">Browse Library</span>
                        <span className="md:hidden sm:inline">Library</span>
                        {newKnowledgeCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                            {newKnowledgeCount}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={handleExportShared}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-100 rounded-lg transition-all border border-purple-700 text-sm font-bold"
                        title="Export knowledge for sharing"
                      >
                        <Upload className="w-4 h-4" />
                        Export Shared
                      </button>

                      <button
                        onClick={handleImportCommunityKnowledge}
                        className="flex items-center gap-2 px-3 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-100 rounded-lg transition-all border border-purple-700 text-xs font-bold"
                        title="Import shared knowledge from community"
                      >
                        <GitBranch className="w-4 h-4" />
                        <span className="hidden sm:inline">Import Community</span>
                        <span className="sm:hidden">Import</span>
                      </button>

                      <button
                        onClick={handleExportVault}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 hover:bg-slate-800 text-slate-100 rounded-lg transition-all border border-slate-700 text-xs font-bold hidden md:flex"
                        title="Export all knowledge (backup)"
                      >
                        <Download className="w-4 h-4" />
                        Export All
                      </button>

                      <button
                        onClick={() => {
                          setNewTitle('');
                          setNewContent('');
                          setNewTags('blender-addon, blender, fallout-4');
                          setNewSource('');
                          setNewCreditName('');
                          setNewCreditUrl('');
                          setNewTrustLevel('personal');
                          setUploadError('');
                          setShowUploadModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-all shadow-lg shadow-blue-900/20 text-sm font-bold"
                        title="Paste a 3rd-party Blender add-on tutorial so Mossy can guide you in Blender"
                      >
                        <Box className="w-4 h-4" />
                        <span className="hidden sm:inline">Blender Add-on Tutorial</span>
                        <span className="sm:hidden">Blender</span>
                      </button>

                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-lg shadow-emerald-900/20 text-sm font-bold"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Ingest Knowledge</span>
                        <span className="sm:hidden">Ingest</span>
                      </button>
                    </div>
                </div>
            </div>

            {/* Knowledge Library Modal */}
            {showKnowledgeLibrary && (
                <div className={`${overlayPositionClass} z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4`}>
                    <div className="bg-[#141814] border border-emerald-500/30 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl shadow-emerald-500/10 flex flex-col">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-emerald-900/30 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <PackageOpen className="w-6 h-6 text-emerald-400" />
                                <div>
                                    <h3 className="text-xl font-bold text-white">Community Knowledge Library</h3>
                                    <p className="text-xs text-slate-400 mt-1">Browse and download curated tutorials from the community</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowKnowledgeLibrary(false)}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {isLoadingLibrary ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
                                    <p className="text-slate-400 text-sm">Loading knowledge library...</p>
                                </div>
                            ) : availableKnowledge.length === 0 ? (
                                <div className="text-center py-12">
                                    <Cloud className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                    <p className="text-slate-400 mb-2">No knowledge packs available yet</p>
                                    <p className="text-slate-500 text-xs">Check back later or configure your GitHub repo in Settings</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {availableKnowledge.map((pack, index) => (
                                        <div key={index} className="bg-[#0f120f] border border-emerald-900/30 rounded-xl p-4 hover:border-emerald-500/50 transition-all">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <h4 className="text-white font-bold text-sm mb-1">{pack.packName}</h4>
                                                    <p className="text-slate-400 text-xs mb-2">{pack.description}</p>
                                                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="w-3 h-3" />
                                                            {pack.itemCount} items
                                                        </span>
                                                        <span>v{pack.version}</span>
                                                        <span>by {pack.author}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDownloadKnowledgePack(pack)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    Import
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-emerald-900/30 bg-[#0f120f]/50">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                                <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Tip: Knowledge packs are automatically checked every 6 hours</span>
                                <button
                                    onClick={handleBrowseKnowledgeLibrary}
                                    disabled={isLoadingLibrary}
                                    className="flex items-center gap-1 px-3 py-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3 h-3 ${isLoadingLibrary ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                            href: whisperModelFileUrl
                            ,
                            kind: 'official'
                            ,
                            note: 'Download the model and place it next to whisper.cpp.exe (see the notice below).'
                        },
                    ]}
                    verify={[
                        'Click "Ingest Knowledge" → paste a short snippet → confirm it appears in the list.',
                        'Search for a unique word you pasted and confirm it matches.',
                        'Confirm the vault count badge updates across the app (Chat/Live pages show it).'
                    ]}
                    firstTestLoop={[
                        'Ingest 1 small text snippet + 1 local file → confirm both show as learned.',
                        'Open Chat and ask a question that should be answered from your ingested content.',
                        'If using Live Synapse, connect and verify the "Vault loaded" badge reflects your count.'
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
                    <span>MEMORIES: {memories.length} TOTAL / {learnedCount} LEARNED / {sharedCount} SHARED</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>TRUST SPLIT: P{personalCount} · C{communityCount} · O{officialCount}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Activity className="w-3 h-3 text-cyan-400" />
                    <span>SEARCH VIEW: {filteredMemories.length} MATCHING</span>
                </div>
            </div>

            {/* Video Transcription Setup Notice */}
            <div className="mx-6 mt-4 mb-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-slate-300 space-y-1">
                        <div className="font-semibold text-blue-300 flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Video Transcription Setup</div>
                        <div className="text-slate-400">
                            For offline video transcription, place these in <code className="px-1 py-0.5 bg-slate-800 rounded text-emerald-400 font-mono text-[10px]">external/whisper/</code>:
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400 ml-1">
                            <li><code className="text-cyan-400 font-mono">whisper.cpp.exe</code> - Get from <a href="https://github.com/ggerganov/whisper.cpp/releases" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">whisper.cpp releases</a></li>
                            <li><code className="text-cyan-400 font-mono">ggml-base.en.bin</code> - Download from <a href={whisperModelFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">HuggingFace</a> (~150MB)</li>
                        </ul>
                        <div className="text-[10px] text-slate-500 mt-1">Or add an OpenAI API key for cloud transcription (optional)</div>
                    </div>
                </div>
            </div>

            {/* Community Knowledge Sharing Info */}
            <div className="mx-6 mb-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                    <Share2 className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-slate-300 space-y-1">
                        <div className="font-semibold text-purple-300 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Community Knowledge Sharing</div>
                        <div className="text-slate-400">
                            Share your knowledge with other Mossy users while keeping private notes safe:
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400 ml-1">
                            <li><strong className="text-purple-300">Mark as Shared:</strong> Toggle the share icon on any memory to include it in community exports</li>
                            <li><strong className="text-purple-300">Export Shared:</strong> Creates a JSON file with only your approved items</li>
                            <li><strong className="text-purple-300">Share via GitHub:</strong> Upload the JSON to a GitHub repo or gist, share the link</li>
                            <li><strong className="text-purple-300">Import Community:</strong> Download others' JSON files and import them instantly</li>
                        </ul>
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            <Info className="w-3 h-3 flex-shrink-0" /> Your personal notes stay local unless explicitly marked for sharing. Credits are always preserved.
                        </div>
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
                className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-6 pb-24 space-y-4"
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
                        <p className="text-sm text-slate-500 max-w-sm">Mossy hasn"t ingested any custom tutorials yet. Click 'Ingest Knowledge" to expand her capabilities.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filteredMemories.map((mem) => (
                            <div key={mem.id} className="group bg-[#141814] border border-emerald-900/20 rounded-xl p-5 hover:border-emerald-500/40 transition-all hover:bg-[#1a1f1a] relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button 
                                        onClick={() => toggleShare(mem.id)}
                                        className={`p-1.5 rounded border transition-colors ${
                                            mem.shareWithCommunity
                                                ? 'bg-purple-900/40 text-purple-300 border-purple-500/40 hover:bg-purple-900/60'
                                                : 'bg-slate-900/20 text-slate-400 border-slate-700/20 hover:bg-slate-900/40'
                                        }`}
                                        title={mem.shareWithCommunity ? 'Remove from community sharing' : 'Share with community'}
                                    >
                                        <Share2 className="w-3.5 h-3.5" />
                                    </button>
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
                                            {mem.shareWithCommunity && (
                                                <span className="px-2 py-0.5 rounded-full border border-purple-500/20 text-[9px] text-purple-300 bg-purple-500/10 uppercase flex items-center gap-1">
                                                    <Share2 className="w-2.5 h-2.5" /> Shared
                                                </span>
                                            )}
                                            <span className="truncate">Credit: {mem.creditName || 'Uncredited'}</span>
                                            {mem.creditUrl && (
                                                <button
                                                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                                    onClick={() => void openExternal(mem.creditUrl!)}
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
                    <div className="bg-[#141814] border border-emerald-500/30 w-full max-w-2xl rounded-2xl shadow-2xl shadow-emerald-500/10 overflow-hidden transform" style={{animation: 'fadeIn 0.2s ease-out'}}>
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
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest pl-1">Knowledge Content (Tutorial / Info / Snippet)</label>
                                    <span className={`text-[10px] font-mono ${newContent.length > 8000 ? 'text-amber-400' : newContent.length > 4000 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                        {newContent.length.toLocaleString()} chars
                                        {newContent.length > 8000 && ' · large — will be chunked'}
                                    </span>
                                </div>
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
                                        onChange={(e) => setNewTrustLevel(e.target.value as 'personal' | 'community' | 'official')}
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
                                {tagSuggestions.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        <span className="text-[10px] text-slate-500 self-center">Suggestions:</span>
                                        {tagSuggestions.map((tag) => {
                                            const alreadyAdded = newTags.split(',').map((t) => t.trim()).includes(tag);
                                            return (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => {
                                                        if (alreadyAdded) return;
                                                        setNewTags((prev) => {
                                                            const existing = prev.split(',').map((t) => t.trim()).filter(Boolean);
                                                            return [...existing, tag].join(', ');
                                                        });
                                                    }}
                                                    disabled={isUploading || alreadyAdded}
                                                    className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
                                                        alreadyAdded
                                                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 cursor-default'
                                                            : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-300 cursor-pointer'
                                                    }`}
                                                >
                                                    {alreadyAdded ? '✓ ' : '+ '}{tag}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Community Sharing */}
                            <div className="bg-purple-900/10 border border-purple-500/30 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="shareWithCommunity"
                                        checked={shareWithCommunity}
                                        onChange={(e) => setShareWithCommunity(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded border-purple-500/50 bg-purple-900/20 text-purple-500 focus:ring-purple-500/50"
                                        disabled={isUploading}
                                    />
                                    <div className="flex-1">
                                        <label htmlFor="shareWithCommunity" className="text-sm font-semibold text-purple-200 cursor-pointer flex items-center gap-2">
                                            <Share2 className="w-4 h-4" />
                                            Share with Community
                                        </label>
                                        <p className="text-xs text-slate-400 mt-1">
                                            This knowledge will be exported to a JSON file you can share via GitHub/Discord. Only approved items are shared - your private notes stay private.
                                        </p>
                                    </div>
                                </div>
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

            {/* Browse Library Modal */}
            {showLibraryModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowLibraryModal(false);
                        }
                    }}
                >
                    <div className="bg-[#141814] border border-blue-500/30 w-full max-w-4xl rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden transform max-h-[80vh] flex flex-col" style={{animation: 'fadeIn 0.2s ease-out'}}>
                        <div className="p-6 border-b border-blue-900/30 flex justify-between items-center bg-[#1a1f1a]">
                            <div className="flex items-center gap-3">
                                <Files className="text-blue-400 w-5 h-5" />
                                <div>
                                    <h3 className="text-lg font-bold text-white uppercase tracking-tight">Community Knowledge Library</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Browse and import knowledge packs shared by the community</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowLibraryModal(false)} 
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto">
                            {isLoadingLibrary ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                                    <span className="ml-3 text-slate-400">Loading community knowledge...</span>
                                </div>
                            ) : communityPacks.length === 0 ? (
                                <div className="text-center py-12">
                                    <Files className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                    <p className="text-slate-400 text-sm">
                                        No community knowledge packs available yet.
                                    </p>
                                    <p className="text-slate-500 text-xs mt-2">
                                        Check back later or share your own knowledge!
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {communityPacks.map((pack) => (
                                        <div 
                                            key={pack.packId}
                                            className="bg-[#0f120f] border border-blue-900/30 rounded-xl p-5 hover:border-blue-700/50 transition-all"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <h4 className="text-white font-bold text-lg mb-1">{pack.packName}</h4>
                                                    <p className="text-slate-400 text-sm mb-2">{pack.description || 'No description provided'}</p>
                                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                                        <span>Version: {pack.packVersion}</span>
                                                        <span>Items: {pack.items?.length || 0}</span>
                                                        {pack.author && <span>By: {pack.author}</span>}
                                                        <span>Date: {pack.exportDate}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => importCommunityPack(pack)}
                                                    disabled={pack.isImported}
                                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                                        pack.isImported
                                                            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 cursor-not-allowed'
                                                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                    }`}
                                                >
                                                    {pack.isImported ? '✓ Imported' : 'Import'}
                                                </button>
                                            </div>
                                            {pack.items && pack.items.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-slate-800">
                                                    <p className="text-xs text-slate-500 mb-2">Included items:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {pack.items.slice(0, 5).map((item: any, idx: number) => (
                                                            <span 
                                                                key={idx}
                                                                className="px-2 py-1 bg-slate-800/50 text-slate-400 text-[10px] rounded border border-slate-700"
                                                            >
                                                                {item.title}
                                                            </span>
                                                        ))}
                                                        {pack.items.length > 5 && (
                                                            <span className="px-2 py-1 text-slate-500 text-[10px]">
                                                                +{pack.items.length - 5} more
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-[#1a1f1a] border-t border-blue-900/30">
                            <div className="text-xs text-slate-400 space-y-1">
                                <p className="flex items-center gap-1"><Info className="w-3 h-3 flex-shrink-0" /> <strong>Tip:</strong> Knowledge packs are bundled with the app and available offline</p>
                                <p className="flex items-center gap-1"><Upload className="w-3 h-3 flex-shrink-0" /> <strong>Share your knowledge:</strong> Export knowledge with "Export Shared" to contribute to the community!</p>
                            </div>
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
