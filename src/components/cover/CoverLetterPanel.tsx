"use client";

import { useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Collapse,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Textarea,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconFileTypePdf,
  IconInfoCircle,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconWand,
  IconX,
} from "@tabler/icons-react";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useResumeStore } from "@/lib/store/resume-store";
import { coverLetterToText } from "@/lib/cover-letter/to-text";
import {
  MAX_PARAGRAPHS,
  type CoverLetterTone,
  type SectionId,
} from "@/lib/schema";
import {
  generateCoverLetter,
  type CoverLetterEmphasis,
  type GeneratedSource,
} from "@/lib/cover-letter/generate";
import { CoverLetterPage } from "./CoverLetterPage";
import { checkSummary, runCoverLetterChecks } from "@/lib/cover-letter/checks";
import { diffWords } from "@/lib/cover-letter/diff";
import { AiError, requestLetterPolish } from "@/lib/ai/client";
import { sanitizeAiText } from "@/lib/ai/sanitize";
import { useAiEnabled } from "@/lib/ai/use-ai-enabled";
import { sanitizeCoverLetter } from "@/lib/schema";
import { ScaledPage } from "@/components/preview/ScaledPage";

/**
 * Pull a company and role out of a pasted posting.
 *
 * Deliberately shallow: these are two regexes over the first lines, and the
 * fields stay editable. Anything cleverer would guess wrong and the user would
 * have to notice.
 */
/**
 * Pull a company and role out of a pasted posting.
 *
 * Deliberately shallow: two regexes over the first lines, and both fields stay
 * editable. Anything cleverer would guess wrong and the user would have to
 * notice. Trailing punctuation is trimmed and a location tail ("in Kuala
 * Lumpur") is cut, because both are common and both pollute the role.
 */
export function extractTarget(jobDescription: string): { company: string; role: string } {
  const text = jobDescription.replace(/\s+/g, " ").trim();
  if (!text) return { role: "", company: "" };

  const trim = (value: string) =>
    value
      .replace(/[,.;:]+$/, "")
      .replace(/\s+(?:in|at|for|to|with|who|that|where|and)\s+.*$/i, "")
      .trim();

  // The labelled form is matched against the raw text, where the newline still
  // delimits the value; collapsing whitespace first would merge it with the
  // next field.
  const roleMatch =
    /(?:job\s*title|role|position)\s*[:\-]\s*([^\n.|]{3,60})/i.exec(jobDescription) ??
    /hiring\s+(?:a|an)\s+([\w/+.-]+(?:\s+[\w/+.-]+){0,4})/i.exec(text);
  const role = roleMatch ? trim(roleMatch[1]) : "";

  const companyMatch =
    /\bat\s+([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*){0,3})/.exec(text) ??
    /(?:company|employer)\s*[:\-]\s*([^.|]{2,60})/i.exec(text);
  const company = companyMatch ? trim(companyMatch[1]) : "";

  return { role, company };
}

/**
 * Split polished prose back into the letter's paragraph slots.
 *
 * The model returns whole text, so blank lines are the only structure worth
 * trusting. When it returns more blocks than the draft had, the surplus is
 * merged into the last paragraph rather than dropped, because losing the
 * closing sentence would be worse than one long paragraph.
 */
export function splitPolishedParagraphs(text: string, expected: number): string[] {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) return [];
  if (!expected || blocks.length <= expected) return blocks;

  const head = blocks.slice(0, expected - 1);
  const tail = blocks.slice(expected - 1).join("\n\n");
  return [...head, tail];
}

function ProvenanceChip({
  source,
  onJump,
}: {
  source: GeneratedSource;
  onJump?: (id: SectionId) => void;
}) {
  const label = `From ${source.label}`;
  if (!onJump) {
    return (
      <Badge size="xs" variant="light" color="gray" style={{ textTransform: "none" }}>
        {label}
      </Badge>
    );
  }
  return (
    <Tooltip label="Open this section" withArrow>
      <UnstyledButton
        onClick={() => onJump(source.section)}
        aria-label={`${label}. Open the ${source.section} section.`}
      >
        <Badge size="xs" variant="light" color="gray" style={{ textTransform: "none" }}>
          {label}
        </Badge>
      </UnstyledButton>
    </Tooltip>
  );
}

export function CoverLetterPanel({
  onJumpToSection,
}: {
  onJumpToSection?: (id: SectionId) => void;
}) {
  const document = useResumeStore((s) => s.document);
  const jobDescription = useResumeStore((s) => s.jobDescription);
  const letter = useResumeStore((s) => s.coverLetter);
  const setCoverLetter = useResumeStore((s) => s.setCoverLetter);
  const updateCoverLetter = useResumeStore((s) => s.updateCoverLetter);

  const [emphasis, setEmphasis] = useState<CoverLetterEmphasis>("experience");
  const [recipientOpen, setRecipientOpen] = useState(false);

  const hasContent =
    document.experience.some(
      (entry) => entry.role.trim() || entry.bullets.some((b) => b.trim()),
    ) || document.projects.some((project) => project.name.trim());
  /** Set on any manual edit, so regeneration can warn before overwriting. */
  const [dirty, setDirty] = useState(false);
  /** Stale when tone or emphasis changed after the last generation. */
  const [stale, setStale] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** Provenance for the paragraphs produced by the last generation only. */
  const [sources, setSources] = useState<GeneratedSource[][]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [polishState, setPolishState] = useState<{
    status: "idle" | "loading" | "ready";
    text?: string;
    error?: string;
    regressed?: string[];
  }>({ status: "idle" });
  const aiEnabled = useAiEnabled();
  const [aiConsent, setAiConsent] = useState(false);
  const letterPageRef = useRef<HTMLDivElement>(null);

  const edit = (patch: Parameters<typeof updateCoverLetter>[0]) => {
    updateCoverLetter(patch);
    setDirty(true);
  };

  const editParagraph = (index: number, text: string) => {
    const paragraphs = letter.paragraphs.map((p, i) => (i === index ? text : p));
    // Once a paragraph is rewritten its provenance no longer describes it.
    setSources((current) => current.map((s, i) => (i === index ? [] : s)));
    edit({ paragraphs });
  };

  const removeParagraph = (index: number) => {
    setSources((current) => current.filter((_, i) => i !== index));
    edit({ paragraphs: letter.paragraphs.filter((_, i) => i !== index) });
  };

  const addParagraph = () => {
    if (letter.paragraphs.length >= MAX_PARAGRAPHS) return;
    setSources((current) => [...current, []]);
    edit({ paragraphs: [...letter.paragraphs, ""] });
  };

  const fillFromJobDescription = () => {
    const target = extractTarget(jobDescription);
    if (!target.company && !target.role) {
      setNotice("Could not find a company or role in the job description. Enter them below.");
      return;
    }
    setNotice(null);
    updateCoverLetter({
      company: target.company || letter.company,
      jobTitle: target.role || letter.jobTitle,
    });
  };

  const runGenerate = () => {
    const result = generateCoverLetter({
      document,
      jobDescription,
      jobTitle: letter.jobTitle,
      company: letter.company,
      tone: letter.tone,
      emphasis,
    });

    if (!result.ok) {
      setNotice(result.reason);
      return;
    }

    setCoverLetter({
      ...letter,
      greeting: result.letter.greeting,
      subject: result.letter.subject,
      paragraphs: result.letter.paragraphs.map((p) => p.text),
      signOff: result.letter.signOff,
    });
    setSources(result.letter.paragraphs.map((p) => p.sources));
    setDirty(false);
    setStale(false);
    setNotice(
      result.letter.general
        ? "No job description found, so this is a general letter. Add a description in the ATS panel for a targeted one."
        : null,
    );
  };

  const handlePrint = useReactToPrint({
    contentRef: letterPageRef,
    documentTitle: `${document.contact.name.trim().replace(/\s+/g, "-").toLowerCase() || "cover-letter"}-cover-letter`,
  });

  const checks = runCoverLetterChecks(letter, document);
  const summary = checkSummary(checks);

  const copyText = async () => {
    const text = coverLetterToText(letter, document.contact.name);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  /**
   * Ask the provider for a polish, then re-run the local checks on the result
   * before it is offered. A polished variant that regresses a check cannot be
   * accepted, which is the point: the checks are the contract, not the model.
   */
  const runPolish = async () => {
    if (!aiEnabled) return;
    setPolishState({ status: "loading" });
    try {
      const { result } = await requestLetterPolish(
        coverLetterToText(letter, document.contact.name),
        letter.tone,
        jobDescription,
      );
      const polished = sanitizeAiText(result).trim();
      if (!polished) {
        setPolishState({ status: "idle", error: "The polish came back empty. Try again." });
        return;
      }

      // Compare like for like: same company, role and greeting, so only prose
      // changes can affect the checks.
      const candidate = sanitizeCoverLetter({
        ...letter,
        paragraphs: splitPolishedParagraphs(polished, letter.paragraphs.length),
      });
      const before = runCoverLetterChecks(letter, document);
      const after = runCoverLetterChecks(candidate, document);
      const regressed = after
        .filter((check) => !check.passed && before.find((b) => b.id === check.id)?.passed)
        .map((check) => check.label);

      setPolishState({ status: "ready", text: polished, regressed });
    } catch (error) {
      const message =
        error instanceof AiError
          ? error.code === "ai_disabled"
            ? "AI polish is disabled on this deployment."
            : error.code === "rate_limited"
              ? `Rate limited. Retry in ${error.retryAfter ?? 60}s.`
              : error.code === "ai_not_configured"
                ? "AI is not configured on this deployment."
                : "Polish failed. Your draft is unchanged."
          : "Polish failed. Your draft is unchanged.";
      setPolishState({ status: "idle", error: message });
    }
  };

  const acceptPolish = () => {
    if (polishState.status !== "ready" || !polishState.text) return;
    if (polishState.regressed?.length) return;
    const paragraphs = splitPolishedParagraphs(polishState.text, letter.paragraphs.length);
    // Provenance no longer describes rewritten prose, so chips are cleared.
    setSources([]);
    edit({ paragraphs });
    setPolishState({ status: "idle" });
  };

  const requestGenerate = () => {
    if (dirty && letter.paragraphs.some((p) => p.trim())) {
      const confirmed = window.confirm(
        "Generating again replaces your edits to this letter. Continue?",
      );
      if (!confirmed) return;
    }
    runGenerate();
  };

  return (
    <Stack gap="md">
      {/* 1. Target */}
      <Card withBorder radius="md" padding="sm">
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={600}>
              Target
            </Text>
            <Button
              size="compact-xs"
              variant="subtle"
              leftSection={<IconWand size={12} />}
              onClick={fillFromJobDescription}
              disabled={!jobDescription.trim()}
            >
              Fill from job description
            </Button>
          </Group>
          <TextInput
            label="Job title"
            value={letter.jobTitle}
            onChange={(event) => edit({ jobTitle: event.currentTarget.value })}
            placeholder="Senior Backend Engineer"
          />
          <TextInput
            label="Company"
            value={letter.company}
            onChange={(event) => edit({ company: event.currentTarget.value })}
            placeholder="Northwind Labs"
          />

          <UnstyledButton
            onClick={() => setRecipientOpen((open) => !open)}
            aria-expanded={recipientOpen}
            aria-label="Toggle recipient details"
          >
            <Group gap={4}>
              <Text size="xs" c="dimmed">
                Recipient details (optional)
              </Text>
              <IconChevronDown
                size={12}
                style={{
                  transform: recipientOpen ? "rotate(180deg)" : undefined,
                  transition: "transform 150ms ease",
                  opacity: 0.6,
                }}
              />
            </Group>
          </UnstyledButton>
          <Collapse expanded={recipientOpen} keepMounted={false}>
            <Stack gap="xs">
              <TextInput
                label="Name"
                value={letter.recipient.name ?? ""}
                onChange={(event) =>
                  edit({
                    recipient: { ...letter.recipient, name: event.currentTarget.value || undefined },
                  })
                }
                placeholder="Ms Priya Chen"
              />
              <TextInput
                label="Title"
                value={letter.recipient.title ?? ""}
                onChange={(event) =>
                  edit({
                    recipient: { ...letter.recipient, title: event.currentTarget.value || undefined },
                  })
                }
                placeholder="Engineering Manager"
              />
              <Textarea
                label="Address"
                description="One to three lines"
                autosize
                minRows={2}
                maxRows={4}
                value={letter.recipient.address ?? ""}
                onChange={(event) =>
                  edit({
                    recipient: {
                      ...letter.recipient,
                      address: event.currentTarget.value || undefined,
                    },
                  })
                }
              />
            </Stack>
          </Collapse>
        </Stack>
      </Card>

      {/* 2. Tone */}
      <div>
        <Text size="sm" fw={600} mb={4}>
          Tone
        </Text>
        <SegmentedControl
          fullWidth
          size="xs"
          value={letter.tone}
          onChange={(value) => {
            updateCoverLetter({ tone: value as CoverLetterTone });
            setStale(true);
          }}
          data={[
            { value: "direct", label: "Direct" },
            { value: "warm", label: "Warm" },
            { value: "formal", label: "Formal" },
          ]}
        />
      </div>

      {/* 3. Emphasis */}
      <div>
        <Text size="sm" fw={600} mb={4}>
          Emphasis
        </Text>
        <SegmentedControl
          fullWidth
          size="xs"
          value={emphasis}
          onChange={(value) => {
            setEmphasis(value as CoverLetterEmphasis);
            setStale(true);
          }}
          data={[
            { value: "experience", label: "Experience" },
            { value: "projects", label: "Projects" },
            { value: "skills", label: "Skills" },
          ]}
        />
      </div>

      {/* 4. Generate */}
      <Group gap="xs" align="center">
        <Button
          size="compact-sm"
          onClick={requestGenerate}
          disabled={!hasContent}
          title={
            hasContent ? undefined : "Add a role or project to your resume first."
          }
        >
          {letter.paragraphs.length ? "Regenerate" : "Generate"}
        </Button>
        {!hasContent ? (
          <Text size="xs" c="dimmed">
            Add a role or project to your resume first.
          </Text>
        ) : stale ? (
          <Text size="xs" c="dimmed">
            Settings changed. Regenerate to apply them.
          </Text>
        ) : null}
      </Group>

      {notice && (
        <Alert
          variant="light"
          color="blue"
          icon={<IconInfoCircle size={16} />}
          withCloseButton
          onClose={() => setNotice(null)}
        >
          <Text size="xs">{notice}</Text>
        </Alert>
      )}

      {/* 5. Editable result */}
      <Stack gap="sm">
        <TextInput
          label="Greeting"
          value={letter.greeting}
          onChange={(event) => edit({ greeting: event.currentTarget.value })}
          placeholder="Dear Ms Chen,"
        />
        <TextInput
          label="Subject"
          value={letter.subject ?? ""}
          onChange={(event) =>
            edit({ subject: event.currentTarget.value || undefined })
          }
          placeholder="Application for Senior Backend Engineer"
        />

        {letter.paragraphs.map((paragraph, index) => (
          <div key={index}>
            <Group gap={4} align="flex-end" wrap="nowrap">
              <Textarea
                label={index === 0 ? "Opening" : `Paragraph ${index + 1}`}
                autosize
                minRows={3}
                style={{ flex: 1 }}
                value={paragraph}
                onChange={(event) => editParagraph(index, event.currentTarget.value)}
              />
              <Tooltip label="Remove paragraph" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  mb={2}
                  aria-label={`Remove paragraph ${index + 1}`}
                  onClick={() => removeParagraph(index)}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
            {(sources[index]?.length ?? 0) > 0 && (
              <Group gap={4} mt={4} wrap="wrap">
                {sources[index].map((source, sourceIndex) => (
                  <ProvenanceChip
                    key={`${source.label}-${sourceIndex}`}
                    source={source}
                    onJump={onJumpToSection}
                  />
                ))}
              </Group>
            )}
          </div>
        ))}

        <Button
          variant="default"
          size="compact-xs"
          leftSection={<IconPlus size={12} />}
          onClick={addParagraph}
          disabled={letter.paragraphs.length >= MAX_PARAGRAPHS}
          style={{ alignSelf: "flex-start" }}
        >
          Add paragraph
        </Button>

        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
          <TextInput
            label="Sign-off"
            value={letter.signOff}
            onChange={(event) => edit({ signOff: event.currentTarget.value })}
          />
          <TextInput
            label="Signature"
            value={letter.signature}
            onChange={(event) => edit({ signature: event.currentTarget.value })}
            placeholder={document.contact.name || "Your name"}
          />
        </SimpleGrid>
      </Stack>

      {/* 6a. Optional AI polish. Absent entirely when AI is disabled. */}
      <Card withBorder radius="md" padding="sm">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={600}>
            Polish with AI
          </Text>
          <Badge size="xs" variant="light" color="gray" style={{ textTransform: "none" }}>
            Optional
          </Badge>
        </Group>
        <Text size="xs" c="dimmed" mt={4}>
          {aiEnabled
            ? "Privacy: this sends your letter text and job description to the server AI provider. Everything else stays in your browser."
            : "AI polish is coming soon. Generation and every check above work without it."}
        </Text>
        <Checkbox
          label="I understand and consent to sending my letter for AI polish."
          size="xs"
          mt="xs"
          disabled={!aiEnabled}
          checked={aiConsent}
          onChange={(event) => setAiConsent(event.currentTarget.checked)}
        />
        <Group gap="xs" mt="xs">
          <Button
            size="compact-xs"
            variant="default"
            leftSection={<IconSparkles size={12} />}
            disabled={
              !aiEnabled ||
              !aiConsent ||
              polishState.status === "loading" ||
              !letter.paragraphs.some((p) => p.trim())
            }
            loading={polishState.status === "loading"}
            onClick={runPolish}
          >
            Polish draft
          </Button>
          {polishState.error && (
            <Text size="xs" c="red">
              {polishState.error}
            </Text>
          )}
        </Group>

        {polishState.status === "ready" && polishState.text && (
          <Stack gap="xs" mt="sm">
            <Text size="xs" fw={600}>
              Changes
            </Text>
            <Box
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                padding: 8,
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {diffWords(
                coverLetterToText(letter, document.contact.name),
                polishState.text,
              ).map((token, index) => (
                <span
                  key={index}
                  className={
                    token.op === "add"
                      ? "diff-add"
                      : token.op === "remove"
                        ? "diff-remove"
                        : undefined
                  }
                >
                  {token.text}{" "}
                </span>
              ))}
            </Box>
            {polishState.regressed && polishState.regressed.length > 0 ? (
              <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>
                <Text size="xs">
                  This version fails checks your current draft passes:{" "}
                  {polishState.regressed.join(", ")}. It cannot be accepted until those pass.
                </Text>
              </Alert>
            ) : (
              <Group gap="xs">
                <Button size="compact-xs" onClick={acceptPolish}>
                  Use this version
                </Button>
                <Button
                  size="compact-xs"
                  variant="default"
                  onClick={() => setPolishState({ status: "idle" })}
                >
                  Keep my draft
                </Button>
              </Group>
            )}
            {polishState.regressed && polishState.regressed.length > 0 && (
              <Button
                size="compact-xs"
                variant="default"
                style={{ alignSelf: "flex-start" }}
                onClick={() => setPolishState({ status: "idle" })}
              >
                Keep my draft
              </Button>
            )}
          </Stack>
        )}
      </Card>

      {/* 6. Checks */}
      <Card withBorder radius="md" padding="sm">
        <Group justify="space-between" align="center" mb={6}>
          <Text size="sm" fw={600}>
            Checks
          </Text>
          <Badge
            size="sm"
            variant="light"
            color={summary.passed === summary.total ? "green" : "yellow"}
            style={{ textTransform: "none" }}
          >
            {summary.passed}/{summary.total} passing
          </Badge>
        </Group>
        <Stack gap={4}>
          {checks.map((check) => {
            const fix = check.fixSection;
            return (
              <Group key={check.id} gap={6} wrap="nowrap" align="flex-start">
                <ThemeIcon
                  size={16}
                  radius="xl"
                  variant={check.passed ? "filled" : "outline"}
                  color={check.passed ? "green" : "red"}
                  mt={2}
                >
                  {check.passed ? <IconCheck size={10} /> : <IconX size={10} />}
                </ThemeIcon>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="xs" c={check.passed ? undefined : "dimmed"}>
                    {check.label}
                  </Text>
                  {check.detail && (
                    <Text size="xs" c="dimmed">
                      {check.detail}
                    </Text>
                  )}
                  {!check.passed && (
                    <Text size="xs" c="dimmed" fs="italic">
                      {check.why}
                    </Text>
                  )}
                </div>
                {!check.passed && fix && onJumpToSection && (
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    leftSection={<IconWand size={12} />}
                    onClick={() => onJumpToSection(fix)}
                    aria-label={`Fix: go to ${fix}`}
                  >
                    Fix
                  </Button>
                )}
              </Group>
            );
          })}
        </Stack>
      </Card>

      {/* 7. Preview and export */}
      <Card withBorder radius="md" padding="sm">
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={600}>
              Preview
            </Text>
            <Group gap={4}>
              <Button
                variant="default"
                size="compact-xs"
                leftSection={<IconCopy size={12} />}
                onClick={copyText}
              >
                {copyState === "copied" ? "Copied" : "Copy text"}
              </Button>
              <Button
                size="compact-xs"
                leftSection={<IconFileTypePdf size={12} />}
                onClick={handlePrint}
              >
                Print / PDF
              </Button>
            </Group>
          </Group>
          {copyState === "failed" && (
            <Text size="xs" c="red">
              Copying needs a secure context (https) or a newer browser. Select the
              text below instead.
            </Text>
          )}
          <Box
            data-tour="cover-preview"
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <ScaledPage
              pageWidthPx={816}
              padding={0}
              background="var(--color-surface-muted)"
            >
              <CoverLetterPage
                letter={letter}
                contact={document.contact}
                innerRef={letterPageRef}
                printable
              />
            </ScaledPage>
          </Box>
        </Stack>
      </Card>
    </Stack>
  );
}
