export type DiffOp = "same" | "add" | "remove";

export interface DiffToken {
  op: DiffOp;
  text: string;
}

/**
 * Word-level diff for showing a polished letter beside the original.
 *
 * Longest-common-subsequence over words, then adjacent runs of the same op are
 * merged so the UI renders one span per change instead of one per token.
 *
 * The table is O(n·m). Both sides are capped before they reach here (a letter
 * is at most 420 words), but the guard keeps a pathological paste from
 * allocating a large matrix.
 */
export function diffWords(before: string, after: string): DiffToken[] {
  const left = tokenizeWords(before);
  const right = tokenizeWords(after);

  const MAX = 4000;
  if (left.length * right.length > MAX * MAX) {
    return [{ op: "remove", text: before }, { op: "add", text: after }];
  }

  const rows = left.length;
  const cols = right.length;
  // lcs[i][j] = length of the LCS of left[i..] and right[j..]
  const lcs: number[][] = Array.from({ length: rows + 1 }, () =>
    new Array<number>(cols + 1).fill(0),
  );
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      lcs[i][j] =
        left[i] === right[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const ops: DiffToken[] = [];
  let i = 0;
  let j = 0;
  const push = (op: DiffOp, text: string) => {
    const last = ops[ops.length - 1];
    if (last && last.op === op) last.text = `${last.text} ${text}`;
    else ops.push({ op, text });
  };

  while (i < rows && j < cols) {
    if (left[i] === right[j]) {
      push("same", left[i]);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push("remove", left[i]);
      i++;
    } else {
      push("add", right[j]);
      j++;
    }
  }
  while (i < rows) push("remove", left[i++]);
  while (j < cols) push("add", right[j++]);

  return ops;
}

function tokenizeWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Whether the polish changed anything at all. */
export function hasChanges(ops: DiffToken[]): boolean {
  return ops.some((op) => op.op !== "same");
}
