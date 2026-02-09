import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, Minimize, ExternalLink, Youtube, Video } from 'lucide-react';

interface VideoTutorialProps {
    isOpen: boolean;
    onClose: () => void;
}

export const VideoTutorial: React.FC<VideoTutorialProps> = ({ isOpen, onClose }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Default tutorial video - placeholder for now, can be configured
    const [videoSource, setVideoSource] = useState<string>('');
    const [useYouTube, setUseYouTube] = useState(true);
    const [youtubeId, setYoutubeId] = useState('');

    useEffect(() => {
        // Load video source from settings
        const savedVideoSource = localStorage.getItem('mossy_tutorial_video_source');
        const savedYouTubeId = localStorage.getItem('mossy_tutorial_youtube_id');
        
        if (savedYouTubeId) {
            setYoutubeId(savedYouTubeId);
            setUseYouTube(true);
        } else if (savedVideoSource) {
            setVideoSource(savedVideoSource);
            setUseYouTube(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setIsPlaying(false);
            if (videoRef.current) {
                videoRef.current.pause();
            }
        }
    }, [isOpen]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateTime = () => setCurrentTime(video.currentTime);
        const updateDuration = () => setDuration(video.duration);
        
        video.addEventListener('timeupdate', updateTime);
        video.addEventListener('loadedmetadata', updateDuration);
        
        return () => {
            video.removeEventListener('timeupdate', updateTime);
            video.removeEventListener('loadedmetadata', updateDuration);
        };
    }, []);

    const togglePlay = () => {
        if (!videoRef.current) return;
        
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        
        if (!isFullscreen) {
            if (containerRef.current.requestFullscreen) {
                containerRef.current.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
        setIsFullscreen(!isFullscreen);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return;
        const time = parseFloat(e.target.value);
        videoRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const formatTime = (seconds: number) => {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
            <div 
                ref={containerRef}
                className="relative w-full max-w-6xl mx-4 bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-700"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <Video className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Video Tutorial</h2>
                            <p className="text-xs text-slate-400">Learn how to use Mossy</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Video Content */}
                <div className="relative bg-black aspect-video">
                    {useYouTube && youtubeId ? (
                        // YouTube embed
                        <iframe
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0`}
                            title="Mossy Tutorial Video"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullscreen
                        />
                    ) : videoSource ? (
                        // Local/External video
                        <>
                            <video
                                ref={videoRef}
                                className="w-full h-full"
                                src={videoSource}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                            />
                            
                            {/* Custom Controls */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                {/* Progress Bar */}
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 0}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    className="w-full mb-3 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer 
                                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                                             [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full 
                                             [&::-webkit-slider-thumb]:bg-emerald-500"
                                />
                                
                                {/* Controls */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={togglePlay}
                                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            {isPlaying ? (
                                                <Pause className="w-5 h-5 text-white" />
                                            ) : (
                                                <Play className="w-5 h-5 text-white" />
                                            )}
                                        </button>
                                        
                                        <button
                                            onClick={toggleMute}
                                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            {isMuted ? (
                                                <VolumeX className="w-5 h-5 text-white" />
                                            ) : (
                                                <Volume2 className="w-5 h-5 text-white" />
                                            )}
                                        </button>
                                        
                                        <span className="text-sm text-white font-mono">
                                            {formatTime(currentTime)} / {formatTime(duration)}
                                        </span>
                                    </div>
                                    
                                    <button
                                        onClick={toggleFullscreen}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        {isFullscreen ? (
                                            <Minimize className="w-5 h-5 text-white" />
                                        ) : (
                                            <Maximize className="w-5 h-5 text-white" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        // No video configured
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <div className="mb-6 p-6 bg-slate-800 rounded-full">
                                <Youtube className="w-16 h-16 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No Tutorial Video Configured</h3>
                            <p className="text-slate-400 mb-6 max-w-md">
                                A video tutorial has not been set up yet. You can configure a YouTube video ID or 
                                local video file in the settings.
                            </p>
                            <div className="space-y-3 w-full max-w-md">
                                <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 text-left">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        YouTube Video ID
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., dQw4w9WgXcQ"
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white 
                                                 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                        onChange={(e) => {
                                            const id = e.target.value.trim();
                                            if (id) {
                                                localStorage.setItem('mossy_tutorial_youtube_id', id);
                                                setYoutubeId(id);
                                                setUseYouTube(true);
                                            }
                                        }}
                                    />
                                    <p className="text-xs text-slate-500 mt-2">
                                        Enter the ID from a YouTube URL (the part after v=)
                                    </p>
                                </div>
                                
                                <div className="text-sm text-slate-500">or</div>
                                
                                <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 text-left">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Local Video File URL
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="file:///C:/Videos/tutorial.mp4"
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white 
                                                 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                        onChange={(e) => {
                                            const url = e.target.value.trim();
                                            if (url) {
                                                localStorage.setItem('mossy_tutorial_video_source', url);
                                                setVideoSource(url);
                                                setUseYouTube(false);
                                            }
                                        }}
                                    />
                                    <p className="text-xs text-slate-500 mt-2">
                                        Enter a local file path or HTTP(S) URL
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer with helpful info */}
                <div className="p-4 bg-slate-800 border-t border-slate-700">
                    <div className="flex items-start gap-3 text-sm">
                        <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                            <ExternalLink className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-slate-300 font-medium mb-1">Quick Tips</p>
                            <ul className="text-xs text-slate-400 space-y-1">
                                <li>• Press ESC to close this tutorial at any time</li>
                                <li>• You can access this video tutorial from the Help menu</li>
                                <li>• For text-based tutorials, use the interactive walkthrough</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoTutorial;
