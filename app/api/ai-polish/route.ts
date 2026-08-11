// src/app/api/ai-polish/route.ts
import { NextRequest, NextResponse } from "next/server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function POST(request: NextRequest) {
  try {
    const { text, type } = await request.json();
    if (!text) return NextResponse.json({ error: "No text" }, { status: 400 });

    const systemPrompt = type === "followup"
      ? "Convert this Hinglish/Hindi follow-up note to professional English. Keep dates and specifics. Output only the note, nothing else."
      : "You are a professional CRM assistant. Convert this Hinglish/Hindi sales note to concise professional English. Keep all facts, numbers, dates intact. Output only the polished note, nothing else.";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: text }],
      }),
    });

    const data = await res.json();
    const polished = data.content?.[0]?.text || "";
    return NextResponse.json({ polished }, { headers: CORS });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: CORS });
  }
}
