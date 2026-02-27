import { queryKeys } from "@/lib/queries/keys";

export interface ProjectFile {
  id: string;
  projectId: string;
  title: string;
  contentText: string;
  lastEditedAt: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ProjectDetailResponse {
  id: string;
  name: string;
  ownerUserId: string;
  ownerName: string | null;
  ownerUsername: string | null;
  lastEditedAt: string;
  files: ProjectFile[];
}

interface ProjectFilesResponse {
  files: ProjectFile[];
}

function ensureOk(response: Response, fallbackMessage: string) {
  if (response.ok) return;
  throw new Error(fallbackMessage);
}

export async function fetchProject(projectId: string): Promise<ProjectDetailResponse> {
  const response = await fetch(`/api/projects/${projectId}`);
  ensureOk(response, "Failed to fetch project");
  return (await response.json()) as ProjectDetailResponse;
}

export async function fetchProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const response = await fetch(`/api/projects/${projectId}/files`);
  ensureOk(response, "Failed to fetch project files");
  const data = (await response.json()) as ProjectFilesResponse;
  return data.files;
}

export async function createProjectFile(
  projectId: string,
  payload: { title?: string; contentText?: string },
): Promise<ProjectFile> {
  const response = await fetch(`/api/projects/${projectId}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  ensureOk(response, "Failed to create file");
  return (await response.json()) as ProjectFile;
}

export async function updateProjectFile(
  fileId: string,
  payload: { title?: string; contentText?: string },
): Promise<ProjectFile> {
  const response = await fetch(`/api/files/${fileId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  ensureOk(response, "Failed to update file");
  return (await response.json()) as ProjectFile;
}

export async function deleteProjectFile(fileId: string): Promise<void> {
  const response = await fetch(`/api/files/${fileId}`, {
    method: "DELETE",
  });
  ensureOk(response, "Failed to delete file");
}

export function projectQueryOptions(projectId: string) {
  return {
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => fetchProject(projectId),
  };
}

export function projectFilesQueryOptions(projectId: string) {
  return {
    queryKey: queryKeys.projects.files(projectId),
    queryFn: () => fetchProjectFiles(projectId),
  };
}
