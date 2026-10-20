ALTER TABLE "files" ADD COLUMN "organisation_id" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "organisation_id" text;--> statement-breakpoint
ALTER TABLE "layouts" ADD COLUMN "organisation_id" text;--> statement-breakpoint
ALTER TABLE "values" ADD COLUMN "organisation_id" text;