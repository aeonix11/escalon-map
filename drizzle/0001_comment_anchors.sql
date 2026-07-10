ALTER TABLE "comments" ADD COLUMN "milestone_id" text;
ALTER TABLE "comments" ADD COLUMN "pinned_date" text;
ALTER TABLE "comments" ADD COLUMN "hemisphere" text;

ALTER TABLE "comments" ADD CONSTRAINT "comments_milestone_id_milestones_id_fk"
  FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE set null ON UPDATE no action;
