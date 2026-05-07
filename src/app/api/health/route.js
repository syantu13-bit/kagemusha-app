// 環境変数の設定状況を返すヘルスチェック。
// 本番では誤ってデプロイ後の動作確認に使う想定で、機密情報は返さない。
export async function GET() {
  const hasKey = typeof process.env.ANTHROPIC_API_KEY === "string"
    && process.env.ANTHROPIC_API_KEY.length > 0;
  const keyLooksValid = hasKey && process.env.ANTHROPIC_API_KEY.startsWith("sk-");
  const ok = hasKey && keyLooksValid;
  return Response.json(
    {
      ok,
      checks: {
        env_ANTHROPIC_API_KEY_present: hasKey,
        env_ANTHROPIC_API_KEY_format: keyLooksValid,
      },
      time: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
