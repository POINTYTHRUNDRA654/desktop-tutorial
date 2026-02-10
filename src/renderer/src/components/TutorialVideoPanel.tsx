import React, { useEffect, useState } from 'react';
import { PlayCircle, AlertCircle } from 'lucide-react';

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

  return (
    <div
      className={`bg-slate-900/70 border border-slate-700 rounded-xl p-4 ${compact ? 'text-xs' : 'text-sm'} ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-white font-bold">{title}</h3>
          <p className="text-slate-400 mt-1">{description}</p>
        </div>
        <div
          className={`px-2 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${
            videoUrl
              ? 'border-emerald-500/40 text-emerald-300 bg-emerald-900/20'
              : 'border-amber-500/40 text-amber-300 bg-amber-900/20'
          }`}
        >
          {videoUrl ? 'Video Ready' : 'Needs Video'}
        </div>
      </div>

      <div className="mt-3">
        {videoUrl ? (
          <video
            src={videoUrl}
            poster={posterUrl || undefined}
            controls
            preload="metadata"
            className="w-full rounded-lg border border-slate-700 bg-black"
          />
        ) : (
          <div className="w-full rounded-lg border border-slate-700 bg-slate-950 p-4 text-slate-400 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-300 flex-shrink-0" />
            <div>
              <div className="text-slate-200 font-semibold flex items-center gap-2">
                <PlayCircle className="w-4 h-4" />
                Add a tutorial video to enable playback
              </div>
              <p className="mt-1">
                Set localStorage keys: <strong>mossy_tutorial_video_url</strong> and
                <strong> mossy_tutorial_video_poster</strong>.
              </p>
            </div>
          </div>
        )}
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
