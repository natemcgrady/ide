import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const isProduction = process.env.NODE_ENV === "production";

function generateSecureRandomString(length: number) {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomBytes = crypto.randomBytes(length);
  return Array.from(randomBytes, (byte) => charset[byte % charset.length]).join(
    "",
  );
}

export async function GET(req: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID;
  if (!clientId?.trim()) {
    console.error(
      "NEXT_PUBLIC_VERCEL_APP_CLIENT_ID is missing or empty. Add it to .env.local - get the Client ID from your app's Manage page: https://vercel.com/docs/sign-in-with-vercel/manage-from-dashboard",
    );
    return NextResponse.json(
      {
        error: "App ID is invalid",
        message:
          "NEXT_PUBLIC_VERCEL_APP_CLIENT_ID is not configured. Check .env.local and restart the dev server.",
      },
      { status: 500 },
    );
  }

  const state = generateSecureRandomString(43);
  const nonce = generateSecureRandomString(43);
  const code_verifier = crypto.randomBytes(43).toString("hex");
  const code_challenge = crypto
    .createHash("sha256")
    .update(code_verifier)
    .digest("base64url");
  const cookieStore = await cookies();

  cookieStore.set("oauth_state", state, {
    maxAge: 10 * 60,
    secure: isProduction,
    httpOnly: true,
    sameSite: "lax",
  });
  cookieStore.set("oauth_nonce", nonce, {
    maxAge: 10 * 60,
    secure: isProduction,
    httpOnly: true,
    sameSite: "lax",
  });
  cookieStore.set("oauth_code_verifier", code_verifier, {
    maxAge: 10 * 60,
    secure: isProduction,
    httpOnly: true,
    sameSite: "lax",
  });

  const queryParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${req.nextUrl.origin}/api/auth/callback`,
    state,
    nonce,
    code_challenge,
    code_challenge_method: "S256",
    response_type: "code",
    scope: "openid email profile offline_access",
  });

  const authorizationUrl = `https://vercel.com/oauth/authorize?${queryParams.toString()}`;
  return NextResponse.redirect(authorizationUrl);
}
