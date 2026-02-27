import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createFile } from "@/lib/db/queries/files";
import { createProject } from "@/lib/db/queries/projects";
import languageTemplates from "@/lib/code-templates";

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    const url = new URL("/sign-in", request.nextUrl.origin);
    return NextResponse.redirect(url);
  }

  const project = await createProject({
    ownerUserId: user.id,
    name: "Untitled Project",
  });

  await createFile({
    projectId: project.id,
    title: "main.py",
    contentText: languageTemplates.python,
  });

  const url = new URL(`/${project.id}`, request.nextUrl.origin);
  return NextResponse.redirect(url);
}
