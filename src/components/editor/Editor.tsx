"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Accordion,
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Button,
  Drawer,
  Group,
  ScrollArea,
  SegmentedControl,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconDownload,
  IconFileTypePdf,
  IconFileUpload,
  IconLayoutGrid,
  IconRobot,
  IconX,
} from "@tabler/icons-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { useUndoRedoShortcuts } from "@/lib/store/use-undo-redo";
import { computeAtsScore } from "@/lib/ats/scoring";
import { exportJson } from "@/lib/export/json";
import { ResumePreview } from "@/components/templates";
import { TemplatePanel } from "@/components/templates/TemplatePanel";
import { AtsPanel } from "@/components/ats/AtsPanel";
import { AiPanel } from "@/components/ai/AiPanel";
import { ImportPanel } from "@/components/import/ImportPanel";
import { ContactForm } from "@/components/forms/ContactForm";
import { SummaryForm } from "@/components/forms/SummaryForm";
import { ExperienceForm } from "@/components/forms/ExperienceForm";
import { EducationForm } from "@/components/forms/EducationForm";
import { ProjectsForm } from "@/components/forms/ProjectsForm";
import { SkillsForm } from "@/components/forms/SkillsForm";
import { CertificationsForm } from "@/components/forms/CertificationsForm";
import { ReferencesForm } from "@/components/forms/ReferencesForm";
import { LanguagesForm, InterestsForm } from "@/components/forms/ListForms";
import type { SectionId } from "@/lib/schema";
import { useTranslations } from "next-intl";

type Panel = "none" | "template" | "ats" | "ai" | "import";
type MobileTab = "form" | "preview";

const SECTION_TABS: { id: SectionId; labelKey: string }[] = [
  { id: "summary", labelKey: "sections.summary" },
  { id: "experience", labelKey: "sections.experience" },
  { id: "education", labelKey: "sections.education" },
  { id: "projects", labelKey: "sections.projects" },
  { id: "skills", labelKey: "sections.skills" },
  { id: "certifications", labelKey: "sections.certifications" },
  { id: "references", labelKey: "sections.references" },
  { id: "languages", labelKey: "sections.languages" },
  { id: "interests", labelKey: "sections.interests" },
];

function SectionForms({ section }: { section: SectionId }) {
  switch (section) {
    case "summary":
      return <SummaryForm />;
    case "experience":
      return <ExperienceForm />;
    case "education":
      return <EducationForm />;
    case "projects":
      return <ProjectsForm />;
    case "skills":
      return <SkillsForm />;
    case "certifications":
      return <CertificationsForm />;
    case "references":
      return <ReferencesForm />;
    case "languages":
      return <LanguagesForm />;
    case "interests":
      return <InterestsForm />;
    default:
      return <ContactForm />;
  }
}

function ScoreBadge({ onClick }: { onClick: () => void }) {
  const document = useResumeStore((s) => s.document);
  const settings = useResumeStore((s) => s.settings);
  const jobDescription = useResumeStore((s) => s.jobDescription);
  const score = computeAtsScore(document, settings, jobDescription).total;
  const color = score >= 75 ? "green" : score >= 50 ? "yellow" : "red";
  return (
    <Tooltip label={`ATS score ${score} of 100. Open details.`} withArrow>
      <Badge
        size="lg"
        color={color}
        variant="filled"
        style={{ cursor: "pointer", textTransform: "none" }}
        onClick={onClick}
      >
        ATS {score}
      </Badge>
    </Tooltip>
  );
}

function PreviewScaler({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const width = container.clientWidth;
      // Resume page is 8.5in ≈ 816px at 96dpi.
      setScale(Math.min(1, width / 816));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={ref}
      h="100%"
      style={{
        overflow: "auto",
        background: "var(--mantine-color-gray-2)",
        padding: "var(--mantine-spacing-md)",
      }}
    >
      <div
        className="preview-scaler"
        style={{
          margin: "0 auto",
          transform: `scale(${scale})`,
          width: `${816 * scale}px`,
        }}
      >
        {children}
      </div>
    </Box>
  );
}

export function Editor() {
  const t = useTranslations();
  const document = useResumeStore((s) => s.document);
  const settings = useResumeStore((s) => s.settings);
  const undo = useResumeStore((s) => s.undo);
  const redo = useResumeStore((s) => s.redo);
  const past = useResumeStore((s) => s.past);
  const future = useResumeStore((s) => s.future);
  const importedAt = useResumeStore((s) => s.importedAt);

  const [panel, setPanel] = useState<Panel>("none");
  const [mobileTab, setMobileTab] = useState<MobileTab>("form");
  const [showOnboarding, setShowOnboarding] = useState(true);

  useUndoRedoShortcuts();

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle:
      document.contact.name.trim().replace(/\s+/g, "-").toLowerCase() || "resume",
  });

  const openPanel = useCallback((p: Panel) => {
    setPanel((current) => (current === p ? "none" : p));
  }, []);

  const isEmpty = !document.contact.name.trim() && !document.summary.trim();

  return (
    <AppShell
      header={{ height: 48 }}
      padding={0}
      styles={{
        main: { height: "100dvh", display: "flex", flexDirection: "column" },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Title order={4}>{t("common.appName")}</Title>
            <Tooltip label="Undo (Ctrl/Cmd+Z)" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={undo}
                disabled={!past.length}
                aria-label={t("common.undo")}
              >
                <IconArrowBackUp size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Redo (Ctrl/Cmd+Shift+Z)" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={redo}
                disabled={!future.length}
                aria-label={t("common.redo")}
              >
                <IconArrowForwardUp size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <ScoreBadge onClick={() => openPanel("ats")} />
            <Button
              variant="default"
              size="compact-sm"
              leftSection={<IconFileUpload size={14} />}
              onClick={() => openPanel("import")}
            >
              Import
            </Button>
            <Button
              variant="default"
              size="compact-sm"
              leftSection={<IconRobot size={14} />}
              onClick={() => openPanel("ai")}
            >
              AI
            </Button>
            <Button
              variant="default"
              size="compact-sm"
              leftSection={<IconLayoutGrid size={14} />}
              onClick={() => openPanel("template")}
            >
              Template
            </Button>
            <Button
              size="compact-sm"
              leftSection={<IconFileTypePdf size={14} />}
              onClick={() => {
                if (isEmpty && !window.confirm("The resume looks empty. Export anyway?")) {
                  return;
                }
                handlePrint();
              }}
            >
              PDF
            </Button>
            <Tooltip label="Download JSON backup" withArrow>
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => exportJson(document, settings)}
                aria-label="Export JSON"
              >
                <IconDownload size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {importedAt && (
          <Group
            justify="space-between"
            bg="brand.0"
            px="md"
            py={6}
            style={{ borderBottom: "1px solid var(--mantine-color-brand-2)" }}
          >
            <Text size="xs" c="brand.8">
              Import detected content — review each section before saving.
            </Text>
            <Button
              variant="subtle"
              size="compact-xs"
              color="brand"
              onClick={() => useResumeStore.setState({ importedAt: null })}
            >
              Dismiss
            </Button>
          </Group>
        )}

        {showOnboarding && (
          <Group
            justify="space-between"
            bg="gray.0"
            px="md"
            py={6}
            style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}
          >
            <Text size="xs" c="dimmed">
              Start with your name and contact info — everything saves automatically in
              this browser.
            </Text>
            <ActionIcon
              variant="subtle"
              size="sm"
              color="gray"
              onClick={() => setShowOnboarding(false)}
              aria-label="Dismiss onboarding hint"
            >
              <IconX size={14} />
            </ActionIcon>
          </Group>
        )}

        {/* Mobile toggle */}
        <Box hiddenFrom="md" p="xs">
          <SegmentedControl
            fullWidth
            size="xs"
            value={mobileTab}
            onChange={(v) => setMobileTab(v as MobileTab)}
            data={[
              { value: "form", label: "Edit" },
              { value: "preview", label: "Preview" },
            ]}
          />
        </Box>

        {/* Split pane */}
        <Group align="stretch" gap={0} wrap="nowrap" style={{ flex: 1, minHeight: 0 }}>
          {/* Left: form */}
          <Box
            className={`editor-form-pane${mobileTab === "form" ? "" : " editor-pane-hidden-mobile"}`}
            w={{ base: "100%", md: "40%" }}
            style={{
              flexDirection: "column",
              overflow: "hidden",
              borderRight: "1px solid var(--mantine-color-gray-3)",
            }}
            data-show-desktop
          >
            <ScrollArea style={{ flex: 1 }} px="sm" py="xs">
              <Accordion
                defaultValue="contact"
                variant="separated"
                radius="md"
                styles={{
                  item: { background: "var(--mantine-color-white)" },
                  content: { paddingTop: "var(--mantine-spacing-sm)" },
                }}
              >
                <Accordion.Item value="contact">
                  <Accordion.Control aria-label="Contact section">
                    Contact
                  </Accordion.Control>
                  <Accordion.Panel>
                    <ContactForm />
                  </Accordion.Panel>
                </Accordion.Item>
                {SECTION_TABS.map((tab) => (
                  <Accordion.Item key={tab.id} value={tab.id}>
                    <Accordion.Control aria-label={`${t(tab.labelKey)} section`}>
                      {t(tab.labelKey)}
                    </Accordion.Control>
                    <Accordion.Panel>
                      <SectionForms section={tab.id} />
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </ScrollArea>
          </Box>

          {/* Right: preview */}
          <Box
            flex={1}
            miw={0}
            className={`editor-preview-pane${mobileTab === "preview" ? "" : " editor-pane-hidden-mobile"}`}
            aria-label="Live resume preview"
          >
            <PreviewScaler>
              <ResumePreview document={document} settings={settings} innerRef={printRef} />
            </PreviewScaler>
          </Box>
        </Group>

        {/* Drawer panels */}
        <Drawer
          opened={panel === "template"}
          onClose={() => setPanel("none")}
          title="Template & customization"
          position="right"
          size="md"
          padding="md"
        >
          <TemplatePanel />
        </Drawer>
        <Drawer
          opened={panel === "ats"}
          onClose={() => setPanel("none")}
          title="ATS Score"
          position="right"
          size="md"
          padding="md"
        >
          <AtsPanel />
        </Drawer>
        <Drawer
          opened={panel === "ai"}
          onClose={() => setPanel("none")}
          title="AI assistant"
          position="right"
          size="md"
          padding="md"
        >
          <AiPanel />
        </Drawer>
        <Drawer
          opened={panel === "import"}
          onClose={() => setPanel("none")}
          title="Import resume"
          position="right"
          size="md"
          padding="md"
        >
          <ImportPanel />
        </Drawer>
      </AppShell.Main>
    </AppShell>
  );
}
