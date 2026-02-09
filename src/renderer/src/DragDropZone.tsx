import React, { useState, useEffect } from 'react';
import { recentFilesService } from './RecentFilesService';

interface DragDropZoneProps {
  onFileDrop: (files: File[]) => void;
}

/**
 * Global drag-and-drop zone overlay
 * Appears when user drags files over the app
 * Handles file drop and routes to appropriate analyzer
 */
export const DragDropZone: React.FC<DragDropZoneProps> = ({ onFileDrop }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      setDragCounter((prev) => prev + 1);
      
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      setDragCounter((prev) => {
        const newCount = prev - 1;
        if (newCount === 0) {
          setIsDragging(false);
        }
        return newCount;
      });
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      setIsDragging(false);
      setDragCounter(0);
      
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        onFileDrop(files);
        
        // Add files to recent files
        files.forEach(file => {
          const ext = file.name.split('.').pop()?.toLowerCase() || 'other';
          let type: any = 'other';
          
          if (['nif'].includes(ext)) type = 'nif';
          else if (['dds', 'png', 'jpg', 'jpeg', 'tga'].includes(ext)) type = 'dds';
          else if (['esp', 'esm', 'esl'].includes(ext)) type = 'esp';
          else if (['blend'].includes(ext)) type = 'blend';
          else if (['fbx'].includes(ext)) type = 'fbx';
          else if (['ba2'].includes(ext)) type = 'ba2';
          
          recentFilesService.addRecentFile({
            path: file.path || file.name,
            name: file.name,
            type,
            timestamp: Date.now(),
            size: file.size,
          });
        });
      }
    };

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, [onFileDrop]);

  if (!isDragging) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        pointerEvents: 'none',
        border: '4px dashed #10b981',
      }}
    >
      <div
        style={{
          background: 'rgba(17, 24, 39, 0.95)',
          border: '2px solid #10b981',
          borderRadius: '16px',
          padding: '48px',
          textAlign: 'center',
          maxWidth: '500px',
          boxShadow: '0 0 40px rgba(16, 185, 129, 0.5)',
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📁</div>
        <h2
          style={{
            color: '#10b981',
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '12px',
            textShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
          }}
        >
          Drop Files to Analyze
        </h2>
        <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>
          Supported: NIF, DDS, ESP, BLEND, FBX, BA2, and more
        </p>
        <div
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: 'rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            color: '#10b981',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        >
          Files will be automatically analyzed
        </div>
      </div>
    </div>
  );
};
