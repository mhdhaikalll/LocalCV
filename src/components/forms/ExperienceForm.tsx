"use client";

import {
  ActionIcon,
  Button,
  Card,
  Checkbox,
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
import type { WorkExperience } from "@/lib/schema";

function newExperience(): WorkExperience {
  return {
    id: uuid(),
    role: "",
    company: "",
    bullets: [],
    isCurrent: false,
  };
}

function ExperienceCard({ item, index }: { item: WorkExperience; index: number }) {
  const updateDocument = useResumeStore((s) => s.updateDocument);

  const patch = (patchData: Partial<WorkExperience>) =>
    updateDocument((draft) => {
      draft.experience[index] = { ...draft.experience[index], ...patchData };
      return draft;
    });

  const remove = () =>
    updateDocument((draft) => {
      draft.experience.splice(index, 1);
      return draft;
    });

  const move = (dir: -1 | 1) =>
    updateDocument((draft) => {
      const target = index + dir;
      if (target < 0 || target >= draft.experience.length) return draft;
      [draft.experience[index], draft.experience[target]] = [
        draft.experience[target],
        draft.experience[index],
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
                onClick={() => move(-1)}
                aria-label={`Move experience ${index + 1} up`}
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
                aria-label={`Move experience ${index + 1} down`}
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
                aria-label={`Remove experience ${index + 1}`}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
        <SimpleGrid cols={2}>
          <TextInput
            label="Role"
            value={item.role}
            onChange={(e) => patch({ role: e.target.value })}
          />
          <TextInput
            label="Company"
            value={item.company}
            onChange={(e) => patch({ company: e.target.value })}
          />
          <TextInput
            label="Location"
            value={item.location ?? ""}
            onChange={(e) => patch({ location: e.target.value })}
          />
          <SimpleGrid cols={2}>
            <TextInput
              label="Start (YYYY-MM)"
              placeholder="2021-06"
              value={item.startDate ?? ""}
              onChange={(e) => patch({ startDate: e.target.value })}
            />
            <TextInput
              label="End"
              placeholder="2023-04"
              value={item.isCurrent ? "Present" : (item.endDate ?? "")}
              disabled={item.isCurrent}
              onChange={(e) => patch({ endDate: e.target.value })}
            />
          </SimpleGrid>
        </SimpleGrid>
        <Checkbox
          label="Current role"
          checked={item.isCurrent}
          onChange={(e) => patch({ isCurrent: e.target.checked })}
        />
        <Textarea
          label="Bullets (one per line)"
          placeholder={"Led X to achieve Y, resulting in Z\nBuilt..."}
          minRows={4}
          autosize
          value={item.bullets.join("\n")}
          onChange={(e) => patch({ bullets: e.target.value.split("\n") })}
        />
      </Stack>
    </Card>
  );
}

export function ExperienceForm() {
  const experience = useResumeStore((s) => s.document.experience);
  const updateDocument = useResumeStore((s) => s.updateDocument);

  return (
    <Stack gap="sm">
      {experience.map((item, i) => (
        <ExperienceCard key={item.id} item={item} index={i} />
      ))}
      <Button
        variant="light"
        leftSection={<IconPlus size={14} />}
        onClick={() =>
          updateDocument((draft) => {
            draft.experience.push(newExperience());
            return draft;
          })
        }
      >
        Add experience
      </Button>
    </Stack>
  );
}
