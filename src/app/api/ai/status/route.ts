import { NextResponse } from "next/server";

/**
 * Reports whether the server AI routes are enabled so the client can disable
 * AI controls without baking a build-time flag into the statically rendered
 * editor. Reads AI_ENABLED at request time.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ enabled: process.env.AI_ENABLED === "true" });
}
