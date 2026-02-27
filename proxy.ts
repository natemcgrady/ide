import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/"];
const publicRoutes = ["/sign-in", "/auth/error"];

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.includes(path);
  const isPublicRoute = publicRoutes.includes(path);
  const accessToken = req.cookies.get("access_token")?.value;

  if (isProtectedRoute && !accessToken) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (path === "/sign-in" && accessToken) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|ico|svg)$).*)"],
};
