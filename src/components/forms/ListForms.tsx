"use client";

import { TextInput } from "@mantine/core";
import { useResumeStore } from "@/lib/store/resume-store";

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
    <TextInput
      label={`${label} (comma-separated)`}
      placeholder={placeholder}
      value={value.join(", ")}
      onChange={(e) =>
        updateDocument((draft) => {
          draft[field] = e.target.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
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
