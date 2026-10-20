"use client";

import {
  ActionIcon,
  Button,
  Card,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from "@tabler/icons-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { uuid } from "@/lib/uuid";
import {
  ADDITIONAL_HEADINGS,
  DEFAULT_ADDITIONAL_HEADING,
  type AdditionalEntry,
} from "@/lib/schema";

const PRESET_HEADINGS = new Set<string>(ADDITIONAL_HEADINGS);
const CUSTOM_VALUE = "__custom__";

const HEADING_OPTIONS = [
  ...ADDITIONAL_HEADINGS.map((heading) => ({ value: heading, label: heading })),
  { value: CUSTOM_VALUE, label: "Custom heading" },
];

function newEntry(): AdditionalEntry {
  return { id: uuid(), title: "", bullets: [] };
}

function EntryCard({ item, index }: { item: AdditionalEntry; index: number }) {
  const entries = useResumeStore((s) => s.document.additional.entries);
  const updateDocument = useResumeStore((s) => s.updateDocument);

  const patch = (patchData: Partial<AdditionalEntry>) =>
    updateDocument((draft) => {
      draft.additional.entries[index] = { ...draft.additional.entries[index], ...patchData };
      return draft;
    });

  const remove = () =>
    updateDocument((draft) => {
      draft.additional.entries.splice(index, 1);
      return draft;
    });

  const move = (dir: -1 | 1) =>
    updateDocument((draft) => {
      const target = index + dir;
      if (target < 0 || target >= draft.additional.entries.length) return draft;
      [draft.additional.entries[index], draft.additional.entries[target]] = [
        draft.additional.entries[target],
        draft.additional.entries[index],
      ];
      return draft;
    });

  return (
    <Card withBorder radius="md" padding="sm" bg="gray.0">
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="xs" fw={600} c="dimmed">
            #{index + 1}
          </Text>
          <Group gap={4}>
            <Tooltip label="Move up" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                disabled={index === 0}
                onClick={() => move(-1)}
                aria-label={`Move entry ${index + 1} up`}
              >
                <IconArrowUp size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Move down" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                disabled={index === entries.length - 1}
                onClick={() => move(1)}
                aria-label={`Move entry ${index + 1} down`}
              >
                <IconArrowDown size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Remove" withArrow>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                onClick={remove}
                aria-label={`Remove entry ${index + 1}`}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
        <TextInput
          label="Title"
          placeholder="Dean's List"
          value={item.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
        <SimpleGrid cols={2}>
          <TextInput
            label="Subtitle"
            placeholder="College of Engineering"
            value={item.subtitle ?? ""}
            onChange={(e) => patch({ subtitle: e.target.value })}
          />
          <TextInput
            label="Date"
            placeholder="2024"
            value={item.date ?? ""}
            onChange={(e) => patch({ date: e.target.value })}
          />
        </SimpleGrid>
        <Textarea
          label="Bullets (one per line)"
          placeholder={"Awarded to the top 5% of the cohort\nPresented at..."}
          minRows={3}
          autosize
          value={item.bullets.join("\n")}
          onChange={(e) => patch({ bullets: e.target.value.split("\n") })}
        />
      </Stack>
    </Card>
  );
}

export function AdditionalForm() {
  const additional = useResumeStore((s) => s.document.additional);
  const updateDocument = useResumeStore((s) => s.updateDocument);
  const isPreset = PRESET_HEADINGS.has(additional.heading);

  const setHeading = (value: string) =>
    updateDocument((draft) => {
      draft.additional.heading = value.slice(0, 40);
      return draft;
    });

  return (
    <Stack gap="sm">
      <Select
        label="Section heading"
        description="Use a heading recruiters and resume parsers recognise."
        data={HEADING_OPTIONS}
        allowDeselect={false}
        value={isPreset ? additional.heading : CUSTOM_VALUE}
        onChange={(value) => {
          if (!value) return;
          setHeading(value === CUSTOM_VALUE ? DEFAULT_ADDITIONAL_HEADING : value);
        }}
      />

      {!isPreset ? (
        <TextInput
          label="Custom heading"
          placeholder={DEFAULT_ADDITIONAL_HEADING}
          maxLength={40}
          value={additional.heading}
          onChange={(e) => setHeading(e.target.value)}
        />
      ) : null}

      {additional.entries.map((item, i) => (
        <EntryCard key={item.id} item={item} index={i} />
      ))}

      <Button
        variant="light"
        leftSection={<IconPlus size={14} />}
        onClick={() =>
          updateDocument((draft) => {
            draft.additional.entries.push(newEntry());
            return draft;
          })
        }
      >
        Add entry
      </Button>
    </Stack>
  );
}
