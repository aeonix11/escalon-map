ALTER TABLE "comments" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "comments" ADD COLUMN "guest_id" text;
ALTER TABLE "comments" ADD COLUMN "guest_name" text;
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_check"
  CHECK (user_id IS NOT NULL OR (guest_id IS NOT NULL AND guest_name IS NOT NULL));
