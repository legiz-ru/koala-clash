import { listen, UnlistenFn, EventCallback } from "@tauri-apps/api/event";
import { event } from "@tauri-apps/api";
import { useRef } from "react";

export const useListen = () => {
  const unlistenFns = useRef<UnlistenFn[]>([]);

  const addListener = async <T>(
    eventName: string,
    handler: EventCallback<T>,
  ) => {
    const unlisten = await listen(eventName, handler);
    unlistenFns.current.push(unlisten);
    return unlisten;
  };
  const removeAllListeners = () => {
    unlistenFns.current.forEach((unlisten) => unlisten());
    unlistenFns.current = [];
  };

  const setupCloseListener = async function () {
    // Do not clear listeners on close-requested (we hide to tray). Clean up only when window is destroyed.
    await event.once("tauri://destroyed", async () => {
      removeAllListeners();
    });
  };

  return {
    addListener,
    setupCloseListener,
  };
};
