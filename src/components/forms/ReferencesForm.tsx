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
import type { Reference } from "@/lib/schema";

const MAX_REFERENCES = 2;

function newReference(): Reference {
  return { id: uuid(), name: "" };
}

export function ReferencesForm() {
  const references = useResumeStore((s) => s.document.references);
  const updateDocument = useResumeStore((s) => s.updateDocument);

  const patch = (index: number, data: Partial<Reference>) =>
    updateDocument((draft) => {
      draft.references[index] = { ...draft.references[index], ...data };
      return draft;
    });

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Up to {MAX_REFERENCES} references. They render side by side on the resume.
      </Text>
      {references.map((ref, i) => (
        <Card key={ref.id} withBorder radius="md" padding="sm" bg="var(--color-surface-muted)">
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
                      draft.references.splice(i, 1);
                      return draft;
                    })
                  }
                  aria-label={`Remove reference ${i + 1}`}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <TextInput
              label="Name"
              value={ref.name}
              onChange={(e) => patch(i, { name: e.target.value })}
            />
            <TextInput
              label="Role"
              placeholder="Engineering Manager"
              value={ref.role ?? ""}
              onChange={(e) => patch(i, { role: e.target.value })}
            />
            <TextInput
              label="Company"
              value={ref.company ?? ""}
              onChange={(e) => patch(i, { company: e.target.value })}
            />
            <TextInput
              label="Email"
              type="email"
              placeholder="ref@example.com"
              value={ref.email ?? ""}
              onChange={(e) => patch(i, { email: e.target.value })}
            />
          </Stack>
        </Card>
      ))}
      {references.length < MAX_REFERENCES && (
        <Button
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={() =>
            updateDocument((draft) => {
              if (draft.references.length < MAX_REFERENCES) {
                draft.references.push(newReference());
              }
              return draft;
            })
          }
        >
          Add reference
        </Button>
      )}
    </Stack>
  );
}
