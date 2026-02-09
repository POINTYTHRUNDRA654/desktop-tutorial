/**
 * ThemeService
 * 
 * Manages application themes with 5 preset options
 * Persists theme choice to localStorage
 * Applies CSS custom properties for theming
 */

export type ThemeName = 'pipboy' | 'dark' | 'light' | 'fallout' | 'neon';

export interface Theme {
  name: ThemeName;
  displayName: string;
  description: string;
  colors: {
    // Primary colors
    primary: string;
    primaryDark: string;
    primaryLight: string;
    
    // Background colors
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    
    // Text colors
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    
    // Border colors
    borderPrimary: string;
    borderSecondary: string;
    
    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Accent colors
    accent: string;
    accentHover: string;
  };
}

export const themes: Record<ThemeName, Theme> = {
  pipboy: {
    name: 'pipboy',
    displayName: 'Pip-Boy',
    description: 'Classic Fallout terminal green',
    colors: {
      primary: '#10b981',
      primaryDark: '#059669',
      primaryLight: '#34d399',
      bgPrimary: '#0a0e0a',
      bgSecondary: '#111511',
      bgTertiary: '#1a1f1a',
      textPrimary: '#10b981',
      textSecondary: '#6ee7b7',
      textTertiary: '#9ca3af',
      borderPrimary: '#10b981',
      borderSecondary: 'rgba(16, 185, 129, 0.3)',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      accent: '#10b981',
      accentHover: '#059669',
    },
  },
  
  dark: {
    name: 'dark',
    displayName: 'Dark Mode',
    description: 'Modern dark theme with blue accents',
    colors: {
      primary: '#3b82f6',
      primaryDark: '#2563eb',
      primaryLight: '#60a5fa',
      bgPrimary: '#0f172a',
      bgSecondary: '#1e293b',
      bgTertiary: '#334155',
      textPrimary: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textTertiary: '#94a3b8',
      borderPrimary: '#3b82f6',
      borderSecondary: 'rgba(59, 130, 246, 0.3)',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      accent: '#3b82f6',
      accentHover: '#2563eb',
    },
  },
  
  light: {
    name: 'light',
    displayName: 'Light Mode',
    description: 'Clean light theme with indigo accents',
    colors: {
      primary: '#6366f1',
      primaryDark: '#4f46e5',
      primaryLight: '#818cf8',
      bgPrimary: '#ffffff',
      bgSecondary: '#f9fafb',
      bgTertiary: '#f3f4f6',
      textPrimary: '#111827',
      textSecondary: '#374151',
      textTertiary: '#6b7280',
      borderPrimary: '#6366f1',
      borderSecondary: 'rgba(99, 102, 241, 0.3)',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      accent: '#6366f1',
      accentHover: '#4f46e5',
    },
  },
  
  fallout: {
    name: 'fallout',
    displayName: 'Fallout Retro',
    description: 'Vintage yellow/amber post-apocalyptic',
    colors: {
      primary: '#f59e0b',
      primaryDark: '#d97706',
      primaryLight: '#fbbf24',
      bgPrimary: '#1c1410',
      bgSecondary: '#292014',
      bgTertiary: '#3d2f1f',
      textPrimary: '#f59e0b',
      textSecondary: '#fbbf24',
      textTertiary: '#9ca3af',
      borderPrimary: '#f59e0b',
      borderSecondary: 'rgba(245, 158, 11, 0.3)',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#fbbf24',
      accent: '#f59e0b',
      accentHover: '#d97706',
    },
  },
  
  neon: {
    name: 'neon',
    displayName: 'Neon Cyberpunk',
    description: 'Vibrant purple/pink cyberpunk aesthetic',
    colors: {
      primary: '#a855f7',
      primaryDark: '#9333ea',
      primaryLight: '#c084fc',
      bgPrimary: '#0c0a1d',
      bgSecondary: '#1a1625',
      bgTertiary: '#2d2440',
      textPrimary: '#a855f7',
      textSecondary: '#c084fc',
      textTertiary: '#9ca3af',
      borderPrimary: '#a855f7',
      borderSecondary: 'rgba(168, 85, 247, 0.3)',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#ec4899',
      accent: '#a855f7',
      accentHover: '#9333ea',
    },
  },
};

class ThemeService {
  private currentTheme: ThemeName = 'pipboy';
  private listeners: Set<(theme: ThemeName) => void> = new Set();

  constructor() {
    // Load saved theme from localStorage
    const saved = localStorage.getItem('mossy_theme');
    if (saved && saved in themes) {
      this.currentTheme = saved as ThemeName;
    }
    
    // Apply theme on initialization
    this.applyTheme(this.currentTheme);
  }

  /**
   * Get current theme name
   */
  getCurrentTheme(): ThemeName {
    return this.currentTheme;
  }

  /**
   * Get theme object by name
   */
  getTheme(name: ThemeName): Theme {
    return themes[name];
  }

  /**
   * Get all available themes
   */
  getAllThemes(): Theme[] {
    return Object.values(themes);
  }

  /**
   * Set and apply a new theme
   */
  setTheme(name: ThemeName): void {
    if (!(name in themes)) {
      console.error(`Theme "${name}" not found`);
      return;
    }

    this.currentTheme = name;
    localStorage.setItem('mossy_theme', name);
    this.applyTheme(name);
    
    // Notify listeners
    this.listeners.forEach(listener => listener(name));
  }

  /**
   * Apply theme by setting CSS custom properties
   */
  private applyTheme(name: ThemeName): void {
    const theme = themes[name];
    const root = document.documentElement;

    // Apply all color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVar = `--theme-${this.camelToKebab(key)}`;
      root.style.setProperty(cssVar, value);
    });

    // Add theme class to body for additional styling
    document.body.classList.remove(...Object.keys(themes).map(t => `theme-${t}`));
    document.body.classList.add(`theme-${name}`);
    
    console.log(`[ThemeService] Applied theme: ${theme.displayName}`);
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(listener: (theme: ThemeName) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Convert camelCase to kebab-case
   */
  private camelToKebab(str: string): string {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  }
}

export const themeService = new ThemeService();
