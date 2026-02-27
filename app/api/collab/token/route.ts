import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireFileReadAccess } from "@/lib/auth";
import { SignJWT } from "jose";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const fileId = (body as { fileId?: string }).fileId;

    if (!fileId || typeof fileId !== "string") {
      return NextResponse.json(
        { error: "fileId is required" },
        { status: 400 }
      );
    }

    await requireFileReadAccess(fileId, user);

    const canWrite = await (async () => {
      const { hasFileAccess } = await import("@/lib/db/queries/collaborators");
      return hasFileAccess(fileId, user.id, "write");
    })();

    const secret = new TextEncoder().encode(
      process.env.COLLAB_JWT_SECRET ?? "dev-secret-change-in-production"
    );

    const token = await new SignJWT({
      userId: user.id,
      fileId,
      permission: canWrite ? "write" : "read",
      name: user.name ?? user.username ?? "Anonymous",
      avatar: user.avatarUrl,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(secret);

    const wsUrl =
      process.env.COLLAB_SERVER_URL?.replace(/^http/, "ws") ??
      "ws://localhost:1234";

    return NextResponse.json({
      token,
      url: wsUrl,
      user: {
        id: user.id,
        name: user.name ?? user.username ?? "Anonymous",
        avatar: user.avatarUrl,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
