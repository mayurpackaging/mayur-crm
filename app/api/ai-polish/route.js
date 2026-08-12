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
      ? "Aap ek professional sales assistant ho. User ne jo follow-up note likha hai usse professional Hinglish mein rewrite karo — Hindi aur English mix karo lekin tone professional rakho. Sirf polished note output karo, kuch aur mat likho."
      : type === "daily_summary"
      ? "Aap Mayur Food Packaging Products ke sales manager ho. Daily sales report ka professional Hinglish summary likho. Include karo: 1) Aaj kya achieve hua 2) Key highlights — numbers ke saath 3) Kya nahi hua / gaps 4) Kal ke action items. Professional tone mein, 300 words se kam mein."
      : "Aap ek professional CRM assistant ho. User ne jo sales note likha hai usse professional Hinglish mein rewrite karo — Hindi aur English naturally mix karo lekin tone polished aur professional rakho. Saare facts, numbers, dates waise hi rakho. Sirf polished note output karo, kuch extra mat likho.";

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
