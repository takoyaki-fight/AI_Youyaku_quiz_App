# AI学習アシスタント 実行計画書

> **プロジェクト名**: AI学習アシスタント（会話ログから学習素材を自動生成）
> **参照設計書**: [DESIGN.md](./DESIGN.md)
> **作成日**: 2026-02-07
> **想定開発期間**: 3日間（ハッカソン）

---

## 1. 全体スケジュール概要

```
Day 1 ─────────────────────────────────────────────────────
  AM  │ Phase 1: GCPプロジェクト構築 + Next.js初期化
      │ Phase 1: Firebase Auth + Firestore 接続
  PM  │ Phase 1: Cloud Run デプロイ確認
      │ Phase 2: Vertex AI Gemini 接続 + チャットAPI
      │ Phase 2: チャットUI基本形

Day 2 ─────────────────────────────────────────────────────
  AM  │ Phase 2: 会話の作成/一覧/継続 完成
      │ Phase 3: 素材生成（要約+用語+メンション）
  PM  │ Phase 3: 用語リンク化 + ポップアップ + 辞書画面
      │ Phase 4: 日次Q&A 生成ロジック + プロンプト

Day 3 ─────────────────────────────────────────────────────
  AM  │ Phase 4: Cloud Scheduler/Tasks + 日次Q&A画面
      │ Phase 4: 再生成API + バージョン管理 + 設定画面
  PM  │ Phase 5: TTL/カスケード削除 + レート制限
      │ Phase 5: エラーハンドリング + 最終テスト
      │ 提出準備（デモ動画・README等）
```

---

## 2. Phase 1: 基盤構築（Day 1 AM）

### 2.1 GCPプロジェクトセットアップ

| # | 作業項目 | コマンド/操作 | 完了条件 |
|---|---------|-------------|---------|
| 1 | GCPプロジェクト作成 | `gcloud projects create ai-learning-assistant-hack` | プロジェクトIDが発行される |
| 2 | 課金アカウント紐付け | GCPコンソール > 課金 | 課金が有効になる |
| 3 | 必要APIの有効化 | 下記コマンド参照 | 各APIがenabled |
| 4 | サービスアカウント作成 | 下記コマンド参照 | SA鍵が手元にある |

```bash
# 必要APIの一括有効化
gcloud services enable \
  run.googleapis.com \
  aiplatform.googleapis.com \
  firestore.googleapis.com \
  cloudscheduler.googleapis.com \
  cloudtasks.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

# Firestoreデータベース作成（Native mode）
gcloud firestore databases create --location=asia-northeast1

# Cloud Tasks キュー作成
gcloud tasks queues create daily-quiz-queue --location=asia-northeast1

# Artifact Registry リポジトリ作成
gcloud artifacts repositories create app-repo \
  --repository-format=docker \
  --location=asia-northeast1
```

### 2.2 Firebase セットアップ

| # | 作業項目 | 操作 | 完了条件 |
|---|---------|------|---------|
| 1 | Firebaseプロジェクト紐付け | Firebase Console > プロジェクト追加 > 既存GCPプロジェクト選択 | Firebase Consoleにプロジェクト表示 |
| 2 | Firebase Auth有効化 | Authentication > Sign-in method > Google | Google Sign-In が有効 |
| 3 | Firebase SDK設定取得 | プロジェクト設定 > ウェブアプリ追加 | `firebaseConfig`オブジェクトを取得 |
| 4 | Firebase Admin SDK鍵生成 | サービスアカウント > 新しい秘密鍵 | JSONファイルをダウンロード |

### 2.3 Next.js プロジェクト初期化

```bash
npx create-next-app@latest ai-learning-assistant \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd ai-learning-assistant

# 依存パッケージインストール
npm install firebase firebase-admin \
  @google-cloud/vertexai \
  @google-cloud/tasks \
  uuid

# UI コンポーネント
npx shadcn@latest init
npx shadcn@latest add button input card dialog accordion popover
```

**ディレクトリ構成の作成:**
```
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (main)/
│   │   ├── chat/page.tsx
│   │   ├── chat/[conversationId]/page.tsx
│   │   ├── chat/[conversationId]/terms/page.tsx
│   │   ├── daily-quiz/page.tsx
│   │   ├── daily-quiz/[date]/page.tsx
│   │   └── settings/page.tsx
│   ├── api/v1/conversations/route.ts
│   ├── api/v1/conversations/[id]/route.ts
│   ├── api/v1/conversations/[id]/messages/route.ts
│   ├── api/v1/conversations/[convId]/materials/[msgId]/route.ts
│   ├── api/v1/conversations/[convId]/materials/[msgId]/regenerate/route.ts
│   ├── api/v1/conversations/[convId]/materials/[msgId]/active-version/route.ts
│   ├── api/v1/conversations/[convId]/terms/route.ts
│   ├── api/v1/daily-quizzes/route.ts
│   ├── api/v1/daily-quizzes/[date]/route.ts
│   ├── api/v1/daily-quizzes/[date]/regenerate/route.ts
│   ├── api/v1/daily-quizzes/[date]/active-version/route.ts
│   ├── api/v1/settings/route.ts
│   ├── api/internal/daily-quiz-trigger/route.ts
│   ├── api/internal/daily-quiz-generate/route.ts
│   └── layout.tsx
├── lib/
│   ├── firebase/client.ts        # クライアント側Firebase初期化
│   ├── firebase/admin.ts         # サーバー側Firebase Admin初期化
│   ├── firestore/repository.ts   # Firestoreアクセス層
│   ├── vertex-ai/client.ts       # Vertex AI初期化
│   ├── vertex-ai/chat.ts         # チャット応答生成
│   ├── vertex-ai/material.ts     # 素材生成
│   ├── vertex-ai/daily-quiz.ts   # 日次Q&A生成
│   ├── services/chat.service.ts
│   ├── services/material.service.ts
│   ├── services/daily-quiz.service.ts
│   ├── services/regeneration.service.ts
│   ├── middleware/auth.ts        # Firebase Auth検証ミドルウェア
│   ├── middleware/rate-limit.ts  # レート制限
│   ├── middleware/idempotency.ts # 冪等性チェック
│   ├── prompts/chat.ts
│   ├── prompts/material.ts
│   ├── prompts/daily-quiz.ts
│   └── utils/date.ts            # JST日付ユーティリティ
├── components/
│   ├── chat/
│   │   ├── ConversationSidebar.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── LinkedContent.tsx
│   │   ├── TermPopover.tsx
│   │   ├── SummaryAccordion.tsx
│   │   └── MessageInput.tsx
│   ├── quiz/
│   │   ├── QuizCardList.tsx
│   │   └── QuizCard.tsx
│   ├── terms/
│   │   ├── TermList.tsx
│   │   └── TermDetail.tsx
│   ├── settings/
│   │   └── SettingsForm.tsx
│   └── common/
│       ├── Header.tsx
│       ├── AuthGuard.tsx
│       └── LoadingSpinner.tsx
└── types/
    ├── conversation.ts
    ├── message.ts
    ├── material.ts
    ├── daily-quiz.ts
    └── settings.ts
```

### 2.4 Cloud Run 初回デプロイ

**Dockerfile:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 8080
ENV PORT=8080
CMD ["node", "server.js"]
```

```bash
# ビルド & デプロイ
gcloud builds submit --tag asia-northeast1-docker.pkg.dev/PROJECT_ID/app-repo/app:v1

gcloud run deploy ai-learning-assistant \
  --image asia-northeast1-docker.pkg.dev/PROJECT_ID/app-repo/app:v1 \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=PROJECT_ID"
```

**Phase 1 完了条件:**
- [x] ローカルで `npm run dev` → ログイン画面表示
- [x] Google Sign-In でログイン成功
- [x] Firestoreに `users` ドキュメント書き込み確認
- [x] Cloud Run にデプロイ → HTTPS URLでアクセス可能

---

## 3. Phase 2: チャットコア（Day 1 PM ～ Day 2 AM）

### 3.1 実装順序

| # | ファイル | 内容 | 所要時間目安 |
|---|---------|------|-----------|
| 1 | `lib/vertex-ai/client.ts` | Vertex AI初期化 | 15分 |
| 2 | `lib/prompts/chat.ts` | チャットシステムプロンプト | 10分 |
| 3 | `lib/vertex-ai/chat.ts` | Gemini呼び出し（ストリーミング対応） | 45分 |
| 4 | `lib/firestore/repository.ts` | 会話・メッセージCRUD | 45分 |
| 5 | `lib/middleware/auth.ts` | Firebase IDトークン検証 | 30分 |
| 6 | `lib/middleware/idempotency.ts` | 冪等キーチェック | 20分 |
| 7 | `api/v1/conversations/route.ts` | 会話作成/一覧API | 30分 |
| 8 | `api/v1/conversations/[id]/route.ts` | 会話詳細/削除API | 20分 |
| 9 | `api/v1/conversations/[id]/messages/route.ts` | **メッセージ送信API（中核）** | 60分 |
| 10 | `components/chat/*` | チャットUI全体 | 90分 |

### 3.2 技術的注意点

**Vertex AI認証:**
```typescript
// Cloud Run上ではApplication Default Credentialsが自動で使える
// ローカル開発時は gcloud auth application-default login を事前実行
import { VertexAI } from '@google-cloud/vertexai';

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: 'asia-northeast1',
});
```

**チャットAPIのストリーミング対応（推奨）:**
```typescript
// Next.js App RouterでのStreaming Response
export async function POST(req: Request) {
  // ... 認証・冪等チェック ...

  const stream = new ReadableStream({
    async start(controller) {
      // 1. チャット応答をストリーミング
      const chatStream = await model.generateContentStream(request);
      let fullResponse = '';

      for await (const chunk of chatStream.stream) {
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
        fullResponse += text;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chat', text })}\n\n`));
      }

      // 2. 素材生成（ストリーム完了後）
      const material = await generateMaterial(conversationHistory, fullResponse);
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'material', material })}\n\n`));

      controller.close();
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

**Phase 2 完了条件:**
- [x] チャット画面でメッセージ送信 → AI応答がリアルタイム表示
- [x] 会話一覧に過去の会話が表示
- [x] 会話の継続（同じ会話でやりとり）が可能
- [x] 同じ冪等キーで再送信しても二重作成されない

---

## 4. Phase 3: 素材生成（Day 2 AM ～ PM）

### 4.1 実装順序

| # | ファイル | 内容 | 所要時間目安 |
|---|---------|------|-----------|
| 1 | `lib/prompts/material.ts` | 素材生成プロンプト + JSONスキーマ | 30分 |
| 2 | `lib/vertex-ai/material.ts` | 構造化出力呼び出し + バリデーション + フォールバック | 60分 |
| 3 | `lib/services/material.service.ts` | 素材保存・取得・オフセット補正 | 45分 |
| 4 | メッセージ送信APIに統合 | チャット応答後に素材生成を呼び出し | 30分 |
| 5 | `components/chat/SummaryAccordion.tsx` | 要約の折りたたみ表示 | 20分 |
| 6 | `components/chat/LinkedContent.tsx` | 用語リンク化レンダリング | 45分 |
| 7 | `components/chat/TermPopover.tsx` | 用語ポップアップ | 20分 |
| 8 | `app/(main)/chat/[convId]/terms/page.tsx` | 用語辞書画面 | 40分 |
| 9 | `api/v1/conversations/[convId]/terms/route.ts` | 用語一覧API | 20分 |

### 4.2 オフセット補正ロジック（重要）

Geminiが返すオフセットは不正確な場合があるため、サーバー側で補正する。

```typescript
function correctMentionOffsets(content: string, mentions: Mention[]): Mention[] {
  return mentions.map(m => {
    // Geminiが返したオフセットで実際の文字列を取得
    const extracted = content.substring(m.startOffset, m.endOffset);

    if (extracted === m.surface) {
      // 正確 → そのまま
      return m;
    }

    // 不正確 → indexOf で再検索
    const searchStart = Math.max(0, m.startOffset - 50);
    const idx = content.indexOf(m.surface, searchStart);

    if (idx === -1) {
      // 本文中に見つからない → 除外（confidence=0）
      return { ...m, confidence: 0 };
    }

    return {
      ...m,
      startOffset: idx,
      endOffset: idx + m.surface.length,
    };
  }).filter(m => m.confidence >= 0.7);
}
```

### 4.3 LinkedContent コンポーネントの実装方針

```typescript
// mentions をオフセット順にソートし、本文を分割してリンク化
function renderLinkedContent(content: string, mentions: Mention[], terms: Term[]) {
  const sorted = [...mentions].sort((a, b) => a.startOffset - b.startOffset);
  const segments: ReactNode[] = [];
  let lastEnd = 0;

  for (const mention of sorted) {
    // リンク前のプレーンテキスト
    if (mention.startOffset > lastEnd) {
      segments.push(content.substring(lastEnd, mention.startOffset));
    }

    // リンク化されたテキスト
    const term = terms.find(t => t.termId === mention.termId);
    segments.push(
      <TermPopover key={mention.startOffset} term={term}>
        <span className="text-blue-600 underline cursor-pointer">
          {content.substring(mention.startOffset, mention.endOffset)}
        </span>
      </TermPopover>
    );

    lastEnd = mention.endOffset;
  }

  // 残りのテキスト
  if (lastEnd < content.length) {
    segments.push(content.substring(lastEnd));
  }

  return <>{segments}</>;
}
```

**Phase 3 完了条件:**
- [x] assistantの各応答に要約が表示される（折りたたみ可）
- [x] 本文中の専門用語がリンク化されている
- [x] リンクをクリック/タップで用語定義がポップアップ表示
- [x] 用語辞書画面で会話内の全用語を一覧・検索できる
- [x] オフセットのズレがない（or 自動補正されている）

---

## 5. Phase 4: 日次Q&A + 再生成 + 設定（Day 2 PM ～ Day 3 AM）

### 5.1 実装順序

| # | ファイル | 内容 | 所要時間目安 |
|---|---------|------|-----------|
| 1 | `lib/prompts/daily-quiz.ts` | 日次Q&Aプロンプト | 20分 |
| 2 | `lib/vertex-ai/daily-quiz.ts` | Q&A生成 + バリデーション | 40分 |
| 3 | `lib/services/daily-quiz.service.ts` | 配分アルゴリズム + 保存 | 45分 |
| 4 | `api/internal/daily-quiz-trigger/route.ts` | Scheduler受付 → Tasks enqueue | 30分 |
| 5 | `api/internal/daily-quiz-generate/route.ts` | 1ユーザー分のQ&A生成 | 30分 |
| 6 | Cloud Scheduler設定 | `gcloud scheduler jobs create` | 15分 |
| 7 | `api/v1/daily-quizzes/` 各route | Q&A取得/再生成/active切替API | 40分 |
| 8 | `components/quiz/*` | Q&Aカード表示UI | 40分 |
| 9 | `app/(main)/daily-quiz/*` | 日次Q&A画面 | 30分 |
| 10 | `lib/services/regeneration.service.ts` | 素材再生成 + バージョン管理 | 40分 |
| 11 | `api/v1/.../regenerate/route.ts` | 再生成エンドポイント | 20分 |
| 12 | `api/v1/.../active-version/route.ts` | active版切替 | 15分 |
| 13 | `api/v1/settings/route.ts` | 設定CRUD API | 15分 |
| 14 | `app/(main)/settings/page.tsx` | 設定画面UI | 30分 |

### 5.2 Cloud Scheduler 設定コマンド

```bash
# サービスアカウント作成（Scheduler → Cloud Run 呼び出し用）
gcloud iam service-accounts create scheduler-sa \
  --display-name="Cloud Scheduler SA"

# Cloud Run invoker 権限付与
gcloud run services add-iam-policy-binding ai-learning-assistant \
  --region=asia-northeast1 \
  --member="serviceAccount:scheduler-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

# Cloud Tasks SA にも同様の権限付与
gcloud iam service-accounts create tasks-sa \
  --display-name="Cloud Tasks SA"

gcloud run services add-iam-policy-binding ai-learning-assistant \
  --region=asia-northeast1 \
  --member="serviceAccount:tasks-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

# Scheduler ジョブ作成
gcloud scheduler jobs create http daily-quiz-trigger \
  --schedule="0 7 * * *" \
  --time-zone="Asia/Tokyo" \
  --uri="https://CLOUD_RUN_URL/api/internal/daily-quiz-trigger" \
  --http-method=POST \
  --oidc-service-account-email="scheduler-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --location=asia-northeast1
```

### 5.3 再生成のバージョン管理フロー

```
ユーザーが「再生成」ボタンを押す
    │
    ▼
[レート制限チェック]
    │ NG → 429 Too Many Requests
    ▼ OK
[現在のmax versionを取得]
    │
    ▼
[Gemini で新しい素材を生成]
    │
    ▼
[Firestoreトランザクション]
    ├── 旧active版: isActive = false
    ├── 新版: isActive = true, version = max + 1
    └── メッセージの activeMaterialVersion 更新
    │
    ▼
[generationLog 保存]
    │
    ▼
[新素材を返却]
```

**Phase 4 完了条件:**
- [x] Cloud Scheduler が 07:00 JST に daily-quiz-trigger を呼び出す
- [x] 昨日の会話からQ&Aカードが生成される
- [x] Q&Aカードにタグ（What/Why/How/When/Example）と出典が表示
- [x] 素材・Q&Aの再生成ボタンが動作する
- [x] バージョン一覧表示 + active版の切替が可能
- [x] 設定画面で日次上限（全体/会話ごと）を変更できる

---

## 6. Phase 5: 堅牢化（Day 3 PM）

### 6.1 実装順序

| # | 作業項目 | 所要時間目安 |
|---|---------|-----------|
| 1 | Firestore TTLポリシー設定 | 15分 |
| 2 | カスケード削除の実装・テスト | 30分 |
| 3 | レート制限ミドルウェア実装 | 20分 |
| 4 | generationLog記録の全API統合 | 20分 |
| 5 | エラーハンドリング統一 | 20分 |
| 6 | フォールバック動作テスト | 15分 |
| 7 | Cloud Run 環境変数最終確認 | 10分 |
| 8 | 本番デプロイ + 動作確認 | 20分 |

### 6.2 Firestore TTL設定

```bash
# TTLポリシーの設定（expireAtフィールドを指定）
gcloud firestore fields ttls update expireAt \
  --collection-group=conversations \
  --enable-ttl

gcloud firestore fields ttls update expireAt \
  --collection-group=messages \
  --enable-ttl

gcloud firestore fields ttls update expireAt \
  --collection-group=materials \
  --enable-ttl

gcloud firestore fields ttls update expireAt \
  --collection-group=dailyQuizzes \
  --enable-ttl

gcloud firestore fields ttls update expireAt \
  --collection-group=generationLogs \
  --enable-ttl

gcloud firestore fields ttls update expireAt \
  --collection-group=idempotencyKeys \
  --enable-ttl
```

### 6.3 環境変数一覧

| 変数名 | 値の例 | 設定場所 |
|--------|-------|---------|
| `GOOGLE_CLOUD_PROJECT` | `ai-learning-assistant-hack` | Cloud Run |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIza...` | Cloud Run |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `xxx.firebaseapp.com` | Cloud Run |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `ai-learning-assistant-hack` | Cloud Run |
| `FIREBASE_ADMIN_SA_KEY` | `(JSON文字列 or Secret Manager)` | Cloud Run (Secret) |
| `VERTEX_AI_LOCATION` | `asia-northeast1` | Cloud Run |
| `CLOUD_TASKS_QUEUE` | `daily-quiz-queue` | Cloud Run |
| `CLOUD_TASKS_SA_EMAIL` | `tasks-sa@xxx.iam.gserviceaccount.com` | Cloud Run |
| `APP_URL` | `https://xxx.run.app` | Cloud Run |

**Phase 5 完了条件:**
- [x] 30日より前に作成したテストデータがTTLで削除される（※実際の削除は数日遅延あり）
- [x] 会話削除時にmessages/materials/Q&Aカードが連動削除される
- [x] チャット送信のレート制限が動作する（1分10回超で429）
- [x] 再生成のレート制限が動作する（1日10回超で429）
- [x] generationLogが記録され、トークン使用量を確認できる

---

## 7. 提出準備チェックリスト

| # | 項目 | 確認 |
|---|------|------|
| 1 | Cloud Run でアプリが動作している | [ ] |
| 2 | Vertex AI (Gemini API) を使用している | [ ] |
| 3 | Firebase Authentication でログインできる | [ ] |
| 4 | チャットでAIと日本語で会話できる | [ ] |
| 5 | assistant応答ごとに要約が表示される | [ ] |
| 6 | 用語がリンク化され、ポップアップで定義表示される | [ ] |
| 7 | 用語辞書画面で一覧検索できる | [ ] |
| 8 | 日次Q&A（07:00 JST）が自動生成される | [ ] |
| 9 | Q&Aカードにタグと出典が表示される | [ ] |
| 10 | 素材/Q&Aの再生成 + バージョン切替ができる | [ ] |
| 11 | 設定画面で日次上限を変更できる | [ ] |
| 12 | 会話データが30日TTLで自動削除される設定 | [ ] |
| 13 | GitHubリポジトリにコードがpushされている | [ ] |
| 14 | README.md にセットアップ手順がある | [ ] |

---

## 8. リスク管理と対応方針

### 8.1 ブロッカーリスク（発生時に作業停止する可能性）

| リスク | 発生確率 | 影響度 | 対応方針 |
|--------|---------|-------|---------|
| Vertex AI APIの認証エラー | 中 | **致命的** | Day 1 午前中に接続確認を最優先。失敗時は `@google/generative-ai` SDK（API Key方式）にフォールバック |
| Cloud Run デプロイ失敗 | 低 | **致命的** | Dockerfileの段階的ビルド確認。失敗時は `next.config.js` の `output: 'standalone'` を確認 |
| Firestore権限エラー | 低 | 高 | サービスアカウントの IAM ロール確認。Cloud Run のデフォルトSAに `roles/datastore.user` 付与 |

### 8.2 品質リスク（機能は動くがUXが低い可能性）

| リスク | 発生確率 | 影響度 | 対応方針 |
|--------|---------|-------|---------|
| 用語オフセットのズレ | **高** | 中 | `correctMentionOffsets()` で補正。それでも駄目ならmentionを使わず、正規表現ベースの用語マッチに切替 |
| 素材生成でチャット応答が遅延 | 中 | 中 | 素材生成を非同期化（SSE/ポーリング）。チャット応答を先に返す |
| 日次Q&Aの問題品質が低い | 中 | 低 | プロンプト調整で対応。MVPでは許容 |

### 8.3 タイムライン判断基準

| 時点 | 判断 | 基準 |
|------|------|------|
| Day 1 終了時 | Phase 2 完了しているか | チャットが動作する → 予定通り。動作しない → Day 2 AMにPhase 2完了を最優先 |
| Day 2 昼 | Phase 3 の素材生成が動くか | 動く → 予定通り。動かない → 用語リンクを簡易版（正規表現）に切替え、Phase 4に進む |
| Day 2 終了時 | Phase 4 に着手できているか | 着手済 → 予定通り。未着手 → Day 3は日次Q&A + 再生成に集中、Phase 5は最小限に |
| Day 3 昼 | デモ可能な状態か | 可能 → Phase 5堅牢化。不可能 → デモに必要な機能だけ仕上げる |

---

## 9. コマンドリファレンス（クイック参照）

### ローカル開発
```bash
npm run dev                          # 開発サーバー起動（localhost:3000）
gcloud auth application-default login # Vertex AI ローカル認証
```

### デプロイ
```bash
# ビルド + Cloud Run デプロイ（1コマンド）
gcloud run deploy ai-learning-assistant \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated
```

### デバッグ
```bash
gcloud run services logs read ai-learning-assistant --region=asia-northeast1 --limit=50
gcloud scheduler jobs run daily-quiz-trigger --location=asia-northeast1  # 手動実行
gcloud tasks list --queue=daily-quiz-queue --location=asia-northeast1
```

### Firestore確認
```bash
# Firebase Emulator（ローカルテスト用、任意）
firebase emulators:start --only firestore,auth
```
