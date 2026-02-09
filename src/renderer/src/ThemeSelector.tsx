import React, { useState, useEffect } from 'react';
import { themeService, ThemeName, Theme } from './ThemeService';
import { Palette, Check } from 'lucide-react';

/**
 * ThemeSelector Component
 * 
 * Allows users to switch between 5 theme presets
 * Shows theme preview colors
 * Persists selection to localStorage
 */
export const ThemeSelector: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(themeService.getCurrentTheme());
  const [isOpen, setIsOpen] = useState(false);
  
  const themes = themeService.getAllThemes();

  useEffect(() => {
    // Subscribe to theme changes
    const unsubscribe = themeService.subscribe((theme) => {
      setCurrentTheme(theme);
    });
    
    return unsubscribe;
  }, []);

  const handleThemeSelect = (themeName: ThemeName) => {
    themeService.setTheme(themeName);
    setIsOpen(false);
  };

  const currentThemeObj = themeService.getTheme(currentTheme);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Theme Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--theme-bg-secondary, rgba(17, 24, 39, 0.8))',
          border: '1px solid var(--theme-border-secondary, rgba(16, 185, 129, 0.3))',
          borderRadius: '8px',
          color: 'var(--theme-text-primary, #10b981)',
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--theme-primary, #10b981)';
          e.currentTarget.style.background = 'var(--theme-bg-tertiary, rgba(26, 31, 26, 0.9))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--theme-border-secondary, rgba(16, 185, 129, 0.3))';
          e.currentTarget.style.background = 'var(--theme-bg-secondary, rgba(17, 24, 39, 0.8))';
        }}
        title="Change theme"
      >
        <Palette size={16} />
        <span>{currentThemeObj.displayName}</span>
      </button>

      {/* Theme Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />
          
          {/* Theme List */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: 'var(--theme-bg-secondary, rgba(17, 24, 39, 0.95))',
              border: '1px solid var(--theme-border-primary, #10b981)',
              borderRadius: '12px',
              padding: '8px',
              minWidth: '280px',
              boxShadow: '0 0 20px var(--theme-border-secondary, rgba(16, 185, 129, 0.3))',
              zIndex: 1000,
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                color: 'var(--theme-text-tertiary, #9ca3af)',
                fontWeight: 'bold',
                borderBottom: '1px solid var(--theme-border-secondary, rgba(16, 185, 129, 0.2))',
                marginBottom: '4px',
              }}
            >
              CHOOSE THEME
            </div>
            
            {themes.map((theme) => (
              <button
                key={theme.name}
                onClick={() => handleThemeSelect(theme.name)}
                style={{
                  width: '100%',
                  padding: '12px',
                  margin: '4px 0',
                  background: currentTheme === theme.name 
                    ? 'var(--theme-bg-tertiary, rgba(26, 31, 26, 0.9))'
                    : 'transparent',
                  border: '1px solid',
                  borderColor: currentTheme === theme.name
                    ? 'var(--theme-primary, #10b981)'
                    : 'transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
                onMouseEnter={(e) => {
                  if (currentTheme !== theme.name) {
                    e.currentTarget.style.background = 'var(--theme-bg-tertiary, rgba(26, 31, 26, 0.5))';
                    e.currentTarget.style.borderColor = 'var(--theme-border-secondary, rgba(16, 185, 129, 0.3))';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentTheme !== theme.name) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
              >
                {/* Color Preview */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
                    border: '2px solid',
                    borderColor: theme.colors.primary,
                    flexShrink: 0,
                  }}
                />
                
                {/* Theme Info */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: 'var(--theme-text-primary, #10b981)',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      marginBottom: '2px',
                    }}
                  >
                    {theme.displayName}
                  </div>
                  <div
                    style={{
                      color: 'var(--theme-text-tertiary, #9ca3af)',
                      fontSize: '12px',
                    }}
                  >
                    {theme.description}
                  </div>
                </div>
                
                {/* Check Mark */}
                {currentTheme === theme.name && (
                  <Check
                    size={20}
                    style={{
                      color: 'var(--theme-primary, #10b981)',
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            ))}
            
            <div
              style={{
                padding: '8px 12px',
                fontSize: '11px',
                color: 'var(--theme-text-tertiary, #9ca3af)',
                borderTop: '1px solid var(--theme-border-secondary, rgba(16, 185, 129, 0.2))',
                marginTop: '4px',
                textAlign: 'center',
              }}
            >
              Theme applies instantly across the app
            </div>
          </div>
        </>
      )}
    </div>
  );
};
