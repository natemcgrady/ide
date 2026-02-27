export const queryKeys = {
  projects: {
    all: ["projects"] as const,
    detail: (projectId: string) => ["projects", projectId] as const,
    files: (projectId: string) => ["projects", projectId, "files"] as const,
    collaborators: (projectId: string) =>
      ["projects", projectId, "collaborators"] as const,
  },
  files: {
    all: ["files"] as const,
    detail: (fileId: string) => ["files", fileId] as const,
  },
  auth: {
    currentUser: ["auth", "me"] as const,
  },
} as const;
