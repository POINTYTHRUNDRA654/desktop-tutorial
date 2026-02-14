import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Book, Upload, Trash2, Search, Brain, FileText, CheckCircle2, Loader2, Sparkles, Database, Plus, X, Activity, Cloud, Files, Download, Share2, Github, Bell, PackageOpen, RefreshCw } from 'lucide-react';
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
    shareWithCommunity?: boolean;
    sharedDate?: string;
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
        
        // Auto-import bundled knowledge on first run
        const hasImportedBundled = localStorage.getItem('mossy_bundled_imported');
        if (!hasImportedBundled) {
            importBundledKnowledge().catch(console.error);
        }
        
        // Check for new community knowledge
        checkGitHubForNewKnowledge().catch(console.error);
    }, []);

    useEffect(() => {
        localStorage.setItem('mossy_knowledge_vault', JSON.stringify(memories));
        // Broadcast to other components if needed
        window.dispatchEvent(new Event('mossy-knowledge-updated'));
    }, [memories]);

    // Auto-import bundled knowledge on first run
    useEffect(() => {
        const importBundledKnowledge = async () => {
            const imported = localStorage.getItem('mossy_bundled_knowledge_imported');
            if (imported) return; // Already imported

            try {
                const response = await fetch('/bundled-knowledge/manifest.json');
                if (!response.ok) return;
                
                const manifest = await response.json();
                const autoImportPacks = manifest.packs.filter((p: any) => p.autoImport);
                
                for (const pack of autoImportPacks) {
                    try {
                        const packResponse = await fetch(`/bundled-knowledge/${pack.file}`);
                        if (!packResponse.ok) continue;
                        
                        const packData = await packResponse.json();
                        if (!packData.items || !Array.isArray(packData.items)) continue;
                        
                        const imported = packData.items.map((item: any) => ({
                            ...item,
                            id: `bundled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            trustLevel: item.trustLevel || 'official',
                            status: 'learned',
                            date: new Date().toLocaleDateString(),
                            shareWithCommunity: false
                        }));
                        
                        setMemories(prev => [...imported, ...prev]);
                    } catch (err) {
                        console.error('Failed to import pack:', pack.name, err);
                    }
                }
                
                localStorage.setItem('mossy_bundled_knowledge_imported', 'true');
                localStorage.setItem('mossy_bundled_knowledge_version', manifest.version);
            } catch (error) {
                console.error('Failed to import bundled knowledge:', error);
            }
        };

        importBundledKnowledge();
    }, []);

    // Check for new knowledge from GitHub (every 6 hours)
    useEffect(() => {
        const checkForUpdates = async () => {
            const lastCheck = localStorage.getItem('mossy_knowledge_last_check');
            const now = Date.now();
            const sixHours = 6 * 60 * 60 * 1000;
            
            if (lastCheck && now - parseInt(lastCheck) < sixHours) {
                return; // Checked recently
            }

            try {
                const repoUrl = 'https://api.github.com/repos/YOUR_USERNAME/mossy-knowledge/contents/community-knowledge';
                const response = await fetch(repoUrl);
                if (!response.ok) return;
                
                const files = await response.json();
                const jsonFiles = files.filter((f: any) => f.name.endsWith('.json'));
                
                const importedVersions = JSON.parse(localStorage.getItem('mossy_imported_versions') || '{}');
                const newPacks = jsonFiles.filter((f: any) => !importedVersions[f.name]);
                
                setNewKnowledgeCount(newPacks.length);
                localStorage.setItem('mossy_knowledge_last_check', now.toString());
            } catch (error) {
                console.error('Failed to check for knowledge updates:', error);
            }
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
                    alert(`❌ Auto-extraction failed.\n\nPlease describe the PSD tutorial content:\n1. What the tutorial covers\n2. Key steps or techniques\n3. Important layers or settings`);
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
                    alert(`❌ Auto-extraction failed.\n\nPlease describe the brush set:\n1. What brushes are included\n2. Best use cases (texturing, painting, etc.)\n3. Recommended settings`);
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
            alert(`❌ Unsupported file type: ${file.name}\n\nSupported: .psd, .abr, .pdf, .txt, .md, .json, .bat, .cmd, .xml, .ini, .cfg, .ps1, .sh, .py, .js, .ts, .html, .css, .scss, .sass, .yaml, .yml, .mp4, .webm, .mov, .avi, .mkv, .flv, .wmv, .m4v, .3gp, .mp3, .wav, .flac, .aac, .ogg, .m4a, .wma`);
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

    // Import bundled knowledge on first run
    const importBundledKnowledge = async () => {
        try {
            const manifestRes = await fetch('/bundled-knowledge/manifest.json');
            if (!manifestRes.ok) return;
            
            const manifest = await manifestRes.json();
            const currentMemories = JSON.parse(localStorage.getItem('mossy_knowledge_vault') || '[]');
            let newItems: MemoryItem[] = [];
            
            for (const pack of manifest.packs) {
                if (pack['auto-import']) {
                    const packRes = await fetch(`/bundled-knowledge/${pack.file}`);
                    if (packRes.ok) {
                        const packData = await packRes.json();
                        newItems = newItems.concat(packData.items);
                    }
                }
            }
            
            if (newItems.length > 0) {
                const combinedMemories = [...newItems, ...currentMemories];
                setMemories(combinedMemories);
                localStorage.setItem('mossy_knowledge_vault', JSON.stringify(combinedMemories));
                localStorage.setItem('mossy_bundled_imported', 'true');
            }
        } catch (error) {
            console.error('Failed to import bundled knowledge:', error);
        }
    };

    // Check GitHub for new community knowledge
    const checkGitHubForNewKnowledge = async () => {
        try {
            const lastCheck = localStorage.getItem('mossy_last_github_check');
            const sixHours = 6 * 60 * 60 * 1000;
            
            if (lastCheck && Date.now() - parseInt(lastCheck) < sixHours) {
                return; // Don't check yet
            }
            
            const repoUrl = 'https://api.github.com/repos/YOUR_USERNAME/mossy-knowledge/contents/community-knowledge';
            const response = await fetch(repoUrl);
            
            if (!response.ok) return;
            
            const files = await response.json();
            const importedVersions = JSON.parse(localStorage.getItem('mossy_imported_knowledge_versions') || '{}');
            
            let newCount = 0;
            for (const file of files) {
                if (file.name.endsWith('.json')) {
                    const packId = file.name.replace('.json', '');
                    if (!importedVersions[packId]) {
                        newCount++;
                    }
                }
            }
            
            setNewKnowledgeCount(newCount);
            localStorage.setItem('mossy_last_github_check', Date.now().toString());
        } catch (error) {
            console.error('Failed to check GitHub for new knowledge:', error);
        }
    };

    // Fetch community knowledge from GitHub
    const fetchCommunityKnowledge = async () => {
        setIsLoadingLibrary(true);
        try {
            const repoUrl = 'https://api.github.com/repos/YOUR_USERNAME/mossy-knowledge/contents/community-knowledge';
            const response = await fetch(repoUrl);
            
            if (!response.ok) {
                throw new Error('Failed to fetch community knowledge');
            }
            
            const files = await response.json();
            const packs = [];
            const importedVersions = JSON.parse(localStorage.getItem('mossy_imported_knowledge_versions') || '{}');
            
            for (const file of files) {
                if (file.name.endsWith('.json')) {
                    try {
                        const packRes = await fetch(file.download_url);
                        const packData = await packRes.json();
                        const isImported = !!importedVersions[packData.packId];
                        packs.push({
                            ...packData,
                            downloadUrl: file.download_url,
                            isImported
                        });
                    } catch (e) {
                        console.error(`Failed to load pack ${file.name}:`, e);
                    }
                }
            }
            
            setCommunityPacks(packs);
        } catch (error) {
            console.error('Failed to fetch community knowledge:', error);
            alert('Failed to load community knowledge. Please check your internet connection.');
        } finally {
            setIsLoadingLibrary(false);
        }
    };

    // Import community knowledge pack
    const importCommunityPack = async (pack: any) => {
        try {
            const currentMemories = [...memories];
            const newItems = pack.items.map((item: any) => ({
                ...item,
                id: `${pack.packId}-${item.id}-${Date.now()}`
            }));
            
            const combinedMemories = [...newItems, ...currentMemories];
            setMemories(combinedMemories);
            localStorage.setItem('mossy_knowledge_vault', JSON.stringify(combinedMemories));
            
            // Mark as imported
            const importedVersions = JSON.parse(localStorage.getItem('mossy_imported_knowledge_versions') || '{}');
            importedVersions[pack.packId] = true;
            localStorage.setItem('mossy_imported_knowledge_versions', JSON.stringify(importedVersions));
            
            // Update pack list
            const updatedPacks = communityPacks.map(p => 
                p.packId === pack.packId ? { ...p, isImported: true } : p
            );
            setCommunityPacks(updatedPacks);
            
            // Update badge count
            setNewKnowledgeCount(prev => Math.max(0, prev - 1));
            
            alert(`✅ Imported "${pack.packName}" (${pack.items.length} items)`);
        } catch (error) {
            console.error('Failed to import pack:', error);
            alert('Failed to import knowledge pack. Please try again.');
        }
    };

    // Export knowledge for sharing
    const handleExportShared = () => {
        const selectedItems = memories.filter(m => m.trustLevel === 'community' || m.trustLevel === 'official');
        
        if (selectedItems.length === 0) {
            alert('No community or official knowledge to export. Mark items as "Community" trust level to share them.');
            return;
        }
        
        const packData = {
            packId: `custom-pack-${Date.now()}`,
            packName: 'Custom Knowledge Pack',
            packVersion: '1.0.0',
            exportDate: new Date().toISOString().split('T')[0],
            description: 'Custom knowledge pack for Mossy',
            author: 'Community Member',
            items: selectedItems
        };
        
        const blob = new Blob([JSON.stringify(packData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${packData.packId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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

            alert(`✅ Exported ${sharedItems.length} shared knowledge item(s)!\n\nNext steps to share with community:\n1. Upload the downloaded JSON to your GitHub repo\n2. Share the link with other Mossy users\n3. They can import it via "Import Community Knowledge"`);
        } catch (error) {
            console.error('Community sync error:', error);
            alert('❌ Failed to export community knowledge. Please try again.');
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
                alert(`✅ Imported ${imported.length} community knowledge item(s)!`);
            } catch (error) {
                console.error('Import error:', error);
                alert('❌ Failed to import community knowledge. Please check the file format.');
            }
        };
        input.click();
    };

    const handleExportSharedOnly = () => {
        const sharedItems = memories.filter(m => m.shareWithCommunity);
        if (sharedItems.length === 0) {
            alert('No shared items to export. Mark items as "Share with Community" first.');
            return;
        }
        handleSyncCommunityKnowledge(sharedItems);
    };

    const handleBrowseKnowledgeLibrary = async () => {
        setIsLoadingLibrary(true);
        setShowKnowledgeLibrary(true);
        
        try {
            // Try to fetch from GitHub repo (user configurable in settings)
            const repoUrl = 'https://api.github.com/repos/YOUR_USERNAME/mossy-knowledge/contents/community-knowledge';
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
                alert('Invalid knowledge pack format');
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
            
            alert(`✅ Imported ${imported.length} knowledge items from "${pack.packName}"!`);
        } catch (error) {
            console.error('Import error:', error);
            alert('❌ Failed to import knowledge pack. Please try again.');
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
                                Memory Vault
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">ENHANCED RAG</span>
                            </h2>
                            <p className="text-xs text-slate-400 hidden sm:block">Upload tutorials, snippets, and lore for Mossy to digest into her long-term memory.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                    <Link
                        to="/reference"
                        className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 transition-colors hidden sm:inline-flex"
                        title="Open help"
                    >
                        Help
                    </Link>
                    <button
                        onClick={() => {
                            setShowLibraryModal(true);
                            fetchCommunityKnowledge();
                        }}
                        className="relative flex items-center gap-2 px-4 py-2 bg-blue-900/50 hover:bg-blue-800/50 text-blue-100 rounded-lg transition-all border border-blue-700 text-sm font-bold"
                    >
                        <Files className="w-4 h-4" />
                        Browse Library
                        {newKnowledgeCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        onClick={handleBrowseKnowledgeLibrary}
                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-blue-900/50 hover:bg-blue-800 text-blue-100 rounded-lg transition-all border border-blue-700 text-xs font-bold relative"
                        title="Browse community knowledge library"
                    >
                        <PackageOpen className="w-4 h-4" />
                        <span className="hidden md:inline">Browse Library</span>
                        <span className="md:hidden hidden sm:inline">Library</span>
                        {newKnowledgeCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
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
                        onClick={handleImportCommunityKnowledge}
                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-purple-900/50 hover:bg-purple-800 text-purple-100 rounded-lg transition-all border border-purple-700 text-xs font-bold"
                        title="Import shared knowledge from community"
                    >
                        <Github className="w-4 h-4" />
                        <span className="hidden sm:inline">Import Community</span>
                        <span className="sm:hidden">Import</span>
                    </button>
                    <button
                        onClick={handleExportSharedOnly}
                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-blue-900/50 hover:bg-blue-800 text-blue-100 rounded-lg transition-all border border-blue-700 text-xs font-bold"
                        title="Export items marked for sharing"
                    >
                        <Share2 className="w-4 h-4" />
                        <span className="hidden md:inline">Export Shared</span>
                        <span className="md:hidden hidden sm:inline">Share</span>
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
                                <span>💡 Tip: Knowledge packs are automatically checked every 6 hours</span>
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

            {/* Community Knowledge Sharing Info */}
            <div className="mx-6 mb-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                    <Share2 className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-slate-300 space-y-1">
                        <div className="font-semibold text-purple-300">🌐 Community Knowledge Sharing</div>
                        <div className="text-slate-400">
                            Share your knowledge with other Mossy users while keeping private notes safe:
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400 ml-1">
                            <li><strong className="text-purple-300">Mark as Shared:</strong> Toggle the share icon on any memory to include it in community exports</li>
                            <li><strong className="text-purple-300">Export Shared:</strong> Creates a JSON file with only your approved items</li>
                            <li><strong className="text-purple-300">Share via GitHub:</strong> Upload the JSON to a GitHub repo or gist, share the link</li>
                            <li><strong className="text-purple-300">Import Community:</strong> Download others' JSON files and import them instantly</li>
                        </ul>
                        <div className="text-[10px] text-slate-500 mt-1">
                            💡 Your personal notes stay local unless explicitly marked for sharing. Credits are always preserved.
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
                    <div className="bg-[#141814] border border-blue-500/30 w-full max-w-4xl rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden transform animate-scale-in max-h-[80vh] flex flex-col">
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
                                <p>💡 <strong>Tip:</strong> Knowledge packs are checked every 6 hours for updates</p>
                                <p>📤 <strong>Share your knowledge:</strong> Export knowledge with "Export Shared" and contribute to the community!</p>
                                <p className="text-slate-500 text-[10px] mt-2">
                                    Last checked: {new Date(parseInt(localStorage.getItem('mossy_last_github_check') || Date.now().toString())).toLocaleString()}
                                </p>
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
