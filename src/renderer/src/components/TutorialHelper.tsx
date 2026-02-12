/**
 * Tutorial Helper Component
 * 
 * Provides context-aware tutorial assistance on any page
 * Allows users to ask Mossy about the current page they're on
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, BookOpen, Lightbulb, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { getTutorialContext, getSuggestedQuestions, getCommonMistakes, generateTutorialPrompt } from './tutorialContext';

interface TutorialHelperProps {
  /** Optional: Override auto-detected page */
  forcePage?: string;
  
  /** Optional: Compact mode (icon only) */
  compact?: boolean;
  
  /** Optional: Position */
  position?: 'fixed' | 'inline';
}

export const TutorialHelper: React.FC<TutorialHelperProps> = ({
  forcePage,
  compact = false,
  position = 'fixed'
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const currentRoute = forcePage || location.pathname;
  const context = getTutorialContext(currentRoute);
  const suggestedQuestions = getSuggestedQuestions(currentRoute);
  const commonMistakes = getCommonMistakes(currentRoute);
  
  // Don't show if no context available
  if (!context) {
    return null;
  }
  
  const handleAskMossy = (question?: string) => {
    // Navigate to chat with pre-filled question
    const prompt = question 
      ? generateTutorialPrompt(currentRoute, question)
      : generateTutorialPrompt(currentRoute, 'Can you help me understand this page?');
    
    // Store the prompt for the chat interface to pick up
    sessionStorage.setItem('mossy_prefilled_prompt', prompt);
    sessionStorage.setItem('mossy_tutorial_context', JSON.stringify(context));
    
    navigate('/chat');
  };
  
  const positionClasses = position === 'fixed'
    ? 'fixed bottom-6 right-6 z-50'
    : '';
  
  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`${positionClasses} bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-full p-3 shadow-lg transition-all hover:scale-110`}
        title="Tutorial Help"
      >
        <HelpCircle className="w-6 h-6 text-emerald-400" />
      </button>
    );
  }
  
  return (
    <div className={`${positionClasses} bg-slate-900/95 border border-emerald-500/30 rounded-lg shadow-2xl max-w-md`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-emerald-500/20">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <h3 className="text-emerald-400 font-bold">Tutorial Help</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-emerald-400 transition-colors"
        >
          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>
      </div>
      
      {/* Content (shown when expanded) */}
      {isExpanded && (
        <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
          {/* Page Info */}
          <div>
            <h4 className="text-slate-200 font-semibold mb-2">{context.pageName}</h4>
            <p className="text-slate-400 text-sm">{context.purpose}</p>
          </div>
          
          {/* Quick Actions */}
          <div className="space-y-2">
            <button
              onClick={() => handleAskMossy()}
              className="w-full flex items-center gap-2 px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-lg text-emerald-400 font-medium transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Ask Mossy About This Page
            </button>
            
            <a
              href="#tutorial"
              onClick={(e) => {
                e.preventDefault();
                // Open tutorial in new window or navigate to it
                window.open('/MOSSY_TUTORIAL_ENHANCED.md', '_blank');
              }}
              className="w-full flex items-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-400 font-medium transition-colors text-center justify-center"
            >
              <BookOpen className="w-4 h-4" />
              Read Full Tutorial
            </a>
          </div>
          
          {/* Suggested Questions */}
          {suggestedQuestions.length > 0 && (
            <div>
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="flex items-center gap-2 text-slate-300 hover:text-emerald-400 transition-colors mb-2"
              >
                <Lightbulb className="w-4 h-4" />
                <span className="text-sm font-medium">Suggested Questions</span>
                {showSuggestions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              
              {showSuggestions && (
                <div className="space-y-2 pl-6">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleAskMossy(question)}
                      className="w-full text-left px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded text-slate-300 text-sm transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Key Features */}
          {context.features.length > 0 && (
            <div>
              <h5 className="text-slate-300 font-medium text-sm mb-2">Key Features on This Page:</h5>
              <ul className="space-y-1 text-sm text-slate-400">
                {context.features.slice(0, 5).map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Common Mistakes */}
          {commonMistakes.length > 0 && (
            <div>
              <h5 className="text-amber-400 font-medium text-sm mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Common Beginner Mistakes:
              </h5>
              <ul className="space-y-1 text-sm text-slate-400">
                {commonMistakes.slice(0, 3).map((mistake, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">⚠</span>
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Tutorial Sections */}
          {context.tutorialSections.length > 0 && (
            <div>
              <h5 className="text-slate-300 font-medium text-sm mb-2">Relevant Tutorial Sections:</h5>
              <div className="space-y-1">
                {context.tutorialSections.map((section, index) => (
                  <div key={index} className="text-sm text-blue-400 hover:text-blue-300 cursor-pointer">
                    → {section}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Hook to get tutorial context for current page
 */
export function useTutorialContext() {
  const location = useLocation();
  const context = getTutorialContext(location.pathname);
  
  return {
    context,
    suggestedQuestions: getSuggestedQuestions(location.pathname),
    commonMistakes: getCommonMistakes(location.pathname),
    askMossy: (question: string) => {
      const prompt = generateTutorialPrompt(location.pathname, question);
      sessionStorage.setItem('mossy_prefilled_prompt', prompt);
      return prompt;
    }
  };
}

export default TutorialHelper;
