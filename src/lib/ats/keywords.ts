/** Terms a light stemmer must leave alone (tech words whose plural is not a plural). */
export const STEM_EXCEPTIONS = new Set([
  "aws",
  "css",
  "ops",
  "gps",
  "devops",
  "kubernetes",
  "analytics",
  "physics",
  "news",
  "series",
  "business",
  "process",
  "access",
  "class",
  "analysis",
]);

export const STOP_WORDS = new Set(
  "a an the and or but if then else for to of in on at by with from as is are was were be been being will would can could should do does did have has had you your we our they their he she it its this that these those not no yes about into over under more most other some such only own same so than too very s t just don now i me my what which who whom when where why how all any both each few nor own too also per via etc across within".split(
    " ",
  ),
);

/**
 * Collapse casing, punctuation, and whitespace. `+`, `#`, and `.` survive
 * because they carry meaning in tech terms (`c++`, `c#`, `node.js`).
 */
export function normalizeTerm(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.]+|[.]+$/g, "");
}

/**
 * Light suffix stripping, not a real stemmer. Both sides of a comparison run
 * through it, so only consistency matters: `managed` and `manage` must agree.
 */
export function stem(word: string): string {
  if (STEM_EXCEPTIONS.has(word)) return word;
  if (word.length <= 3) return word;

  let stemmed = word;

  if (word.endsWith("ies") && word.length - 3 + 1 > 4) {
    stemmed = `${word.slice(0, -3)}y`;
  } else if (word.endsWith("ied") && word.length - 3 + 1 > 4) {
    stemmed = `${word.slice(0, -3)}y`;
  } else if (word.endsWith("ing") && word.length - 3 >= 3) {
    stemmed = word.slice(0, -3);
  } else if (word.endsWith("ed") && word.length - 2 >= 3) {
    stemmed = word.slice(0, -2);
  } else if (word.endsWith("es") && word.length - 2 >= 3) {
    stemmed = word.slice(0, -2);
  } else if (word.endsWith("s") && !word.endsWith("ss") && word.length - 1 >= 3) {
    stemmed = word.slice(0, -1);
  }

  // "running" -> "runn" -> "run"; "shipped" -> "shipp" -> "ship".
  if (stemmed.length >= 3) {
    const last = stemmed[stemmed.length - 1];
    if (last === stemmed[stemmed.length - 2] && !/[aeiou]/.test(last)) {
      stemmed = stemmed.slice(0, -1);
    }
  }

  // Final "e" so "manage" and "managed" meet in the middle.
  if (stemmed.endsWith("e") && stemmed.length - 1 >= 4) {
    stemmed = stemmed.slice(0, -1);
  }

  return stemmed;
}

/** Normalized, stop-word-free tokens. */
export function tokenize(text: string): string[] {
  return normalizeTerm(text)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * Unigrams plus 2- and 3-token phrases. A phrase survives only when every one
 * of its tokens is a content word, so "machine learning" stays whole while
 * "the machine" is boiled down to its content tokens.
 */
export function extractTerms(text: string): string[] {
  const tokens = normalizeTerm(text)
    .split(" ")
    .filter((token) => token.length > 1);

  const terms: string[] = [];
  for (const token of tokens) {
    if (!STOP_WORDS.has(token)) terms.push(token);
  }

  for (let size = 2; size <= 3; size++) {
    for (let i = 0; i + size <= tokens.length; i++) {
      const window = tokens.slice(i, i + size);
      if (window.some((token) => STOP_WORDS.has(token))) continue;
      terms.push(window.join(" "));
    }
  }

  return terms;
}

/**
 * Comparison key: normalize, stem and (via the lexicon) canonicalise each word,
 * so "React.js", "ReactJS" and "React" all produce `react`.
 */
export function termKey(term: string, canonicalize: (value: string) => string): string {
  return normalizeTerm(term)
    .split(" ")
    .filter(Boolean)
    .map((token) => canonicalize(stem(token)))
    .join(" ");
}
