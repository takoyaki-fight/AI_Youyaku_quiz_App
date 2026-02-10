import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import {
  checkIdempotencyKey,
  isIdempotencyHit,
} from "@/lib/middleware/idempotency";
import {
  createConversation,
  listConversations,
  upsertUser,
  saveIdempotency,
} from "@/lib/firestore/repository";
import { v4 as uuidv4 } from "uuid";

// POST /api/v1/conversations — 新規会話作成
export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const idempResult = await checkIdempotencyKey(req);
  if (isIdempotencyHit(idempResult)) return idempResult;

  const { userId, email } = authResult;
  const { key } = idempResult;

  // ユーザー情報を upsert
  await upsertUser(userId, email, email.split("@")[0]);

  const body = await req.json().catch(() => ({}));
  const title = body.title || "新しい会話";

  const conversationId = uuidv4();
  const conversation = await createConversation(userId, conversationId, title);

  await saveIdempotency(key, conversation);

  return NextResponse.json(conversation, { status: 201 });
}

// GET /api/v1/conversations — 会話一覧取得
export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const conversations = await listConversations(authResult.userId);
  return NextResponse.json({ conversations });
}
