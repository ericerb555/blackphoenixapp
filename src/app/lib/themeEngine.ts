/**
 * Theme Engine
 * Manages dynamic theming and styling
 */

export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
  };
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };
  spacing: {
    unit: number;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

/**
 * Default theme configuration
 */
export const defaultTheme: Theme = {
  id: 'default',
  name: 'Default Theme',
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#10B981',
    background: '#FFFFFF',
    foreground: '#0F172A',
    muted: '#F1F5F9',
    border: '#E2E8F0',
  },
  fonts: {
    heading: 'system-ui, -apple-system, sans-serif',
    body: 'system-ui, -apple-system, sans-serif',
    mono: 'ui-monospace, monospace',
  },
  spacing: {
    unit: 4,
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
};

/**
 * Load theme configuration
 */
export function loadTheme(themeId: string = 'default'): Theme {
  // In a real app, this would fetch from database or localStorage
  // For now, return default theme
  return defaultTheme;
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  // Apply CSS custom properties
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  Object.entries(theme.fonts).forEach(([key, value]) => {
    root.style.setProperty(`--font-${key}`, value);
  });

  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });

  root.style.setProperty('--spacing-unit', `${theme.spacing.unit}px`);
}

/**
 * Get current theme
 */
export function getCurrentTheme(): Theme {
  // For now, always return default theme
  return defaultTheme;
}

/**
 * Initialize theme engine
 */
export function initializeThemeEngine(themeId: string = 'default'): void {
  const theme = loadTheme(themeId);
  applyTheme(theme);
}

/**
 * Load and apply active theme (alias for initializeThemeEngine)
 */
export function loadActiveTheme(themeId: string = 'default'): void {
  initializeThemeEngine(themeId);
}

export default {
  loadTheme,
  applyTheme,
  getCurrentTheme,
  initializeThemeEngine,
  loadActiveTheme,
  defaultTheme,
};