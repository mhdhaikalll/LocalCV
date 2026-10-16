"use client";

import { SimpleGrid, Stack, TextInput } from "@mantine/core";
import { useResumeStore } from "@/lib/store/resume-store";
import type { Contact } from "@/lib/schema";

export function ContactForm() {
  const contact = useResumeStore((s) => s.document.contact);
  const updateDocument = useResumeStore((s) => s.updateDocument);

  const patch = (data: Partial<Contact>) =>
    updateDocument((draft) => ({ ...draft, contact: { ...draft.contact, ...data } }));

  return (
    <Stack gap="sm">
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
