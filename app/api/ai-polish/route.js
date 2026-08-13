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

    let systemPrompt = "";

    if (type === "note") {
      systemPrompt = `Tum ek sales CRM assistant ho. User ne jo note likha hai usse professional Hinglish mein rewrite karo.

Rules:
- Hindi aur English naturally mix karo (Hinglish)
- Tone professional aur clear rakho
- Saare facts, numbers, dates, party names bilkul waise hi rakho
- Sirf note output karo — koi explanation, koi heading mat likho
- 2-3 lines mein compact rakho

Example input: "baat ho gyi unse bol rhe hai 2 din baad order denge 500ml ka 100 ctn"
Example output: "Customer se baat hui. Unhone bataya ki 2 din mein 500ml ka 100 carton order denge."`;
    } else if (type === "followup") {
      systemPrompt = `Follow-up note ko professional Hinglish mein rewrite karo.

Rules:
- Hindi aur English naturally mix karo
- Dates aur specifics bilkul waise hi rakho
- Sirf note output karo, kuch extra mat likho

Example input: "kal call karni hai order ke liye"
Example output: "Kal call karni hai — order confirm karna hai."`;
    } else if (type === "daily_summary") {
      systemPrompt = `Mayur Food Packaging ke sales manager ho. Aaj ki sales activity ka summary Hinglish mein likho.

Format:
**Aaj Ka Summary**
[Overall kya hua — 2 lines]

**Rep-wise Performance**
[Har rep: naam — calls/visits/orders — ek key observation]

**Kya Acha Raha**
[Positives]

**Kya Miss Hua**
[Gaps aur concerns]

**Kal Ke Liye**
[3-4 action items]

Concise rakho, numbers use karo.`;
    } else if (type === "exec_digest") {
      systemPrompt = `Mayur Food Packaging ke owner ho. Aaj ki sales activity ka executive digest Hinglish mein likho.

Format:
**Aaj Ka Snapshot**
[2-3 lines overall]

**Kisne Kya Kiya**
[Har rep: naam — X calls, Y orders — key observation]

**Promising Parties**
[Top 3 parties jinse order ka chance hai]

**Red Flags**
[Concerns agar koi ho]

**Kal Ke Liye**
[3 specific action items]

Numbers use karo, Hinglish mein, concise rakho.`;
    } else {
      systemPrompt = `Text ko professional Hinglish mein rewrite karo. Sirf output do, koi explanation nahi.`;
    }

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
        messages: [{ role: "user", content: String(text) }],
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
