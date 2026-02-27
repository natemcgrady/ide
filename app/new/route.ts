import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createFile } from "@/lib/db/queries/files";
import languageTemplates from "@/lib/code-templates";

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    const url = new URL("/sign-in", request.nextUrl.origin);
    return NextResponse.redirect(url);
  }

  const file = await createFile({
    ownerUserId: user.id,
    title: "Untitled",
    language: "python",
    contentText: languageTemplates.python,
  });

  const url = new URL(`/${file.id}`, request.nextUrl.origin);
  return NextResponse.redirect(url);
}
