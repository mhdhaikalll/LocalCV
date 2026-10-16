"use client";

import { Text, Textarea } from "@mantine/core";
import { useResumeStore } from "@/lib/store/resume-store";

export function SummaryForm() {
  const summary = useResumeStore((s) => s.document.summary);
  const updateDocument = useResumeStore((s) => s.updateDocument);

  return (
    <div>
      <Textarea
        label="Professional summary"
        placeholder="2–4 sentences summarizing your experience and strengths."
        minRows={5}
        autosize
        value={summary}
        onChange={(e) =>
          updateDocument((draft) => ({ ...draft, summary: e.target.value }))
        }
      />
      <Text size="xs" c="dimmed" mt={4}>
        Tip: mirror key terms from the job description you are targeting.
      </Text>
    </div>
  );
}
