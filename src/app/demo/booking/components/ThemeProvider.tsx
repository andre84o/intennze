'use client';

import { useEffect, useState } from 'react';
import { storage } from '../lib/storage';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const applyTheme = () => {
      const settings = storage.getSettings();
      const theme = settings.theme;

      // Ensure classList logic is robust
      const root = document.documentElement;
      
      const enableDark = 
        theme === 'dark' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (enableDark) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark'); // extra attribute for safety
      } else {
        root.classList.remove('dark');
        root.removeAttribute('data-theme');
      }
    };

    // Apply theme on mount
    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const settings = storage.getSettings();
      if (settings.theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    // Listen for localStorage changes (when settings are updated)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'settings') {
        applyTheme();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event when settings change in the same window
    const handleSettingsChange = () => {
      applyTheme();
    };
    window.addEventListener('settingsChanged', handleSettingsChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settingsChanged', handleSettingsChange);
    };
  }, []);

  // Prevent flash of unstyled content
  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}
