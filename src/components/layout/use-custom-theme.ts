import { useEffect, useMemo } from "react";
import { useSetThemeMode, useThemeMode } from "@/services/states";
import { useVerge } from "@/hooks/use-verge";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Theme } from "@tauri-apps/api/window";

export const useCustomTheme = () => {
  const appWindow = useMemo(() => getCurrentWebviewWindow(), []);
  const { verge } = useVerge();
  const { theme_mode } = verge ?? {};

  const mode = useThemeMode();
  const setMode = useSetThemeMode();

  useEffect(() => {
    setMode(theme_mode === "light" || theme_mode === "dark" ? theme_mode : "system");
  }, [theme_mode, setMode]);

  useEffect(() => {
    const root = document.documentElement;

    const activeTheme = mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : mode;

    root.classList.remove("light", "dark");
    root.classList.add(activeTheme);
    appWindow.setTheme(activeTheme as Theme).catch(console.error);

  }, [mode, appWindow]);

  useEffect(() => {
    if (theme_mode !== "system") return;
    const unlistenPromise = appWindow.onThemeChanged(({ payload }) => {
      setMode(payload);
    });
    return () => { unlistenPromise.then(f => f()); };
  }, [theme_mode, appWindow, setMode]);

  return {};
};
