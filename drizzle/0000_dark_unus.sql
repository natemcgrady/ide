CREATE TYPE "public"."collaborator_permission" AS ENUM('read', 'write');--> statement-breakpoint
CREATE TABLE "file_collaborators" (
	"file_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permission" "collaborator_permission" NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_ydoc_snapshots" (
	"file_id" uuid PRIMARY KEY NOT NULL,
	"snapshot_bin" text NOT NULL,
	"state_vector_bin" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_ydoc_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"seq" text NOT NULL,
	"update_bin" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"title" text DEFAULT 'Untitled' NOT NULL,
	"language" text DEFAULT 'python' NOT NULL,
	"content_text" text DEFAULT '' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"last_edited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vercel_sub" text NOT NULL,
	"email" text,
	"name" text,
	"username" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_vercel_sub_unique" UNIQUE("vercel_sub")
);
--> statement-breakpoint
ALTER TABLE "file_collaborators" ADD CONSTRAINT "file_collaborators_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_collaborators" ADD CONSTRAINT "file_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_collaborators" ADD CONSTRAINT "file_collaborators_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_ydoc_snapshots" ADD CONSTRAINT "file_ydoc_snapshots_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_ydoc_updates" ADD CONSTRAINT "file_ydoc_updates_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "file_collaborators_file_user_unique" ON "file_collaborators" USING btree ("file_id","user_id");--> statement-breakpoint
CREATE INDEX "file_collaborators_user_file" ON "file_collaborators" USING btree ("user_id","file_id");--> statement-breakpoint
CREATE INDEX "file_collaborators_file" ON "file_collaborators" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "file_ydoc_updates_file_seq" ON "file_ydoc_updates" USING btree ("file_id","seq");--> statement-breakpoint
CREATE INDEX "files_owner_last_edited" ON "files" USING btree ("owner_user_id","last_edited_at");