import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "../client";
import { fileYdocSnapshots, fileYdocUpdates } from "../schema";

export async function getYdocSnapshot(fileId: string) {
  const [row] = await db
    .select()
    .from(fileYdocSnapshots)
    .where(eq(fileYdocSnapshots.fileId, fileId))
    .limit(1);
  return row ?? null;
}

export async function getYdocUpdatesAfter(fileId: string, afterSeq: string) {
  return db
    .select()
    .from(fileYdocUpdates)
    .where(
      and(eq(fileYdocUpdates.fileId, fileId), gt(fileYdocUpdates.seq, afterSeq))
    )
    .orderBy(asc(fileYdocUpdates.seq));
}

export async function getAllYdocUpdates(fileId: string) {
  return db
    .select()
    .from(fileYdocUpdates)
    .where(eq(fileYdocUpdates.fileId, fileId))
    .orderBy(asc(fileYdocUpdates.seq));
}

export async function upsertYdocSnapshot(
  fileId: string,
  snapshotBin: string,
  stateVectorBin: string
) {
  await db
    .insert(fileYdocSnapshots)
    .values({
      fileId,
      snapshotBin,
      stateVectorBin,
    })
    .onConflictDoUpdate({
      target: fileYdocSnapshots.fileId,
      set: {
        snapshotBin,
        stateVectorBin,
        updatedAt: new Date(),
      },
    });
}

export async function appendYdocUpdate(
  fileId: string,
  seq: string,
  updateBin: string
) {
  await db.insert(fileYdocUpdates).values({
    fileId,
    seq,
    updateBin,
  });
}
