import React from 'react';
import { Youtube, Twitch, BookOpen, ExternalLink, Globe } from 'lucide-react';

/**
 * DarkfoxCreationKitResources Component
 * 
 * Reusable component to display Darkfox127's (Richard's) Creation Kit tutorials
 * including YouTube playlists, Twitch streams, and website.
 * Can be embedded in any CK-related tutorial, guide, or documentation page.
 */
interface DarkfoxResourcesProps {
    showTitle?: boolean;
    compact?: boolean;
    className?: string;
}

const DarkfoxCreationKitResources: React.FC<DarkfoxResourcesProps> = ({
    showTitle = true,
    compact = false,
    className = ''
}) => {
    const youtubeUrl = 'https://www.youtube.com/@Darkfox127';
    const playlistsUrl = 'https://www.youtube.com/@Darkfox127/playlists';
    const twitchUrl = 'https://www.twitch.tv/darkfox127';
    const websiteUrl = 'https://darkfox127.com';

    return (
        <div className={`rounded-lg border border-purple-500/30 bg-gradient-to-r from-purple-950/20 to-transparent p-4 ${className}`}>
            {showTitle && (
                <div className="mb-3 flex items-center gap-2">
                    <Youtube className="h-5 w-5 text-purple-500" />
                    <h3 className="font-semibold text-purple-300">Creation Kit Tutorial Series</h3>
                </div>
            )}

            <div className={`space-y-${compact ? '1' : '3'}`}>
                <div>
                    <p className="text-sm font-medium text-purple-200">
                        📺 Darkfox127 (Richard) - Creation Kit Tutorials
                    </p>
                    <div className="mt-2 space-y-1">
                        <a
                            href={youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                        >
                            <Youtube className="h-3.5 w-3.5" />
                            YouTube Channel
                            <ExternalLink className="h-3 w-3" />
                        </a>
                        <a
                            href={playlistsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                        >
                            <BookOpen className="h-3.5 w-3.5" />
                            Video Playlists
                            <ExternalLink className="h-3 w-3" />
                        </a>
                        <a
                            href={twitchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                        >
                            <Twitch className="h-3.5 w-3.5" />
                            Twitch Live Streams
                            <ExternalLink className="h-3 w-3" />
                        </a>
                        {!compact && (
                            <a
                                href={websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                            >
                                <Globe className="h-3.5 w-3.5" />
                                Darkfox127.com
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </div>
                </div>

                {!compact && (
                    <>
                        <div className="space-y-1 text-xs text-purple-200/80">
                            <p className="font-medium text-purple-300">Coverage:</p>
                            <ul className="list-inside list-disc space-y-0.5 text-purple-200/70">
                                <li>Creation Kit interface and workflows</li>
                                <li>Modding tutorials for Fallout</li>
                                <li>Step-by-step creation guides</li>
                                <li>World editing and design</li>
                                <li>NPC and quest creation</li>
                            </ul>
                        </div>

                        <p className="text-xs text-purple-200/70">
                            <span className="font-medium text-purple-300">Learning Options:</span> Video tutorials + Live Twitch streams for interactive learning
                        </p>

                        <div className="rounded bg-purple-950/30 p-2 text-xs text-purple-200/80">
                            <p className="mb-1 font-medium text-purple-300">💡 Tip:</p>
                            <p>
                                Watch his YouTube tutorials for structured learning, or join his Twitch livestreams for real-time problem-solving and community interaction.
                            </p>
                        </div>
                    </>
                )}

                {compact && (
                    <p className="text-xs text-purple-200/70">
                        Video tutorials + live Twitch streams for Creation Kit learning. Comprehensive coverage from beginner to advanced.
                    </p>
                )}

                <div className="rounded bg-purple-900/20 px-2 py-1 text-xs text-purple-200/70">
                    <p className="font-medium text-purple-300">Creator:</p>
                    <p>
                        <span className="font-semibold">Darkfox127 (Richard)</span> •
                        Channel: <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">@Darkfox127</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DarkfoxCreationKitResources;
