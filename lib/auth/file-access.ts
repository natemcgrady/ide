import type { CurrentUser } from "./get-current-user";
import { hasFileAccess } from "@/lib/db/queries/collaborators";

export async function requireFileReadAccess(
  fileId: string,
  user: CurrentUser
): Promise<void> {
  const allowed = await hasFileAccess(fileId, user.id, "read");
  if (!allowed) {
    throw new FileAccessError("Forbidden: no read access to this file");
  }
}

export async function requireFileWriteAccess(
  fileId: string,
  user: CurrentUser
): Promise<void> {
  const allowed = await hasFileAccess(fileId, user.id, "write");
  if (!allowed) {
    throw new FileAccessError("Forbidden: no write access to this file");
  }
}

export class FileAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileAccessError";
  }
}
