"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Progress,
  RingProgress,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { computeAtsScore } from "@/lib/ats/scoring";
import { resumeToText } from "@/lib/ats/scoring";
import { requestAtsReview, AiError, type AtsReviewFeedback } from "@/lib/ai/client";
import { sanitizeAiText } from "@/lib/ai/sanitize";
import { useAiEnabled } from "@/lib/ai/use-ai-enabled";

function scoreColor(score: number): string {
  if (score >= 75) return "green";
  if (score >= 50) return "yellow";
  return "red";
}

export function AtsPanel() {
  const aiEnabled = useAiEnabled();
  const document = useResumeStore((s) => s.document);
  const settings = useResumeStore((s) => s.settings);
  const jobDescription = useResumeStore((s) => s.jobDescription);
  const setJobDescription = useResumeStore((s) => s.setJobDescription);

  const [aiReview, setAiReview] = useState<{
    score: number;
    feedback: AtsReviewFeedback[];
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiConsent, setAiConsent] = useState(false);

  const result = useMemo(
    () => computeAtsScore(document, settings, jobDescription),
    [document, settings, jobDescription],
  );

  const runAiReview = async () => {
    if (!aiEnabled) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const review = await requestAtsReview(
        resumeToText(document),
        jobDescription,
      );
      setAiReview({
        score: review.score,
        feedback: review.feedback.map((f) => ({
          category: f.category,
          text: sanitizeAiText(f.text),
        })),
      });
    } catch (e) {
      if (e instanceof AiError) {
        setAiError(
          e.code === "ai_disabled"
            ? "AI review is disabled on this deployment."
            : e.code === "rate_limited"
              ? `Rate limited. Retry in ${e.retryAfter ?? 60}s.`
              : e.code === "ai_not_configured"
                ? "AI is not configured on this deployment."
                : "AI review failed. Try again.",
        );
      } else {
        setAiError("AI review failed. Try again.");
      }
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Stack gap="md">
      <Group wrap="nowrap">
        <RingProgress
          size={90}
          thickness={8}
          roundCaps
          sections={[{ value: result.total, color: scoreColor(result.total) }]}
          label={
            <Text ta="center" fw={700} size="lg">
              {result.total}
            </Text>
          }
          aria-label={`ATS score ${result.total} of 100`}
        />
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            Deterministic local score — identical input always yields the same score.
          </Text>
          <Text size="xs" c="dimmed">
            This is a heuristic, not an ATS emulator.
          </Text>
        </Stack>
      </Group>

      {result.categories.map((cat) => (
        <Card key={cat.id} withBorder radius="md" padding="sm">
          <Group justify="space-between" mb={4}>
            <Text size="sm" fw={600}>
              {cat.label}
            </Text>
            <Text size="xs" c="dimmed">
              {cat.score}/{cat.max}
            </Text>
          </Group>
          <Progress
            value={(cat.score / cat.max) * 100}
            color={scoreColor((cat.score / cat.max) * 100)}
            size="sm"
            radius="xl"
            mb="xs"
          />
          <Stack gap={2}>
            {cat.checks.map((check) => (
              <Group key={check.label} gap="xs" wrap="nowrap">
                <ThemeIcon
                  size={16}
                  radius="xl"
                  variant={check.passed ? "filled" : "outline"}
                  color={check.passed ? "green" : "gray"}
                >
                  <IconCheck size={10} />
                </ThemeIcon>
                <Text size="xs" c={check.passed ? undefined : "dimmed"}>
                  {check.label}
                </Text>
              </Group>
            ))}
          </Stack>
        </Card>
      ))}

      {result.missingKeywords.length > 0 && (
        <Card withBorder radius="md" padding="sm">
          <Text size="sm" fw={600} mb="xs">
            Missing keywords
          </Text>
          <Group gap={4}>
            {result.missingKeywords.map((k) => (
              <Badge
                key={k.keyword}
                variant="light"
                color="yellow"
                title={`Add to: ${k.recommendedSection}`}
              >
                {k.keyword} → {k.recommendedSection}
              </Badge>
            ))}
          </Group>
        </Card>
      )}

      <Textarea
        label="Job description (optional, improves keyword scoring)"
        placeholder="Paste the job description here..."
        minRows={5}
        autosize
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />

      <Card withBorder radius="md" padding="sm">
        <Text size="sm" fw={600} mb={4}>
          AI deep review (optional)
        </Text>
        <Text size="xs" c="dimmed" mb="xs">
          {aiEnabled
            ? "Privacy: this sends your resume text and job description to the server AI provider. Everything else stays in your browser."
            : "AI deep review is coming soon. The local ATS score above keeps working without it."}
        </Text>
        <Checkbox
          label="I understand and consent to sending my resume content for AI review."
          size="xs"
          mb="xs"
          disabled={!aiEnabled}
          checked={aiConsent}
          onChange={(e) => setAiConsent(e.target.checked)}
        />
        <Tooltip
          label="AI features are coming soon"
          withArrow
          disabled={aiEnabled}
          events={{ hover: true, focus: false, touch: true }}
        >
          <span style={{ display: "block" }}>
            <Button
              size="xs"
              disabled={!aiEnabled || !aiConsent || !jobDescription.trim() || aiLoading}
              loading={aiLoading}
              onClick={runAiReview}
            >
              Run AI deep review
            </Button>
          </span>
        </Tooltip>
        {aiError && (
          <Alert color="red" variant="light" mt="xs" title="Error">
            <Text size="xs">{aiError}</Text>
          </Alert>
        )}
        {aiReview && (
          <Stack gap={4} mt="sm">
            <Text size="xs" fw={600}>
              AI qualitative score: {aiReview.score}/100 (non-deterministic)
            </Text>
            {aiReview.feedback.map((f, i) => (
              <Text key={i} size="xs">
                <Text span fw={600} style={{ textTransform: "capitalize" }}>
                  {f.category}:{" "}
                </Text>
                {f.text}
              </Text>
            ))}
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
