"use client";

import { useEffect } from "react";
import { PAGE_SIZES } from "@/lib/templates/style-context";
import type { ResumeSettings } from "@/lib/schema";

const STYLE_ID = "resume-print-page-style";

/**
 * Print page margins must be declared on `@page`, not on the element: element
 * padding only applies to the first printed page, which is exactly why page two
 * used to start flush against the paper edge.
 *
 * The margin comes from the user's settings, so it cannot live in the static
 * stylesheet; this keeps a single `<style>` element in sync instead of
 * re-rendering the document tree.
 */
export function usePrintPageStyle(settings: Pick<ResumeSettings, "pageSize" | "margins">) {
  useEffect(() => {
    const page = PAGE_SIZES[settings.pageSize];
    const rule = [
      `@page {`,
      `  size: ${page.width} ${page.height};`,
      `  margin: ${settings.margins}pt;`,
      `}`,
    ].join("\n");

    let element = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!element) {
      element = document.createElement("style");
      element.id = STYLE_ID;
      document.head.appendChild(element);
    }
    element.textContent = rule;
  }, [settings.pageSize, settings.margins]);
}
