import { notFound, redirect } from "next/navigation";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth";
import { hasProjectAccess } from "@/lib/db/queries/collaborators";
import {
  getProjectWithOwner,
  listFilesInProject,
} from "@/lib/db/queries/projects";
import { queryKeys } from "@/lib/queries/keys";
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

  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKeys.projects.files(projectId), files);
  queryClient.setQueryData(queryKeys.projects.detail(projectId), {
    id: row.project.id,
    name: row.project.name,
    ownerUserId: row.project.ownerUserId,
    ownerName: row.ownerName,
    ownerUsername: row.ownerUsername,
    lastEditedAt: row.project.lastEditedAt,
    files,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
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
    </HydrationBoundary>
  );
}
