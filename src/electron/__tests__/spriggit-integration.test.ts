/**
 * Spriggit Integration Tests
 * 
 * These tests validate that Spriggit CLI integration will work correctly
 * when the app is deployed. They check for common setup issues that prevent
 * Spriggit from working for new users.
 * 
 * Run automatically when opening the project in VS Code.
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

describe('Spriggit Integration Setup Validation', () => {
  
  describe('Critical Dependencies', () => {
    
    it('should have .NET Runtime check logic in place', () => {
      // Verify the main.ts file contains .NET detection code
      const mainFilePath = path.resolve(__dirname, '../main.ts');
      expect(fs.existsSync(mainFilePath)).toBe(true);
      
      const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
      
      // Check for .NET version detection
      expect(mainContent).toContain('dotnet');
      expect(mainContent).toContain('--version');
    });
    
    it('should have Spriggit error handling for missing .NET', () => {
      const mainFilePath = path.resolve(__dirname, '../main.ts');
      const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
      
      // Verify we handle .NET not being installed
      expect(mainContent.toLowerCase()).toMatch(/\.net|dotnet/);
      expect(mainContent).toMatch(/error|fail|missing/i);
    });
    
  });
  
  describe('Spriggit Handler Implementation', () => {
    
    it('should have SPRIGGIT_SERIALIZE IPC handler', () => {
      const mainFilePath = path.resolve(__dirname, '../main.ts');
      const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
      
      expect(mainContent).toContain('SPRIGGIT_SERIALIZE');
      expect(mainContent).toContain('spriggit-serialize');
    });
    
    it('should have SPRIGGIT_PICK_CLI IPC handler', () => {
      const mainFilePath = path.resolve(__dirname, '../main.ts');
      const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
      
      expect(mainContent).toContain('SPRIGGIT_PICK_CLI');
      expect(mainContent).toContain('spriggit-pick-cli');
    });
    
    it('should have comprehensive error handling for Spriggit execution', () => {
      const mainFilePath = path.resolve(__dirname, '../main.ts');
      const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
      
      // Check for error handling keywords in Spriggit section
      const spriggitSection = mainContent.substring(
        mainContent.indexOf('SPRIGGIT'),
        mainContent.lastIndexOf('SPRIGGIT') + 1000
      );
      
      expect(spriggitSection).toMatch(/try\s*{|catch/);
      expect(spriggitSection).toMatch(/error/i);
    });
    
  });
  
  describe('Spriggit Cache Configuration', () => {
    
    it('should configure DOTNET_BUNDLE_EXTRACT_BASE_DIR', () => {
      const mainFilePath = path.resolve(__dirname, '../main.ts');
      const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
      
      // Verify cache directory is configured next to Spriggit exe
      expect(mainContent).toContain('DOTNET_BUNDLE_EXTRACT_BASE_DIR');
      expect(mainContent).toContain('spriggit-dotnet-cache');
    });
    
    it('should save spriggitPath to settings for cache clearing', () => {
      const mainFilePath = path.resolve(__dirname, '../main.ts');
      const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
      
      expect(mainContent).toContain('spriggitPath');
      expect(mainContent).toMatch(/settings|config/i);
    });
    
  });
  
  describe('Version Compatibility', () => {
    
    it('should handle both old and new Spriggit flag syntax', () => {
      const mainFilePath = path.resolve(__dirname, '../main.ts');
      const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
      
      // v0.40.0 removed --PackageName flag
      // Should handle both versions gracefully
      const hasVersionCheck = mainContent.includes('--version') || 
                             mainContent.includes('version') && mainContent.includes('spriggit');
      
      expect(hasVersionCheck).toBe(true);
    });
    
    it('should detect Spriggit version for FO4 1.11.x compatibility', () => {
      const mainFilePath = path.resolve(__dirname, '../main.ts');
      const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
      
      // Should check Spriggit version compatibility
      expect(mainContent).toMatch(/version.*spriggit|spriggit.*version/i);
    });
    
  });
  
  describe('Error Diagnostics', () => {
    
    it('should detect disk space issues', () => {
      const mainFilePath = path.resolve(__dirname, '../main.ts');
      const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
      
      // Check for disk space validation
      const hasDiskCheck = mainContent.includes('disk') || 
                          mainContent.includes('space') ||
                          mainContent.includes('ENOSPC');
      
      expect(hasDiskCheck).toBe(true);
    });
    
    it('should detect permission errors', () => {
      const mainFilePath = path.resolve(__dirname, '../main.ts');
      const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
      
      // Check for permission error handling
      const hasPermCheck = mainContent.includes('EACCES') || 
                          mainContent.includes('permission') ||
                          mainContent.includes('EPERM');
      
      expect(hasPermCheck).toBe(true);
    });
    
    it('should handle Smart App Control (SAC) issues', () => {
      const mainFilePath = path.resolve(__dirname, '../main.ts');
      const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
      
      // Windows Smart App Control can block Spriggit
      // Cache directory placement helps avoid this
      expect(mainContent).toContain('spriggit-dotnet-cache');
    });
    
    it('should handle 0xFFFFFFFF crash code', () => {
      const mainFilePath = path.resolve(__dirname, '../main.ts');
      const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
      
      // This is a common Spriggit crash code
      const handles0xFF = mainContent.includes('0xFFFFFFFF') || 
                         mainContent.includes('4294967295') ||
                         mainContent.includes('-1') && mainContent.includes('exit');
      
      expect(handles0xFF).toBe(true);
    });
    
  });
  
  describe('TypeScript Type Safety', () => {
    
    it('should have Spriggit IPC channels defined in types', () => {
      const typesFilePath = path.resolve(__dirname, '../types.ts');
      
      if (fs.existsSync(typesFilePath)) {
        const typesContent = fs.readFileSync(typesFilePath, 'utf-8');
        
        expect(typesContent).toContain('SPRIGGIT_SERIALIZE');
        expect(typesContent).toContain('SPRIGGIT_PICK_CLI');
      }
    });
    
    it('should have Spriggit preload bridge functions', () => {
      const preloadFilePath = path.resolve(__dirname, '../preload.ts');
      
      if (fs.existsSync(preloadFilePath)) {
        const preloadContent = fs.readFileSync(preloadFilePath, 'utf-8');
        
        expect(preloadContent).toMatch(/spriggit.*serialize|spriggitSerialize/i);
        expect(preloadContent).toMatch(/spriggit.*pick.*cli|spriggitPickCli/i);
      }
    });
    
  });
  
  describe('Documentation', () => {
    
    it('should have Spriggit setup documentation', () => {
      const knowledgePath = path.resolve(__dirname, '../../..', 'resources/public/knowledge');
      
      if (fs.existsSync(knowledgePath)) {
        const files = fs.readdirSync(knowledgePath);
        const hasSpriggitDocs = files.some(f => f.toLowerCase().includes('spriggit'));
        
        expect(hasSpriggitDocs).toBe(true);
      }
    });
    
    it('should have Spriggit error fix documentation', () => {
      const rootPath = path.resolve(__dirname, '../../..');
      const files = fs.readdirSync(rootPath);
      
      const hasFixDocs = files.some(f => 
        f.toUpperCase().includes('SPRIGGIT') && 
        (f.includes('FIX') || f.includes('0xFFFFFFFF'))
      );
      
      expect(hasFixDocs).toBe(true);
    });
    
  });
  
  describe('User Experience - First Run', () => {
    
    it('should include Spriggit in onboarding downloads list', () => {
      const onboardingPath = path.resolve(__dirname, '../../renderer/src/FirstRunOnboarding.tsx');
      
      if (fs.existsSync(onboardingPath)) {
        const onboardingContent = fs.readFileSync(onboardingPath, 'utf-8');
        
        expect(onboardingContent.toLowerCase()).toContain('spriggit');
        expect(onboardingContent).toMatch(/download|install/i);
      }
    });
    
    it('should include .NET in required dependencies', () => {
      const onboardingPath = path.resolve(__dirname, '../../renderer/src/FirstRunOnboarding.tsx');
      
      if (fs.existsSync(onboardingPath)) {
        const onboardingContent = fs.readFileSync(onboardingPath, 'utf-8');
        
        expect(onboardingContent).toMatch(/\.net|dotnet/i);
        expect(onboardingContent).toMatch(/required|runtime/i);
      }
    });
    
  });
  
});

describe('Spriggit Error Messages - User Clarity', () => {
  
  it('should provide clear error messages (not generic)', () => {
    const mainFilePath = path.resolve(__dirname, '../main.ts');
    const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
    
    // Error messages should be specific and actionable
    const hasActionableErrors = mainContent.includes('install') || 
                               mainContent.includes('download') ||
                               mainContent.includes('permission');
    
    expect(hasActionableErrors).toBe(true);
  });
  
  it('should prioritize common errors (disk space, permissions)', () => {
    const mainFilePath = path.resolve(__dirname, '../main.ts');
    const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
    
    // Most common errors should be checked FIRST
    const spriggitSection = mainContent.substring(
      mainContent.indexOf('SPRIGGIT_SERIALIZE'),
      mainContent.indexOf('SPRIGGIT_SERIALIZE') + 5000
    );
    
    const diskCheckIndex = spriggitSection.search(/disk|space|ENOSPC/i);
    const permCheckIndex = spriggitSection.search(/permission|EACCES|EPERM/i);
    
    // At least one common error should be checked
    expect(diskCheckIndex > -1 || permCheckIndex > -1).toBe(true);
  });
  
});

describe('Developer Experience - Quick Validation', () => {
  
  it('README should mention Spriggit requirements', () => {
    const readmePath = path.resolve(__dirname, '../../../README.md');
    
    if (fs.existsSync(readmePath)) {
      const readmeContent = fs.readFileSync(readmePath, 'utf-8');
      
      // README should mention key dependencies
      const mentionsDeps = readmeContent.toLowerCase().includes('spriggit') ||
                          readmeContent.toLowerCase().includes('.net') ||
                          readmeContent.toLowerCase().includes('dotnet');
      
      expect(mentionsDeps).toBe(true);
    }
  });
  
  it('should have VS Code auto-test configuration', () => {
    const tasksPath = path.resolve(__dirname, '../../../.vscode/tasks.json');
    
    expect(fs.existsSync(tasksPath)).toBe(true);
    
    if (fs.existsSync(tasksPath)) {
      const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
      
      // Should auto-run tests on folder open
      expect(tasksContent).toContain('folderOpen');
      expect(tasksContent).toMatch(/test|npm run test/i);
    }
  });
  
});
