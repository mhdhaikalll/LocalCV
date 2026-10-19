"use client";

import { TextInput, type TextInputProps } from "@mantine/core";
import { useEffect, useRef, useState } from "react";

export function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

type CommaListInputProps = Omit<TextInputProps, "value" | "onChange"> & {
  value: string[];
  onChange: (items: string[]) => void;
};

/**
 * Comma-separated text input backed by a string array.
 *
 * Keeps the raw text locally so typing a delimiter is not erased by the
 * round-trip through the array (e.g. typing "React, " must keep the comma and
 * trailing space). The store is updated with the parsed items as you type.
 */
export function CommaListInput({ value, onChange, ...props }: CommaListInputProps) {
  const [text, setText] = useState(() => value.join(", "));
  const textRef = useRef(text);
  const external = value.join("\u0000");

  useEffect(() => {
    const current = parseCommaList(textRef.current).join("\u0000");
    if (current !== external) {
      const next = value.join(", ");
      textRef.current = next;
      setText(next);
    }
  }, [external, value]);

  return (
    <TextInput
      {...props}
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        textRef.current = next;
        setText(next);
        onChange(parseCommaList(next));
      }}
    />
  );
}
