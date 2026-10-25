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
  VisuallyHidden,
} from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconGripVertical } from "@tabler/icons-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { TEMPLATE_REGISTRY } from "@/lib/templates/registry";
import { FONT_STACKS } from "@/lib/templates/style-context";
import { ResumeSettingsSchema, getSectionLabel } from "@/lib/schema";
import { usePointerSort } from "./use-pointer-sort";

export function TemplatePanel() {
  const settings = useResumeStore((s) => s.settings);
  const document = useResumeStore((s) => s.document);
  const updateSettings = useResumeStore((s) => s.updateSettings);
  const descriptor = TEMPLATE_REGISTRY.find((t) => t.id === settings.templateId);

  const patch = (patchData: Partial<typeof settings>) => {
    const next = ResumeSettingsSchema.safeParse({ ...settings, ...patchData });
    if (next.success) updateSettings(next.data);
  };

  const sort = usePointerSort({
    ids: document.sectionOrder,
    onCommit: (order) => useResumeStore.getState().reorderSections(order),
    labelFor: (id) => getSectionLabel(document, id),
  });

  const moveBy = (index: number, delta: number) => {
    const next = [...document.sectionOrder];
    const target = index + delta;
    [next[target], next[index]] = [next[index], next[target]];
    useResumeStore.getState().reorderSections(next);
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
                    ? // A brand tint, not brand-0: that shade is near-white and
                      // would leave the selected card brighter than the panel in
                      // dark mode.
                      "color-mix(in srgb, var(--mantine-color-brand-6) 14%, transparent)"
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
        <div role="list" aria-roledescription="sortable list" style={{ position: "relative" }}>
          {sort.indicatorTop !== null && sort.activeId !== null && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: sort.indicatorTop - 1,
                height: 2,
                background: "var(--mantine-color-brand-6)",
                borderRadius: 1,
                pointerEvents: "none",
                zIndex: 2,
              }}
            />
          )}
          {document.sectionOrder.map((id, i) => {
            const label = getSectionLabel(document, id);
            const dragging = sort.activeId === id;
            return (
              <Group
                key={id}
                role="listitem"
                ref={(element) => sort.setRowRef(id, element)}
                justify="space-between"
                wrap="nowrap"
                gap={4}
                py={4}
                style={{
                  position: "relative",
                  touchAction: "pan-y",
                  background: "var(--color-surface-raised)",
                  boxShadow: dragging ? "0 2px 8px rgba(0, 0, 0, 0.16)" : undefined,
                  zIndex: dragging ? 1 : undefined,
                }}
              >
                <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    aria-label={`Reorder ${label}`}
                    style={{ cursor: "grab", touchAction: "none" }}
                    onPointerDown={(event) => {
                      sort.startDrag(id, i, event);
                    }}
                  >
                    <IconGripVertical size={14} />
                  </ActionIcon>
                  <Text size="sm" style={{ textTransform: "capitalize" }}>
                    {label}
                  </Text>
                </Group>
                <Group gap={4} wrap="nowrap">
                  <Tooltip label="Move up" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      disabled={i === 0}
                      aria-label={`Move ${label} up`}
                      onClick={() => moveBy(i, -1)}
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
                      aria-label={`Move ${label} down`}
                      onClick={() => moveBy(i, 1)}
                    >
                      <IconArrowDown size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            );
          })}
        </div>
        <VisuallyHidden aria-live="polite">{sort.announcement}</VisuallyHidden>
      </Fieldset>
    </Stack>
  );
}
