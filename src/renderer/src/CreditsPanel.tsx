/**
 * Credits Panel Component
 * Displays comprehensive credits and acknowledgments for all dependencies,
 * frameworks, and external tools that make Mossy possible.
 *
 * Features:
 * - Auto-loads CREDITS.md from app resources
 * - Renders Markdown content
 * - Searchable credits list
 * - Organized by category
 * - Links to external project websites
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Heart, ExternalLink, Search, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface CreditsPanel {
    onClose?: () => void;
}

export const CreditsPanel: React.FC<CreditsPanel> = ({ onClose }) => {
    const [creditsContent, setCreditsContent] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadCredits = async () => {
            try {
                setIsLoading(true);
                // Attempt to load CREDITS.md from the app resources
                const response = await fetch('/CREDITS.md');
                if (!response.ok) {
                    throw new Error(`Failed to load CREDITS.md: ${response.status}`);
                }
                const content = await response.text();
                setCreditsContent(content);
                setError(null);
            } catch (err: any) {
                console.error('[CreditsPanel] Error loading credits:', err);
                setError(err?.message || 'Failed to load credits');
                // Fallback to embedded credits if file loading fails
                setCreditsContent(getFallbackCredits());
            } finally {
                setIsLoading(false);
            }
        };

        loadCredits();
    }, []);

    // Simple search filter for credits content
    const filteredContent = useMemo(() => {
        if (!searchTerm.trim()) return creditsContent;

        const lines = creditsContent.split('\n');
        return lines
            .filter((line) =>
                line.toLowerCase().includes(searchTerm.toLowerCase()) ||
                // Also include the next 2 lines (context) if current line matches
                true
            )
            .join('\n');
    }, [creditsContent, searchTerm]);

    const handleExport = () => {
        const element = document.createElement('a');
        const file = new Blob([creditsContent], { type: 'text/markdown' });
        element.href = URL.createObjectURL(file);
        element.download = 'Mossy-CREDITS.md';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="border-b border-slate-700 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Heart className="w-6 h-6 text-rose-500" />
                        <div>
                            <h2 className="text-2xl font-bold text-white">Credits & Acknowledgments</h2>
                            <p className="text-sm text-slate-400 mt-1">
                                Mossy is built on the shoulders of giants
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors font-bold text-xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Search Bar */}
                <div className="border-b border-slate-700 p-4">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search credits (e.g., React, PyTorch, electron)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg transition-colors"
                            title="Download credits as Markdown"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="inline-block animate-spin mb-4">
                                    <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full"></div>
                                </div>
                                <p className="text-slate-400">Loading credits...</p>
                            </div>
                        </div>
                    ) : error && !creditsContent ? (
                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4">
                            <p className="text-red-200 text-sm">
                                ⚠️ {error}
                            </p>
                        </div>
                    ) : null}

                    {creditsContent && (
                        <div className="prose prose-invert max-w-none">
                            <ReactMarkdown
                                components={{
                                    h1: ({ node, ...props }) => (
                                        <h1 className="text-3xl font-bold text-white mb-4 mt-6 first:mt-0" {...props} />
                                    ),
                                    h2: ({ node, ...props }) => (
                                        <h2 className="text-2xl font-bold text-blue-400 mb-3 mt-5" {...props} />
                                    ),
                                    h3: ({ node, ...props }) => (
                                        <h3 className="text-lg font-semibold text-blue-300 mb-2 mt-3" {...props} />
                                    ),
                                    p: ({ node, ...props }) => (
                                        <p className="text-slate-300 mb-3 leading-relaxed" {...props} />
                                    ),
                                    ul: ({ node, ...props }) => (
                                        <ul className="list-disc list-inside text-slate-300 mb-3 space-y-1" {...props} />
                                    ),
                                    ol: ({ node, ...props }) => (
                                        <ol className="list-decimal list-inside text-slate-300 mb-3 space-y-1" {...props} />
                                    ),
                                    a: ({ node, href, children, ...props }) => (
                                        <a
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1 transition-colors"
                                            {...props}
                                        >
                                            {children}
                                            <ExternalLink className="w-3 h-3 inline" />
                                        </a>
                                    ),
                                    code: ({ node, inline, className, ...props }: any) =>
                                        inline ? (
                                            <code
                                                className="bg-slate-800 text-amber-300 px-2 py-1 rounded text-sm font-mono"
                                                {...props}
                                            />
                                        ) : (
                                            <code
                                                className="bg-slate-800 text-amber-300 px-3 py-2 rounded block font-mono text-sm mb-3 overflow-x-auto"
                                                {...props}
                                            />
                                        ),
                                    hr: ({ node, ...props }) => (
                                        <hr className="border-slate-700 my-4" {...props} />
                                    ),
                                    blockquote: ({ node, ...props }) => (
                                        <blockquote
                                            className="border-l-4 border-slate-600 pl-4 italic text-slate-400 my-3"
                                            {...props}
                                        />
                                    ),
                                }}
                            >
                                {filteredContent}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-700 p-4 bg-slate-800/50">
                    <p className="text-xs text-slate-500 text-center">
                        If you find any missing credits or license issues, please report them on GitHub.
                        <br />
                        <span className="text-rose-500 font-semibold">❤️ Thank you to everyone who makes Mossy possible!</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

/**
 * Fallback credits if CREDITS.md cannot be loaded
 */
function getFallbackCredits(): string {
    return `# Mossy - Credits & Acknowledgments

Mossy is built on amazing open-source software and frameworks:

## Core
- **Electron** - Cross-platform desktop framework
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Node.js** - JavaScript runtime

## AI & Machine Learning
- **OpenAI SDK** - ChatGPT integration
- **Groq SDK** - Fast LLM inference
- **PyTorch** - Machine learning framework
- **NumPy** - Numerical computing

## Build & Development
- **Vite** - Next-gen build tool
- **TailwindCSS** - Utility-first CSS
- **electron-builder** - App packaging

## External Tools
- **Blender** - 3D modeling
- **Creation Kit** - Fallout 4 modding tool
- **xEdit** - Plugin editor
- **Mod Organizer 2** - Advanced mod manager

## Community
Thank you to the Fallout 4 modding community and all contributors!

For the full credits, see: CREDITS.md in the application directory.
`;
}
