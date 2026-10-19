"use client";

import { useEffect, useRef } from "react";
import type { DriveStep, Driver } from "driver.js";
import "driver.js/dist/driver.css";

/** Kept outside the resume store so the flag never enters JSON backups. */
const TOUR_KEY = "rm.tour.v1";

const DESKTOP_STEPS: DriveStep[] = [
  {
    element: '[data-tour="form"]',
    popover: {
      title: "Start with the basics",
      description:
        "Fill in Contact first, then work down each section. Everything saves automatically in this browser.",
    },
  },
  {
    element: '[data-tour="preview"]',
    popover: {
      title: "Live preview",
      description:
        "Your resume updates as you type, and this preview is exactly what prints to PDF.",
    },
  },
  {
    element: '[data-tour="ats"]',
    popover: {
      title: "ATS score",
      description:
        "A deterministic 0–100 score built from 40+ checks. Add a job description in the panel for keyword matching.",
    },
  },
  {
    element: '[data-tour="template"]',
    popover: {
      title: "Pick a template",
      description:
        "Open Template to choose from 12 pre-built ATS-safe templates, then adjust font, color, spacing, and section order.",
    },
  },
  {
    element: '[data-tour="header"]',
    popover: {
      title: "Import and export",
      description:
        "Bring in a PDF, DOCX, or JSON backup, or export your finished resume as a PDF.",
    },
  },
];

/**
 * Mobile shows one pane at a time, so the preview step is replaced by the tab
 * switcher that reveals it.
 */
const MOBILE_STEPS: DriveStep[] = [
  {
    element: '[data-tour="mobile-tabs"]',
    popover: {
      title: "Edit or preview",
      description: "Switch tabs to move between the form and the live preview.",
    },
  },
  {
    element: '[data-tour="form"]',
    popover: {
      title: "Start with the basics",
      description:
        "Fill in Contact first, then work down each section. Everything saves automatically in this browser.",
    },
  },
  {
    element: '[data-tour="ats"]',
    popover: {
      title: "ATS score",
      description:
        "Tap the badge to see a deterministic 0–100 score built from 40+ parser checks.",
    },
  },
  {
    element: '[data-tour="template"]',
    popover: {
      title: "Pick a template",
      description:
        "Open this menu and choose Template to pick from 12 pre-built ATS-safe templates, then export as PDF.",
    },
  },
];

interface EditorTourProps {
  /** True after the store hydrates and no drawer is open. */
  enabled: boolean;
  /** An empty resume means this visitor has not started yet. */
  isEmpty: boolean;
  isMobile: boolean;
  /** Show the form tab before highlighting it on mobile. */
  onBeforeStart?: () => void;
}

/**
 * One-time product tour for the editor.
 *
 * Runs only when the store has hydrated, the resume is untouched, the tour has
 * not been seen, and no drawer covers the layout. Every failure path is silent
 * so a broken tour can never block editing.
 */
export function EditorTour({ enabled, isEmpty, isMobile, onBeforeStart }: EditorTourProps) {
  const driverRef = useRef<Driver | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      driverRef.current?.destroy();
      driverRef.current = null;
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    const timers: number[] = [];

    const start = async () => {
      const force = new URLSearchParams(window.location.search).get("tour") === "1";
      if (!force && !isEmpty) return;

      let seen = true;
      try {
        seen = window.localStorage.getItem(TOUR_KEY) !== null;
      } catch {
        // Storage can be blocked in private modes; fail closed rather than
        // showing the tour on every visit.
      }
      if (!force && seen) return;

      onBeforeStart?.();
      // Let a mobile tab switch paint before driver measures the elements.
      await new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, 150));
      });
      if (cancelled) return;

      try {
        const { driver } = await import("driver.js");
        if (cancelled) return;

        const d = driver({
          steps: isMobile ? MOBILE_STEPS : DESKTOP_STEPS,
          animate: true,
          smoothScroll: true,
          allowClose: true,
          allowScroll: true,
          overlayClickBehavior: "none",
          skipMissingElement: true,
          stagePadding: 6,
          stageRadius: 8,
          showProgress: true,
          progressText: "{{current}} of {{total}}",
          nextBtnText: "Next",
          prevBtnText: "Back",
          doneBtnText: "Got it",
          onDestroyed: (_element, _step, opts) => {
            driverRef.current = null;
            // Only remember a tour the visitor actually finished or dismissed.
            // Programmatic destroys (unmount, resize) leave it available.
            if (opts.reason !== "done" && opts.reason !== "close" && opts.reason !== "escape") {
              return;
            }
            try {
              window.localStorage.setItem(TOUR_KEY, "1");
            } catch {
              // Ignore storage failures.
            }
          },
        });

        driverRef.current = d;
        d.drive();
      } catch {
        // A failed tour must never affect editing.
      }
    };

    void start();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      // Unmount (or StrictMode remount) must not leave an overlay behind.
      driverRef.current?.destroy();
      driverRef.current = null;
      startedRef.current = false;
    };
    // Re-runs only when hydration/layout readiness flips; props are read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    // A breakpoint change rebuilds the DOM the tour is pointing at.
    if (!driverRef.current) return;
    driverRef.current.destroy();
    driverRef.current = null;
    startedRef.current = false;
  }, [isMobile]);

  return null;
}
