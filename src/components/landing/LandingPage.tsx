"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowRight,
  IconBrandGithub,
  IconDeviceFloppy,
  IconFileTypePdf,
  IconGauge,
  IconLock,
  IconRobot,
  IconTemplate,
} from "@tabler/icons-react";
import { ResumePreview } from "@/components/templates";
import { createEmptyDocument, createDefaultSettings } from "@/lib/schema";
import type { ResumeDocument } from "@/lib/schema";

function buildSampleDocument(): ResumeDocument {
  const doc = createEmptyDocument();
  doc.contact = {
    name: "Alex Morgan",
    headline: "Senior Product Designer",
    email: "alex.morgan@example.com",
    phone: "+1 (555) 012-3456",
    location: "Portland, OR",
    linkedin: "linkedin.com/in/alexmorgan",
  };
  doc.summary =
    "Product designer with 8+ years crafting accessible, data-informed experiences for B2B SaaS. Led design systems adopted by 40+ engineers and shipped features used by 2M+ users.";
  doc.experience = [
    {
      id: "sample-1",
      role: "Senior Product Designer",
      company: "Northwind Labs",
      location: "Portland, OR",
      startDate: "2021-03",
      isCurrent: true,
      bullets: [
        "Led redesign of onboarding flow, lifting activation from 34% to 52%",
        "Built and documented a 120-component design system in Figma",
        "Partnered with data science to ship an experimentation playbook",
      ],
    },
    {
      id: "sample-2",
      role: "Product Designer",
      company: "Brightpath",
      location: "Seattle, WA",
      startDate: "2017-06",
      endDate: "2021-02",
      isCurrent: false,
      bullets: [
        "Shipped mobile checkout flow generating $4.2M ARR",
        "Ran 30+ moderated usability sessions to inform roadmap",
      ],
    },
  ];
  doc.skills = [
    {
      id: "sample-s1",
      category: "Design",
      items: ["Figma", "Design Systems", "Prototyping", "User Research"],
    },
    {
      id: "sample-s2",
      category: "Collaboration",
      items: ["Design Ops", "Workshop Facilitation", "Accessibility"],
    },
  ];
  doc.education = [
    {
      id: "sample-e1",
      school: "University of Washington",
      degree: "BDes",
      field: "Interaction Design",
      startDate: "2013",
      endDate: "2017",
      bullets: [],
    },
  ];
  return doc;
}

const GITHUB_URL = "https://github.com/mhdhaikalll";

const FEATURES = [
  {
    icon: IconLock,
    title: "Local-first privacy",
    body: "Your resume never leaves your browser. Autosaves to localStorage — no account, no cloud.",
  },
  {
    icon: IconGauge,
    title: "Deterministic ATS score",
    body: "Real-time heuristic scoring against 40+ checks. Paste a job description for keyword matching.",
  },
  {
    icon: IconTemplate,
    title: "10 ATS-safe templates",
    body: "Single reading order, semantic HTML, real text everywhere. Built to survive parsers.",
  },
  {
    icon: IconFileTypePdf,
    title: "Print-perfect PDF",
    body: "One click to a pixel-accurate A4 or Letter PDF via your browser's print pipeline.",
  },
  {
    icon: IconRobot,
    title: "Optional AI assist",
    body: "Rewrite bullets, summarize, or deep-review against a job post. Explicit consent, always.",
  },
  {
    icon: IconDeviceFloppy,
    title: "Import & export",
    body: "Parse PDF/DOCX resumes locally, or back up and restore as versioned JSON.",
  },
];

export function LandingPage() {
  const [sample] = useState(buildSampleDocument);
  const [settings] = useState(() => ({
    ...createDefaultSettings(),
    templateId: "classic" as const,
    primaryColor: "#2b6469",
    accentColor: "#478f94",
  }));

  return (
    <Box className="landing-root">
      {/* Header */}
      <Container size="lg" py="md">
        <Group justify="space-between">
          <Text fw={700} size="lg" c="brand.8">
            LocalCV
          </Text>
          <Group gap="sm">
            <Button
              component={Link}
              href="/resume"
              variant="subtle"
              color="brand"
              size="sm"
            >
              Open editor
            </Button>
            <Button
              component={Link}
              href="/resume"
              size="sm"
              rightSection={<IconArrowRight size={16} />}
            >
              Start building
            </Button>
          </Group>
        </Group>
      </Container>

      {/* Hero */}
      <Container size="lg" pt={60} pb={80}>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={60} style={{ alignItems: "center" }}>
          <Stack gap="lg" className="hero-copy">
            <Badge variant="light" color="brand" size="lg" w="fit-content">
              Free · No account · ATS-friendly
            </Badge>
            <Title order={1} fz={{ base: 36, md: 48 }} lh={1.1} c="brand.9">
              Build a resume that actually gets read.
            </Title>
            <Text size="lg" c="dimmed" maw={480}>
              A local-first resume builder with deterministic ATS scoring, ten
              parser-safe templates, and print-perfect PDF export. Your data stays
              in your browser — always.
            </Text>
            <Group>
              <Button
                component={Link}
                href="/resume"
                size="lg"
                rightSection={<IconArrowRight size={18} />}
              >
                Start building — it&apos;s free
              </Button>
              <Button
                component={Link}
                href="/resume"
                size="lg"
                variant="default"
              >
                See the editor
              </Button>
            </Group>
            <Group gap="xl" mt="sm">
              {[
                ["10", "templates"],
                ["100%", "local-first"],
                ["0", "signups"],
              ].map(([n, label]) => (
                <div key={label}>
                  <Text fw={700} fz={28} c="brand.7">
                    {n}
                  </Text>
                  <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: "0.08em" }}>
                    {label}
                  </Text>
                </div>
              ))}
            </Group>
          </Stack>

          {/* Floating resume preview */}
          <Box className="hero-preview">
            <Box className="hero-float">
              <Box className="hero-resume-frame">
                <Box style={{ transform: "scale(0.52)", transformOrigin: "top left", width: 816 }}>
                  <ResumePreview document={sample} settings={settings} />
                </Box>
              </Box>
              <Box className="hero-chip hero-chip-a">
                <Badge color="green" variant="filled" size="lg">
                  ATS 92
                </Badge>
              </Box>
              <Box className="hero-chip hero-chip-b">
                <Badge color="brand" variant="filled" size="lg">
                  PDF ready
                </Badge>
              </Box>
            </Box>
          </Box>
        </SimpleGrid>
      </Container>

      {/* Features */}
      <Box bg="white" py={72} style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} ta="center" maw={560} mx="auto">
              <Title order={2} c="brand.9">
                Everything you need, nothing you don&apos;t
              </Title>
              <Text c="dimmed">
                No accounts, no subscriptions, no lock-in. Just a careful tool for a
                high-stakes document.
              </Text>
            </Stack>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
              {FEATURES.map((f, i) => (
                <Stack
                  key={f.title}
                  gap="xs"
                  className="feature-card"
                  style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                >
                  <ThemeIcon size={40} radius="md" variant="light" color="brand">
                    <f.icon size={22} />
                  </ThemeIcon>
                  <Text fw={600}>{f.title}</Text>
                  <Text size="sm" c="dimmed">
                    {f.body}
                  </Text>
                </Stack>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* CTA */}
      <Box py={80}>
        <Container size="sm" ta="center">
          <Stack gap="md" align="center">
            <Title order={2} c="brand.9">
              Ready when you are
            </Title>
            <Text c="dimmed" maw={440}>
              Open the editor, start typing, and watch the preview update live. Your
              work autosaves in this browser.
            </Text>
            <Button
              component={Link}
              href="/resume"
              size="lg"
              rightSection={<IconArrowRight size={18} />}
            >
              Open the editor
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Footer */}
      <Box py="lg" style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
        <Container size="lg">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              LocalCV — local-first, ATS-friendly resume builder.
            </Text>
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                Your data never leaves your browser.
              </Text>
              <Tooltip label="View on GitHub" withArrow>
                <ActionIcon
                  component="a"
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="default"
                  size="md"
                  aria-label="GitHub repository"
                >
                  <IconBrandGithub size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Container>
      </Box>
    </Box>
  );    
}
