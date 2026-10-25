import { afterEach, describe, expect, it } from "vitest";
import { aiEnabled, completionsUrl, getAiEnv } from "./server";

const AI_KEYS = [
  "AI_ENABLED",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENAI_MODEL",
] as const;

afterEach(() => {
  for (const key of AI_KEYS) delete process.env[key];
});

describe("completionsUrl", () => {
  it("keeps the /v1 prefix instead of replacing the last segment", () => {
    expect(completionsUrl("https://api.openai.com/v1")?.href).toBe(
      "https://api.openai.com/v1/chat/completions",
    );
  });

  it("handles a trailing slash", () => {
    expect(completionsUrl("https://api.openai.com/v1/")?.href).toBe(
      "https://api.openai.com/v1/chat/completions",
    );
  });

  it("preserves multi-segment provider prefixes", () => {
    expect(completionsUrl("https://openrouter.ai/api/v1")?.href).toBe(
      "https://openrouter.ai/api/v1/chat/completions",
    );
  });

  it("builds a bare host without an empty path segment", () => {
    expect(completionsUrl("https://api.example.com")?.href).toBe(
      "https://api.example.com/chat/completions",
    );
  });

  it("does not double-append an explicit completions path", () => {
    expect(
      completionsUrl("https://api.example.com/v1/chat/completions")?.href,
    ).toBe("https://api.example.com/v1/chat/completions");
  });

  it("drops query and hash from the base URL", () => {
    expect(completionsUrl("https://api.example.com/v1?x=1#y")?.href).toBe(
      "https://api.example.com/v1/chat/completions",
    );
  });

  it("rejects insecure and private targets", () => {
    expect(completionsUrl("http://api.openai.com/v1")).toBeNull();
    expect(completionsUrl("https://10.0.0.1/v1")).toBeNull();
    expect(completionsUrl("not a url")).toBeNull();
  });

  it("allows http only on localhost for local providers", () => {
    expect(completionsUrl("http://localhost:11434/v1")?.href).toBe(
      "http://localhost:11434/v1/chat/completions",
    );
  });
});

describe("getAiEnv", () => {
  it("falls back to defaults when vars are blank", () => {
    process.env.OPENAI_BASE_URL = "";
    process.env.OPENAI_MODEL = "   ";
    process.env.OPENAI_API_KEY = "";
    const env = getAiEnv();
    expect(env.baseUrl).toBe("https://api.openai.com/v1");
    expect(env.model).toBe("gpt-4o-mini");
    expect(env.apiKey).toBeUndefined();
  });

  it("trims configured values", () => {
    process.env.OPENAI_MODEL = " gpt-4o-mini \n";
    process.env.OPENAI_API_KEY = " sk-test ";
    const env = getAiEnv();
    expect(env.model).toBe("gpt-4o-mini");
    expect(env.apiKey).toBe("sk-test");
  });

  it("accepts common truthy flag spellings", () => {
    for (const value of ["true", "TRUE", " true ", "1"]) {
      process.env.AI_ENABLED = value;
      expect(aiEnabled()).toBe(true);
    }
    for (const value of ["false", "0", "", "yes", "on"]) {
      process.env.AI_ENABLED = value;
      expect(aiEnabled()).toBe(false);
    }
  });

  it("fails closed when the flag is unset", () => {
    expect(aiEnabled()).toBe(false);
  });
});
