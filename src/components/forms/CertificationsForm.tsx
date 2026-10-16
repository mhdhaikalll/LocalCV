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
  Tooltip,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { uuid } from "@/lib/uuid";
import type { Certificate } from "@/lib/schema";

function newCert(): Certificate {
  return { id: uuid(), name: "" };
}

export function CertificationsForm() {
  const certifications = useResumeStore((s) => s.document.certifications);
  const updateDocument = useResumeStore((s) => s.updateDocument);

  const patch = (index: number, data: Partial<Certificate>) =>
    updateDocument((draft) => {
      draft.certifications[index] = { ...draft.certifications[index], ...data };
      return draft;
    });

  return (
    <Stack gap="sm">
      {certifications.map((cert, i) => (
        <Card key={cert.id} withBorder radius="md" padding="sm" bg="gray.0">
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
                      draft.certifications.splice(i, 1);
                      return draft;
                    })
                  }
                  aria-label={`Remove certification ${i + 1}`}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <SimpleGrid cols={2}>
              <TextInput
                label="Name"
                value={cert.name}
                onChange={(e) => patch(i, { name: e.target.value })}
              />
              <TextInput
                label="Issuer"
                value={cert.issuer ?? ""}
                onChange={(e) => patch(i, { issuer: e.target.value })}
              />
              <TextInput
                label="Date"
                value={cert.date ?? ""}
                onChange={(e) => patch(i, { date: e.target.value })}
              />
              <TextInput
                label="Link"
                placeholder="https://..."
                value={cert.link ?? ""}
                onChange={(e) => patch(i, { link: e.target.value })}
              />
            </SimpleGrid>
          </Stack>
        </Card>
      ))}
      <Button
        variant="light"
        leftSection={<IconPlus size={14} />}
        onClick={() =>
          updateDocument((draft) => {
            draft.certifications.push(newCert());
            return draft;
          })
        }
      >
        Add certification
      </Button>
    </Stack>
  );
}
