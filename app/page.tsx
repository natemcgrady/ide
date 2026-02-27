import { redirect } from "next/navigation";
import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProjectListItem from "@/components/ProjectListItem";
import {
  getProjectCollaboratorCount,
  getProjectFileCount,
  listProjectsForUser,
} from "@/lib/db/queries/projects";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { owned, shared } = await listProjectsForUser(user.id);

  const ownedWithCount = await Promise.all(
    owned.map(async (project) => ({
      ...project,
      fileCount: await getProjectFileCount(project.id),
      collaboratorCount: await getProjectCollaboratorCount(project.id),
    })),
  );
  const sharedWithCount = await Promise.all(
    shared.map(async (project) => ({
      ...project,
      fileCount: await getProjectFileCount(project.id),
      collaboratorCount: await getProjectCollaboratorCount(project.id),
    })),
  );

  const hasAnyProjects = ownedWithCount.length > 0 || sharedWithCount.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            IDE
          </h1>
          <Link href="/new" prefetch={false}>
            <Button size="sm">
              <FolderPlus className="mr-2 size-4" />
              Create New Project
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {!hasAnyProjects ? (
          <div className="flex flex-col items-center justify-center gap-6 rounded-lg border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">No projects yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first project to get started
            </p>
            <Link href="/new" prefetch={false}>
              <Button>
                <FolderPlus className="mr-2 size-4" />
                Create New Project
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {ownedWithCount.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-medium text-muted-foreground">
                  Owned by you
                </h2>
                <ul className="space-y-2">
                  {ownedWithCount.map((project) => (
                    <ProjectListItem
                      key={project.id}
                      id={project.id}
                      name={project.name ?? ""}
                      lastEditedAt={project.lastEditedAt}
                      fileCount={project.fileCount}
                      collaboratorCount={project.collaboratorCount}
                      isOwner={true}
                    />
                  ))}
                </ul>
              </section>
            )}

            {sharedWithCount.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-medium text-muted-foreground">
                  Shared with you
                </h2>
                <ul className="space-y-2">
                  {sharedWithCount.map((project) => (
                    <ProjectListItem
                      key={project.id}
                      id={project.id}
                      name={project.name ?? ""}
                      lastEditedAt={project.lastEditedAt}
                      fileCount={project.fileCount}
                      collaboratorCount={project.collaboratorCount}
                      isOwner={false}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
