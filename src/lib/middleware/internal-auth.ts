import { NextRequest, NextResponse } from "next/server";

const INTERNAL_SECRET_HEADER = "x-internal-api-key";

function hasValidInternalSecret(req: NextRequest, expected: string): boolean {
  const actual = req.headers.get(INTERNAL_SECRET_HEADER);
  return typeof actual === "string" && actual === expected;
}

export function verifyInternalRequest(req: NextRequest): NextResponse | null {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (!secret) {
    if (!isProduction) {
      return null;
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_AUTH_MISCONFIGURED",
          message: "INTERNAL_API_SECRET is not configured.",
        },
      },
      { status: 500 }
    );
  }

  if (!hasValidInternalSecret(req, secret)) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid internal API key.",
        },
      },
      { status: 401 }
    );
  }

  return null;
}
