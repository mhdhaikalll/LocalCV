"use client";

import { useCallback, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Accordion,
  ActionIcon,
  Alert,
  AppShell,
  Badge,
  Box,
  Button,
  Drawer,
  Group,
  Menu,
  Modal,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconDotsVertical,
  IconDownload,
  IconFileTypePdf,
  IconFileUpload,
  IconInfoCircle,
  IconLayoutGrid,
  IconMail,
  IconRobot,
} from "@tabler/icons-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { useAiEnabled } from "@/lib/ai/use-ai-enabled";
import { EditorTour } from "./EditorTour";
import { PageFitBadge } from "./PageFitBadge";
import { PreviewMeasurementProvider, usePreviewMeasurement } from "./preview-measurement";
import { ScaledPage } from "@/components/preview/ScaledPage";
import { useUndoRedoShortcuts } from "@/lib/store/use-undo-redo";
import { computeAtsScore } from "@/lib/ats/scoring";
import { measurePageUnits } from "@/lib/layout/measure";
import { PAGE_HEIGHT_PX } from "@/lib/layout/page-fit";
import { usePrintPageStyle } from "@/lib/export/print-page-style";
import { ColorSchemeToggle } from "./ColorSchemeToggle";
import { exportJson } from "@/lib/export/json";
import { ResumePreview } from "@/components/templates";
import { TemplatePanel } from "@/components/templates/TemplatePanel";
import { AtsPanel } from "@/components/ats/AtsPanel";
import { AiPanel } from "@/components/ai/AiPanel";
import { ImportPanel } from "@/components/import/ImportPanel";
import { CoverLetterPanel } from "@/components/cover/CoverLetterPanel";
import { ContactForm } from "@/components/forms/ContactForm";
import { SummaryForm } from "@/components/forms/SummaryForm";
import { ExperienceForm } from "@/components/forms/ExperienceForm";
import { EducationForm } from "@/components/forms/EducationForm";
import { ProjectsForm } from "@/components/forms/ProjectsForm";
import { SkillsForm } from "@/components/forms/SkillsForm";
import { CertificationsForm } from "@/components/forms/CertificationsForm";
import { ReferencesForm } from "@/components/forms/ReferencesForm";
import { LanguagesForm, InterestsForm } from "@/components/forms/ListForms";
import { ExtracurricularsForm } from "@/components/forms/ExtracurricularsForm";
import { AdditionalForm } from "@/components/forms/AdditionalForm";
import type { SectionId } from "@/lib/schema";
import { useTranslations } from "next-intl";

type Panel = "none" | "template" | "ats" | "ai" | "import" | "cover";
type MobileTab = "form" | "preview";

const SECTION_TABS: { id: SectionId; labelKey: string }[] = [
  { id: "summary", labelKey: "sections.summary" },
  { id: "experience", labelKey: "sections.experience" },
  { id: "education", labelKey: "sections.education" },
  { id: "projects", labelKey: "sections.projects" },
  { id: "skills", labelKey: "sections.skills" },
  { id: "certifications", labelKey: "sections.certifications" },
  { id: "extracurriculars", labelKey: "sections.extracurriculars" },
  { id: "additional", labelKey: "sections.additional" },
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
    case "extracurriculars":
      return <ExtracurricularsForm />;
    case "additional":
      return <AdditionalForm />;
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
        data-tour="ats"
        style={{ cursor: "pointer", textTransform: "none" }}
        onClick={onClick}
      >
        ATS {score}
      </Badge>
    </Tooltip>
  );
}

/**
 * The preview document, re-rendered with the planner's page decisions so the
 * preview shows real pages and the printed output breaks in the same places.
 * Mounted inside the measurement provider, which is where those decisions live.
 */
function PreviewBreakDocument({
  innerRef,
}: {
  innerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const document = useResumeStore((s) => s.document);
  const settings = useResumeStore((s) => s.settings);
  const { pageStarts } = usePreviewMeasurement();
  const spacers = Object.fromEntries(
    pageStarts.map((start) => [start.sectionId, start.spacerPx]),
  );
  const breaks = pageStarts.map((start) => start.sectionId);
  return (
    <ResumePreview
      document={document}
      settings={settings}
      innerRef={innerRef}
      pageBreaks={breaks}
      pageSpacers={spacers}
    />
  );
}

/**
 * The resume preview: a scaled, page-shaped surface that also feeds the
 * measurement provider, so the page-fit badge and the break planner read the
 * same geometry the user sees.
 */
function PreviewScaler({ children }: { children: React.ReactNode }) {
  const { setContentHeight, setScale, setUnits, pages } = usePreviewMeasurement();
  const contentElementRef = useRef<HTMLElement | null>(null);
  const settings = useResumeStore((s) => s.settings);
  const pageWidthPx = 816;
  const pageHeightPx = PAGE_HEIGHT_PX[settings.pageSize] ?? PAGE_HEIGHT_PX.Letter;

  return (
    <ScaledPage
      pageWidthPx={pageWidthPx}
      onContentRef={(element) => {
        if (!element) return;
        contentElementRef.current = element.firstElementChild as HTMLElement | null;
      }}
      onMeasured={({ scale, contentHeight }) => {
        setScale(scale);
        setContentHeight(contentHeight);
        // `contentHeight` is the whole flow including page spacers; the planner
        // needs the natural per-section geometry instead.
        const root = contentElementRef.current;
        if (root) setUnits(measurePageUnits(root, scale));
      }}
      overlay={() => (
        <>
          {/* Draw each sheet edge, so the gap between pages is visible even
              inside one continuous flow. */}
          {Array.from({ length: Math.max(0, pages - 1) }, (_, index) => {
            const top = (index + 1) * pageHeightPx;
            return (
              <div
                key={top}
                className="page-sheet-edge"
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top,
                  height: 8,
                  background: "var(--color-backdrop)",
                  borderTop: "1px solid var(--color-preview-edge)",
                  borderBottom: "1px solid var(--color-preview-edge)",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    right: 8,
                    top: -14,
                    fontSize: 9,
                    lineHeight: "12px",
                    color: "var(--color-preview-label)",
                    letterSpacing: "0.04em",
                  }}
                >
                  PAGE {index + 2}
                </span>
              </div>
            );
          })}
        </>
      )}
    >
      {children}
    </ScaledPage>
  );
}
export function Editor() {
  const t = useTranslations();
  const aiEnabled = useAiEnabled();
  const document = useResumeStore((s) => s.document);
  const settings = useResumeStore((s) => s.settings);
  const undo = useResumeStore((s) => s.undo);
  const redo = useResumeStore((s) => s.redo);
  const past = useResumeStore((s) => s.past);
  const future = useResumeStore((s) => s.future);
  const importedAt = useResumeStore((s) => s.importedAt);
  const coverLetter = useResumeStore((s) => s.coverLetter);

  const [panel, setPanel] = useState<Panel>("none");
  const [mobileTab, setMobileTab] = useState<MobileTab>("form");
  const [openSection, setOpenSection] = useState<string | null>("contact");
  const [printHintOpen, setPrintHintOpen] = useState(false);
  const hydrated = useResumeStore((s) => s.hydrated);
  const isMobile = useMediaQuery("(max-width: 48em)");

  useUndoRedoShortcuts();

  // Accordion controls are keyed by section id so a jump can open and focus one.
  const accordionRefs = useRef(new Map<string, HTMLElement>());

  const jumpToSection = useCallback(
    (id: SectionId) => {
      setOpenSection(id);
      setPanel("none");
      if (isMobile) setMobileTab("form");

      // Wait for the drawer to close and the panel to expand before scrolling,
      // otherwise the measured position is wrong and the focus target is hidden.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const control = accordionRefs.current.get(id);
          if (!control) return;
          control.scrollIntoView({ behavior: "smooth", block: "center" });
          control.focus({ preventScroll: true });
        });
      });
    },
    [isMobile],
  );

  const printRef = useRef<HTMLDivElement>(null);
  // A single owner for `@page`: the margins must describe whichever surface is
  // currently the print root. Two competing hooks would let the loser win.
  usePrintPageStyle(
    // The letter sets its margins as padding on the page element, so `@page`
    // must be zero or the two would stack. The resume relies on `@page`
    // instead, because element padding only applies to the first printed page.
    panel === "cover"
      ? { pageSize: coverLetter.layout.pageSize, margins: 0 }
      : settings,
  );
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle:
      document.contact.name.trim().replace(/\s+/g, "-").toLowerCase() || "resume",
  });

  const openPanel = useCallback((p: Panel) => {
    setPanel((current) => (current === p ? "none" : p));
  }, []);

  /** The additional section's tab uses its user-chosen heading. */
  const tabLabel = (tab: { id: SectionId; labelKey: string }) =>
    tab.id === "additional"
      ? document.additional.heading.trim() || t(tab.labelKey)
      : t(tab.labelKey);

  const isEmpty = !document.contact.name.trim() && !document.summary.trim();

  // The tour itself decides whether this visitor is new (empty resume and no
  // stored tour flag); here we only wait for the store to hydrate.
  const tourEnabled = hydrated;

  const triggerPrint = () => {
    if (isEmpty && !window.confirm("The resume looks empty. Export anyway?")) {
      return;
    }
    handlePrint();
  };

  return (
    <PreviewMeasurementProvider>
      <AppShell
        header={{ height: 48 }}
        padding={0}
        styles={{
          main: { height: "100dvh", display: "flex", flexDirection: "column" },
        }}
      >
      <AppShell.Header data-tour="header">
        <Group h="100%" px="sm" justify="space-between" wrap="nowrap" gap="xs">
          <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
            <Title order={4} textWrap="nowrap">
              {t("common.appName")}
            </Title>
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

          {isMobile ? (
            <Group gap={4} wrap="nowrap">
              <ScoreBadge onClick={() => openPanel("ats")} />
              <ColorSchemeToggle />
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon
                    variant="default"
                    size="lg"
                    aria-label="More actions"
                    data-tour="template"
                  >
                    <IconDotsVertical size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconFileTypePdf size={16} />}
                    onClick={triggerPrint}
                  >
                    Export PDF
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconInfoCircle size={16} />}
                    onClick={() => setPrintHintOpen(true)}
                  >
                    PDF export tips
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconDownload size={16} />}
                    onClick={() => exportJson(document, settings, coverLetter)}
                  >
                    Export JSON
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconMail size={16} />}
                    onClick={() => openPanel("cover")}
                  >
                    Cover letter
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconLayoutGrid size={16} />}
                    onClick={() => openPanel("template")}
                  >
                    Template
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconRobot size={16} />}
                    onClick={() => openPanel("ai")}
                    disabled={!aiEnabled}
                    rightSection={
                      aiEnabled ? null : (
                        <Text size="xs" c="dimmed">
                          Coming soon
                        </Text>
                      )
                    }
                  >
                    AI assistant
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconFileUpload size={16} />}
                    onClick={() => openPanel("import")}
                  >
                    Import
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          ) : (
            <Group gap="xs" wrap="nowrap">
              <ScoreBadge onClick={() => openPanel("ats")} />
              <ColorSchemeToggle />
              <Box visibleFrom="lg">
                <PageFitBadge />
              </Box>
              <Button
                variant="default"
                size="compact-sm"
                leftSection={<IconFileUpload size={14} />}
                onClick={() => openPanel("import")}
              >
                Import
              </Button>
              <Tooltip
                label="AI features are coming soon"
                withArrow
                disabled={aiEnabled}
                events={{ hover: true, focus: true, touch: true }}
              >
                <span>
                  <Button
                    variant="default"
                    size="compact-sm"
                    leftSection={<IconRobot size={14} />}
                    disabled={!aiEnabled}
                    onClick={() => openPanel("ai")}
                  >
                    AI
                  </Button>
                </span>
              </Tooltip>
              <Button
                variant="default"
                size="compact-sm"
                leftSection={<IconMail size={14} />}
                onClick={() => openPanel("cover")}
              >
                Cover letter
              </Button>
              <Button
                variant="default"
                size="compact-sm"
                leftSection={<IconLayoutGrid size={14} />}
                data-tour="template"
                onClick={() => openPanel("template")}
              >
                Template
              </Button>
              <Button
                size="compact-sm"
                leftSection={<IconFileTypePdf size={14} />}
                onClick={triggerPrint}
              >
                PDF
              </Button>
              <Tooltip label="Download JSON backup" withArrow>
                <ActionIcon
                  variant="default"
                  size="lg"
                  onClick={() => exportJson(document, settings, coverLetter)}
                  aria-label="Export JSON"
                >
                  <IconDownload size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {importedAt && (
          <Group
            justify="space-between"
            style={{
              background: "var(--color-surface-muted)",
              borderBottom: "1px solid var(--color-border)",
            }}
            px="md"
            py={6}
          >
            <Text size="xs" c="var(--color-text)">
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

        {/* Mobile toggle */}
        <Box hiddenFrom="md" p="xs" data-tour="mobile-tabs">
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
            data-tour="form"
            w={{ base: "100%", md: "40%" }}
            style={{
              flexDirection: "column",
              overflow: "hidden",
              borderRight: "1px solid var(--color-border)",
            }}
            data-show-desktop
          >
            <ScrollArea style={{ flex: 1 }} px="sm" py="xs">
              <Accordion
                value={openSection}
                onChange={setOpenSection}
                variant="separated"
                radius="md"
                styles={{
                  item: { background: "var(--color-surface-raised)" },
                  content: { paddingTop: "var(--mantine-spacing-sm)" },
                }}
              >
                <Accordion.Item value="contact">
                  <Accordion.Control
                    aria-label="Contact section"
                    ref={(element) => {
                      if (element) accordionRefs.current.set("contact", element);
                      else accordionRefs.current.delete("contact");
                    }}
                  >
                    Contact
                  </Accordion.Control>
                  <Accordion.Panel>
                    <ContactForm />
                  </Accordion.Panel>
                </Accordion.Item>
                {SECTION_TABS.map((tab) => (
                  <Accordion.Item key={tab.id} value={tab.id}>
                    <Accordion.Control
                      aria-label={`${tabLabel(tab)} section`}
                      ref={(element) => {
                        if (element) accordionRefs.current.set(tab.id, element);
                        else accordionRefs.current.delete(tab.id);
                      }}
                    >
                      {tabLabel(tab)}
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
            data-tour="preview"
            className={`editor-preview-pane${mobileTab === "preview" ? "" : " editor-pane-hidden-mobile"}`}
            aria-label="Live resume preview"
          >
            <PreviewScaler>
              <PreviewBreakDocument innerRef={printRef} />
            </PreviewScaler>
          </Box>
        </Group>

        {/* Drawer panels */}
        <Drawer
          opened={panel === "template"}
          onClose={() => setPanel("none")}
          title="Template & customization"
          position="right"
          size={isMobile ? "100%" : "md"}
          padding="md"
        >
          <TemplatePanel />
        </Drawer>
        <Drawer
          opened={panel === "ats"}
          onClose={() => setPanel("none")}
          title="ATS Score"
          position="right"
          size={isMobile ? "100%" : "md"}
          padding="md"
        >
          <AtsPanel onJumpToSection={jumpToSection} />
        </Drawer>
        <Drawer
          opened={panel === "ai"}
          onClose={() => setPanel("none")}
          title="AI assistant"
          position="right"
          size={isMobile ? "100%" : "md"}
          padding="md"
        >
          <AiPanel />
        </Drawer>
        <Drawer
          opened={panel === "import"}
          onClose={() => setPanel("none")}
          title="Import resume"
          position="right"
          size={isMobile ? "100%" : "md"}
          padding="md"
        >
          <ImportPanel />
        </Drawer>
        <Drawer
          opened={panel === "cover"}
          onClose={() => setPanel("none")}
          title="Cover letter"
          position="right"
          size={isMobile ? "100%" : "md"}
          padding="md"
        >
          <CoverLetterPanel onJumpToSection={jumpToSection} />
        </Drawer>
        <Modal
          opened={printHintOpen}
          onClose={() => setPrintHintOpen(false)}
          title="Getting a clean PDF"
          centered
        >
          <Stack gap="sm">
            <Text size="sm">
              The browser adds its own header and footer when printing: the date,
              the page title, the site URL and the page number. Those lines are
              drawn outside the page, in the margin area, so a stylesheet cannot
              remove them.
            </Text>
            <Text size="sm">
              In the print dialog, open <strong>More settings</strong> and clear{" "}
              <strong>Headers and footers</strong>. Choose <strong>Save as PDF</strong> as
              the destination, and set margins to <strong>None</strong> or{" "}
              <strong>Default</strong>, because the resume supplies its own margins.
            </Text>
            <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
              Your page breaks, margins and page count are already correct. This
              setting only affects the browser&apos;s extra text around the page.
            </Alert>
          </Stack>
        </Modal>
        <EditorTour
          enabled={tourEnabled}
          isEmpty={isEmpty}
          isMobile={isMobile}
          onBeforeStart={() => setMobileTab("form")}
        />
        </AppShell.Main>
      </AppShell>
    </PreviewMeasurementProvider>
  );
}
