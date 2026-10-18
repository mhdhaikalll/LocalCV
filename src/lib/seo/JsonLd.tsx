/**
 * Render structured data as a JSON-LD script.
 *
 * React writes the string as a text node, so no HTML injection is possible.
 * `<` is escaped to `\u003c` to prevent a `</script>` sequence from terminating
 * the tag early.
 */
export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json">{json}</script>;
}
