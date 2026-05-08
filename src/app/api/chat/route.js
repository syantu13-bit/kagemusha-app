// Google Gemini API のストリーミングエンドポイントを呼び出す。
// SSE (Server-Sent Events) を受け取り、テキストチャンクをそのまま流す。
// クライアントは res.body を ReadableStream として読み込む。

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`;

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

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("[chat] gemini upstream error", res.status, data);
      return Response.json(
        { error: data?.error?.message || "Upstream API error", details: data },
        { status: res.status }
      );
    }

    // SSE を受け取り、テキストチャンクだけを抽出してそのまま流す
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() ?? "";
            for (const event of events) {
              for (const line of event.split("\n")) {
                if (!line.startsWith("data: ")) continue;
                const raw = line.slice(6).trim();
                if (!raw || raw === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(raw);
                  const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) controller.enqueue(encoder.encode(text));
                } catch {}
              }
            }
          }
        } catch (err) {
          console.error("[chat] stream read error", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    return Response.json(
      { error: "Failed to reach Gemini API.", details: String(err?.message || err) },
      { status: 502 }
    );
  }
}
