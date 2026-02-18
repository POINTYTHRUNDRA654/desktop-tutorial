import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TutorialSlide {
  id: number;
  filename: string;
  imagePath: string;
  title: string;
  description: string;
}

interface ImageTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ImageTutorial - Displays a comprehensive slideshow tutorial with 55+ pages
 * 
 * Images are loaded from: public/visual-guide-images/
 * Named as: page-1-mossy-space.png, page-2-ai-chat.png, etc.
 * 
 * Captions are auto-generated from page titles in filenames
 */
export const ImageTutorial: React.FC<ImageTutorialProps> = ({ isOpen, onClose }) => {
  const [slides, setSlides] = useState<TutorialSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTutorialSlides();
  }, []);

  const loadTutorialSlides = async () => {
    setLoading(true);
    setError(null);

    try {
      // All visual guide images (pages 1-55, with some duplicates)
      const visualGuidePages = [
        'page-1-mossy-space',
        'page-2-ai-chat',
        'page-3-ai-mod-assistant',
        'page-4-first-success',
        'page-5-modding-roadmaps',
        'page-6-whats-new',
        'page-7-mod-projects',
        'page-8-quick-reference',
        'page-9-knowledge-search',
        'page-10-memory-vault',
        'page-11-wizards',
        'page-12-crash-triage',
        'page-13-ck-safety',
        'page-14-dds-converter',
        'page-15-texture-generator',
        'page-16-packaging-release',
        'page-17-animation-guide',
        'page-18-quest-mod-authorizing',
        'page-19-the-lorekeeper',
        'page-20-the-blueprint',
        'page-21-cosmos-workflow',
        'page-22-devtools',
        'page-23-the-assembler',
        'page-24-the-workshop',
        'page-25-the-auditor',
        'page-26-ck-crash-prevention',
        'page-27-mining-and-analysis-hub',
        'page-28-the-scribe',
        'page-29-system-monitor',
        'page-30-the-orchestrator',
        'page-31-workflow-runner',
        'page-32-the-holodeck',
        'page-33-the-vault',
        'page-34-ba2-manager',
        'page-35-workflow-recorder',
        'page-36-plugin-manager',
        'page-37-local-capabilities',
        'page-38-image-studio',
        'page-39-live-synapse',
        'page-40-desktop-bridge',
        'page-41-mo2-extension',
        'page-42-xedit-tools',
        'page-43-ck-extensions',
        'page-44-comfyui-extensions',
        'page-45-upscale-extension',
        'page-46-duplicate-finder',
        'page-47-community-learning',
        'page-48-tool-verify',
        'page-49-settings',
        'page-50-diagnostic-tools',
        'page-51-support-mossy',
        'page-53-fallout-4-wiki',
        'page-54-guided-tours',
        'page-55-pip-boy-on-off',
      ];

      // Load all images from visual-guide-images directory
      const loadedSlides: TutorialSlide[] = [];
      
      for (let i = 0; i < visualGuidePages.length; i++) {
        const filename = visualGuidePages[i];
        const imagePath = `/visual-guide-images/${filename}.png`;
        
        // Check if image exists
        const exists = await checkImageExists(imagePath);
        
        if (exists) {
          const title = generateTitleFromFilename(filename);
          
          loadedSlides.push({
            id: i + 1,
            filename: filename,
            imagePath: imagePath,
            title: title,
            description: `Page ${i + 1} - ${title}`
          });
        }
      }

      if (loadedSlides.length === 0) {
        setError('No tutorial images found in visual-guide-images directory.');
      } else {
        setSlides(loadedSlides);
      }
    } catch (err) {
      setError(`Failed to load tutorial: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const checkImageExists = async (path: string): Promise<boolean> => {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  const generateTitleFromFilename = (filename: string): string => {
    // Convert "page-1-mossy-space" to "Mossy Space"
    // Convert "page-25-the-auditor" to "The Auditor"
    const parts = filename.split('-').slice(2); // Remove "page" and number
    return parts
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;
    
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentSlide, slides.length]);

  if (!isOpen) return null;

  const slide = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full h-full max-w-7xl mx-auto p-4 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <ImageIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Visual Tutorial - Complete Guide</h2>
              {!loading && !error && (
                <p className="text-sm text-slate-400">
                  Page {currentSlide + 1} of {slides.length} - All App Features
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center">
          {loading && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-slate-400">Loading tutorial images...</p>
            </div>
          )}

          {error && (
            <div className="max-w-2xl mx-auto text-center">
              <div className="p-6 bg-slate-800 rounded-xl border border-slate-700">
                <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Tutorial Images Found</h3>
                <p className="text-slate-400 mb-4">{error}</p>
                <div className="bg-slate-900 rounded-lg p-4 text-left text-sm">
                  <p className="text-slate-300 font-medium mb-2">Tutorial images should be in:</p>
                  <ol className="text-slate-400 space-y-1 list-decimal list-inside">
                    <li><code className="text-emerald-400">public/visual-guide-images/</code></li>
                    <li>Named as: page-1-mossy-space.png, page-2-ai-chat.png, etc.</li>
                    <li>55+ comprehensive screenshots of all app pages</li>
                  </ol>
                </div>
                <button
                  onClick={onClose}
                  className="mt-6 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
                >
                  Close Tutorial
                </button>
              </div>
            </div>
          )}

          {!loading && !error && slide && (
            <div className="w-full h-full flex flex-col">
              {/* Image Container */}
              <div className="flex-1 flex items-center justify-center mb-4">
                <img
                  src={slide.imagePath}
                  alt={slide.title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-slate-700"
                />
              </div>

              {/* Slide Info */}
              <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold">
                        {String(slide.id).padStart(2, '0')}
                      </span>
                      <h3 className="text-xl font-bold text-white">{slide.title}</h3>
                    </div>
                    {slide.description && (
                      <p className="text-slate-300 leading-relaxed">{slide.description}</p>
                    )}
                  </div>
                  
                  {/* Progress Indicators */}
                  <div className="flex gap-1">
                    {slides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`h-2 rounded-full transition-all ${
                          index === currentSlide
                            ? 'w-8 bg-emerald-500'
                            : index < currentSlide
                            ? 'w-2 bg-emerald-600'
                            : 'w-2 bg-slate-600'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        {!loading && !error && slides.length > 0 && (
          <div className="flex items-center justify-between mt-4 px-4">
            <button
              onClick={handlePrevious}
              disabled={currentSlide === 0}
              className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            <div className="text-slate-400 text-sm">
              Use ← → arrow keys to navigate
            </div>

            <button
              onClick={currentSlide === slides.length - 1 ? onClose : handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
            >
              {currentSlide === slides.length - 1 ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Finish Tutorial
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageTutorial;
