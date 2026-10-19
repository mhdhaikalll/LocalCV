"use client";

import { useResumeStore } from "@/lib/store/resume-store";
import { CommaListInput } from "./CommaListInput";

export function ListForm({
  field,
  label,
  placeholder,
}: {
  field: "languages" | "interests";
  label: string;
  placeholder: string;
}) {
  const value = useResumeStore((s) => s.document[field]);
  const updateDocument = useResumeStore((s) => s.updateDocument);

  return (
    <CommaListInput
      label={`${label} (comma-separated)`}
      placeholder={placeholder}
      value={value}
      onChange={(items) =>
        updateDocument((draft) => {
          draft[field] = items;
          return draft;
        })
      }
    />
  );
}

export function LanguagesForm() {
  return <ListForm field="languages" label="Languages" placeholder="English (native), Spanish (fluent)" />;
}

export function InterestsForm() {
  return <ListForm field="interests" label="Interests" placeholder="Open source, hiking, chess" />;
}
