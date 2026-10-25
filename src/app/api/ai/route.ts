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

interface PromptContext {
  role?: string;
  section?: string;
  tone?: string;
  jobDescription?: string;
}

const PROMPTS: Record<
  string,
  (content: string, context?: PromptContext) => { system: string; user: string }
> = {
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
  /**
   * Polish only. The letter already exists and already passes the local checks,
   * so this prompt is fenced three ways: rewrite-only instructions, the
   * untrusted wrapper around every user field, and the shared untrusted
   * instruction appended to the system prompt. The result is diffed and
   * re-checked before the user may accept it.
   */
  "polish-letter": (content, context) => ({
    system: `You polish an existing cover letter. Rewrite it for clarity and flow only.
Hard rules:
- Never add a fact, number, metric, employer, technology or claim that is not already in the letter.
- Keep every figure exactly as written. Do not round, combine or remove numbers.
- Keep the greeting, the sign-off and the paragraph breaks.
- Do not add placeholders such as [Company], [role] or curly-brace variables.
- No em dashes.
- Return the whole letter, not a summary or a list of changes.
${UNTRUSTED_INSTRUCTION}`,
    user: `Polish the following cover letter${context?.tone ? ` (tone: ${context.tone})` : ""}.${context?.jobDescription ? " The role description is included for vocabulary only: do not invent experience from it." : ""}\n\n${frameUntrusted(content)}${
      context?.jobDescription
        ? `\n\nRole description (vocabulary reference only):\n${frameUntrusted(context.jobDescription)}`
        : ""
    }\n\nReturn JSON only: { "result": "<the full polished letter>" }`,
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
