'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type UiTheme = 'midnight' | 'paper';

interface ThemeContextType {
  theme: UiTheme;
  setTheme: (theme: UiTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'midnight',
  setTheme: () => {},
  toggleTheme: () => {},
});

const THEME_STORAGE_KEY = 'cloud_reader_ui_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<UiTheme>('midnight');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as UiTheme | null;
    if (saved && (saved === 'midnight' || saved === 'paper')) {
      setThemeState(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      document.documentElement.setAttribute('data-theme', 'midnight');
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: UiTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const toggleTheme = () => {
    const next = theme === 'midnight' ? 'paper' : 'midnight';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <div className={`min-h-screen transition-colors duration-300 ${theme === 'paper' ? 'theme-paper' : 'theme-midnight'}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useUiTheme() {
  return useContext(ThemeContext);
}
