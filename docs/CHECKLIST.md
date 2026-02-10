# AI学習アシスタント 開発チェックリスト

> **凡例**: 各タスクを完了したら `[ ]` → `[x]` に変更

---

## Phase 1: 基盤構築（Day 1 AM）

### 1-1. GCPプロジェクト
- [ ] GCPプロジェクト作成
- [ ] 課金アカウント紐付け
- [ ] API有効化（Run / AI Platform / Firestore / Scheduler / Tasks / Build / Artifact Registry）
- [ ] Firestoreデータベース作成（Native mode, asia-northeast1）
- [ ] Cloud Tasksキュー作成（daily-quiz-queue）
- [ ] Artifact Registryリポジトリ作成

### 1-2. Firebase
- [ ] Firebaseプロジェクト紐付け（既存GCPプロジェクト選択）
- [ ] Firebase Authentication有効化（Google Sign-In）
- [ ] ウェブアプリ追加 → `firebaseConfig` 取得
- [ ] Firebase Admin SDK秘密鍵ダウンロード

### 1-3. Next.jsプロジェクト初期化
- [ ] `create-next-app` 実行（TypeScript + Tailwind + App Router）
- [ ] 依存パッケージインストール（firebase, firebase-admin, @google-cloud/vertexai, @google-cloud/tasks, uuid）
- [ ] shadcn/ui 初期化 + 必要コンポーネント追加
- [ ] ディレクトリ構成作成（app / lib / components / types）
- [ ] 型定義ファイル作成（conversation.ts, message.ts, material.ts, daily-quiz.ts, settings.ts）
- [ ] 環境変数ファイル（`.env.local`）作成
- [ ] `npm run dev` でローカル起動確認

### 1-4. Firebase Auth実装
- [ ] `lib/firebase/client.ts` — クライアントSDK初期化
- [ ] `lib/firebase/admin.ts` — Admin SDK初期化
- [ ] `lib/middleware/auth.ts` — IDトークン検証ミドルウェア
- [ ] `components/common/AuthGuard.tsx` — 認証ガード
- [ ] `app/(auth)/login/page.tsx` — ログイン画面
- [ ] `app/layout.tsx` — AuthProvider統合
- [ ] Google Sign-Inでログイン成功を確認

### 1-5. Firestore接続
- [ ] `lib/firestore/repository.ts` — 基本CRUD関数
- [ ] Firestoreに `users` ドキュメント書き込み確認
- [ ] 読み取り確認

### 1-6. Cloud Runデプロイ
- [ ] `Dockerfile` 作成
- [ ] `next.config.js` に `output: 'standalone'` 設定
- [ ] `.dockerignore` 作成
- [ ] 初回ビルド & デプロイ
- [ ] HTTPS URLでアクセス → ログイン画面表示を確認
- [ ] Cloud Run上でFirebase Auth動作を確認

---

## Phase 2: チャットコア（Day 1 PM ～ Day 2 AM）

### 2-1. Vertex AI Gemini接続
- [ ] `lib/vertex-ai/client.ts` — Vertex AI初期化
- [ ] `lib/prompts/chat.ts` — チャットシステムプロンプト定義
- [ ] `lib/vertex-ai/chat.ts` — Gemini呼び出し実装
- [ ] ローカルで `gcloud auth application-default login` 実行
- [ ] Geminiにテスト送信 → 日本語応答が返ることを確認

### 2-2. チャットAPI
- [ ] `lib/middleware/idempotency.ts` — 冪等キーチェック
- [ ] `api/v1/conversations/route.ts` — POST（会話作成）/ GET（一覧取得）
- [ ] `api/v1/conversations/[id]/route.ts` — GET（詳細）/ DELETE（削除）
- [ ] `api/v1/conversations/[id]/messages/route.ts` — POST（メッセージ送信 → AI応答）
- [ ] 会話作成APIテスト（Postman等）
- [ ] メッセージ送信APIテスト
- [ ] 冪等キーの二重作成防止テスト

### 2-3. チャットUI
- [ ] `components/common/Header.tsx` — ヘッダー（ナビゲーション）
- [ ] `components/chat/ConversationSidebar.tsx` — 会話一覧サイドバー
- [ ] `components/chat/MessageList.tsx` — メッセージ一覧
- [ ] `components/chat/MessageBubble.tsx` — メッセージ吹き出し
- [ ] `components/chat/MessageInput.tsx` — 入力欄 + 送信ボタン
- [ ] `app/(main)/chat/page.tsx` — 会話一覧ページ
- [ ] `app/(main)/chat/[conversationId]/page.tsx` — チャット画面
- [ ] 新規会話作成 → メッセージ送受信の動作確認
- [ ] 会話の継続（同じ会話でやりとり）確認
- [ ] 会話一覧に過去の会話が表示される確認

### 2-4. Phase 2 デプロイ確認
- [ ] Cloud Runに再デプロイ
- [ ] 本番環境でチャットが動作することを確認

---

## Phase 3: 素材生成（Day 2 AM ～ PM）

### 3-1. 素材生成バックエンド
- [ ] `lib/prompts/material.ts` — 素材生成プロンプト + JSONスキーマ定義
- [ ] `lib/vertex-ai/material.ts` — 構造化出力呼び出し
- [ ] バリデーション関数（summary/terms/mentionsの検証）
- [ ] フォールバック処理（構造化出力失敗 → テキスト → スタブ）
- [ ] オフセット補正ロジック（`correctMentionOffsets`）
- [ ] 用語フィルタリング（confidence閾値 + ブラックリスト + 最小文字数）
- [ ] `lib/services/material.service.ts` — 素材の保存・取得
- [ ] メッセージ送信APIに素材生成を統合
- [ ] 素材生成の動作テスト（JSON出力の確認）
- [ ] オフセット補正の動作テスト

### 3-2. 素材取得API
- [ ] `api/v1/conversations/[convId]/materials/[msgId]/route.ts` — GET（active版取得）
- [ ] `api/v1/conversations/[convId]/materials/[msgId]/versions/route.ts` — GET（バージョン一覧）
- [ ] `api/v1/conversations/[convId]/terms/route.ts` — GET（会話内全用語）

### 3-3. 要約UI
- [ ] `components/chat/SummaryAccordion.tsx` — 折りたたみ要約コンポーネント
- [ ] MessageBubbleに要約表示を統合
- [ ] 折りたたみ開閉の動作確認

### 3-4. 用語リンク + ポップアップUI
- [ ] `components/chat/LinkedContent.tsx` — 本文の用語リンク化レンダリング
- [ ] `components/chat/TermPopover.tsx` — ポップアップ（用語定義表示）
- [ ] MessageBubbleにLinkedContent統合
- [ ] リンクタップ → ポップアップ表示の確認
- [ ] オフセットズレがないことの確認（複数パターンで検証）

### 3-5. 用語辞書画面
- [ ] `components/terms/TermList.tsx` — 用語一覧コンポーネント
- [ ] `components/terms/TermDetail.tsx` — 用語詳細コンポーネント
- [ ] `app/(main)/chat/[conversationId]/terms/page.tsx` — 辞書画面
- [ ] 用語検索機能
- [ ] 出現箇所へのジャンプ機能
- [ ] チャット画面 ↔ 辞書画面の遷移確認

### 3-6. Phase 3 デプロイ確認
- [ ] Cloud Runに再デプロイ
- [ ] 本番環境で要約・用語リンク・辞書が動作することを確認

---

## Phase 4: 日次Q&A + 再生成 + 設定（Day 2 PM ～ Day 3 AM）

### 4-1. 日次Q&A生成ロジック
- [ ] `lib/prompts/daily-quiz.ts` — 日次Q&Aプロンプト
- [ ] `lib/vertex-ai/daily-quiz.ts` — Q&A生成 + バリデーション
- [ ] `lib/services/daily-quiz.service.ts` — 配分アルゴリズム + 保存
- [ ] `lib/utils/date.ts` — JST日付ユーティリティ（getYesterdayRange）
- [ ] 配分アルゴリズムの単体テスト（20/5制約の検証）
- [ ] Q&A生成のローカルテスト

### 4-2. Cloud Scheduler + Cloud Tasks
- [ ] サービスアカウント作成（scheduler-sa, tasks-sa）
- [ ] Cloud Run invoker権限付与
- [ ] `api/internal/daily-quiz-trigger/route.ts` — Scheduler受付 → Tasks enqueue
- [ ] `api/internal/daily-quiz-generate/route.ts` — 1ユーザー分のQ&A生成
- [ ] 内部エンドポイントのOIDC認証実装
- [ ] Cloud Schedulerジョブ作成（07:00 JST）
- [ ] Scheduler手動実行テスト（`gcloud scheduler jobs run`）
- [ ] Cloud Tasksでのタスク実行確認
- [ ] バッチ冪等性テスト（同日2回実行で二重生成しない）

### 4-3. 日次Q&A API + UI
- [ ] `api/v1/daily-quizzes/route.ts` — GET（日次Q&A一覧）
- [ ] `api/v1/daily-quizzes/[date]/route.ts` — GET（特定日のQ&A）
- [ ] `components/quiz/QuizCard.tsx` — Q&Aカードコンポーネント
- [ ] `components/quiz/QuizCardList.tsx` — カード一覧コンポーネント
- [ ] `app/(main)/daily-quiz/page.tsx` — 日次Q&A一覧画面
- [ ] `app/(main)/daily-quiz/[date]/page.tsx` — 特定日のカード画面
- [ ] タグ表示（What/Why/How/When/Example）確認
- [ ] 出典ジャンプ（カード → 元の会話メッセージ）確認

### 4-4. 再生成 + バージョン管理
- [ ] `lib/services/regeneration.service.ts` — 再生成ロジック
- [ ] `api/v1/conversations/[convId]/materials/[msgId]/regenerate/route.ts` — 素材再生成
- [ ] `api/v1/conversations/[convId]/materials/[msgId]/active-version/route.ts` — active版切替
- [ ] `api/v1/daily-quizzes/[date]/regenerate/route.ts` — Q&A再生成
- [ ] `api/v1/daily-quizzes/[date]/active-version/route.ts` — Q&A active版切替
- [ ] 再生成ボタンをMessageBubble / Q&A画面に追加
- [ ] バージョン一覧表示UI
- [ ] active版切替UIの動作確認
- [ ] 再生成でversion番号がインクリメントされることを確認
- [ ] 旧版が保持されていることを確認

### 4-5. 設定画面
- [ ] `api/v1/settings/route.ts` — GET / PUT
- [ ] `components/settings/SettingsForm.tsx` — 設定フォーム
- [ ] `app/(main)/settings/page.tsx` — 設定画面
- [ ] 日次Q&A 全体上限（default: 20）の変更
- [ ] 日次Q&A 会話ごと上限（default: 5）の変更
- [ ] 日次Q&A ON/OFF切替
- [ ] 再生成履歴の表示
- [ ] 設定変更の保存・反映確認

### 4-6. Phase 4 デプロイ確認
- [ ] Cloud Runに再デプロイ
- [ ] 本番環境で日次Q&A・再生成・設定が動作することを確認

---

## Phase 5: 堅牢化（Day 3 PM）

### 5-1. TTL + カスケード削除
- [ ] Firestore TTLポリシー設定（conversations, messages, materials, dailyQuizzes, generationLogs, idempotencyKeys）
- [ ] 会話削除API内でカスケード削除実装（messages, materials）
- [ ] 会話削除時にdailyQuizzesから関連カード除去
- [ ] カスケード削除の動作テスト

### 5-2. レート制限
- [ ] `lib/middleware/rate-limit.ts` — レート制限ミドルウェア
- [ ] チャット送信: 1分あたり10メッセージ制限
- [ ] 素材再生成: 1日あたり10回制限（ユーザー設定に連動）
- [ ] 日次Q&A再生成: 1日あたり3回制限
- [ ] 429レスポンスの返却確認

### 5-3. ログ・監視
- [ ] `generationLog` の記録を全Gemini呼び出し箇所に統合
- [ ] トークン使用量（prompt/completion）の記録確認
- [ ] レイテンシの記録確認
- [ ] エラー時のログ記録確認

### 5-4. エラーハンドリング
- [ ] API共通エラーレスポンス形式の統一
- [ ] Gemini呼び出し失敗時のフォールバック動作確認
- [ ] Firestore接続エラー時の適切なレスポンス
- [ ] フロントエンドのエラー表示（トースト等）

### 5-5. 最終デプロイ
- [ ] 環境変数の最終確認
- [ ] Cloud Runに最終デプロイ
- [ ] 全画面の動作確認（本番環境）

---

## 提出前チェック

### ハッカソン必須条件
- [ ] Cloud Run でアプリが実行されている
- [ ] Vertex AI（Gemini API）を使用している
- [ ] 上記2点を提出フォームに記載

### 機能要件（MVP）
- [ ] チャット: AIと日本語で会話できる
- [ ] チャット: 会話の作成/継続/閲覧ができる
- [ ] チャット: 会話ログが保存される
- [ ] 要約: assistant応答ごとに5〜10行の要約が表示される
- [ ] 用語: 専門用語が抽出され、文脈に即した定義がある
- [ ] 用語リンク: 本文中の用語がリンク化されている
- [ ] 用語ポップアップ: リンクタップで定義がポップアップ表示
- [ ] 用語辞書: 別画面で一覧・検索・出現箇所ジャンプ
- [ ] 日次Q&A: 07:00 JSTに自動生成される
- [ ] 日次Q&A: タグ付き（What/Why/How/When/Example）
- [ ] 日次Q&A: 各カードにsources（出典メッセージID）がある
- [ ] 日次Q&A: 全体最大20問 / 会話あたり最大5問
- [ ] 日次Q&A: 上限がユーザー設定で変更可能
- [ ] 再生成: 要約/用語/日次Q&Aが再生成可能
- [ ] バージョン: 再生成で新versionが作成され、過去版も保持
- [ ] バージョン: active版の切替が可能
- [ ] データ削除: 30日TTLで自動削除
- [ ] データ削除: 会話削除でカスケード削除

### 非機能要件
- [ ] 冪等性: 二重送信で二重作成されない
- [ ] コスト: 再生成の頻度制限が動作する
- [ ] コスト: generationLogにトークン使用量が記録されている
- [ ] セキュリティ: Firebase Authで認証されている
- [ ] セキュリティ: userIdでデータが分離されている

### 提出物
- [ ] GitHubリポジトリにコードがpush済み
- [ ] README.md（概要・セットアップ手順・技術スタック）
- [ ] デモURL（Cloud Run）
- [ ] デモ動画（任意だが推奨）
- [ ] 提出フォーム記入（使用GCPプロダクト: Cloud Run, Vertex AI, Firebase）
