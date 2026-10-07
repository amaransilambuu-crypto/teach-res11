import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { InstitutionTheme } from '../types.ts';
import { api } from '../services/api.ts';
import { isDarkColor, getContrastTextColor, hexToRgba } from '../utils/color.ts';

const LOCAL_STORAGE_THEME_KEY = 'trh_institution_theme_v1';

export const DEFAULT_INSTITUTION_THEME: InstitutionTheme = {
  school_id: 'pannaipuram_high',
  school_name: 'Govt Hr Sec School, Pannaipuram',
  primary_color: '#1e3a8a', // Deep Academic Navy
  accent_color: '#3b82f6',
  navbar_style: 'solid',
  sidebar_style: 'solid',
  updated_at: new Date().toISOString(),
  updated_by_name: 'School System Default',
};

export type SettingsModalTab = 'theme' | 'profile' | 'security' | 'devices';

interface ThemeContextType {
  theme: InstitutionTheme;
  isDarkBrand: boolean;
  contrastTextColor: string;
  brandColor: string;
  schoolName: string;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  // Modal controls
  isSettingsModalOpen: boolean;
  settingsModalTab: SettingsModalTab;
  openSettingsModal: (tab?: SettingsModalTab) => void;
  closeSettingsModal: () => void;
  // Operations
  updateTheme: (updates: Partial<InstitutionTheme>) => Promise<InstitutionTheme>;
  setPrimaryColor: (color: string) => Promise<InstitutionTheme>;
  setSchoolName: (name: string) => Promise<InstitutionTheme>;
  resetTheme: () => Promise<InstitutionTheme>;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize with cached theme or default to eliminate layout flash
  const [theme, setTheme] = useState<InstitutionTheme>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.primary_color) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_INSTITUTION_THEME;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SettingsModal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState<SettingsModalTab>('theme');

  const openSettingsModal = useCallback((tab: SettingsModalTab = 'theme') => {
    setSettingsModalTab(tab);
    setIsSettingsModalOpen(true);
  }, []);

  const closeSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);

  // Apply CSS custom properties to document root for global styling
  const applyCssVariables = useCallback((currentTheme: InstitutionTheme) => {
    const root = document.documentElement;
    const isDark = isDarkColor(currentTheme.primary_color);
    const contrastText = isDark ? '#ffffff' : '#0f172a';

    root.style.setProperty('--school-primary', currentTheme.primary_color);
    root.style.setProperty('--school-primary-rgb', currentTheme.primary_color);
    root.style.setProperty('--school-contrast-text', contrastText);
    root.style.setProperty('--school-primary-glass', hexToRgba(currentTheme.primary_color, 0.95));
    root.style.setProperty('--school-primary-subtle', hexToRgba(currentTheme.primary_color, 0.08));

    // Also update mobile browser theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', currentTheme.primary_color);
    }
  }, []);

  // Apply on theme change
  useEffect(() => {
    applyCssVariables(theme);
    try {
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, JSON.stringify(theme));
    } catch {
      // ignore
    }
  }, [theme, applyCssVariables]);

  // Fetch latest theme from server
  const fetchThemeFromServer = useCallback(async () => {
    try {
      const res = await api.institution.getTheme(theme.school_id);
      if (res && res.theme) {
        setTheme((prev) => {
          // Only update if changed
          if (
            prev.primary_color !== res.theme.primary_color ||
            prev.school_name !== res.theme.school_name ||
            prev.updated_at !== res.theme.updated_at
          ) {
            return res.theme;
          }
          return prev;
        });
      }
    } catch (e) {
      // Fallback is already loaded from localStorage
    }
  }, [theme.school_id]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    fetchThemeFromServer().finally(() => setIsLoading(false));
  }, [fetchThemeFromServer]);

  // Dynamic school-wide sync polling:
  // Automatically polls every 6 seconds so any update made by another teacher/admin
  // dynamically updates the navbar and sidebar for all users in that school!
  useEffect(() => {
    const interval = setInterval(() => {
      fetchThemeFromServer();
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchThemeFromServer]);

  // Update theme
  const updateTheme = useCallback(
    async (updates: Partial<InstitutionTheme>): Promise<InstitutionTheme> => {
      setIsSaving(true);
      setError(null);

      // Optimistic update for instant UI responsiveness
      const optimisticTheme: InstitutionTheme = {
        ...theme,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      setTheme(optimisticTheme);
      applyCssVariables(optimisticTheme);

      try {
        const res = await api.institution.updateTheme(updates);
        const saved = res.theme;
        setTheme(saved);
        applyCssVariables(saved);
        try {
          localStorage.setItem(LOCAL_STORAGE_THEME_KEY, JSON.stringify(saved));
        } catch {
          // ignore
        }
        return saved;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to update institution theme';
        setError(msg);
        // Persist optimistic change in local storage so user continues without blocking
        localStorage.setItem(LOCAL_STORAGE_THEME_KEY, JSON.stringify(optimisticTheme));
        return optimisticTheme;
      } finally {
        setIsSaving(false);
      }
    },
    [theme, applyCssVariables]
  );

  const setPrimaryColor = useCallback(
    async (color: string): Promise<InstitutionTheme> => {
      return updateTheme({ primary_color: color });
    },
    [updateTheme]
  );

  const setSchoolName = useCallback(
    async (name: string): Promise<InstitutionTheme> => {
      return updateTheme({ school_name: name });
    },
    [updateTheme]
  );

  const resetTheme = useCallback(async (): Promise<InstitutionTheme> => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await api.institution.resetTheme();
      const reset = res.theme;
      setTheme(reset);
      applyCssVariables(reset);
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, JSON.stringify(reset));
      return reset;
    } catch {
      setTheme(DEFAULT_INSTITUTION_THEME);
      applyCssVariables(DEFAULT_INSTITUTION_THEME);
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, JSON.stringify(DEFAULT_INSTITUTION_THEME));
      return DEFAULT_INSTITUTION_THEME;
    } finally {
      setIsSaving(false);
    }
  }, [applyCssVariables]);

  const isDarkBrand = isDarkColor(theme.primary_color);
  const contrastTextColor = getContrastTextColor(theme.primary_color);

  const value: ThemeContextType = {
    theme,
    isDarkBrand,
    contrastTextColor,
    brandColor: theme.primary_color,
    schoolName: theme.school_name,
    isLoading,
    isSaving,
    error,
    isSettingsModalOpen,
    settingsModalTab,
    openSettingsModal,
    closeSettingsModal,
    updateTheme,
    setPrimaryColor,
    setSchoolName,
    resetTheme,
    refreshTheme: fetchThemeFromServer,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useInstitutionTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useInstitutionTheme must be used within a ThemeProvider');
  }
  return context;
};
