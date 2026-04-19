# 🎭 影武者相談室

AIと本人が答える、あなただけの相談チャットサービス。

## 機能
- 💬 AI影武者チャット（Claude APIが自動応答）
- 📅 本人対応枠の予約カレンダー
- 🎭 キャラクター設定管理画面
- 🕐 時間帯で本人/AI自動切り替え

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
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-...`（Anthropicのダッシュボードから取得）
4. 「Deploy」ボタンを押す

→ 1〜2分でURLが発行されます 🎉

### ④ APIキーの取得（まだ持っていない場合）
1. https://console.anthropic.com にアクセス
2. 「API Keys」→「Create Key」
3. 発行されたキーをVercelの環境変数に貼り付ける

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
