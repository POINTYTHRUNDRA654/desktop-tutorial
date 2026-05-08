import React from 'react';
import { Youtube, BookOpen, ExternalLink } from 'lucide-react';

/**
 * SheldonCreationKitResources Component
 * 
 * Reusable component to display Sheldon Seddon's Creation Kit channel
 * with links and attribution. Can be embedded in any CK-related tutorial,
 * guide, or documentation page.
 */
interface SheldonResourcesProps {
    showTitle?: boolean;
    compact?: boolean;
    className?: string;
}

const SheldonCreationKitResources: React.FC<SheldonResourcesProps> = ({
    showTitle = true,
    compact = false,
    className = ''
}) => {
    const channelUrl = 'https://www.youtube.com/user/seddon4494';
    const channelDisplay = '@seddon4494';

    return (
        <div className={`rounded-lg border border-orange-500/30 bg-gradient-to-r from-orange-950/20 to-transparent p-4 ${className}`}>
            {showTitle && (
                <div className="mb-3 flex items-center gap-2">
                    <Youtube className="h-5 w-5 text-orange-500" />
                    <h3 className="font-semibold text-orange-300">Creation Kit Learning Resource</h3>
                </div>
            )}

            <div className={`space-y-${compact ? '1' : '3'}`}>
                <div>
                    <p className="text-sm font-medium text-orange-200">
                        📺 Sheldon Seddon's Creation Kit Channel
                    </p>
                    <a
                        href={channelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300 underline"
                    >
                        {channelUrl}
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </div>

                {!compact && (
                    <>
                        <div className="space-y-1 text-xs text-orange-200/80">
                            <p className="font-medium text-orange-300">Coverage:</p>
                            <ul className="list-inside list-disc space-y-0.5 text-orange-200/70">
                                <li>Creation Kit fundamentals</li>
                                <li>Papyrus scripting &amp; quest design</li>
                                <li>NPC creation &amp; dialogue setup</li>
                                <li>Worldbuilding &amp; optimization</li>
                                <li>GECK (Garden of Eden Creation Kit)</li>
                            </ul>
                        </div>

                        <p className="text-xs text-orange-200/70">
                            <span className="font-medium text-orange-300">Access:</span> Free, no subscription required. All content hosted on YouTube.
                        </p>

                        <div className="rounded bg-orange-950/30 p-2 text-xs text-orange-200/80">
                            <p className="mb-1 font-medium text-orange-300">💡 Tip:</p>
                            <p>
                                For in-depth Creation Kit topics, Sheldon's channel is your go-to free resource. Subscribe to stay updated on new tutorials.
                            </p>
                        </div>
                    </>
                )}

                {compact && (
                    <p className="text-xs text-orange-200/70">
                        Comprehensive free video tutorials covering CK, Papyrus, quests, NPCs, worldbuilding, and more.
                    </p>
                )}

                <div className="rounded bg-orange-900/20 px-2 py-1 text-xs text-orange-200/70">
                    <p className="font-medium text-orange-300">Attribution:</p>
                    <p>
                        Credit: <span className="font-semibold">Sheldon Seddon</span> •
                        Channel: <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">{channelDisplay}</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SheldonCreationKitResources;
