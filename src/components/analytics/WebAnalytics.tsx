"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SCRIPT_ID = "cloudflare-web-analytics";

/**
 * Loads the Cloudflare Web Analytics beacon only after hydration and never
 * inside the editor. Keeping the script out of SSR output avoids hydration
 * mismatches, and skipping /resume keeps third-party JS away from the
 * performance-sensitive live preview.
 *
 * The beacon is loaded without SPA mode, so client-side navigation away from
 * the landing page does not emit additional page views.
 */
export function WebAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!pathname || pathname.startsWith("/resume")) return;

    const token = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;
    if (!token || document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.defer = true;
    script.src = "https://static.cloudflareinsights.com/beacon.min.js";
    script.dataset.cfBeacon = JSON.stringify({ token });
    document.body.appendChild(script);
  }, [pathname]);

  return null;
}
