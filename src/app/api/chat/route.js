// Google Gemini API を呼び出すチャット用エンドポイント。
// 完全無料枠（gemini-2.5-flash）を使う。
// クライアントが期待する Anthropic 形式
//   { content: [{ type:"text", text:"..." }], stop_reason: "..." }
// に整形して返す（クライアント側コードは無改修）。

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

  // assistant -> model に変換し、Gemini の contents 形式へ
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

    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.find(p => typeof p?.text === "string")?.text;

    if (!text) {
      console.warn("[chat] gemini empty content", {
        finishReason: candidate?.finishReason,
        safetyRatings: candidate?.safetyRatings,
      });
    }

    // クライアントが期待する形式に整形
    return Response.json({
      content: text ? [{ type: "text", text }] : [],
      stop_reason: candidate?.finishReason || "unknown",
    });
  } catch (err) {
    return Response.json(
      { error: "Failed to reach Gemini API.", details: String(err?.message || err) },
      { status: 502 }
    );
  }
}
