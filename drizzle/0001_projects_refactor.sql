CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name" text DEFAULT 'Untitled Project' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"last_edited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "projects_owner_last_edited" ON "projects" USING btree ("owner_user_id","last_edited_at");
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "project_id" uuid;
--> statement-breakpoint
CREATE TEMP TABLE "__file_project_map" (
	"file_id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL
);
--> statement-breakpoint
INSERT INTO "__file_project_map" ("file_id", "project_id")
SELECT "id", gen_random_uuid()
FROM "files";
--> statement-breakpoint
INSERT INTO "projects" (
	"id",
	"owner_user_id",
	"name",
	"is_deleted",
	"last_edited_at",
	"created_at",
	"updated_at"
)
SELECT
	m."project_id",
	f."owner_user_id",
	CASE
		WHEN trim(f."title") = '' THEN 'Untitled Project'
		ELSE f."title" || ' Project'
	END,
	f."is_deleted",
	f."last_edited_at",
	f."created_at",
	f."updated_at"
FROM "files" f
INNER JOIN "__file_project_map" m ON m."file_id" = f."id";
--> statement-breakpoint
UPDATE "files" f
SET "project_id" = m."project_id"
FROM "__file_project_map" m
WHERE m."file_id" = f."id";
--> statement-breakpoint
UPDATE "files"
SET "title" = CASE
	WHEN position('.' in reverse("title")) > 0 THEN "title"
	WHEN "language" = 'python' THEN "title" || '.py'
	ELSE "title" || '.ts'
END;
--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "project_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "files_project_last_edited" ON "files" USING btree ("project_id","last_edited_at");
--> statement-breakpoint
CREATE TABLE "project_collaborators" (
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permission" "collaborator_permission" NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "project_collaborators" (
	"project_id",
	"user_id",
	"permission",
	"invited_by_user_id",
	"created_at"
)
SELECT
	f."project_id",
	fc."user_id",
	fc."permission",
	fc."invited_by_user_id",
	fc."created_at"
FROM "file_collaborators" fc
INNER JOIN "files" f ON f."id" = fc."file_id";
--> statement-breakpoint
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "project_collaborators_project_user_unique" ON "project_collaborators" USING btree ("project_id","user_id");
--> statement-breakpoint
CREATE INDEX "project_collaborators_user_project" ON "project_collaborators" USING btree ("user_id","project_id");
--> statement-breakpoint
CREATE INDEX "project_collaborators_project" ON "project_collaborators" USING btree ("project_id");
--> statement-breakpoint
DROP TABLE "file_collaborators";
--> statement-breakpoint
DROP INDEX "files_owner_last_edited";
--> statement-breakpoint
ALTER TABLE "files" DROP CONSTRAINT "files_owner_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "owner_user_id";
--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "language";
--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "title" SET DEFAULT 'untitled.py';
--> statement-breakpoint
DROP TABLE "__file_project_map";