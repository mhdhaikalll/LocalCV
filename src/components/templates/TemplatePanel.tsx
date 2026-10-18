"use client";

import {
  ActionIcon,
  Badge,
  Card,
  ColorInput,
  Fieldset,
  Group,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { TEMPLATE_REGISTRY } from "@/lib/templates/registry";
import { FONT_STACKS } from "@/lib/templates/style-context";
import { ResumeSettingsSchema } from "@/lib/schema";

export function TemplatePanel() {
  const settings = useResumeStore((s) => s.settings);
  const document = useResumeStore((s) => s.document);
  const updateSettings = useResumeStore((s) => s.updateSettings);
  const descriptor = TEMPLATE_REGISTRY.find((t) => t.id === settings.templateId);

  const patch = (patchData: Partial<typeof settings>) => {
    const next = ResumeSettingsSchema.safeParse({ ...settings, ...patchData });
    if (next.success) updateSettings(next.data);
  };

  return (
    <Stack gap="lg">
      <SimpleGrid cols={2}>
        {TEMPLATE_REGISTRY.map((t) => (
          <UnstyledButton
            key={t.id}
            onClick={() => patch({ templateId: t.id })}
            aria-pressed={settings.templateId === t.id}
          >
            <Card
              withBorder
              radius="md"
              padding="sm"
              style={{
                borderColor:
                  settings.templateId === t.id
                    ? "var(--mantine-color-brand-6)"
                    : undefined,
                background:
                  settings.templateId === t.id
                    ? "var(--mantine-color-brand-0)"
                    : undefined,
              }}
            >
              <Text size="sm" fw={600}>
                {t.name}
              </Text>
              <Text size="xs" c="dimmed">
                {t.description}
              </Text>
              <Badge size="xs" variant="light" color="gray" mt={4}>
                {t.columns === 2 ? "2 columns" : "single column"} · ATS safe
                {t.id.startsWith("photo-") ? " · photo" : ""}
              </Badge>
            </Card>
          </UnstyledButton>
        ))}
      </SimpleGrid>

      <Select
        label={`Font family ${descriptor && !descriptor.customizable.font ? "(locked for this template)" : ""}`}
        data={Object.keys(FONT_STACKS)}
        value={settings.fontFamily}
        disabled={descriptor ? !descriptor.customizable.font : false}
        onChange={(v) => v && patch({ fontFamily: v })}
      />

      <div>
        <Text size="sm" fw={500} mb={4}>
          Font size: {settings.fontSize}pt
        </Text>
        <Slider
          min={8}
          max={16}
          step={0.5}
          value={settings.fontSize}
          onChange={(v) => patch({ fontSize: v })}
          label={(v) => `${v}pt`}
        />
      </div>

      <SimpleGrid cols={2}>
        <ColorInput
          label="Primary color"
          value={settings.primaryColor}
          onChange={(v) => patch({ primaryColor: v })}
        />
        <ColorInput
          label="Accent color"
          value={settings.accentColor}
          onChange={(v) => patch({ accentColor: v })}
        />
      </SimpleGrid>

      <div>
        <Text size="sm" fw={500} mb={4}>
          Line height: {settings.lineHeight}
        </Text>
        <Slider
          min={1}
          max={2}
          step={0.05}
          value={settings.lineHeight}
          onChange={(v) => patch({ lineHeight: v })}
        />
      </div>

      <SimpleGrid cols={2}>
        <Select
          label="Page size"
          data={[
            { value: "A4", label: "A4" },
            { value: "Letter", label: "Letter" },
          ]}
          value={settings.pageSize}
          onChange={(v) => v && patch({ pageSize: v as "A4" | "Letter" })}
        />
        <Select
          label="Spacing"
          data={[
            { value: "compact", label: "Compact" },
            { value: "normal", label: "Normal" },
            { value: "spacious", label: "Spacious" },
          ]}
          value={settings.spacing}
          onChange={(v) =>
            v && patch({ spacing: v as "compact" | "normal" | "spacious" })
          }
        />
      </SimpleGrid>

      <div>
        <Text size="sm" fw={500} mb={4}>
          Margins: {settings.margins}pt
        </Text>
        <Slider
          min={0}
          max={48}
          step={1}
          value={settings.margins}
          onChange={(v) => patch({ margins: v })}
          label={(v) => `${v}pt`}
        />
      </div>

      <Fieldset legend="Section order">
        <Stack gap={4}>
          {document.sectionOrder.map((id, i) => (
            <Group key={id} justify="space-between" wrap="nowrap">
              <Text size="sm" style={{ textTransform: "capitalize" }}>
                {id}
              </Text>
              <Group gap={4} wrap="nowrap">
                <Tooltip label="Move up" withArrow>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    disabled={i === 0}
                    aria-label={`Move ${id} up`}
                    onClick={() => {
                      const next = [...document.sectionOrder];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      useResumeStore.getState().reorderSections(next);
                    }}
                  >
                    <IconArrowUp size={14} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Move down" withArrow>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    disabled={i === document.sectionOrder.length - 1}
                    aria-label={`Move ${id} down`}
                    onClick={() => {
                      const next = [...document.sectionOrder];
                      [next[i + 1], next[i]] = [next[i], next[i + 1]];
                      useResumeStore.getState().reorderSections(next);
                    }}
                  >
                    <IconArrowDown size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          ))}
        </Stack>
      </Fieldset>
    </Stack>
  );
}
