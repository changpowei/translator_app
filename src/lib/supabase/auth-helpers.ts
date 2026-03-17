import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface AuthResult {
  readonly userId: string;
  readonly accessToken: string;
}

/**
 * Extract and validate the user's auth session from the request.
 * Returns userId and accessToken on success, or a 401 NextResponse on failure.
 */
export async function getAuthFromRequest(
  request: NextRequest
): Promise<AuthResult | NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "請先登入" },
      { status: 401 }
    );
  }

  const accessToken = authHeader.slice(7);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "伺服器設定錯誤" },
      { status: 500 }
    );
  }

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "登入已過期，請重新登入" },
      { status: 401 }
    );
  }

  return { userId: user.id, accessToken };
}

/**
 * Type guard to check if getAuthFromRequest returned an error response.
 */
export function isAuthError(
  result: AuthResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
