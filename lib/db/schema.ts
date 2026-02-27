import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const collaboratorPermissionEnum = pgEnum(
  "collaborator_permission",
  ["read", "write"]
);

// Users table - maps Vercel OAuth identity to internal IDs
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  vercelSub: text("vercel_sub").notNull().unique(),
  email: text("email"),
  name: text("name"),
  username: text("username"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Projects table
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Untitled Project"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    lastEditedAt: timestamp("last_edited_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("projects_owner_last_edited").on(t.ownerUserId, t.lastEditedAt)]
);

// Files table
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("untitled.py"),
    contentText: text("content_text").notNull().default(""),
    isDeleted: boolean("is_deleted").notNull().default(false),
    lastEditedAt: timestamp("last_edited_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("files_project_last_edited").on(t.projectId, t.lastEditedAt)]
);

// Project collaborators - invite-only sharing with read/write permission
export const projectCollaborators = pgTable(
  "project_collaborators",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: collaboratorPermissionEnum("permission").notNull(),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("project_collaborators_project_user_unique").on(
      t.projectId,
      t.userId
    ),
    index("project_collaborators_user_project").on(t.userId, t.projectId),
    index("project_collaborators_project").on(t.projectId),
  ]
);

// Yjs document updates - append-only for durability
export const fileYdocUpdates = pgTable(
  "file_ydoc_updates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    seq: text("seq").notNull(), // sequence number as string for ordering
    updateBin: text("update_bin").notNull(), // base64-encoded binary
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("file_ydoc_updates_file_seq").on(t.fileId, t.seq)]
);

// Yjs document snapshots - full state for fast load
export const fileYdocSnapshots = pgTable("file_ydoc_snapshots", {
  fileId: uuid("file_id")
    .primaryKey()
    .references(() => files.id, { onDelete: "cascade" }),
  snapshotBin: text("snapshot_bin").notNull(), // base64-encoded
  stateVectorBin: text("state_vector_bin").notNull(), // base64-encoded
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedProjects: many(projects),
  projectCollaborators: many(projectCollaborators),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerUserId],
    references: [users.id],
  }),
  files: many(files),
  collaborators: many(projectCollaborators),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  project: one(projects, {
    fields: [files.projectId],
    references: [projects.id],
  }),
  ydocSnapshot: one(fileYdocSnapshots),
  ydocUpdates: many(fileYdocUpdates),
}));

export const projectCollaboratorsRelations = relations(
  projectCollaborators,
  ({ one }) => ({
    project: one(projects),
    user: one(users),
    invitedBy: one(users, {
      fields: [projectCollaborators.invitedByUserId],
      references: [users.id],
    }),
  })
);
