/**
 * Hocuspocus WebSocket server for real-time collaborative editing.
 * Run with: pnpm run collab
 * Requires DATABASE_URL and COLLAB_JWT_SECRET env vars.
 */
import "dotenv/config";
import { Server } from "@hocuspocus/server";
import * as Y from "yjs";
import { jwtVerify } from "jose";
import { db } from "../lib/db/client";
import {
  getYdocSnapshot,
  getAllYdocUpdates,
  upsertYdocSnapshot,
} from "../lib/db/queries/ydoc";
import { hasFileAccess } from "../lib/db/queries/collaborators";
import { getFileById, updateFileMetadata } from "../lib/db/queries/files";

const JWT_SECRET = new TextEncoder().encode(
  process.env.COLLAB_JWT_SECRET ?? "dev-secret-change-in-production"
);

const server = new Server({
  async onAuthenticate({
    documentName,
    token,
    connection,
  }: {
    documentName: string;
    token: string;
    connection?: { readOnly: boolean };
  }) {
    if (!token) throw new Error("Token required");
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;
    const fileId = payload.fileId as string;
    const permission = payload.permission as string;

    if (documentName !== fileId) throw new Error("Document name mismatch");
    const allowed = await hasFileAccess(fileId, userId, "read");
    if (!allowed) throw new Error("Access denied");

    if (connection) connection.readOnly = permission !== "write";

    return {
      userId,
      fileId,
      permission: permission === "write",
      name: payload.name ?? "Anonymous",
      avatar: payload.avatar ?? null,
    };
  },

  async onLoadDocument({ documentName }) {
    const fileId = documentName;
    const ydoc = new Y.Doc();

    const [snapshot, updates, file] = await Promise.all([
      getYdocSnapshot(fileId),
      getAllYdocUpdates(fileId),
      getFileById(fileId),
    ]);

    if (snapshot) {
      const snapshotBuf = Buffer.from(snapshot.snapshotBin, "base64");
      Y.applyUpdate(ydoc, new Uint8Array(snapshotBuf));
    }

    for (const u of updates) {
      const buf = Buffer.from(u.updateBin, "base64");
      Y.applyUpdate(ydoc, new Uint8Array(buf));
    }

    const ytext = ydoc.getText("monaco");
    if (ytext.length === 0 && file?.contentText) {
      ytext.insert(0, file.contentText);
    }

    return ydoc;
  },

  async onStoreDocument({ documentName, document }) {
    const fileId = documentName;
    const snapshot = Y.encodeStateAsUpdate(document);
    const stateVector = Y.encodeStateVector(document);
    const snapshotBin = Buffer.from(snapshot).toString("base64");
    const stateVectorBin = Buffer.from(stateVector).toString("base64");

    await upsertYdocSnapshot(fileId, snapshotBin, stateVectorBin);

    const contentText = document.getText("monaco").toString();
    await updateFileMetadata(fileId, { contentText });
  },
});

const port = parseInt(process.env.COLLAB_PORT ?? "1234", 10);
void server.listen(port).then(() => {
  console.log(`Collab server listening on port ${port}`);
});
