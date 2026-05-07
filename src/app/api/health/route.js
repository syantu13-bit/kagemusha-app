// 環境変数の設定状況を返すヘルスチェック。
// Gemini API キーの存在のみ検証（プレフィックスは固定でないので形式チェックなし）。
export async function GET() {
  const hasKey = typeof process.env.GEMINI_API_KEY === "string"
    && process.env.GEMINI_API_KEY.length > 0;
  const ok = hasKey;
  return Response.json(
    {
      ok,
      checks: {
        env_GEMINI_API_KEY_present: hasKey,
      },
      time: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
