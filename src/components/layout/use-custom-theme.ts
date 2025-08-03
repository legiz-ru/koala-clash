import { useEffect, useMemo, useState } from "react";
import { useSetThemeMode, useThemeMode } from "@/services/states";
import { useVerge } from "@/hooks/use-verge";
import { getCurrentWebviewWindow, WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Theme } from "@tauri-apps/api/window";

export const useCustomTheme = () => {
  const appWindow: WebviewWindow = useMemo(() => getCurrentWebviewWindow(), []);
  const { verge } = useVerge();
  const { theme_mode } = verge ?? {};

  const mode = useThemeMode();
  const setMode = useSetThemeMode();

  const [systemTheme, setSystemTheme] = useState(
      () => window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  useEffect(() => {
    setMode(
        theme_mode === "light" || theme_mode === "dark" ? theme_mode : "system",
    );
  }, [theme_mode, setMode]);

  useEffect(() => {
    if (mode !== 'system') return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    const activeTheme = mode === "system" ? systemTheme : mode;
    root.classList.remove("light", "dark");
    root.classList.add(activeTheme);

    if (theme_mode === "system") {
      appWindow.setTheme(null).catch(console.error);
    } else {
      appWindow.setTheme(activeTheme as Theme).catch(console.error);
    }

  }, [mode, systemTheme, appWindow, theme_mode]);

  return {};
};