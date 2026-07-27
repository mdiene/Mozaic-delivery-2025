import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../services/db';

export type ColorTheme = 'default' | 'orange' | 'amber' | 'green' | 'blue';

export interface ThemeOption {
  id: ColorTheme;
  name: string;
  color: string;
}

export const COLOR_THEMES: ThemeOption[] = [
  { id: 'default', name: 'Default', color: '#6f42c1' },
  { id: 'orange', name: 'Orange', color: '#f97316' },
  { id: 'amber', name: 'Amber', color: '#f59e0b' },
  { id: 'green', name: 'Green', color: '#16a34a' },
  { id: 'blue', name: 'Blue', color: '#2563eb' },
];

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  colorTheme: ColorTheme;
  setColorTheme: (colorTheme: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('app-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('app-color-theme') as ColorTheme;
    if (['default', 'orange', 'amber', 'green', 'blue'].includes(saved)) {
      return saved;
    }
    return 'default';
  });

  // Check user_preferences table on page load or when user becomes available
  useEffect(() => {
    if (!user?.email) return;

    let isMounted = true;
    db.getUserPreferences(user.email).then((prefs) => {
      if (!isMounted || !prefs) return;

      // 1. Check theme_name ('Light' or 'Dark') or fallback theme_mode
      let loadedMode: ThemeMode | null = null;
      if (prefs.theme_name) {
        const lower = prefs.theme_name.toLowerCase();
        if (lower === 'light' || lower === 'dark') {
          loadedMode = lower as ThemeMode;
        }
      } else if (prefs.theme_mode) {
        if (prefs.theme_mode === 'light' || prefs.theme_mode === 'dark') {
          loadedMode = prefs.theme_mode;
        }
      }

      if (loadedMode) {
        setThemeState(loadedMode);
      }

      // 2. Check theme_color ('Default', 'Orange', 'Amber', 'Green', 'Blue')
      if (prefs.theme_color) {
        const matchedTheme = COLOR_THEMES.find(
          (t) =>
            t.name.toLowerCase() === prefs.theme_color?.toLowerCase() ||
            t.id === prefs.theme_color?.toLowerCase()
        );
        if (matchedTheme) {
          setColorThemeState(matchedTheme.id);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user?.email]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('theme-orange', 'theme-amber', 'theme-green', 'theme-blue');
    if (colorTheme !== 'default') {
      root.classList.add(`theme-${colorTheme}`);
    }
    localStorage.setItem('app-color-theme', colorTheme);
  }, [colorTheme]);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setThemeState(nextTheme);

    if (user?.email) {
      const themeName = nextTheme === 'light' ? 'Light' : 'Dark';
      db.saveUserPreferences(user.email, {
        theme_name: themeName,
        theme_mode: nextTheme,
      });
    }
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);

    if (user?.email) {
      const themeName = newTheme === 'light' ? 'Light' : 'Dark';
      db.saveUserPreferences(user.email, {
        theme_name: themeName,
        theme_mode: newTheme,
      });
    }
  };

  const setColorTheme = (newColorTheme: ColorTheme) => {
    setColorThemeState(newColorTheme);

    const targetThemeOption = COLOR_THEMES.find((t) => t.id === newColorTheme);
    const themeName = targetThemeOption ? targetThemeOption.name : 'Default';

    if (user?.email) {
      db.saveUserPreferences(user.email, {
        theme_color: themeName,
      });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
