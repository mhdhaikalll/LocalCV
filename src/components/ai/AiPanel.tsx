"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Code,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { requestAi, AiError, type AiAction } from "@/lib/ai/client";
import { sanitizeAiText } from "@/lib/ai/sanitize";

export function AiPanel() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [action, setAction] = useState<AiAction>("rewrite");

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await requestAi(action, content);
      setResult(sanitizeAiText(r));
    } catch (e) {
      if (e instanceof AiError) {
        setError(
          e.code === "ai_disabled"
            ? "AI is disabled on this deployment."
            : e.code === "rate_limited"
              ? `Rate limited. Retry in ${e.retryAfter ?? 60}s.`
              : e.code === "ai_not_configured"
                ? "AI is not configured on this deployment."
                : "AI request failed. Try again.",
        );
      } else {
        setError("AI request failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="md">
      <Alert color="gray" variant="light">
        <Text size="xs">
          Privacy: the text you submit below is sent to the server AI provider. Your
          stored resume never leaves your browser except when you explicitly run an
          AI action.
        </Text>
      </Alert>

      <Textarea
        label="Content"
        placeholder="Paste a bullet point, summary, or section text..."
        minRows={6}
        autosize
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <SegmentedControl
        fullWidth
        size="xs"
        value={action}
        onChange={(v) => setAction(v as AiAction)}
        data={[
          { value: "rewrite", label: "Rewrite" },
          { value: "summarize", label: "Summarize" },
          { value: "suggest", label: "Suggest" },
        ]}
      />

      <Checkbox
        label="I consent to sending this text to the AI provider."
        size="xs"
        checked={consent}
        onChange={(e) => setConsent(e.target.checked)}
      />

      <Button
        size="xs"
        disabled={!consent || !content.trim() || loading}
        loading={loading}
        onClick={run}
      >
        Run {action}
      </Button>

      {error && (
        <Alert color="red" variant="light" title="Error">
          <Text size="xs">{error}</Text>
        </Alert>
      )}

      {result && (
        <Card withBorder radius="md" padding="sm" bg="gray.0">
          <Text size="xs" fw={600} mb={4}>
            Result (AI-generated — review before using)
          </Text>
          <Code block style={{ whiteSpace: "pre-wrap" }}>
            {result}
          </Code>
          <Group mt="xs">
            <Button
              size="compact-xs"
              variant="default"
              onClick={() => navigator.clipboard.writeText(result)}
            >
              Copy
            </Button>
          </Group>
        </Card>
      )}
    </Stack>
  );
}
