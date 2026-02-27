import { NextRequest, NextResponse } from "next/server";
import { Liveblocks } from "@liveblocks/node";
import { requireAuth, requireFileReadAccess } from "@/lib/auth";
import { hasFileAccess } from "@/lib/db/queries/collaborators";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json().catch(() => ({}));

    // Liveblocks SDK posts { room: "file:<uuid>" } when entering a room.
    // We also accept a plain { fileId } for backwards-compatible callers.
    const raw = body as { room?: string; fileId?: string };
    const roomId = raw.room ?? (raw.fileId ? `file:${raw.fileId}` : undefined);

    if (!roomId || typeof roomId !== "string") {
      return NextResponse.json(
        { error: "room or fileId is required" },
        { status: 400 },
      );
    }

    if (!roomId.startsWith("file:")) {
      return NextResponse.json({ error: "Invalid room" }, { status: 400 });
    }

    const fileId = roomId.slice("file:".length);

    await requireFileReadAccess(fileId, user);

    const canWrite = await hasFileAccess(fileId, user.id, "write");

    const session = liveblocks.prepareSession(user.id, {
      userInfo: {
        name: user.name ?? user.username ?? "Anonymous",
        username: user.username ?? undefined,
        avatar: user.avatarUrl ?? undefined,
      },
    });

    if (canWrite) {
      session.allow(roomId, session.FULL_ACCESS);
    } else {
      session.allow(roomId, session.READ_ACCESS);
    }

    const { status, body: responseBody } = await session.authorize();
    return new NextResponse(responseBody, {
      status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
