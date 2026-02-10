import { NextResponse } from "next/server";

export function errorResponse(
  code: string,
  message: string,
  status: number
): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    { status }
  );
}

export function notFound(message = "リソースが見つかりません。"): NextResponse {
  return errorResponse("NOT_FOUND", message, 404);
}

export function badRequest(message = "リクエストが不正です。"): NextResponse {
  return errorResponse("BAD_REQUEST", message, 400);
}

export function serverError(message = "サーバーエラーが発生しました。"): NextResponse {
  return errorResponse("INTERNAL_ERROR", message, 500);
}
