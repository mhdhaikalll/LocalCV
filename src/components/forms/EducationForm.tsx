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
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { uuid } from "@/lib/uuid";
import type { Education } from "@/lib/schema";

function newEducation(): Education {
  return { id: uuid(), school: "", bullets: [] };
}

export function EducationForm() {
  const education = useResumeStore((s) => s.document.education);
  const updateDocument = useResumeStore((s) => s.updateDocument);

  const patch = (index: number, data: Partial<Education>) =>
    updateDocument((draft) => {
      draft.education[index] = { ...draft.education[index], ...data };
      return draft;
    });

  return (
    <Stack gap="sm">
      {education.map((item, i) => (
        <Card key={item.id} withBorder radius="md" padding="sm" bg="gray.0">
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
                      draft.education.splice(i, 1);
                      return draft;
                    })
                  }
                  aria-label={`Remove education ${i + 1}`}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <TextInput
              label="School"
              value={item.school}
              onChange={(e) => patch(i, { school: e.target.value })}
            />
            <TextInput
              label="Degree"
              value={item.degree ?? ""}
              onChange={(e) => patch(i, { degree: e.target.value })}
            />
            <SimpleGrid cols={2}>
              <TextInput
                label="Start"
                value={item.startDate ?? ""}
                onChange={(e) => patch(i, { startDate: e.target.value })}
              />
              <TextInput
                label="End"
                value={item.endDate ?? ""}
                onChange={(e) => patch(i, { endDate: e.target.value })}
              />
            </SimpleGrid>
            <Textarea
              label="Notes (one per line)"
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
            draft.education.push(newEducation());
            return draft;
          })
        }
      >
        Add education
      </Button>
    </Stack>
  );
}
