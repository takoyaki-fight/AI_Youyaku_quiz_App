import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import { listSummarySheets } from "@/lib/firestore/repository";

// GET /api/v1/summary-sheets
export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const sheets = await listSummarySheets(authResult.userId, 100);
  return NextResponse.json({ sheets });
}
