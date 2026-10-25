"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createEmptyCoverLetter,
  createEmptyDocument,
  createDefaultSettings,
  sanitizeCoverLetter,
  sanitizeDocument,
  STORAGE_KEYS,
  type CoverLetter,
  type ResumeDocument,
  type ResumeSettings,
  type SectionId,
} from "@/lib/schema";

const HISTORY_LIMIT = 100;

interface ResumeState {
  document: ResumeDocument;
  settings: ResumeSettings;
  jobDescription: string;
  /**
   * Kept outside `document` and outside the undo/redo history: letters are
   * regenerated rather than painstakingly hand-edited, and including them in
   * history would double the size of every entry.
   */
  coverLetter: CoverLetter;
  past: ResumeDocument[];
  future: ResumeDocument[];
  importedAt: number | null;
  hydrated: boolean;
  // document actions
  updateDocument: (updater: (draft: ResumeDocument) => ResumeDocument) => void;
  replaceDocument: (doc: ResumeDocument, opts?: { markImport?: boolean }) => void;
  undo: () => void;
  redo: () => void;
  // settings actions
  updateSettings: (patch: Partial<ResumeSettings>) => void;
  replaceSettings: (settings: ResumeSettings) => void;
  // job description
  setJobDescription: (text: string) => void;
  // cover letter
  setCoverLetter: (letter: CoverLetter) => void;
  updateCoverLetter: (patch: Partial<CoverLetter>) => void;
  // sections
  toggleSectionVisibility: (id: SectionId, visible: boolean) => void;
  reorderSections: (order: SectionId[]) => void;
  setHydrated: (v: boolean) => void;
}

function pushHistory(past: ResumeDocument[], doc: ResumeDocument): ResumeDocument[] {
  const next = [...past, doc];
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
}

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      document: createEmptyDocument(),
      settings: createDefaultSettings(),
      jobDescription: "",
      coverLetter: createEmptyCoverLetter(),
      past: [],
      future: [],
      importedAt: null,
      hydrated: false,

      updateDocument: (updater) => {
        const { document, past } = get();
        const next = updater(structuredClone(document));
        set({
          document: next,
          past: pushHistory(past, document),
          future: [],
        });
      },

      replaceDocument: (doc, opts) => {
        const { document, past } = get();
        set({
          document: sanitizeDocument(doc),
          past: pushHistory(past, document),
          future: [],
          importedAt: opts?.markImport ? Date.now() : get().importedAt,
        });
      },

      undo: () => {
        const { past, future, document } = get();
        if (!past.length) return;
        const prev = past[past.length - 1];
        set({
          document: prev,
          past: past.slice(0, -1),
          future: [document, ...future].slice(0, HISTORY_LIMIT),
        });
      },

      redo: () => {
        const { past, future, document } = get();
        if (!future.length) return;
        const next = future[0];
        set({
          document: next,
          past: pushHistory(past, document),
          future: future.slice(1),
        });
      },

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      replaceSettings: (settings) => set({ settings }),

      setJobDescription: (text) => set({ jobDescription: text }),

      setCoverLetter: (letter) => set({ coverLetter: sanitizeCoverLetter(letter) }),

      updateCoverLetter: (patch) =>
        set((s) => ({ coverLetter: sanitizeCoverLetter({ ...s.coverLetter, ...patch }) })),

      toggleSectionVisibility: (id, visible) =>
        set((s) => ({
          document: {
            ...s.document,
            sectionVisibility: { ...s.document.sectionVisibility, [id]: visible },
          },
          past: pushHistory(s.past, s.document),
          future: [],
        })),

      reorderSections: (order) =>
        set((s) => ({
          document: { ...s.document, sectionOrder: order },
          past: pushHistory(s.past, s.document),
          future: [],
        })),

      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: STORAGE_KEYS.resume,
      partialize: (state) => ({
        document: state.document,
        settings: state.settings,
        jobDescription: state.jobDescription,
        coverLetter: state.coverLetter,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ResumeState>;
        return {
          ...current,
          document: sanitizeDocument(p.document),
          settings:
            p.settings && p.settings.templateId ? p.settings : current.settings,
          jobDescription: typeof p.jobDescription === "string" ? p.jobDescription : "",
          // A payload saved before letters existed must hydrate to a usable
          // empty letter, never `undefined`.
          coverLetter: p.coverLetter
            ? sanitizeCoverLetter(p.coverLetter)
            : createEmptyCoverLetter(),
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
