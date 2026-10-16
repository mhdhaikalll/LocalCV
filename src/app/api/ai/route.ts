import {
  AiRequestSchema,
  chatCompletion,
  checkRateLimit,
  errorResponse,
  extractJson,
  frameUntrusted,
  getAiEnv,
  getClientIp,
  UNTRUSTED_INSTRUCTION,
} from "@/lib/ai/server";
import { z } from "zod";

const PROMPTS: Record<string, (content: string, context?: { role?: string; section?: string }) => { system: string; user: string }> = {
  rewrite: (content, context) => ({
    system: `You rewrite resume bullet points to be concise and achievement-oriented. Never invent facts, metrics, or technologies not present in the input. Preserve the author's voice.\n${UNTRUSTED_INSTRUCTION}`,
    user: `Rewrite the following resume content${context?.section ? ` (section: ${context.section})` : ""}${context?.role ? ` (role: ${context.role})` : ""}. Improve verb strength and structure only.\n\n${frameUntrusted(content)}\n\nReturn JSON only: { "result": "<rewritten text, one bullet per line>" }`,
  }),
  summarize: (content) => ({
    system: `You write short professional resume summaries (2-4 sentences) from provided content. Never invent facts not present in the input.\n${UNTRUSTED_INSTRUCTION}`,
    user: `Summarize the following into a professional resume summary:\n\n${frameUntrusted(content)}\n\nReturn JSON only: { "result": "<summary text>" }`,
  }),
  suggest: (content, context) => ({
    system: `You suggest improvements for resume content. Suggest only changes that rephrase or restructure what is provided; never fabricate experience.\n${UNTRUSTED_INSTRUCTION}`,
    user: `Suggest concrete improvements for the following resume content${context?.section ? ` (section: ${context.section})` : ""}:\n\n${frameUntrusted(content)}\n\nReturn JSON only: { "result": "<suggestions, one per line>" }`,
  }),
};

export async function POST(request: Request) {
  const env = getAiEnv();

  // Fail closed: disabled or unconfigured AI never reaches the provider.
  if (!env.enabled) {
    return errorResponse(403, "ai_disabled");
  }
  if (!env.apiKey) {
    return errorResponse(503, "ai_not_configured");
  }

  const rate = await checkRateLimit(getClientIp(request));
  if (!rate.ok) {
    return errorResponse(429, "rate_limited", {
      "Retry-After": String(rate.retryAfter),
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_request");
  }

  const parsed = AiRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, "invalid_request");
  }

  const { action, content, context } = parsed.data;
  const promptBuilder = PROMPTS[action];
  if (!promptBuilder) {
    return errorResponse(400, "invalid_request");
  }

  try {
    const { system, user } = promptBuilder(content, context);
    const raw = await chatCompletion(
      env,
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      true,
    );
    const result = z
      .object({ result: z.string() })
      .safeParse(extractJson(raw));
    if (!result.success) {
      return errorResponse(502, "provider_error");
    }
    return Response.json(result.data);
  } catch {
    return errorResponse(502, "provider_error");
  }
}
