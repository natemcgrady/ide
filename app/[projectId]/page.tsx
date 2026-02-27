import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasProjectAccess } from "@/lib/db/queries/collaborators";
import {
  getProjectWithOwner,
  listFilesInProject,
} from "@/lib/db/queries/projects";
import IDEWithProject from "./IDEWithProject";

export const dynamic = "force-dynamic";

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { projectId } = await params;
  const row = await getProjectWithOwner(projectId);
  if (!row || row.project.isDeleted) {
    notFound();
  }

  const canAccess = await hasProjectAccess(projectId, user.id, "read");
  if (!canAccess) {
    redirect("/");
  }

  const [canWrite, files] = await Promise.all([
    hasProjectAccess(projectId, user.id, "write"),
    listFilesInProject(projectId),
  ]);

  return (
    <IDEWithProject
      projectId={projectId}
      initialProjectName={row.project.name}
      initialFiles={files}
      canWrite={canWrite}
      currentUser={{
        id: user.id,
        name: user.name ?? user.username ?? "Anonymous",
        avatar: user.avatarUrl,
      }}
    />
  );
}
