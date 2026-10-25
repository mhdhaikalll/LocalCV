"use client";

import {
  ActionIcon,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { uuid } from "@/lib/uuid";
import type { Project } from "@/lib/schema";

function newProject(): Project {
  return { id: uuid(), name: "", bullets: [] };
}

export function ProjectsForm() {
  const projects = useResumeStore((s) => s.document.projects);
  const updateDocument = useResumeStore((s) => s.updateDocument);

  const patch = (index: number, data: Partial<Project>) =>
    updateDocument((draft) => {
      draft.projects[index] = { ...draft.projects[index], ...data };
      return draft;
    });

  return (
    <Stack gap="sm">
      {projects.map((item, i) => (
        <Card key={item.id} withBorder radius="md" padding="sm" bg="var(--color-surface-muted)">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="xs" fw={600} c="dimmed">
                #{i + 1}
              </Text>
              <Tooltip label="Remove" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={() =>
                    updateDocument((draft) => {
                      draft.projects.splice(i, 1);
                      return draft;
                    })
                  }
                  aria-label={`Remove project ${i + 1}`}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <TextInput
              label="Name"
              value={item.name}
              onChange={(e) => patch(i, { name: e.target.value })}
            />
            <TextInput
              label="Description"
              value={item.description ?? ""}
              onChange={(e) => patch(i, { description: e.target.value })}
            />
            <TextInput
              label="Link"
              placeholder="https://..."
              value={item.link ?? ""}
              onChange={(e) => patch(i, { link: e.target.value })}
            />
            <Textarea
              label="Bullets (one per line)"
              minRows={3}
              autosize
              value={item.bullets.join("\n")}
              onChange={(e) => patch(i, { bullets: e.target.value.split("\n") })}
            />
          </Stack>
        </Card>
      ))}
      <Button
        variant="light"
        leftSection={<IconPlus size={14} />}
        onClick={() =>
          updateDocument((draft) => {
            draft.projects.push(newProject());
            return draft;
          })
        }
      >
        Add project
      </Button>
    </Stack>
  );
}
