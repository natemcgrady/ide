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

// Files table
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled"),
    language: text("language").notNull().default("python"),
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
  (t) => [index("files_owner_last_edited").on(t.ownerUserId, t.lastEditedAt)]
);

// File collaborators - invite-only sharing with read/write permission
export const fileCollaborators = pgTable(
  "file_collaborators",
  {
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
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
    uniqueIndex("file_collaborators_file_user_unique").on(t.fileId, t.userId),
    index("file_collaborators_user_file").on(t.userId, t.fileId),
    index("file_collaborators_file").on(t.fileId),
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
  ownedFiles: many(files),
  fileCollaborators: many(fileCollaborators),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  owner: one(users, {
    fields: [files.ownerUserId],
    references: [users.id],
  }),
  collaborators: many(fileCollaborators),
  ydocSnapshot: one(fileYdocSnapshots),
  ydocUpdates: many(fileYdocUpdates),
}));

export const fileCollaboratorsRelations = relations(
  fileCollaborators,
  ({ one }) => ({
    file: one(files),
    user: one(users),
    invitedBy: one(users, {
      fields: [fileCollaborators.invitedByUserId],
      references: [users.id],
    }),
  })
);
