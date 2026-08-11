// src/app/api/ai-polish/route.js
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(request) {
  try {
    const { text, type } = await request.json();
    if (!text) return Response.json({ error: "No text" }, { status: 400 });

    const systemPrompt = type === "followup"
      ? "Convert this Hinglish/Hindi follow-up note to professional English. Keep dates and specifics. Output only the note, nothing else."
      : type === "daily_summary"
      ? "You are a sales manager assistant for Mayur Food Packaging Products. Write a concise daily sales report summary in English. Include: 1) What was accomplished 2) Key highlights 3) Gaps / not done 4) Action items for tomorrow. Be specific with numbers. Under 300 words."
      : "You are a professional CRM assistant. Convert this Hinglish/Hindi sales note to concise professional English. Keep all facts, numbers, dates intact. Output only the polished note, nothing else.";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err, polished: "" }, {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    const data = await res.json();
    const polished = data.content?.[0]?.text || "";

    return Response.json({ polished }, {
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  } catch (e) {
    return Response.json({ error: e.message, polished: "" }, {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
}
