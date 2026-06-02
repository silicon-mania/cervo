CREATE TABLE "document_boxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"box_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" DROP CONSTRAINT "documents_box_id_boxes_id_fk";
--> statement-breakpoint
ALTER TABLE "boxes" ADD COLUMN "parent_box_id" uuid;--> statement-breakpoint
ALTER TABLE "document_boxes" ADD CONSTRAINT "document_boxes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_boxes" ADD CONSTRAINT "document_boxes_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_boxes" ADD CONSTRAINT "document_boxes_box_id_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."boxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "document_boxes" ("workspace_id", "document_id", "box_id", "created_by", "created_at")
SELECT "workspace_id", "id", "box_id", "created_by", now()
FROM "documents"
WHERE "box_id" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
CREATE UNIQUE INDEX "document_boxes_document_box_idx" ON "document_boxes" USING btree ("document_id","box_id");--> statement-breakpoint
CREATE INDEX "document_boxes_workspace_box_idx" ON "document_boxes" USING btree ("workspace_id","box_id");--> statement-breakpoint
CREATE INDEX "document_boxes_workspace_document_idx" ON "document_boxes" USING btree ("workspace_id","document_id");--> statement-breakpoint
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_parent_box_id_boxes_id_fk" FOREIGN KEY ("parent_box_id") REFERENCES "public"."boxes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_home_document_id_documents_id_fk" FOREIGN KEY ("home_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "boxes_workspace_parent_idx" ON "boxes" USING btree ("workspace_id","parent_box_id");--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "box_id";
