import {
  AtsReviewRequestSchema,
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

const ReviewSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.array(
    z.object({
      category: z.enum(["keywords", "wording", "sections"]),
      text: z.string().max(1000),
    }),
  ),
});

export async function POST(request: Request) {
  const env = getAiEnv();

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

  const parsed = AtsReviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, "invalid_request");
  }

  try {
    const raw = await chatCompletion(
      env,
      [
        {
          role: "system",
          content: `You are an expert resume reviewer for ATS compatibility. Analyze the resume against the job description. Identify missing keywords, weak wording, and structural issues. Never invent facts about the candidate. Be specific and actionable.\n${UNTRUSTED_INSTRUCTION}`,
        },
        {
          role: "user",
          content: `Job description:\n${frameUntrusted(parsed.data.jobDescription)}\n\nResume:\n${frameUntrusted(parsed.data.resumeText)}\n\nReturn JSON only: { "score": <0-100 number>, "feedback": [ { "category": "keywords" | "wording" | "sections", "text": "specific actionable feedback" } ] }`,
        },
      ],
      true,
    );
    const result = ReviewSchema.safeParse(extractJson(raw));
    if (!result.success) {
      return errorResponse(502, "provider_error");
    }
    return Response.json(result.data);
  } catch {
    return errorResponse(502, "provider_error");
  }
}
