"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Burger,
  Button,
  ColorSwatch,
  Container,
  Divider,
  Drawer,
  Group,
  Progress,
  RingProgress,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconArrowRight,
  IconBrandGithub,
  IconCheck,
  IconFileTypePdf,
  IconGauge,
  IconLock,
  IconTemplate,
  IconWifiOff,
} from "@tabler/icons-react";
import { ResumeFrame } from "./ResumeFrame";
import {
  buildSampleDocument,
  buildSampleSettings,
  isPhotoTemplate,
  PLACEHOLDER_PHOTO,
  SAMPLE_JOB_POSTING,
  SAMPLE_PALETTES,
  SAMPLE_TEMPLATES,
  withPhoto,
} from "./sample";
import { computeAtsScore } from "@/lib/ats/scoring";
import { TEMPLATE_REGISTRY } from "@/lib/templates/registry";
import { SITE, FAQS } from "@/lib/seo/site";
import type { TemplateId } from "@/lib/schema";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#templates", label: "Templates" },
  { href: "#ats", label: "ATS score" },
  { href: "#faq", label: "FAQ" },
];

const STEPS = [
  {
    title: "Write the content",
    body: "Fill in the sections that matter, in the order you want them read. The preview updates as you type, and your work saves in this browser.",
  },
  {
    title: "Check how it reads",
    body: "Run the built-in ATS checks, then paste a job post to see which required terms your resume already covers and which are missing.",
  },
  {
    title: "Export and send",
    body: "Print to PDF with selectable text, or keep a JSON backup you can import later. No watermark, no forced sign-up screen.",
  },
];

const PRIVACY_POINTS = [
  {
    icon: IconLock,
    title: "No uploads",
    body: "Editing, scoring, import, and export run in your browser. Your resume is stored in local storage on this device.",
  },
  {
    icon: IconWifiOff,
    title: "Works offline",
    body: "After the page loads, you can keep editing without a connection. Nothing waits on a server round trip.",
  },
  {
    icon: IconFileTypePdf,
    title: "You keep the file",
    body: "PDFs are generated locally through your browser's print pipeline, so the text stays searchable and machine-readable.",
  },
];

function scoreColor(score: number): string {
  if (score >= 75) return "green";
  if (score >= 50) return "yellow";
  return "red";
}

export function LandingPage() {
  const [sample] = useState(buildSampleDocument);
  const [heroTemplate, setHeroTemplate] = useState<TemplateId>("classic");
  const [heroPalette, setHeroPalette] = useState(0);
  const [template, setTemplate] = useState<TemplateId>("classic");
  const [jobPost, setJobPost] = useState("");
  const [useJobPost, setUseJobPost] = useState(false);
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [menuOpened, menu] = useDisclosure(false);

  const photoSample = useMemo(() => withPhoto(sample, PLACEHOLDER_PHOTO), [sample]);
  const heroSettings = useMemo(
    () => buildSampleSettings(heroTemplate, heroPalette),
    [heroTemplate, heroPalette],
  );
  const templateSettings = useMemo(() => buildSampleSettings(template, 0), [template]);

  const ats = useMemo(
    () => computeAtsScore(sample, buildSampleSettings("classic", 0), useJobPost ? jobPost : ""),
    [sample, useJobPost, jobPost],
  );


  return (
    <Box className="landing-root" id="top">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="landing-header">
        <Container size="lg" h="100%">
          <Group justify="space-between" h="100%" wrap="nowrap">
            <Group gap={10} wrap="nowrap">
              <span className="landing-mark" aria-hidden />
              <Text fw={700} size="lg" className="landing-wordmark">
                LocalCV
              </Text>
            </Group>

            <Group gap={28} component="nav" aria-label="Sections" visibleFrom="md">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="landing-nav-link">
                  {link.label}
                </a>
              ))}
            </Group>

            <Group gap="sm" wrap="nowrap">
              <Tooltip label="View source on GitHub" withArrow>
                <ActionIcon
                  component="a"
                  href={SITE.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label="GitHub repository"
                  visibleFrom="sm"
                >
                  <IconBrandGithub size={19} />
                </ActionIcon>
              </Tooltip>
              <Button component={Link} href="/resume" size="sm" visibleFrom="sm">
                Open editor
              </Button>
              <Burger
                opened={menuOpened}
                onClick={menu.toggle}
                hiddenFrom="md"
                size="sm"
                aria-label="Open menu"
              />
            </Group>
          </Group>
        </Container>
      </header>

      <Drawer
        opened={menuOpened}
        onClose={menu.close}
        position="right"
        size="xs"
        title="Menu"
      >
        <Stack gap="lg">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="landing-nav-link landing-nav-link-mobile"
              onClick={menu.close}
            >
              {link.label}
            </a>
          ))}
          <Divider />
          <Button component={Link} href="/resume" onClick={menu.close} fullWidth>
            Open editor
          </Button>
          <Button
            component="a"
            href={SITE.github}
            target="_blank"
            rel="noopener noreferrer"
            variant="subtle"
            color="gray"
            leftSection={<IconBrandGithub size={17} />}
            fullWidth
          >
            Source on GitHub
          </Button>
        </Stack>
      </Drawer>

      <main id="main">
        {/* Hero */}
        <Box component="section" className="landing-hero">
          <Container size="lg" py={{ base: 48, md: 80 }}>
            <SimpleGrid
              cols={{ base: 1, md: 2 }}
              spacing={{ base: 40, md: 64 }}
              style={{ alignItems: "center" }}
            >
              <Stack gap="lg">
                <Text className="landing-eyebrow">Free resume builder</Text>
                <Title order={1} className="landing-title">
                  A resume that reads cleanly to people and to software.
                </Title>
                <Text size="lg" c="dimmed" className="landing-lede">
                  Write it in your browser, check it against real ATS checks, and export a
                  PDF. No account, no uploads, and nothing to unsubscribe from.
                </Text>
                <Group gap="sm">
                  <Button
                    component={Link}
                    href="/resume"
                    size="md"
                    rightSection={<IconArrowRight size={17} />}
                  >
                    Start building
                  </Button>
                  <Button component="a" href="#templates" size="md" variant="default">
                    Browse templates
                  </Button>
                </Group>
                <Group gap={20} className="landing-assurances">
                  {["No account needed", "Saves in your browser", "PDF export"].map((item) => (
                    <Group key={item} gap={6} wrap="nowrap">
                      <IconCheck size={15} className="landing-check" />
                      <Text size="sm" c="dimmed">
                        {item}
                      </Text>
                    </Group>
                  ))}
                </Group>
              </Stack>

              <Box>
                <Box className="preview-card">
                  <Group justify="space-between" className="preview-toolbar" wrap="nowrap">
                    <Text size="xs" fw={600} className="preview-toolbar-label">
                      Live preview
                    </Text>
                    <Group gap={6} wrap="nowrap">
                      {SAMPLE_PALETTES.map((palette, index) => (
                        <UnstyledButton
                          key={palette.name}
                          onClick={() => setHeroPalette(index)}
                          aria-label={`${palette.name} accent color`}
                          aria-pressed={heroPalette === index}
                          className="palette-button"
                          data-active={heroPalette === index || undefined}
                        >
                          <ColorSwatch color={palette.accent} size={18} />
                        </UnstyledButton>
                      ))}
                    </Group>
                  </Group>

                  <Box className="preview-stage">
                    <ResumeFrame
                      document={photoSample}
                      settings={heroSettings}
                      ariaLabel={`Resume preview using the ${
                        SAMPLE_TEMPLATES.find((t) => t.id === heroTemplate)?.label
                      } template`}
                    />
                  </Box>

                  <Box className="preview-controls">
                    <Box className="preview-segmented">
                      <SegmentedControl
                        size="xs"
                        fullWidth
                        value={heroTemplate}
                        onChange={(value) => setHeroTemplate(value as TemplateId)}
                        data={SAMPLE_TEMPLATES.map((t) => ({ value: t.id, label: t.label }))}
                        aria-label="Preview template"
                      />
                    </Box>
                  </Box>
                </Box>
                <Text size="xs" c="dimmed" ta="center" mt={10} className="hero-caption">
                  A real template rendered at page size. Switch layouts or accent color to
                  compare.
                </Text>
              </Box>
            </SimpleGrid>
          </Container>
        </Box>

        {/* How it works */}
        <Box component="section" id="how-it-works" className="landing-section">
          <Container size="lg" py={{ base: 48, md: 72 }}>
            <Stack gap={8} maw={560}>
              <Text className="landing-eyebrow">Three passes</Text>
              <Title order={2} className="landing-h2">
                Write it once. Check it properly. Send it.
              </Title>
              <Text c="dimmed">
                Most resume tools stop at formatting. The part that decides whether you get a
                call is whether the document can be read and whether it matches the role.
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={32} mt={40}>
              {STEPS.map((step, index) => (
                <Box key={step.title} className="step">
                  <Text className="step-number">{String(index + 1).padStart(2, "0")}</Text>
                  <Text fw={600} mt={10}>
                    {step.title}
                  </Text>
                  <Text size="sm" c="dimmed" mt={6}>
                    {step.body}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          </Container>
        </Box>

        {/* Plain-language summary, kept for search and answer engines */}
        <Box component="section" id="about" className="landing-section">
          <Container size="lg" py={{ base: 40, md: 56 }}>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: 24, md: 64 }}>
              <Title order={2} className="landing-h3">
                What is LocalCV?
              </Title>
              <Stack gap="md">
                <Text size="sm" c="dimmed">
                  LocalCV is a free resume builder that runs in your browser. It uses twelve
                  parser-safe templates, scores your resume against a fixed set of ATS
                  checks, and exports a PDF with selectable text. There is no account, no
                  subscription, and no upload; your resume is stored in local storage on the
                  device you use.
                </Text>
                <Group gap={24} wrap="wrap">
                  {[
                    "Costs nothing",
                    "No account required",
                    "Core features work offline",
                  ].map((fact) => (
                    <Group key={fact} gap={6} wrap="nowrap">
                      <IconCheck size={14} className="landing-check" />
                      <Text size="sm">{fact}</Text>
                    </Group>
                  ))}
                </Group>
              </Stack>
            </SimpleGrid>
          </Container>
        </Box>

        {/* Templates */}
        <Box component="section" id="templates" className="landing-section landing-section-muted">
          <Container size="lg" py={{ base: 48, md: 72 }}>
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={{ base: 40, md: 56 }}>
              <Stack gap="lg">
                <Stack gap={8}>
                  <Text className="landing-eyebrow">Templates</Text>
                  <Title order={2} className="landing-h2">
                    Twelve layouts, one reading order.
                  </Title>
                  <Text c="dimmed">
                    Every template uses real text, semantic sections, and a linear reading
                    order. The two-column layouts still put your content in a sequence a
                    parser can follow. Two photo layouts are included for fields where a
                    headshot is expected; the preview shows how they frame an image.
                  </Text>
                </Stack>

                <SimpleGrid cols={{ base: 2, sm: 2 }} spacing={10}>
                  {TEMPLATE_REGISTRY.map((item) => (
                    <UnstyledButton
                      key={item.id}
                      onClick={() => setTemplate(item.id)}
                      aria-pressed={template === item.id}
                      data-active={template === item.id || undefined}
                      className="template-option"
                    >
                      <Group justify="space-between" gap={6} wrap="nowrap" align="flex-start">
                        <Text size="sm" fw={template === item.id ? 600 : 500} className="template-option-name">
                          {item.name}
                        </Text>
                        {template === item.id ? (
                          <IconCheck size={15} className="landing-check" />
                        ) : (
                          <Text size="xs" c="dimmed" className="template-columns">
                            {item.columns} col
                          </Text>
                        )}
                      </Group>
                      <Text
                        size="xs"
                        c="dimmed"
                        mt={2}
                        lineClamp={2}
                        className="template-option-description"
                      >
                        {item.description}
                      </Text>
                    </UnstyledButton>
                  ))}
                </SimpleGrid>

                <Group gap="sm">
                  <Button
                    component={Link}
                    href="/resume"
                    variant="default"
                    rightSection={<IconArrowRight size={16} />}
                  >
                    Use this template
                  </Button>
                  <Text size="xs" c="dimmed">
                    Font size, spacing, and margins are adjustable in the editor.
                  </Text>
                </Group>
              </Stack>

              <Box className="template-preview">
                <Box className="preview-card">
                  <Group justify="space-between" className="preview-toolbar" wrap="nowrap">
                    <Group gap={6} wrap="nowrap">
                      <IconTemplate size={15} />
                      <Text size="xs" fw={600} className="preview-toolbar-label">
                        {TEMPLATE_REGISTRY.find((t) => t.id === template)?.name}
                      </Text>
                    </Group>
                    <Badge size="sm" variant="light" color="brand" radius="sm">
                      ATS-safe
                    </Badge>
                  </Group>
                  <Box className="preview-stage">
                    <ResumeFrame
                      document={isPhotoTemplate(template) ? photoSample : sample}
                      settings={templateSettings}
                      ariaLabel={`Preview of the ${
                        TEMPLATE_REGISTRY.find((t) => t.id === template)?.name
                      } template`}
                    />
                  </Box>
                  <Box className="template-preview-caption">
                    <Text size="xs" c="dimmed">
                      {TEMPLATE_REGISTRY.find((t) => t.id === template)?.description}
                    </Text>
                    {isPhotoTemplate(template) ? (
                      <Text size="xs" c="dimmed" mt={4}>
                        Photo layouts use a placeholder image here; your own photo can be
                        added in the editor.
                      </Text>
                    ) : null}
                  </Box>
                </Box>
              </Box>
            </SimpleGrid>
          </Container>
        </Box>

        {/* ATS demonstrator */}
        <Box component="section" id="ats" className="landing-section">
          <Container size="lg" py={{ base: 48, md: 72 }}>
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={{ base: 40, md: 56 }}>
              <Stack gap="lg" style={{ alignSelf: "center" }}>
                <Stack gap={8}>
                  <Text className="landing-eyebrow">ATS score</Text>
                  <Title order={2} className="landing-h2">
                    A score you can reason about.
                  </Title>
                  <Text c="dimmed">
                    The score comes from fixed rules: contact details, section completeness,
                    formatting safety, and keyword coverage against a job post. The same
                    resume always gets the same result, so you can see whether an edit helped.
                  </Text>
                  <Text c="dimmed">
                    It is a heuristic, not a simulation of any particular vendor&apos;s
                    software. Treat it as a checklist, not a guarantee.
                  </Text>
                </Stack>

                <Box className="ats-note">
                  <ThemeIcon variant="light" color="brand" size="lg" radius="md">
                    <IconGauge size={20} />
                  </ThemeIcon>
                  <Box>
                    <Text size="sm" fw={600}>
                      Try it on the sample resume
                    </Text>
                    <Text size="sm" c="dimmed">
                      Toggle the job post on the right. Edit the text to see the keyword
                      match change.
                    </Text>
                  </Box>
                </Box>
              </Stack>

              <Box className="ats-card">
                <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                  <Group gap="md" wrap="nowrap">
                    <RingProgress
                      size={92}
                      thickness={8}
                      roundCaps
                      sections={[{ value: ats.total, color: scoreColor(ats.total) }]}
                      label={
                        <Text ta="center" fw={700} size="lg">
                          {ats.total}
                        </Text>
                      }
                      aria-label={`Sample resume ATS score ${ats.total} of 100`}
                    />
                    <Box>
                      <Text fw={600} size="sm">
                        Sample resume
                      </Text>
                      <Text size="xs" c="dimmed">
                        {ats.hasJobDescription
                          ? "Scored against your job post"
                          : "Scored without a job post"}
                      </Text>
                      <Text size="xs" c="dimmed" mt={4}>
                        {ats.categories.length} categories · deterministic
                      </Text>
                    </Box>
                  </Group>

                  <SegmentedControl
                    size="xs"
                    value={useJobPost ? "with" : "without"}
                    onChange={(value) => {
                      const withJob = value === "with";
                      setUseJobPost(withJob);
                      if (withJob && !jobPost) setJobPost(SAMPLE_JOB_POSTING);
                    }}
                    data={[
                      { value: "without", label: "No job post" },
                      { value: "with", label: "Job post" },
                    ]}
                    aria-label="Job post comparison"
                    className="ats-toggle"
                  />
                </Group>

                {useJobPost ? (
                  <Box mt="md">
                    <Text size="xs" fw={600} mb={6}>
                      Job post
                    </Text>
                    <textarea
                      value={jobPost}
                      onChange={(event) => setJobPost(event.target.value)}
                      className="ats-textarea"
                      rows={isMobile ? 5 : 6}
                      spellCheck={false}
                      aria-label="Job post text used for keyword comparison"
                    />
                    <Text size="xs" c="dimmed" mt={6}>
                      Text stays in this page. Nothing is sent to a server.
                    </Text>
                  </Box>
                ) : null}

                <Stack gap="sm" mt="lg">
                  {ats.categories.map((category) => (
                    <Box key={category.id}>
                      <Group justify="space-between" mb={4} gap="xs" wrap="nowrap">
                        <Text size="xs" fw={500}>
                          {category.label}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {category.score}/{category.max}
                        </Text>
                      </Group>
                      <Progress
                        value={(category.score / category.max) * 100}
                        color={scoreColor((category.score / category.max) * 100)}
                        size="sm"
                        radius="xl"
                        aria-label={`${category.label} score ${category.score} of ${category.max}`}
                      />
                    </Box>
                  ))}
                </Stack>

                {useJobPost ? (
                  <Box mt="md" pt="md" className="ats-keywords">
                    <Text size="xs" fw={600} mb={8}>
                      {ats.missingKeywords.length
                        ? "Terms from the job post not found in the resume"
                        : "Every extracted term appears in the resume"}
                    </Text>
                    <Group gap={6}>
                      {ats.missingKeywords.slice(0, 8).map((item) => (
                        <Badge
                          key={item.keyword}
                          size="sm"
                          variant="light"
                          color="gray"
                          radius="sm"
                        >
                          {item.keyword}
                        </Badge>
                      ))}
                    </Group>
                  </Box>
                ) : null}
              </Box>
            </SimpleGrid>
          </Container>
        </Box>

        {/* Privacy */}
        <Box component="section" id="privacy" className="landing-section landing-section-muted">
          <Container size="lg" py={{ base: 48, md: 72 }}>
            <Stack gap={8} maw={600}>
              <Text className="landing-eyebrow">Privacy</Text>
              <Title order={2} className="landing-h2">
                Your resume stays where you wrote it.
              </Title>
              <Text c="dimmed">
                LocalCV is a static front end with no database for resume content. There is
                no account system to leak and no file storage to breach.
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={32} mt={40}>
              {PRIVACY_POINTS.map((point) => (
                <Box key={point.title} className="privacy-point">
                  <ThemeIcon variant="light" color="brand" size={38} radius="md">
                    <point.icon size={20} />
                  </ThemeIcon>
                  <Text fw={600} mt={12}>
                    {point.title}
                  </Text>
                  <Text size="sm" c="dimmed" mt={6}>
                    {point.body}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          </Container>
        </Box>

        {/* FAQ */}
        <Box component="section" id="faq" className="landing-section">
          <Container size="md" py={{ base: 48, md: 72 }}>
            <Stack gap="xl">
              <Stack gap={8}>
                <Text className="landing-eyebrow">Questions</Text>
                <Title order={2} className="landing-h2">
                  Answers before you start
                </Title>
                <Text c="dimmed">
                  If something is still unclear, the source is public and the whole app runs
                  on your machine.
                </Text>
              </Stack>
              <Accordion variant="separated" radius="md" className="landing-accordion">
                {FAQS.map((faq) => (
                  <Accordion.Item key={faq.question} value={faq.question}>
                    <Accordion.Control>
                      <Text fw={600} size="sm">
                        {faq.question}
                      </Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Text size="sm" c="dimmed">
                        {faq.answer}
                      </Text>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </Stack>
          </Container>
        </Box>

        {/* Closing CTA */}
        <Box component="section" className="landing-cta">
          <Container size="lg" py={{ base: 48, md: 64 }}>
            <Group justify="space-between" gap="xl" wrap="wrap">
              <Stack gap={6} maw={520}>
                <Title order={2} className="landing-h2">
                  Start with a blank page or an existing file.
                </Title>
                <Text c="dimmed">
                  Import a PDF or DOCX, or type the first section yourself. Nothing is
                  committed until you decide to export.
                </Text>
              </Stack>
              <Group gap="sm">
                <Button
                  component={Link}
                  href="/resume"
                  size="md"
                  rightSection={<IconArrowRight size={17} />}
                >
                  Open the editor
                </Button>
                <Button
                  component="a"
                  href={SITE.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="md"
                  variant="default"
                  leftSection={<IconBrandGithub size={17} />}
                >
                  View source
                </Button>
              </Group>
            </Group>
          </Container>
        </Box>
      </main>

      <Box component="footer" className="landing-footer">
        <Container size="lg" py="xl">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={32}>
            <Stack gap={8}>
              <Group gap={8}>
                <span className="landing-mark" aria-hidden />
                <Text fw={700}>LocalCV</Text>
              </Group>
              <Text size="sm" c="dimmed" maw={280}>
                A local-first resume builder. Open source, no account, no uploads.
              </Text>
            </Stack>

            <Stack gap={8}>
              <Text size="xs" fw={600} tt="uppercase" className="landing-footer-heading">
                Product
              </Text>
              <a href="#templates" className="landing-footer-link">
                Templates
              </a>
              <a href="#ats" className="landing-footer-link">
                ATS score
              </a>
              <Link href="/resume" className="landing-footer-link">
                Resume editor
              </Link>
            </Stack>

            <Stack gap={8}>
              <Text size="xs" fw={600} tt="uppercase" className="landing-footer-heading">
                Elsewhere
              </Text>
              <a
                href={SITE.github}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-footer-link"
              >
                GitHub
              </a>
              <a
                href="/llms.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-footer-link"
              >
                llms.txt
              </a>
            </Stack>
          </SimpleGrid>
          <Divider my="lg" />
          <Group justify="space-between" gap="sm">
            <Text size="xs" c="dimmed">
              Built for people who would rather not hand over their work history to another
              SaaS product.
            </Text>
            <Text size="xs" c="dimmed">
              Analytics are cookieless.
            </Text>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
