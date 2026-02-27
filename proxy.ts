import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/sign-in", "/auth/error"];

function isPublicPath(path: string): boolean {
  return publicPaths.some((p) => path === p || path.startsWith(`${p}/`));
}

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const accessToken = req.cookies.get("access_token")?.value;

  if (isPublicPath(path)) {
    if (path.startsWith("/sign-in") && accessToken) {
      return NextResponse.redirect(new URL("/files", req.url));
    }
    return NextResponse.next();
  }

  if (!accessToken) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|ico|svg)$).*)"],
};
