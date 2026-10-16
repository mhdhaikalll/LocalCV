"use client";

import { useRef, useState } from "react";
import { Alert, Card, Center, Group, Loader, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import { parseResumeFile } from "@/lib/import/parse-resume";
import { importJson } from "@/lib/export/json";
import { useResumeStore } from "@/lib/store/resume-store";

export function ImportPanel() {
  const replaceDocument = useResumeStore((s) => s.replaceDocument);
  const replaceSettings = useResumeStore((s) => s.replaceSettings);
  const [status, setStatus] = useState<"idle" | "parsing" | "review" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setStatus("parsing");
    setMessage(null);
    setWarnings([]);
    try {
      if (file.name.toLowerCase().endsWith(".json")) {
        const result = await importJson(file);
        if (!result.ok) {
          setStatus("error");
          setMessage(result.error ?? "Import failed.");
          return;
        }
        if (result.settings) replaceSettings(result.settings);
        replaceDocument(result.document!, { markImport: true });
        setStatus("review");
        setMessage("Imported resume JSON — review sections before continuing.");
        return;
      }
      const parsed = await parseResumeFile(file);
      replaceDocument(parsed.document, { markImport: true });
      setWarnings(parsed.warnings);
      setStatus("review");
      setMessage(
        `Import detected ${parsed.extractedItems} items — review before saving. Imported content is not final until you edit and it autosaves.`,
      );
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Import failed.");
    }
  };

  return (
    <Stack gap="md">
      <Text size="xs" c="dimmed">
        Files are parsed locally in your browser — nothing is uploaded. Import is
        best-effort: a manual review step is always required. Scanned/image PDFs
        will not import meaningfully.
      </Text>

      <UnstyledButton
        onClick={() => fileRef.current?.click()}
        aria-label="Upload resume file (PDF, DOCX, or JSON export)"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        style={{ width: "100%" }}
      >
        <Card
          withBorder
          radius="md"
          padding="xl"
          style={{
            borderStyle: "dashed",
            borderWidth: 2,
            borderColor: dragOver
              ? "var(--mantine-color-brand-6)"
              : "var(--mantine-color-gray-4)",
            background: dragOver ? "var(--mantine-color-brand-0)" : undefined,
          }}
        >
          <Center>
            <Stack gap={4} align="center">
              <IconUpload size={28} color="var(--mantine-color-dimmed)" />
              <Text size="sm" c="dimmed" ta="center">
                Drop a PDF, DOCX, or LocalCV JSON file here
              </Text>
              <Text size="xs" c="dimmed">
                or click to browse
              </Text>
            </Stack>
          </Center>
        </Card>
      </UnstyledButton>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.json,application/pdf,application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {status === "parsing" && (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="xs" c="dimmed">
            Parsing…
          </Text>
        </Group>
      )}
      {message && (
        <Alert
          color={status === "error" ? "red" : "brand"}
          variant="light"
          title={status === "error" ? "Import failed" : "Import complete"}
        >
          <Text size="xs">{message}</Text>
        </Alert>
      )}
      {warnings.map((w) => (
        <Alert key={w} color="yellow" variant="light" title="Warning">
          <Text size="xs">{w}</Text>
        </Alert>
      ))}
    </Stack>
  );
}
