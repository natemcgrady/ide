import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getFileWithOwner } from "@/lib/db/queries/files";
import { hasFileAccess } from "@/lib/db/queries/collaborators";
import IDEWithFile from "./IDEWithFile";

export const dynamic = "force-dynamic";

export default async function FileEditorPage({
  params,
}: {
  params: Promise<{ fileId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { fileId } = await params;
  const row = await getFileWithOwner(fileId);
  if (!row || row.file.isDeleted) {
    notFound();
  }

  const canAccess = await hasFileAccess(fileId, user.id, "read");
  if (!canAccess) {
    redirect("/files");
  }

  const canWrite = await hasFileAccess(fileId, user.id, "write");

  return (
    <IDEWithFile
      fileId={fileId}
      initialTitle={row.file.title}
      initialLanguage={row.file.language as "python" | "typescript"}
      initialCode={row.file.contentText}
      canWrite={canWrite}
    />
  );
}
