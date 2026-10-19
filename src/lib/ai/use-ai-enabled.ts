"use client";

import { useEffect, useState } from "react";

let cached: Promise<boolean> | null = null;

function loadAiEnabled(): Promise<boolean> {
  cached ??= fetch("/api/ai/status", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : { enabled: false }))
    .then((data: { enabled?: unknown }) => data.enabled === true)
    .catch(() => false);
  return cached;
}

/**
 * Mirrors the server's AI_ENABLED flag. Starts disabled (fail closed) and
 * enables once the status route confirms AI is turned on.
 */
export function useAiEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    void loadAiEnabled().then((value) => {
      if (active) setEnabled(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return enabled;
}
