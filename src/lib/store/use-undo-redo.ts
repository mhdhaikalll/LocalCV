"use client";

import { useEffect } from "react";
import { useResumeStore } from "./resume-store";

/** Global undo/redo keyboard shortcuts (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z). */
export function useUndoRedoShortcuts() {
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      // Allow native undo inside text inputs.
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      e.preventDefault();
      if (e.shiftKey) {
        useResumeStore.getState().redo();
      } else {
        useResumeStore.getState().undo();
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, []);
}
