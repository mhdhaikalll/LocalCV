"use client";

import { useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Button,
  Group,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconPhoto, IconX } from "@tabler/icons-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { fileToPhotoDataUrl } from "@/lib/image";
import type { Contact } from "@/lib/schema";

const PHOTO_TEMPLATES = new Set(["photo-sidebar", "photo-header"]);

export function ContactForm() {
  const contact = useResumeStore((s) => s.document.contact);
  const templateId = useResumeStore((s) => s.settings.templateId);
  const updateDocument = useResumeStore((s) => s.updateDocument);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoSupported = PHOTO_TEMPLATES.has(templateId);

  const patch = (data: Partial<Contact>) =>
    updateDocument((draft) => ({ ...draft, contact: { ...draft.contact, ...data } }));

  const handlePhoto = async (file: File) => {
    setPhotoError(null);
    try {
      patch({ photo: await fileToPhotoDataUrl(file) });
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Could not load that image.");
    }
  };

  return (
    <Stack gap="sm">
      {photoSupported ? (
        <Stack gap="sm">
          <Group gap="sm" align="center">
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: templateId === "photo-header" ? "50%" : 8,
                overflow: "hidden",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-muted)",
                flexShrink: 0,
              }}
            >
              {contact.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- data-URL preview
                <img
                  src={contact.photo}
                  alt="Profile photo preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    transform: `translate(${contact.photoOffsetX ?? 0}%, ${contact.photoOffsetY ?? 0}%) scale(${contact.photoZoom ?? 1})`,
                  }}
                />
              ) : null}
            </div>
            <Stack gap={4}>
              <Group gap="xs">
                <Button
                  size="compact-xs"
                  variant="default"
                  leftSection={<IconPhoto size={14} />}
                  onClick={() => fileRef.current?.click()}
                >
                  {contact.photo ? "Change photo" : "Add photo"}
                </Button>
                {contact.photo && (
                  <Tooltip label="Remove photo" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      aria-label="Remove photo"
                      onClick={() =>
                        patch({
                          photo: undefined,
                          photoZoom: undefined,
                          photoOffsetX: undefined,
                          photoOffsetY: undefined,
                        })
                      }
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                Processed locally, never uploaded.
              </Text>
            </Stack>
          </Group>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handlePhoto(file);
              e.target.value = "";
            }}
          />
          {photoError && (
            <Text size="xs" c="red">
              {photoError}
            </Text>
          )}
          {contact.photo && (
            <Stack gap={6}>
              <div>
                <Text size="xs" fw={500} mb={2}>
                  Zoom: {(contact.photoZoom ?? 1).toFixed(2)}x
                </Text>
                <Slider
                  min={1}
                  max={3}
                  step={0.05}
                  size="xs"
                  value={contact.photoZoom ?? 1}
                  onChange={(v) => patch({ photoZoom: v })}
                />
              </div>
              <div>
                <Text size="xs" fw={500} mb={2}>
                  Horizontal: {contact.photoOffsetX ?? 0}%
                </Text>
                <Slider
                  min={-100}
                  max={100}
                  step={1}
                  size="xs"
                  value={contact.photoOffsetX ?? 0}
                  onChange={(v) => patch({ photoOffsetX: v })}
                />
              </div>
              <div>
                <Text size="xs" fw={500} mb={2}>
                  Vertical: {contact.photoOffsetY ?? 0}%
                </Text>
                <Slider
                  min={-100}
                  max={100}
                  step={1}
                  size="xs"
                  value={contact.photoOffsetY ?? 0}
                  onChange={(v) => patch({ photoOffsetY: v })}
                />
              </div>
            </Stack>
          )}
        </Stack>
      ) : (
        contact.photo ? (
          <Alert color="gray" variant="light" p="xs">
            <Text size="xs">
              Your photo is saved but hidden — switch to a photo template to show it.
            </Text>
          </Alert>
        ) : (
          <Text size="xs" c="dimmed">
            Profile photos are available with the Photo Sidebar and Photo Header
            templates.
          </Text>
        )
      )}
      <TextInput
        label="Full name"
        value={contact.name}
        onChange={(e) => patch({ name: e.target.value })}
      />
      <TextInput
        label="Headline"
        placeholder="Senior Software Engineer"
        value={contact.headline ?? ""}
        onChange={(e) => patch({ headline: e.target.value })}
      />
      <SimpleGrid cols={2}>
        <TextInput
          label="Email"
          type="email"
          value={contact.email ?? ""}
          onChange={(e) => patch({ email: e.target.value })}
        />
        <TextInput
          label="Phone"
          value={contact.phone ?? ""}
          onChange={(e) => patch({ phone: e.target.value })}
        />
      </SimpleGrid>
      <TextInput
        label="Location"
        placeholder="City, Country"
        value={contact.location ?? ""}
        onChange={(e) => patch({ location: e.target.value })}
      />
      <TextInput
        label="Website"
        placeholder="https://..."
        value={contact.website ?? ""}
        onChange={(e) => patch({ website: e.target.value })}
      />
      <TextInput
        label="LinkedIn"
        placeholder="https://linkedin.com/in/..."
        value={contact.linkedin ?? ""}
        onChange={(e) => patch({ linkedin: e.target.value })}
      />
      <TextInput
        label="GitHub"
        placeholder="https://github.com/..."
        value={contact.github ?? ""}
        onChange={(e) => patch({ github: e.target.value })}
      />
    </Stack>
  );
}
