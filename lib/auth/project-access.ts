import type { CurrentUser } from "./get-current-user";
import {
  hasFileAccess,
  hasProjectAccess,
} from "@/lib/db/queries/collaborators";

export async function requireProjectReadAccess(
  projectId: string,
  user: CurrentUser
): Promise<void> {
  const allowed = await hasProjectAccess(projectId, user.id, "read");
  if (!allowed) {
    throw new AccessError("Forbidden: no read access to this project");
  }
}

export async function requireProjectWriteAccess(
  projectId: string,
  user: CurrentUser
): Promise<void> {
  const allowed = await hasProjectAccess(projectId, user.id, "write");
  if (!allowed) {
    throw new AccessError("Forbidden: no write access to this project");
  }
}

export async function requireFileReadAccess(
  fileId: string,
  user: CurrentUser
): Promise<void> {
  const allowed = await hasFileAccess(fileId, user.id, "read");
  if (!allowed) {
    throw new AccessError("Forbidden: no read access to this file");
  }
}

export async function requireFileWriteAccess(
  fileId: string,
  user: CurrentUser
): Promise<void> {
  const allowed = await hasFileAccess(fileId, user.id, "write");
  if (!allowed) {
    throw new AccessError("Forbidden: no write access to this file");
  }
}

export class AccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessError";
  }
}
