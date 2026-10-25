"use client";

import {
  ActionIcon,
  Button,
  Card,
  Group,
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
import type { Extracurricular } from "@/lib/schema";

function newExtracurricular(): Extracurricular {
  return {
    id: uuid(),
    organization: "",
    bullets: [],
  };
}

function ExtracurricularCard({ item, index }: { item: Extracurricular; index: number }) {
  const updateDocument = useResumeStore((s) => s.updateDocument);

  const patch = (patchData: Partial<Extracurricular>) =>
    updateDocument((draft) => {
      draft.extracurriculars[index] = { ...draft.extracurriculars[index], ...patchData };
      return draft;
    });

  const remove = () =>
    updateDocument((draft) => {
      draft.extracurriculars.splice(index, 1);
      return draft;
    });

  const move = (dir: -1 | 1) =>
    updateDocument((draft) => {
      const target = index + dir;
      if (target < 0 || target >= draft.extracurriculars.length) return draft;
      [draft.extracurriculars[index], draft.extracurriculars[target]] = [
        draft.extracurriculars[target],
        draft.extracurriculars[index],
      ];
      return draft;
    });

  return (
    <Card withBorder radius="md" padding="sm" bg="var(--color-surface-muted)">
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
                onClick={() => move(-1)}
                aria-label={`Move activity ${index + 1} up`}
              >
                <IconArrowUp size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Move down" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => move(1)}
                aria-label={`Move activity ${index + 1} down`}
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
                aria-label={`Remove activity ${index + 1}`}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
        <TextInput
          label="Organization or programme"
          placeholder="American Red Cross"
          value={item.organization}
          onChange={(e) => patch({ organization: e.target.value })}
        />
        <SimpleGrid cols={2}>
          <TextInput
            label="Role"
            placeholder="Volunteer coordinator"
            value={item.role ?? ""}
            onChange={(e) => patch({ role: e.target.value })}
          />
          <TextInput
            label="Date"
            placeholder="Mar 2024"
            value={item.date ?? ""}
            onChange={(e) => patch({ date: e.target.value })}
          />
        </SimpleGrid>
        <Textarea
          label="Bullets (one per line)"
          placeholder={"Organized X, resulting in Y\nCoordinated..."}
          minRows={3}
          autosize
          value={item.bullets.join("\n")}
          onChange={(e) => patch({ bullets: e.target.value.split("\n") })}
        />
      </Stack>
    </Card>
  );
}

export function ExtracurricularsForm() {
  const extracurriculars = useResumeStore((s) => s.document.extracurriculars);
  const updateDocument = useResumeStore((s) => s.updateDocument);

  return (
    <Stack gap="sm">
      {extracurriculars.map((item, i) => (
        <ExtracurricularCard key={item.id} item={item} index={i} />
      ))}
      <Button
        variant="light"
        leftSection={<IconPlus size={14} />}
        onClick={() =>
          updateDocument((draft) => {
            draft.extracurriculars.push(newExtracurricular());
            return draft;
          })
        }
      >
        Add activity
      </Button>
    </Stack>
  );
}
