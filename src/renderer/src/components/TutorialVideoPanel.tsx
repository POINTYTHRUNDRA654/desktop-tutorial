import React, { useEffect, useState } from 'react';
import { PlayCircle } from 'lucide-react';

interface TutorialVideoPanelProps {
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

const DEFAULT_CHAPTERS = [
  'Welcome and app layout',
  'System scan and permissions',
  'Sidebar modules and navigation',
  'First scan workflow',
  'Where to get help and docs',
];

const TutorialVideoPanel: React.FC<TutorialVideoPanelProps> = ({
  title = 'Onboarding Video',
  description = 'A complete walkthrough of first-time setup and the core pages.',
  className = '',
  compact = false,
}) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = localStorage.getItem('mossy_tutorial_video_url');
    const poster = localStorage.getItem('mossy_tutorial_video_poster');
    setVideoUrl(url && url.trim() ? url.trim() : null);
    setPosterUrl(poster && poster.trim() ? poster.trim() : null);
  }, []);

  // No video ships with Mossy; the panel only appears when one has been configured.
  // (It used to show users developer instructions about localStorage keys instead.)
  if (!videoUrl) return null;

  return (
    <div
      className={`bg-slate-900/70 border border-slate-700 rounded-xl p-4 ${compact ? 'text-xs' : 'text-sm'} ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-white font-bold">{title}</h3>
          <p className="text-slate-400 mt-1">{description}</p>
        </div>
        <PlayCircle className="w-5 h-5 text-emerald-300 flex-shrink-0" />
      </div>

      <div className="mt-3">
        <video
          src={videoUrl}
          poster={posterUrl || undefined}
          controls
          preload="metadata"
          className="w-full rounded-lg border border-slate-700 bg-black"
        />
      </div>

      {!compact && (
        <div className="mt-4">
          <div className="text-[11px] text-slate-500 uppercase tracking-wider">Chapters</div>
          <ul className="mt-2 space-y-1 text-slate-300">
            {DEFAULT_CHAPTERS.map((chapter) => (
              <li key={chapter} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {chapter}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TutorialVideoPanel;
