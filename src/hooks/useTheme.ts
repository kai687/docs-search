import { useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "docs-search-theme";
const THEME_TRANSITION_CLASS = "theme-animating";

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === "light" || value === "dark";

const getSystemTheme = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const getStoredThemeMode = (): ThemeMode | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeMode(storedValue) ? storedValue : null;
};

export function useTheme() {
  const [storedThemeMode, setStoredThemeMode] = useState<ThemeMode | null>(getStoredThemeMode);

  const resolvedTheme = useMemo<ThemeMode>(() => {
    return storedThemeMode ?? getSystemTheme();
  }, [storedThemeMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(THEME_TRANSITION_CLASS);

    const timer = window.setTimeout(() => {
      root.classList.remove(THEME_TRANSITION_CLASS);
    }, 300);

    return () => {
      window.clearTimeout(timer);
      root.classList.remove(THEME_TRANSITION_CLASS);
    };
  }, [resolvedTheme]);

  useEffect(() => {
    if (storedThemeMode) {
      window.localStorage.setItem(THEME_STORAGE_KEY, storedThemeMode);
      return;
    }

    window.localStorage.removeItem(THEME_STORAGE_KEY);
  }, [storedThemeMode]);

  return {
    themeMode: resolvedTheme,
    setThemeMode: setStoredThemeMode,
  };
}
