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
 * ImageTutorial - Displays a slideshow tutorial using user-provided screenshots
 * 
 * Images should be placed in: public/tutorial-images/
 * Named as: 01-welcome.png, 02-sidebar.png, etc.
 * 
 * Captions can be provided in: public/tutorial-images/captions.json
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
      // Try to load captions file
      let captions: Record<string, { title: string; description: string }> = {};
      try {
        const captionsResponse = await fetch('/tutorial-images/captions.json');
        if (captionsResponse.ok) {
          captions = await captionsResponse.json();
        }
      } catch (err) {
        console.log('No captions.json found, using auto-generated titles');
      }

      // Expected slide filenames (in order)
      const expectedSlides = [
        '01-welcome',
        '02-sidebar',
        '03-nexus-dashboard',
        '04-chat-interface',
        '05-live-voice',
        '06-auditor',
        '07-image-suite',
        '08-workshop',
        '09-vault',
        '10-bridge',
        '11-settings',
        '12-help',
      ];

      // Try to load each image
      const loadedSlides: TutorialSlide[] = [];
      
      for (let i = 0; i < expectedSlides.length; i++) {
        const filename = expectedSlides[i];
        const pngPath = `/tutorial-images/${filename}.png`;
        const jpgPath = `/tutorial-images/${filename}.jpg`;
        
        // Try PNG first, then JPG
        const imagePath = await checkImageExists(pngPath) ? pngPath : 
                         await checkImageExists(jpgPath) ? jpgPath : null;
        
        if (imagePath) {
          const caption = captions[`${filename}.png`] || captions[`${filename}.jpg`];
          const autoTitle = generateTitleFromFilename(filename);
          
          loadedSlides.push({
            id: i + 1,
            filename: filename,
            imagePath: imagePath,
            title: caption?.title || autoTitle,
            description: caption?.description || ''
          });
        }
      }

      if (loadedSlides.length === 0) {
        setError('No tutorial images found. Please add screenshots to public/tutorial-images/');
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
    // Convert "01-welcome" to "Welcome"
    // Convert "03-nexus-dashboard" to "Nexus Dashboard"
    const parts = filename.split('-').slice(1); // Remove number prefix
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
              <h2 className="text-xl font-bold text-white">Visual Tutorial</h2>
              {!loading && !error && (
                <p className="text-sm text-slate-400">
                  Step {currentSlide + 1} of {slides.length}
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
                  <p className="text-slate-300 font-medium mb-2">To add tutorial images:</p>
                  <ol className="text-slate-400 space-y-1 list-decimal list-inside">
                    <li>See <code className="text-emerald-400">SCREENSHOT_GUIDE_FOR_TUTORIAL.md</code></li>
                    <li>Capture screenshots of each page</li>
                    <li>Place them in <code className="text-emerald-400">public/tutorial-images/</code></li>
                    <li>Name them: 01-welcome.png, 02-sidebar.png, etc.</li>
                    <li>Reload this tutorial</li>
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
