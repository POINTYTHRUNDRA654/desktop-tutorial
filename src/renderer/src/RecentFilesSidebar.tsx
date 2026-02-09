/**
 * RecentFilesSidebar - Quick access to recent files and favorites
 * Part of Quick Win Feature #1: Recent Files & Favorites Sidebar
 */

import React, { useEffect, useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Star, 
  X, 
  FileText,
  Image as ImageIcon,
  Box,
  Folder,
  File,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { recentFilesService, RecentFile } from './RecentFilesService';
import { useFavorites, FavoriteItem } from './useFavorites';

interface RecentFilesSidebarProps {
  className?: string;
}

export const RecentFilesSidebar: React.FC<RecentFilesSidebarProps> = ({ className = '' }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem('mossy_recent_sidebar_collapsed');
    return stored === 'true';
  });
  
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  
  // Load recent files and subscribe to changes
  useEffect(() => {
    const loadFiles = () => {
      setRecentFiles(recentFilesService.getRecentFiles());
    };
    
    loadFiles();
    const unsubscribe = recentFilesService.subscribe(loadFiles);
    
    return unsubscribe;
  }, []);
  
  // Listen for keyboard shortcut toggle event
  useEffect(() => {
    const handleToggle = () => {
      setIsCollapsed(prev => !prev);
    };
    
    window.addEventListener('toggle-recent-files', handleToggle);
    return () => window.removeEventListener('toggle-recent-files', handleToggle);
  }, []);
  
  // Save collapsed state
  useEffect(() => {
    localStorage.setItem('mossy_recent_sidebar_collapsed', isCollapsed.toString());
  }, [isCollapsed]);
  
  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  const handleFileClick = (file: RecentFile) => {
    // TODO: Integrate with file viewer/analyzer
    console.log('Opening file:', file.path);
    
    // For now, show notification
    const event = new CustomEvent('mossy-notification', {
      detail: {
        type: 'info',
        message: `Opening ${file.name}...`,
        duration: 3000
      }
    });
    window.dispatchEvent(event);
  };
  
  const handleRemoveRecent = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    recentFilesService.removeRecentFile(path);
  };
  
  const handleClearAll = () => {
    if (window.confirm('Clear all recent files?')) {
      recentFilesService.clearRecentFiles();
    }
  };
  
  const getFileIcon = (type: RecentFile['type']) => {
    const iconClass = 'w-4 h-4';
    
    switch (type) {
      case 'nif':
      case 'fbx':
        return <Box className={iconClass} />;
      case 'dds':
        return <ImageIcon className={iconClass} />;
      case 'esp':
      case 'esm':
      case 'esl':
        return <FileText className={iconClass} />;
      case 'blend':
        return <Box className={`${iconClass} text-orange-400`} />;
      case 'ba2':
        return <Folder className={iconClass} />;
      default:
        return <File className={iconClass} />;
    }
  };
  
  const getFileTypeColor = (type: RecentFile['type']): string => {
    switch (type) {
      case 'nif':
      case 'fbx':
        return 'text-blue-400';
      case 'dds':
        return 'text-purple-400';
      case 'esp':
      case 'esm':
      case 'esl':
        return 'text-green-400';
      case 'blend':
        return 'text-orange-400';
      case 'ba2':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };
  
  if (isCollapsed) {
    return (
      <div className={`${className} fixed left-0 top-16 h-[calc(100vh-4rem)] bg-black/40 backdrop-blur-sm border-r border-emerald-500/30 z-40 transition-all duration-300`}
           style={{ width: '48px' }}>
        <button
          onClick={handleToggleCollapse}
          className="absolute top-2 right-1 p-2 hover:bg-emerald-500/20 rounded transition-colors"
          title="Expand Recent Files"
        >
          <ChevronRight className="w-4 h-4 text-emerald-400" />
        </button>
        
        {/* Collapsed icons */}
        <div className="mt-12 flex flex-col items-center space-y-4">
          <Clock className="w-5 h-5 text-emerald-400/60" />
          <Star className="w-5 h-5 text-amber-400/60" />
        </div>
      </div>
    );
  }
  
  return (
    <div className={`${className} fixed left-0 top-16 h-[calc(100vh-4rem)] bg-black/40 backdrop-blur-sm border-r border-emerald-500/30 z-40 transition-all duration-300`}
         style={{ width: '280px' }}>
      
      {/* Header */}
      <div className="p-3 border-b border-emerald-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">Quick Access</span>
        </div>
        <button
          onClick={handleToggleCollapse}
          className="p-1 hover:bg-emerald-500/20 rounded transition-colors"
          title="Collapse"
        >
          <ChevronLeft className="w-4 h-4 text-emerald-400" />
        </button>
      </div>
      
      {/* Content */}
      <div className="overflow-y-auto h-[calc(100%-56px)] custom-scrollbar">
        
        {/* Recent Files Section */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Recent Files
            </h3>
            {recentFiles.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
          
          {recentFiles.length === 0 ? (
            <div className="text-xs text-gray-500 italic py-4 text-center">
              No recent files
            </div>
          ) : (
            <div className="space-y-1">
              {recentFiles.map((file, index) => (
                <div
                  key={`${file.path}-${index}`}
                  onClick={() => handleFileClick(file)}
                  className="group relative p-2 rounded hover:bg-emerald-500/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 ${getFileTypeColor(file.type)}`}>
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200 truncate" title={file.name}>
                        {file.name}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>{recentFilesService.formatTimestamp(file.timestamp)}</span>
                        {file.size && (
                          <>
                            <span>•</span>
                            <span>{recentFilesService.formatSize(file.size)}</span>
                          </>
                        )}
                      </div>
                      {file.projectName && (
                        <div className="text-xs text-emerald-400/60 truncate">
                          {file.projectName}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleRemoveRecent(e, file.path)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                      title="Remove from recent"
                    >
                      <X className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Favorites Section */}
        <div className="p-3 border-t border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400" />
              Favorites
            </h3>
          </div>
          
          {favorites.length === 0 ? (
            <div className="text-xs text-gray-500 italic py-4 text-center">
              No favorites yet
              <div className="text-xs text-gray-600 mt-1">
                Click ★ to add favorites
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="group relative p-2 rounded hover:bg-amber-500/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200 truncate" title={fav.label}>
                        {fav.label}
                      </div>
                      {fav.path && (
                        <div className="text-xs text-gray-500 truncate" title={fav.path}>
                          {fav.path}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(fav);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                      title="Remove favorite"
                    >
                      <X className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
      
      {/* Keyboard shortcut hint */}
      <div className="absolute bottom-2 left-0 right-0 px-3">
        <div className="text-xs text-gray-600 text-center">
          Press <kbd className="px-1 py-0.5 bg-black/30 rounded text-emerald-400">Ctrl+Shift+R</kbd> to toggle
        </div>
      </div>
    </div>
  );
};

export default RecentFilesSidebar;
