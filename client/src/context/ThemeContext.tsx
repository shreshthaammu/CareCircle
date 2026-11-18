import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'high-contrast';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleHighContrast: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return (window.localStorage.getItem('carecircle_theme') as Theme) || 'light';
      }
    } catch {
      // Fallback
    }
    return 'light';
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('carecircle_theme', theme);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('theme-dark', 'theme-high-contrast', 'dark');

        if (theme === 'dark') {
          document.documentElement.classList.add('dark', 'theme-dark');
        } else if (theme === 'high-contrast') {
          document.documentElement.classList.add('theme-high-contrast');
        }
      }
    } catch {
      // Fallback
    }
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  const toggleHighContrast = () => {
    setThemeState(prev => (prev === 'high-contrast' ? 'light' : 'high-contrast'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleHighContrast }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
