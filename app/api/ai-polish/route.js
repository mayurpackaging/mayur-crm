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

    const prompts = {
      note: "Aap ek professional CRM assistant ho. User ne jo sales note likha hai usse professional Hinglish mein rewrite karo. Saare facts, numbers, dates waise hi rakho. Sirf polished note output karo.",
      followup: "Ye follow-up note professional Hinglish mein rewrite karo. Dates aur specifics waise hi rakho. Sirf note output karo.",
      daily_summary: "Aap Mayur Food Packaging ke sales manager ho. Daily sales report ka professional Hinglish summary likho. Include: 1) Aaj kya achieve hua 2) Key highlights numbers ke saath 3) Kya nahi hua/gaps 4) Kal ke action items. 300 words se kam.",
      exec_digest: `Aap Mayur Food Packaging Products ke CEO ho. Aaj ki sales activity ka executive summary Hinglish mein likho.

Format exactly aisa rakho:

**AAJKA SNAPSHOT**
[2-3 lines mein overall performance]

**KISAN NE KYA KIYA**
[Har rep ke liye: naam — X calls, Y visits, Z orders — key observation]

**KAUNSI PARTIES PROMISING HAIN**
[Top 3-5 parties jinse order ka chance hai — reason ke saath]

**RED FLAGS**
[Koi concern — low conversion, missing parties, etc]

**KAL KE LIYE**
[3-4 specific action items]

Concise rakho, numbers use karo, Hinglish mein.`
    };

    const systemPrompt = prompts[type] || prompts.note;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1000,
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
