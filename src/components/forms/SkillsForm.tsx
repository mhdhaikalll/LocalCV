"use client";

import {
  ActionIcon,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { uuid } from "@/lib/uuid";
import type { SkillGroup } from "@/lib/schema";

function newGroup(): SkillGroup {
  return { id: uuid(), category: "", items: [] };
}

export function SkillsForm() {
  const skills = useResumeStore((s) => s.document.skills);
  const updateDocument = useResumeStore((s) => s.updateDocument);

  const patch = (index: number, data: Partial<SkillGroup>) =>
    updateDocument((draft) => {
      draft.skills[index] = { ...draft.skills[index], ...data };
      return draft;
    });

  return (
    <Stack gap="sm">
      {skills.map((group, i) => (
        <Card key={group.id} withBorder radius="md" padding="sm" bg="gray.0">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="xs" fw={600} c="dimmed">
                Group
              </Text>
              <Tooltip label="Remove" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={() =>
                    updateDocument((draft) => {
                      draft.skills.splice(i, 1);
                      return draft;
                    })
                  }
                  aria-label={`Remove skill group ${i + 1}`}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <TextInput
              label="Category"
              placeholder="Languages, Tools, Frameworks..."
              value={group.category}
              onChange={(e) => patch(i, { category: e.target.value })}
            />
            <TextInput
              label="Items (comma-separated)"
              placeholder="TypeScript, Python, SQL"
              value={group.items.join(", ")}
              onChange={(e) =>
                patch(i, {
                  items: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </Stack>
        </Card>
      ))}
      <Button
        variant="light"
        leftSection={<IconPlus size={14} />}
        onClick={() =>
          updateDocument((draft) => {
            draft.skills.push(newGroup());
            return draft;
          })
        }
      >
        Add skill group
      </Button>
    </Stack>
  );
}
