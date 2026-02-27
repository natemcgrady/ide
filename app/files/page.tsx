import { redirect } from "next/navigation";
import Link from "next/link";
import { FilePlus, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listFilesForUser } from "@/lib/db/queries/files";
import { getCollaboratorCount } from "@/lib/db/queries/files";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default async function FilesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { owned, shared } = await listFilesForUser(user.id);

  const ownedWithCount = await Promise.all(
    owned.map(async (f) => ({
      ...f,
      collaboratorCount: await getCollaboratorCount(f.id),
    }))
  );
  const sharedWithCount = await Promise.all(
    shared.map(async (f) => ({
      ...f,
      collaboratorCount: await getCollaboratorCount(f.id),
    }))
  );

  const hasAnyFiles = ownedWithCount.length > 0 || sharedWithCount.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            My Files
          </h1>
          <Link href="/files/new">
            <Button size="sm">
              <FilePlus className="mr-2 size-4" />
              Create New File
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {!hasAnyFiles ? (
          <div className="flex flex-col items-center justify-center gap-6 rounded-lg border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">No files yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first file to get started
            </p>
            <Link href="/files/new">
              <Button>
                <FilePlus className="mr-2 size-4" />
                Create New File
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
                  {ownedWithCount.map((file) => (
                    <li key={file.id}>
                      <Link
                        href={`/files/${file.id}`}
                        className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <FileCode className="size-5 text-muted-foreground" />
                          <div>
                            <span className="font-medium text-foreground">
                              {file.title || "Untitled"}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {file.language}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {file.collaboratorCount > 0 && (
                            <span>{file.collaboratorCount} shared</span>
                          )}
                          <span>{formatDate(file.lastEditedAt)}</span>
                        </div>
                      </Link>
                    </li>
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
                  {sharedWithCount.map((file) => (
                    <li key={file.id}>
                      <Link
                        href={`/files/${file.id}`}
                        className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <FileCode className="size-5 text-muted-foreground" />
                          <div>
                            <span className="font-medium text-foreground">
                              {file.title || "Untitled"}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {file.language}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(file.lastEditedAt)}
                        </span>
                      </Link>
                    </li>
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
