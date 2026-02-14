# AI要約 x Daily Quiz App

会話ベースの学習支援アプリです。  
チャット内容をもとに、要約シートと4択クイズを自動生成して復習できます。

## 主な機能

- Googleログイン（Firebase Authentication）
- 会話チャット（Vertex AI / Gemini）
- 回答ごとの要点・用語抽出
- 要約シート自動生成（Markdown）
- 要約シート再生成時の追加指示入力（任意）
- 要約シート一覧（左: 一覧 / 右: 詳細）とMarkdownダウンロード
- デイリークイズ生成（4択 + 解説）
- クイズ学習モード（選択式、結果一覧、解説表示、間違いのみ復習）
- 日次自動生成（Cloud Scheduler + Cloud Tasks）と手動生成

## 画面構成

- `/chat`: 会話一覧・チャット
- `/summary-sheets`: 要約シート一覧/詳細
- `/daily-quiz`: クイズ一覧
- `/settings`: 生成設定

## 技術スタック

- Next.js 16 (App Router) / React 19 / TypeScript
- Tailwind CSS v4 + shadcn/ui
- Firebase Authentication / Firestore
- Vertex AI (`gemini-2.5-flash` デフォルト)
- Cloud Tasks（本番の日次処理で利用）

## セットアップ

### 1. 前提

- Node.js 20 以上
- Firebaseプロジェクト（Googleログイン有効化）
- GCPプロジェクト（Vertex AI有効化）

### 2. インストール

```bash
npm install
```

### 3. 環境変数

`.env.example` を `.env.local` にコピーして値を設定してください。

```bash
cp .env.example .env.local
```

PowerShell の場合:

```powershell
Copy-Item .env.example .env.local
```

最低限設定が必要な項目:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `GOOGLE_CLOUD_PROJECT`
- `VERTEX_AI_LOCATION`（例: `asia-northeast1`）
- `VERTEX_AI_MODEL`（例: `gemini-2.5-flash`）
- `APP_URL`（ローカルは `http://localhost:3000`）

Firebase Admin 認証は次のいずれかを利用します。

- `gcloud auth application-default login`
- `FIREBASE_ADMIN_SA_KEY` にJSON文字列を設定
- `GOOGLE_APPLICATION_CREDENTIALS` に鍵ファイルパスを設定

### 4. 開発サーバー起動

```bash
npm run dev
```

`http://localhost:3000` にアクセスしてください。  
Googleログインは `localhost` ドメインでの利用を推奨します。

## npm scripts

- `npm run dev`: 開発サーバー
- `npm run build`: 本番ビルド
- `npm run start`: 本番起動
- `npm run lint`: ESLint
- `npm run mcp:playwright`: Playwright MCPサーバー起動（`127.0.0.1:8931`）

## API利用時の注意

- `/api/v1/**` は `Authorization: Bearer <Firebase ID Token>` が必要です。
- 一部POSTは `X-Idempotency-Key` が必須です。
  - 例: 会話作成、メッセージ送信、要約再生成、手動クイズ生成、クイズ再生成
- レート制限があります（例: チャット 10回/分、クイズ再生成 3回/日）。

## 日次クイズ自動生成フロー

1. Cloud Scheduler が `/api/internal/daily-quiz-trigger` を呼ぶ
2. 対象ユーザーごとに Cloud Tasks を enqueue
3. `/api/internal/daily-quiz-generate` が各ユーザー分を生成

開発環境では Cloud Tasks を使わずに直接実行されます。

## Firestoreデータ構造（概要）

```text
users/{userId}
  conversations/{conversationId}
    messages/{messageId}
    materials/{materialId}
    sheets/{sheetId}
  dailyQuizzes/{quizId}
  settings/default
  generationLogs/{logId}

idempotencyKeys/{key}
```

## 補足

- 主要仕様は `docs/` 配下（`DESIGN.md`, `EXECUTION_PLAN.md` など）にあります。
