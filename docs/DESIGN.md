# AI学習アシスタント 詳細設計書

## 0. 設計判断（要件の曖昧箇所への回答）

| # | 曖昧点 | 推奨デフォルト案（本設計で採用） | 理由 |
|---|--------|-------------------------------|------|
| Q1 | DBは何を使うか | **Firestore（Native mode）** | スキーマレスでTTL組み込み、Firebase Auth連携が容易、ハッカソン向きの立ち上がり速度 |
| Q2 | フロントエンド技術 | **Next.js (App Router) on Cloud Run** | SSR/APIルートを1コンテナで完結、Vercel不要でCloud Run条件を満たす |
| Q3 | 認証方式 | **Firebase Authentication（Google Sign-In）** | 最小構成で安全、Firestoreセキュリティルールと直結 |
| Q4 | キュー/非同期処理 | **Cloud Tasks**（日次バッチ + 再生成） | Cloud Scheduler → Cloud Tasks → Cloud Run で統一。Cloud Pub/Subより設定が軽い |
| Q5 | Geminiモデル選定 | チャット本体: **Gemini 2.0 Flash**、日次Q&A: **Gemini 2.0 Flash** | コスト最小。品質不足時のみProへ昇格 |
| Q6 | 用語辞書のスコープ | **会話スコープ**（conversation単位） | 要件7に従い、MVP後に横断辞書へ拡張可能な構造にする |
| Q7 | フロントのUIライブラリ | **Tailwind CSS + shadcn/ui** | 高速プロトタイピング向き |
| Q8 | 同時接続想定 | **DAU 100人以下**（ハッカソンMVP） | コスト概算の基準 |

---

## 1. アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                        ユーザー (ブラウザ)                        │
│                     Next.js App (React)                         │
└──────────────┬──────────────────────────────────────────────────┘
               │ HTTPS
               ▼
┌──────────────────────────────────────┐
│         Cloud Run (単一サービス)        │
│  ┌──────────────────────────────┐    │
│  │  Next.js App Router          │    │
│  │  - Pages (SSR/CSR)           │    │
│  │  - API Routes (/api/*)       │    │
│  └──────────┬───────────────────┘    │
│             │                        │
│  ┌──────────▼───────────────────┐    │
│  │  Backend Services             │    │
│  │  - ChatService               │    │
│  │  - MaterialService           │    │
│  │  - DailyQuizService          │    │
│  │  - RegenerationService       │    │
│  └──────────┬───────────────────┘    │
└─────────────┼────────────────────────┘
              │
    ┌─────────┼──────────┬─────────────────┐
    ▼         ▼          ▼                 ▼
┌────────┐ ┌──────┐ ┌──────────┐  ┌──────────────┐
│Firestore│ │Vertex│ │Cloud     │  │Cloud         │
│(DB+TTL) │ │AI    │ │Scheduler │  │Tasks         │
│         │ │Gemini│ │(07:00JST)│  │(非同期ジョブ)  │
└────────┘ └──────┘ └──────────┘  └──────────────┘
    ▲                     │              │
    │                     ▼              ▼
    │              Cloud Run (同一サービスの内部エンドポイント)
    │              POST /api/internal/daily-quiz
    │              POST /api/internal/regenerate
    └──────────────────────────────────────
```

### コンポーネント一覧

| コンポーネント | GCPプロダクト | 役割 |
|---|---|---|
| Webアプリ + API | **Cloud Run** (必須条件2.1) | Next.jsホスティング、全APIエンドポイント |
| AI推論 | **Vertex AI Gemini API** (必須条件2.2) | チャット応答、素材生成、日次Q&A |
| データベース | **Firestore** | 会話・素材・Q&A・設定の永続化、TTL自動削除 |
| 認証 | **Firebase Authentication** | Google Sign-In、JWT検証 |
| 日次スケジューラ | **Cloud Scheduler** | 07:00 JST cron |
| 非同期タスク | **Cloud Tasks** | 日次バッチの各ユーザー処理、再生成 |

### デプロイ構成

```yaml
# Cloud Run サービス
Service: ai-learning-assistant
Region: asia-northeast1 (東京)
Min instances: 0
Max instances: 10
Memory: 512Mi
CPU: 1
Concurrency: 80
Timeout: 300s
```

---

## 2. データモデル

### 2.1 エンティティ関係図

```
users
  └─── conversations (TTL: 30日)
         ├─── messages (サブコレクション)
         │      └─ role: user | assistant
         │
         ├─── materials (サブコレクション, versionあり)
         │      ├─ summary
         │      ├─ terms[]
         │      └─ mentions[]
         │
         └─ (参照元) dailyQuizzes
                └─ cards[] (各カードにsources)

users
  └─── dailyQuizzes (TTL: 30日, versionあり)

users
  └─── settings

users
  └─── generationLogs
```

### 2.2 コレクション定義

#### `users/{userId}`
```typescript
interface User {
  userId: string;           // Firebase Auth UID
  email: string;
  displayName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `users/{userId}/settings`（単一ドキュメント `default`）
```typescript
interface UserSettings {
  dailyQuizEnabled: boolean;        // default: true
  dailyQuizMaxTotal: number;        // default: 20, range: 1-50
  dailyQuizMaxPerConversation: number; // default: 5, range: 1-10
  regenerationDailyLimit: number;   // default: 10
  updatedAt: Timestamp;
}
```

#### `users/{userId}/conversations/{conversationId}`
```typescript
interface Conversation {
  conversationId: string;   // UUID v4
  title: string;            // 最初のユーザーメッセージから自動生成
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expireAt: Timestamp;      // Firestore TTL: createdAt + 30日
  messageCount: number;
}
```

#### `users/{userId}/conversations/{conversationId}/messages/{messageId}`
```typescript
interface Message {
  messageId: string;          // UUID v4
  role: 'user' | 'assistant';
  content: string;            // 元のテキスト（用語リンクなし）
  createdAt: Timestamp;
  expireAt: Timestamp;        // 親conversationと同一TTL

  // assistant メッセージのみ
  activeMaterialVersion?: number;  // 現在採用中の素材バージョン
}
```

#### `users/{userId}/conversations/{conversationId}/materials/{materialId}`
```typescript
interface Material {
  materialId: string;         // "{messageId}_v{version}" 形式
  messageId: string;          // 対象のassistantメッセージID
  version: number;            // 1始まり、再生成で+1
  isActive: boolean;          // このバージョンが採用中か

  summary: string[];          // 要約（5〜10行の配列）

  terms: Term[];              // 抽出用語一覧
  mentions: Mention[];        // 本文中の用語出現位置

  idempotencyKey: string;     // 冪等キー: "{messageId}_v{version}"
  generationModel: string;    // 使用モデル名
  promptTokens: number;       // 入力トークン数
  completionTokens: number;   // 出力トークン数
  generatedAt: Timestamp;
  expireAt: Timestamp;        // 親conversationと同一TTL
}

interface Term {
  termId: string;             // UUID v4
  surface: string;            // 表層形（例："量子もつれ"）
  reading: string;            // 読み（例："りょうしもつれ"）
  definition: string;         // 会話文脈における定義
  category: string;           // "technical" | "proper_noun" | "concept"
  confidence: number;         // 0.0-1.0
}

interface Mention {
  termId: string;             // 対応するTermのID
  surface: string;            // 本文中に出現した表記
  startOffset: number;        // 本文中の開始位置（文字単位）
  endOffset: number;          // 本文中の終了位置（文字単位）
  confidence: number;         // 0.0-1.0（閾値: 0.7以上のみリンク化）
}
```

#### `users/{userId}/dailyQuizzes/{quizId}`
```typescript
interface DailyQuiz {
  quizId: string;             // "{targetDate}_v{version}" 形式
  targetDate: string;         // "2026-02-06" (JSTの日付)
  version: number;
  isActive: boolean;

  cards: QuizCard[];

  idempotencyKey: string;     // "{userId}_{targetDate}_v{version}"
  generationModel: string;
  promptTokens: number;
  completionTokens: number;
  generatedAt: Timestamp;
  expireAt: Timestamp;        // targetDate + 30日
}

interface QuizCard {
  cardId: string;             // UUID v4
  tag: 'What' | 'Why' | 'How' | 'When' | 'Example';
  question: string;
  answer: string;
  sources: string[];          // messageId の配列
  conversationId: string;     // 元の会話ID
}
```

#### `users/{userId}/generationLogs/{logId}`
```typescript
interface GenerationLog {
  logId: string;
  type: 'chat' | 'material' | 'daily_quiz' | 'regeneration';
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  createdAt: Timestamp;
  expireAt: Timestamp;        // 30日TTL
}
```

### 2.3 TTL設計

| データ | TTL基準日 | 保持期間 |
|--------|----------|---------|
| conversations | createdAt | 30日 |
| messages | 親conversationのexpireAt | 30日 |
| materials | 親conversationのexpireAt | 30日 |
| dailyQuizzes | targetDate | 30日 |
| generationLogs | createdAt | 30日 |

Firestoreの TTLポリシー で `expireAt` フィールドを指定。自動削除はFirestoreが実行する（数日以内の遅延あり）。

### 2.4 カスケード削除

ユーザーが会話を手動削除した場合：
1. `conversations/{conversationId}` を削除
2. Cloud Functions / API内で以下を削除:
   - `messages/*`（サブコレクション）
   - `materials/*`（サブコレクション）
   - `dailyQuizzes` 内で `cards[].conversationId === conversationId` のカードを除去（カードが0になったらドキュメントごと削除）

```typescript
// カスケード削除の実装方針
async function deleteConversationCascade(userId: string, conversationId: string) {
  const batch = db.batch();

  // 1. messages サブコレクション全削除
  const messages = await db
    .collection(`users/${userId}/conversations/${conversationId}/messages`)
    .listDocuments();
  messages.forEach(doc => batch.delete(doc));

  // 2. materials サブコレクション全削除
  const materials = await db
    .collection(`users/${userId}/conversations/${conversationId}/materials`)
    .listDocuments();
  materials.forEach(doc => batch.delete(doc));

  // 3. 会話ドキュメント本体を削除
  batch.delete(
    db.doc(`users/${userId}/conversations/${conversationId}`)
  );

  await batch.commit();

  // 4. dailyQuizzes からこの会話由来のカードを除去（別トランザクション）
  await purgeDailyQuizCards(userId, conversationId);
}
```

---

## 3. API設計

### 3.1 共通仕様

- **ベースパス**: `/api/v1`
- **認証**: `Authorization: Bearer <Firebase ID Token>` → サーバー側でFirebase Admin SDKで検証
- **冪等キー**: `X-Idempotency-Key` ヘッダ（POST系で必須）
- **レスポンス形式**: JSON
- **エラー形式**:
```json
{
  "error": {
    "code": "CONVERSATION_NOT_FOUND",
    "message": "指定された会話は存在しません。"
  }
}
```

### 3.2 エンドポイント一覧

#### チャット

| Method | Path | 説明 | 冪等キー |
|--------|------|------|---------|
| POST | `/api/v1/conversations` | 新規会話作成 | `X-Idempotency-Key` (UUID) |
| GET | `/api/v1/conversations` | 会話一覧取得 | — |
| GET | `/api/v1/conversations/:id` | 会話詳細 + メッセージ一覧 | — |
| DELETE | `/api/v1/conversations/:id` | 会話削除(カスケード) | — |
| POST | `/api/v1/conversations/:id/messages` | メッセージ送信→AI応答+素材生成 | `X-Idempotency-Key` |

#### 学習素材

| Method | Path | 説明 | 冪等キー |
|--------|------|------|---------|
| GET | `/api/v1/conversations/:convId/materials/:msgId` | 特定メッセージの素材(active版) | — |
| GET | `/api/v1/conversations/:convId/materials/:msgId/versions` | 素材のバージョン一覧 | — |
| POST | `/api/v1/conversations/:convId/materials/:msgId/regenerate` | 素材再生成 | `X-Idempotency-Key` |
| PUT | `/api/v1/conversations/:convId/materials/:msgId/active-version` | active版切替 | — |

#### 用語辞書

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/v1/conversations/:convId/terms` | 会話内の全用語(active素材から集約) |
| GET | `/api/v1/conversations/:convId/terms/:termId` | 用語詳細 + 出現箇所 |

#### 日次一問一答

| Method | Path | 説明 | 冪等キー |
|--------|------|------|---------|
| GET | `/api/v1/daily-quizzes` | 日次Q&A一覧(日付降順) | — |
| GET | `/api/v1/daily-quizzes/:date` | 特定日のQ&A(active版) | — |
| GET | `/api/v1/daily-quizzes/:date/versions` | バージョン一覧 | — |
| POST | `/api/v1/daily-quizzes/:date/regenerate` | 再生成 | `X-Idempotency-Key` |
| PUT | `/api/v1/daily-quizzes/:date/active-version` | active版切替 | — |

#### 設定

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/v1/settings` | ユーザー設定取得 |
| PUT | `/api/v1/settings` | ユーザー設定更新 |

#### 内部エンドポイント（Cloud Tasks/Schedulerから呼び出し）

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/internal/daily-quiz-trigger` | Cloud Schedulerが呼出。全対象ユーザーのタスクをenqueue |
| POST | `/api/internal/daily-quiz-generate` | Cloud Tasksが呼出。1ユーザー分のQ&A生成 |

内部エンドポイントはOIDCトークンで認証（Cloud Scheduler/Tasks → Cloud Runのサービス間認証）。

### 3.3 主要エンドポイント詳細

#### `POST /api/v1/conversations/:id/messages`（最重要）

**Request:**
```json
{
  "content": "量子コンピュータについて教えてください"
}
```
**Headers:**
```
Authorization: Bearer <firebase_id_token>
X-Idempotency-Key: "550e8400-e29b-41d4-a716-446655440000"
```

**処理フロー:**
```
1. 冪等チェック（同一keyのメッセージが既存なら既存結果を返却）
2. userメッセージをFirestoreに保存
3. 会話履歴を取得（直近20件に制限）
4. Vertex AI Gemini呼び出し（チャット応答）
5. assistantメッセージをFirestoreに保存
6. Vertex AI Gemini呼び出し（素材生成: 要約+用語+メンション）※ストリーミング応答後に非同期でも可
7. materialをFirestoreに保存
8. generationLogを保存
9. レスポンス返却
```

**Response (201):**
```json
{
  "userMessage": {
    "messageId": "msg_001",
    "role": "user",
    "content": "量子コンピュータについて教えてください",
    "createdAt": "2026-02-07T10:00:00Z"
  },
  "assistantMessage": {
    "messageId": "msg_002",
    "role": "assistant",
    "content": "量子コンピュータは、量子力学の原理を利用して...",
    "createdAt": "2026-02-07T10:00:02Z"
  },
  "material": {
    "materialId": "msg_002_v1",
    "version": 1,
    "isActive": true,
    "summary": [
      "量子コンピュータは量子ビット(qubit)を使った計算機である",
      "従来のビットと異なり、0と1の重ね合わせ状態を取れる",
      "特定の問題で古典コンピュータより指数関数的に高速",
      "量子もつれと量子干渉が計算能力の源泉",
      "現在はノイズの課題があり、実用化は段階的に進行中"
    ],
    "terms": [
      {
        "termId": "term_001",
        "surface": "量子ビット",
        "reading": "りょうしビット",
        "definition": "量子コンピュータの基本単位。0と1の重ね合わせ状態を取ることができる。",
        "category": "technical",
        "confidence": 0.95
      }
    ],
    "mentions": [
      {
        "termId": "term_001",
        "surface": "量子ビット",
        "startOffset": 15,
        "endOffset": 20,
        "confidence": 0.95
      }
    ]
  }
}
```

#### `POST /api/v1/conversations/:convId/materials/:msgId/regenerate`

**処理:**
1. 日次再生成上限チェック（`regenerationDailyLimit`）
2. 新しいversion番号を採番（既存max + 1）
3. Gemini呼び出し（素材生成）
4. 新materialを `isActive: true` で保存、旧active版を `isActive: false` に更新
5. generationLog保存

**Response (201):**
```json
{
  "material": { "...新しい素材..." },
  "previousVersion": 1,
  "currentVersion": 2
}
```

### 3.4 冪等性の実装

```typescript
async function checkIdempotency(key: string, collection: string): Promise<ExistingResult | null> {
  const doc = await db.collection('idempotencyKeys').doc(key).get();
  if (doc.exists) {
    return doc.data().result;
  }
  return null;
}

async function saveIdempotency(key: string, result: any): Promise<void> {
  await db.collection('idempotencyKeys').doc(key).set({
    result,
    createdAt: FieldValue.serverTimestamp(),
    expireAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)) // 24時間TTL
  });
}
```

---

## 4. ジョブ設計

### 4.1 日次一問一答バッチ（07:00 JST）

#### Cloud Scheduler設定
```yaml
name: daily-quiz-trigger
schedule: "0 7 * * *"        # 毎日 07:00
timezone: "Asia/Tokyo"
target:
  uri: https://<cloud-run-url>/api/internal/daily-quiz-trigger
  httpMethod: POST
  oidcToken:
    serviceAccountEmail: scheduler-sa@project.iam.gserviceaccount.com
```

#### 処理フロー

```
[Cloud Scheduler 07:00 JST]
        │
        ▼
[POST /api/internal/daily-quiz-trigger]
        │
        │ 1. dailyQuizEnabled=true の全ユーザーを取得
        │ 2. 各ユーザーについてCloud Tasksにenqueue
        │
        ▼ (並列・独立)
[Cloud Tasks: /api/internal/daily-quiz-generate]
        │
        │ per user:
        │ 1. 昨日範囲のconversations取得
        │ 2. 各conversationのmessages取得
        │ 3. 配分アルゴリズムでQ&A数決定
        │ 4. Gemini呼び出し
        │ 5. Firestore保存
        │
        ▼
[完了]
```

#### 「昨日」の定義（JST基準）

```typescript
function getYesterdayRange(): { start: Date; end: Date } {
  const now = new Date();
  // JST = UTC+9
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const jstYesterday = new Date(jstNow);
  jstYesterday.setDate(jstYesterday.getDate() - 1);

  // 昨日 00:00:00 JST → UTC
  const start = new Date(Date.UTC(
    jstYesterday.getFullYear(),
    jstYesterday.getMonth(),
    jstYesterday.getDate(),
    0, 0, 0
  ));
  start.setTime(start.getTime() - 9 * 60 * 60 * 1000); // JST→UTC

  // 昨日 23:59:59.999 JST → UTC
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

  return { start, end };
  // 例: JST 2026-02-06 → UTC 2026-02-05T15:00:00Z ~ 2026-02-06T14:59:59.999Z
}
```

#### 20/5 配分アルゴリズム

```typescript
interface QuizAllocation {
  conversationId: string;
  messageCount: number;      // 昨日のメッセージ数
  allocatedQuestions: number; // 割り当て問題数
}

function allocateQuestions(
  conversations: { id: string; msgCount: number }[],
  maxTotal: number,    // ユーザー設定 (default: 20)
  maxPerConv: number   // ユーザー設定 (default: 5)
): QuizAllocation[] {

  // 0. 会話がなければ空
  if (conversations.length === 0) return [];

  // 1. 各会話の上限を maxPerConv でキャップ
  //    メッセージ数に応じた比例配分
  const totalMessages = conversations.reduce((sum, c) => sum + c.msgCount, 0);

  let allocations = conversations.map(c => ({
    conversationId: c.id,
    messageCount: c.msgCount,
    // 比例配分（小数）→ 切り捨て → 最低1問保証
    allocatedQuestions: Math.max(1, Math.min(
      maxPerConv,
      Math.floor((c.msgCount / totalMessages) * maxTotal)
    ))
  }));

  // 2. 合計が maxTotal を超えたら、多い順に1ずつ削減
  let total = allocations.reduce((s, a) => s + a.allocatedQuestions, 0);
  while (total > maxTotal) {
    // 割当が最大のものから削減
    allocations.sort((a, b) => b.allocatedQuestions - a.allocatedQuestions);
    for (const a of allocations) {
      if (a.allocatedQuestions > 1 && total > maxTotal) {
        a.allocatedQuestions--;
        total--;
      }
    }
  }

  // 3. 合計に余裕があれば、maxPerConv未満の会話に追加
  while (total < maxTotal) {
    let added = false;
    for (const a of allocations) {
      if (a.allocatedQuestions < maxPerConv && total < maxTotal) {
        a.allocatedQuestions++;
        total++;
        added = true;
      }
    }
    if (!added) break; // 全会話が上限に達した
  }

  return allocations;
}
```

#### バッチの冪等性

冪等キー: `{userId}_{targetDate}_v1`

```typescript
async function generateDailyQuiz(userId: string, targetDate: string) {
  const idempotencyKey = `${userId}_${targetDate}_v1`;

  // 既存チェック
  const existing = await db
    .collection(`users/${userId}/dailyQuizzes`)
    .where('idempotencyKey', '==', idempotencyKey)
    .limit(1)
    .get();

  if (!existing.empty) {
    console.log(`Quiz already exists for ${userId} on ${targetDate}, skipping.`);
    return;
  }

  // ... 生成処理 ...
}
```

#### Cloud Tasks設定

```typescript
// タスクenqueue時
const task = {
  httpRequest: {
    httpMethod: 'POST',
    url: `${CLOUD_RUN_URL}/api/internal/daily-quiz-generate`,
    headers: { 'Content-Type': 'application/json' },
    body: Buffer.from(JSON.stringify({ userId, targetDate })),
    oidcToken: {
      serviceAccountEmail: TASKS_SA_EMAIL,
    },
  },
  // リトライ設定
  retryConfig: {
    maxAttempts: 3,
    minBackoff: { seconds: 10 },
    maxBackoff: { seconds: 300 },
  },
};
```

---

## 5. プロンプト設計

### 5.1 チャット応答プロンプト

```typescript
const CHAT_SYSTEM_PROMPT = `あなたは学習支援AIアシスタントです。
ユーザーの質問に対して、わかりやすく正確に日本語で回答してください。

ガイドライン:
- 専門用語を使う場合は、簡潔な説明を添えてください。
- 適度に段落を分けて読みやすくしてください。
- 不確実な情報には、その旨を明記してください。
- 会話の文脈を踏まえて回答してください。`;
```

### 5.2 素材生成プロンプト（1回のGemini呼び出しで統合生成）

```typescript
const MATERIAL_GENERATION_PROMPT = `
あなたは学習支援のための素材生成AIです。
以下のassistantの応答に対して、学習素材を生成してください。

## 会話コンテキスト
{conversation_history}

## 対象のassistant応答
{assistant_message}

## 生成指示

以下のJSON形式で出力してください。JSON以外のテキストは一切出力しないでください。

{
  "summary": [
    "要約文1",
    "要約文2",
    ...
  ],
  "terms": [
    {
      "termId": "term_<連番3桁>",
      "surface": "用語の表層形",
      "reading": "よみがな（ひらがな）",
      "definition": "この会話文脈における用語の意味（一般的な辞書定義ではなく、この応答で使われている意味）",
      "category": "technical | proper_noun | concept",
      "confidence": 0.0〜1.0
    }
  ],
  "mentions": [
    {
      "termId": "対応するtermのtermId",
      "surface": "本文中に出現した表記そのもの",
      "startOffset": 本文先頭からの文字数オフセット（0始まり）,
      "endOffset": 終了オフセット（exclusive）,
      "confidence": 0.0〜1.0
    }
  ]
}

## ルール
1. summary: 5〜10行。この応答の理解を助ける要約。箇条書きの各項目は1文で簡潔に。
2. terms: 専門用語・固有名詞を抽出。一般的すぎる語（「技術」「方法」等）は除外。confidence 0.7未満は除外。
3. mentions: assistant応答本文中の用語出現位置を正確に特定。
   - startOffset/endOffset は本文の文字数カウントで正確に算出すること。
   - 同じ用語が複数回出現する場合、各出現を別々のmentionとして記録。
   - confidence 0.7未満のmentionは除外。
   - 部分一致や曖昧な一致は低いconfidenceにする。
4. 出力はJSON**のみ**。マークダウンのコードブロック記法は使わない。
`;
```

### 5.3 素材生成のGemini呼び出し（構造化出力）

```typescript
import { VertexAI } from '@google-cloud/vertexai';

const vertexAI = new VertexAI({
  project: PROJECT_ID,
  location: 'asia-northeast1',
});

const generativeModel = vertexAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        summary: {
          type: 'array',
          items: { type: 'string' },
          minItems: 5,
          maxItems: 10,
        },
        terms: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              termId: { type: 'string' },
              surface: { type: 'string' },
              reading: { type: 'string' },
              definition: { type: 'string' },
              category: { type: 'string', enum: ['technical', 'proper_noun', 'concept'] },
              confidence: { type: 'number' },
            },
            required: ['termId', 'surface', 'reading', 'definition', 'category', 'confidence'],
          },
        },
        mentions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              termId: { type: 'string' },
              surface: { type: 'string' },
              startOffset: { type: 'integer' },
              endOffset: { type: 'integer' },
              confidence: { type: 'number' },
            },
            required: ['termId', 'surface', 'startOffset', 'endOffset', 'confidence'],
          },
        },
      },
      required: ['summary', 'terms', 'mentions'],
    },
  },
});
```

### 5.4 日次Q&Aプロンプト

```typescript
const DAILY_QUIZ_PROMPT = `
あなたは学習確認のための一問一答を生成するAIです。

## 昨日の会話内容
{conversations_with_messages}

## 生成指示

以下のJSON形式で一問一答カードを生成してください。

{
  "cards": [
    {
      "tag": "What | Why | How | When | Example",
      "question": "問題文（日本語）",
      "answer": "回答（日本語、2〜5文）",
      "sourceMessageIds": ["msg_xxx", "msg_yyy"],
      "conversationId": "conv_xxx"
    }
  ]
}

## ルール
1. タグの分類:
   - What: 定義・概念の確認（「〜とは何ですか？」）
   - Why: 理由・目的の確認（「なぜ〜ですか？」）
   - How: 手順・方法の確認（「どのように〜しますか？」）
   - When: 条件・タイミングの確認（「どのような場合に〜しますか？」）
   - Example: 具体例の確認（「〜の具体例を挙げてください」）
2. 各タグが偏らないよう、バランスよく生成すること。
3. sourceMessageIdsには、その問題の根拠となるassistantメッセージのIDを含める。
4. この会話から生成する問題数: {allocated_count}問
5. 問題の難易度は会話内容に基づき、初学者でも取り組めるレベルにする。
6. 出力はJSONのみ。
`;
```

### 5.5 フォールバック設計

```typescript
async function generateMaterialWithFallback(
  conversationHistory: Message[],
  assistantMessage: Message
): Promise<Material> {
  try {
    // 1st attempt: 構造化出力
    const result = await generateMaterialStructured(conversationHistory, assistantMessage);
    validateMaterial(result);
    return result;
  } catch (e) {
    console.warn('Structured output failed, trying text mode:', e);

    try {
      // 2nd attempt: テキスト出力 → JSON.parse
      const textResult = await generateMaterialText(conversationHistory, assistantMessage);
      const parsed = JSON.parse(extractJson(textResult));
      validateMaterial(parsed);
      return parsed;
    } catch (e2) {
      console.error('Text mode also failed:', e2);

      // 3rd attempt: 最低限の素材を手動生成
      return {
        summary: ['（素材の自動生成に失敗しました。再生成をお試しください。）'],
        terms: [],
        mentions: [],
        _fallback: true,
      };
    }
  }
}

function validateMaterial(material: any): void {
  if (!Array.isArray(material.summary) || material.summary.length < 1) {
    throw new Error('Invalid summary');
  }
  if (!Array.isArray(material.terms)) {
    throw new Error('Invalid terms');
  }
  if (!Array.isArray(material.mentions)) {
    throw new Error('Invalid mentions');
  }

  // mentionのオフセット検証（不正なオフセットを除外）
  material.mentions = material.mentions.filter((m: Mention) =>
    m.startOffset >= 0 &&
    m.endOffset > m.startOffset &&
    m.confidence >= 0.7
  );

  // termのconfidence検証
  material.terms = material.terms.filter((t: Term) => t.confidence >= 0.7);
}
```

### 5.6 用語リンク誤リンク抑制

```typescript
// ブラックリスト（一般的すぎる語をリンク化しない）
const TERM_BLACKLIST = new Set([
  '技術', '方法', '問題', '結果', '情報', '処理', 'データ',
  '機能', 'システム', 'サービス', 'プログラム', '設計',
  // ... 拡張可能
]);

function filterMentions(mentions: Mention[], terms: Term[]): Mention[] {
  return mentions.filter(m => {
    const term = terms.find(t => t.termId === m.termId);
    if (!term) return false;

    // 1. confidence閾値
    if (m.confidence < 0.7) return false;

    // 2. ブラックリスト
    if (TERM_BLACKLIST.has(term.surface)) return false;

    // 3. 表層形が2文字未満は除外（「AI」等は例外リストで許可）
    if (term.surface.length < 2 && !SHORT_TERM_ALLOWLIST.has(term.surface)) return false;

    return true;
  });
}
```

---

## 6. コスト概算

### 6.1 Gemini 2.0 Flash 料金（2026年1月時点の参考値）

| 項目 | 料金 |
|------|------|
| 入力 (128Kまで) | $0.10 / 1M tokens |
| 出力 | $0.40 / 1M tokens |

### 6.2 1ユーザー1日あたりのトークン概算

| 操作 | 回数/日 | 入力トークン | 出力トークン | 入力コスト | 出力コスト |
|------|---------|------------|------------|-----------|-----------|
| チャット応答 | 20回 | 1,500 × 20 = 30K | 500 × 20 = 10K | $0.003 | $0.004 |
| 素材生成 | 20回 | 2,000 × 20 = 40K | 800 × 20 = 16K | $0.004 | $0.006 |
| 日次Q&A | 1回 | 10K | 3K | $0.001 | $0.001 |
| **合計** | | **80K** | **29K** | **$0.008** | **$0.012** |

**1ユーザー/日 ≈ $0.02 (約3円)**

### 6.3 DAU別月額概算

| DAU | 月額Gemini費用 | Firestore | Cloud Run | **合計** |
|-----|--------------|-----------|-----------|---------|
| 10 | $6 | $0 (無料枠内) | $0 (無料枠内) | **~$6** |
| 50 | $30 | ~$5 | ~$5 | **~$40** |
| 100 | $60 | ~$15 | ~$10 | **~$85** |
| 500 | $300 | ~$50 | ~$30 | **~$380** |

### 6.4 Flash/Pro切替方針

| 用途 | デフォルト | Pro昇格条件 |
|------|-----------|------------|
| チャット応答 | Flash | ユーザーから品質苦情がある場合 |
| 素材生成 | Flash | 用語抽出精度が低い場合 |
| 日次Q&A | Flash | 問題の質が低い場合 |

**MVPではFlash固定**。Pro切替はユーザー設定ではなくサーバー側フラグで制御。
Pro料金はFlashの約10倍のため、切替時はコスト監視を強化する。

### 6.5 コスト暴発対策

```typescript
// レート制限の定義
const RATE_LIMITS = {
  // チャット: 1分あたり10メッセージ
  chatPerMinute: 10,

  // 再生成: 1日あたり（ユーザー設定のregenerationDailyLimitに従う、デフォルト10）
  regeneratePerDay: 10,

  // 日次Q&A再生成: 1日あたり3回
  dailyQuizRegeneratePerDay: 3,
};

// generationLogsを使った実装
async function checkRateLimit(
  userId: string,
  type: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  const logs = await db
    .collection(`users/${userId}/generationLogs`)
    .where('type', '==', type)
    .where('createdAt', '>=', Timestamp.fromDate(since))
    .count()
    .get();

  return logs.data().count < limit;
}
```

---

## 7. 実装優先順位

### Phase 1: 基盤（Day 1）
| # | タスク | リスク | 検証ポイント |
|---|--------|------|------------|
| 1-1 | プロジェクト初期化（Next.js + TypeScript） | 低 | ローカルで起動確認 |
| 1-2 | Firebase Auth設定 + ログイン画面 | 低 | Google Sign-Inが動作するか |
| 1-3 | Firestore接続 + データモデル基本実装 | 低 | CRUD動作確認 |
| 1-4 | Cloud Runデプロイパイプライン | 中 | デプロイが通るか、環境変数設定 |

### Phase 2: チャットコア（Day 1-2）
| # | タスク | リスク | 検証ポイント |
|---|--------|------|------------|
| 2-1 | Vertex AI Gemini接続 + チャットAPI | **高** | APIキー/認証の設定、レスポンス速度 |
| 2-2 | チャットUI（メッセージ送受信） | 低 | ストリーミング表示が滑らかか |
| 2-3 | 会話の作成/一覧/継続 | 低 | — |

### Phase 3: 素材生成（Day 2）
| # | タスク | リスク | 検証ポイント |
|---|--------|------|------------|
| 3-1 | 素材生成プロンプト + 構造化出力 | **高** | JSON schemaが正しく機能するか、オフセット精度 |
| 3-2 | 要約表示（折りたたみ） | 低 | — |
| 3-3 | 用語リンク化 + ポップアップ | 中 | オフセットズレの対処、UX |
| 3-4 | 用語辞書画面 | 低 | — |

### Phase 4: 日次Q&A + 再生成（Day 2-3）
| # | タスク | リスク | 検証ポイント |
|---|--------|------|------------|
| 4-1 | 日次Q&Aプロンプト + 生成ロジック | 中 | 配分アルゴリズムの動作、出典の正確性 |
| 4-2 | Cloud Scheduler + Cloud Tasks設定 | 中 | cron発火確認、内部認証 |
| 4-3 | 日次Q&A画面 | 低 | — |
| 4-4 | 再生成API + バージョン管理 | 中 | 冪等性、active切替 |
| 4-5 | 設定画面 | 低 | — |

### Phase 5: 堅牢化（Day 3）
| # | タスク | リスク | 検証ポイント |
|---|--------|------|------------|
| 5-1 | TTL設定 + カスケード削除 | 中 | 削除漏れがないか |
| 5-2 | レート制限 + コスト監視 | 低 | — |
| 5-3 | エラーハンドリング + フォールバック | 低 | — |
| 5-4 | generationLogの記録 + 確認UI | 低 | — |

### 主要リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| Gemini構造化出力のオフセットが不正確 | 用語リンクがズレる | サーバー側でオフセットを検証・補正するロジックを実装。`content.indexOf(mention.surface, nearOffset)` で再計算 |
| 日次バッチが大量ユーザーでタイムアウト | Q&Aが生成されない | Cloud Tasksで1ユーザー=1タスクに分割。リトライ3回 |
| Firestoreの読み取りコスト | 会話履歴が長い場合のコスト | 会話コンテキストを直近20メッセージに制限 |
| 素材生成がチャット応答を遅延させる | UX劣化 | チャット応答はストリーミングで先に返し、素材生成は非同期（バックグラウンド）で実行も検討 |

---

## 補足: フロントエンド画面構成

```
/                        → リダイレクト → /chat
/login                   → ログイン画面
/chat                    → 会話一覧 + 新規作成
/chat/:conversationId    → チャット画面（メイン）
  ├─ メッセージ一覧（assistant本文 + 要約折りたたみ + 用語リンク）
  └─ 用語ポップアップ
/chat/:conversationId/terms → 用語辞書画面（会話スコープ）
/daily-quiz              → 日次Q&A一覧（日付選択）
/daily-quiz/:date        → 特定日のカード一覧
/settings                → ユーザー設定
```

### チャット画面のコンポーネント構成

```
ChatPage
├── ConversationSidebar     // 会話一覧
├── MessageList
│   └── MessageBubble
│       ├── LinkedContent   // 用語リンク付き本文
│       │   └── TermPopover // ポップアップ（定義表示）
│       ├── SummaryAccordion // 折りたたみ要約
│       └── RegenerateButton
└── MessageInput            // 入力欄 + 送信ボタン
```

---

## 補足: プロジェクト構成（推奨）

```
/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (main)/
│   │   │   ├── chat/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [conversationId]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── terms/page.tsx
│   │   │   ├── daily-quiz/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [date]/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── conversations/
│   │   │   │   ├── daily-quizzes/
│   │   │   │   └── settings/
│   │   │   └── internal/
│   │   │       ├── daily-quiz-trigger/
│   │   │       └── daily-quiz-generate/
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── firebase/           # Firebase初期化、Auth
│   │   ├── firestore/          # Firestoreアクセス層
│   │   ├── vertex-ai/          # Vertex AI Gemini呼び出し
│   │   ├── services/           # ビジネスロジック
│   │   │   ├── chat.service.ts
│   │   │   ├── material.service.ts
│   │   │   ├── daily-quiz.service.ts
│   │   │   └── regeneration.service.ts
│   │   ├── prompts/            # プロンプトテンプレート
│   │   └── utils/              # 共通ユーティリティ
│   ├── components/             # UIコンポーネント
│   └── types/                  # TypeScript型定義
├── Dockerfile
├── cloudbuild.yaml
├── package.json
└── tsconfig.json
```
