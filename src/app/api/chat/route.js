// Google Gemini API (非ストリーミング) を呼び出し、plain text で返す。
// クライアントは res.body をストリームとして読み込む（単一チャンク）。

const MODEL = "gemini-2.5-flash";

export async function POST(req) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { system, messages } = body || {};
  if (typeof system !== "string" || !Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: "Request must include `system` (string) and non-empty `messages` array." },
      { status: 400 }
    );
  }

  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[chat] gemini upstream error", res.status, data);
      return Response.json(
        { error: data?.error?.message || "Upstream API error", details: data },
        { status: res.status }
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.find(p => typeof p?.text === "string")?.text ?? "";

    if (!text) {
      console.warn("[chat] gemini empty content", {
        finishReason: data?.candidates?.[0]?.finishReason,
        safetyRatings: data?.candidates?.[0]?.safetyRatings,
      });
    }

    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    return Response.json(
      { error: "Failed to reach Gemini API.", details: String(err?.message || err) },
      { status: 502 }
    );
  }
}
