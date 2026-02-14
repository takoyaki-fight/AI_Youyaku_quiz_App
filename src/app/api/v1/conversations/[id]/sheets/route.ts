import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import {
  checkIdempotencyKey,
  isIdempotencyHit,
} from "@/lib/middleware/idempotency";
import {
  getConversation,
  getMessages,
  listConversationSheets,
  saveIdempotency,
} from "@/lib/firestore/repository";
import { syncAutoConversationSheet } from "@/lib/services/conversation-sheet.service";
import type { ConversationSheet } from "@/types/conversation-sheet";

const MAX_ADDITIONAL_INSTRUCTION_CHARS = 800;

function toMillis(value: unknown): number {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function isLowQualitySheet(markdown: string): boolean {
  const text = markdown.toLowerCase();
  const hasTemplateSections =
    /(^|\n)##\s*(decisions?|open questions?|next actions?)\b/i.test(markdown);
  const noneMatches = text.match(/\b(?:none|n\/a|na)\b/g);
  const noneCount = noneMatches ? noneMatches.length : 0;
  const hasEscapedNewlineHeading = /\\n#{1,6}\s+/.test(markdown);
  const hasAnyHeading = /^#{1,6}\s+/m.test(markdown);

  return (
    hasTemplateSections && noneCount >= 2 ||
    hasEscapedNewlineHeading ||
    !hasAnyHeading
  );
}

async function generateSheetIfPossible(userId: string, conversationId: string) {
  const messages = await getMessages(userId, conversationId, 60);
  if (!messages.length) {
    return null;
  }
  return syncAutoConversationSheet(userId, conversationId, messages);
}

function parseAdditionalInstruction(value: unknown): {
  instruction?: string;
  error?: string;
} {
  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value !== "string") {
    return {
      error: "instruction must be a string",
    };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  const chars = Array.from(trimmed);
  if (chars.length > MAX_ADDITIONAL_INSTRUCTION_CHARS) {
    return {
      error: `instruction must be at most ${MAX_ADDITIONAL_INSTRUCTION_CHARS} characters`,
    };
  }

  return { instruction: trimmed };
}

async function generateSheetWithInstructionIfPossible(
  userId: string,
  conversationId: string,
  instruction?: string
) {
  const messages = await getMessages(userId, conversationId, 60);
  if (!messages.length) {
    return null;
  }
  return syncAutoConversationSheet(userId, conversationId, messages, instruction);
}

// GET /api/v1/conversations/:id/sheets
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const { id: conversationId } = await params;
  const conversation = await getConversation(authResult.userId, conversationId);
  if (!conversation) {
    return NextResponse.json(
      { error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found" } },
      { status: 404 }
    );
  }

  let sheets = await listConversationSheets(authResult.userId, conversationId);

  const latestSheet = sheets[0] as ConversationSheet | undefined;
  const sheetStale =
    !!latestSheet &&
    toMillis(conversation.updatedAt) > toMillis(latestSheet.updatedAt) + 1_000;
  const sheetLooksLowQuality =
    !!latestSheet && isLowQualitySheet(latestSheet.markdown);

  if (sheets.length === 0 || sheetStale || sheetLooksLowQuality) {
    const generated = await generateSheetIfPossible(authResult.userId, conversationId);
    if (generated) {
      sheets = [generated, ...sheets.filter((sheet) => sheet.sheetId !== generated.sheetId)];
    }
  }

  return NextResponse.json({ sheets });
}

// POST /api/v1/conversations/:id/sheets
// Auto-generate or refresh the conversation sheet with LLM.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const idempResult = await checkIdempotencyKey(req);
  if (isIdempotencyHit(idempResult)) return idempResult;

  const { key } = idempResult;
  const { id: conversationId } = await params;
  let body: unknown = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsedInstruction = parseAdditionalInstruction(
    (body as { instruction?: unknown }).instruction
  );
  if (parsedInstruction.error) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_INSTRUCTION",
          message: parsedInstruction.error,
        },
      },
      { status: 400 }
    );
  }

  const conversation = await getConversation(authResult.userId, conversationId);
  if (!conversation) {
    return NextResponse.json(
      { error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found" } },
      { status: 404 }
    );
  }

  const sheet = await generateSheetWithInstructionIfPossible(
    authResult.userId,
    conversationId,
    parsedInstruction.instruction
  );
  if (!sheet) {
    return NextResponse.json(
      { error: { code: "NO_MESSAGES", message: "No messages to summarize yet" } },
      { status: 400 }
    );
  }

  const result = { sheet };
  await saveIdempotency(key, result);
  return NextResponse.json(result, { status: 201 });
}
