"use client";

import { ActionIcon, Tooltip, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";

/**
 * Light/dark switch for the editor chrome.
 *
 * The scheme is persisted by Mantine's colour-scheme manager under
 * `mantine-color-scheme-value`, so the value is known before first paint via
 * `ColorSchemeScript` and the icon never renders the wrong way round.
 *
 * Mantine's own value can still read `auto` on a first visit; the app treats
 * that as light, matching the provider's `defaultColorScheme`.
 */
export function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  // `auto` is resolved to an explicit value once, so the stored choice is a
  // concrete light/dark from then on.
  useIsomorphicLayoutEffect(() => {
    if (colorScheme === "auto") setColorScheme("light");
  }, [colorScheme, setColorScheme]);

  return (
    <Tooltip label={isDark ? "Switch to light" : "Switch to dark"} withArrow>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        aria-pressed={isDark}
        onClick={() => setColorScheme(isDark ? "light" : "dark")}
      >
        {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}
