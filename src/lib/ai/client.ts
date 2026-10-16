"use client";

export type AiAction = "rewrite" | "summarize" | "suggest";

export class AiError extends Error {
  status: number;
  code: string;
  retryAfter?: number;
  constructor(status: number, code: string, retryAfter?: number) {
    super(code);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let code = "provider_error";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) code = data.error;
    } catch {
      // ignore parse failure
    }
    const retryAfter = Number(res.headers.get("Retry-After")) || undefined;
    throw new AiError(res.status, code, retryAfter);
  }
  return (await res.json()) as T;
}

export async function requestAi(
  action: AiAction,
  content: string,
  context?: { role?: string; section?: string },
): Promise<string> {
  const data = await post<{ result: string }>("/api/ai", { action, content, context });
  return data.result;
}

export interface AtsReviewFeedback {
  category: "keywords" | "wording" | "sections";
  text: string;
}

export async function requestAtsReview(
  resumeText: string,
  jobDescription: string,
): Promise<{ score: number; feedback: AtsReviewFeedback[] }> {
  return post("/api/ai/ats-review", { resumeText, jobDescription });
}
