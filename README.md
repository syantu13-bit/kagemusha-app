# 🎭 影武者相談室

AIと本人が答える、あなただけの相談チャットサービス。

## 機能
- 💬 AI影武者チャット（Google Gemini APIが自動応答・無料枠で運用可能）
- 📅 本人対応枠の予約カレンダー
- 🎭 キャラクター設定管理画面（複数の影武者を切替可能）
- 🕐 時間帯で本人/AI自動切り替え
- 🔍 会話履歴の検索・Markdown エクスポート
- 🎨 5種類の背景テーマ
- 🔔 予約30分前のブラウザ通知

---

## 🚀 Vercelへの公開手順

### ① GitHubにリポジトリを作る
1. https://github.com にアクセス
2. 右上「+」→「New repository」
3. 名前を入力（例：kagemusha-app）→「Create repository」

### ② このフォルダをGitHubに上げる
ターミナルで以下を実行：

```bash
cd kagemusha-app
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/kagemusha-app.git
git push -u origin main
```

### ③ Vercelに接続する
1. https://vercel.com にアクセス（GitHubアカウントでログイン）
2. 「Add New Project」→ GitHubのリポジトリを選択
3. 「Environment Variables」に以下を追加：
   - Name: `GEMINI_API_KEY`
   - Value: `AIza...`（Google AI Studioから取得）
4. 「Deploy」ボタンを押す

→ 1〜2分でURLが発行されます 🎉

### ④ APIキーの取得（まだ持っていない場合）
1. https://aistudio.google.com/apikey にアクセス（Google アカウントでログイン）
2. 「Create API key」→ プロジェクトを選択（または新規作成）
3. 発行されたキー（`AIza...` で始まる）をVercelの環境変数に貼り付ける

**Gemini API は無料枠が広いので、個人開発・試作中は完全無料で運用できます。**

---

## ローカルで動かす場合

```bash
# 依存関係をインストール
npm install

# .env.localを作成してAPIキーを設定
cp .env.local.example .env.local
# .env.localを開いてAPIキーを入力

# 開発サーバー起動
npm run dev
```

http://localhost:3000 で開きます。
