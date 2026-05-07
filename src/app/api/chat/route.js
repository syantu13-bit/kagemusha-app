export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
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

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system,
        messages,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[chat] upstream error", res.status, data);
      return Response.json(
        { error: data?.error?.message || "Upstream API error", details: data },
        { status: res.status }
      );
    }
    if (!data?.content?.[0]?.text) {
      console.warn("[chat] empty content", { stop_reason: data?.stop_reason, content: data?.content });
    }
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: "Failed to reach Anthropic API.", details: String(err?.message || err) },
      { status: 502 }
    );
  }
}
