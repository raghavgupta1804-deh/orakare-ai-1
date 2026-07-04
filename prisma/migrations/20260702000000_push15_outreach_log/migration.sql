CREATE TABLE IF NOT EXISTS "OutreachLog" (
  "id"          TEXT NOT NULL,
  "clinicId"    TEXT NOT NULL,
  "patientId"   TEXT NOT NULL,
  "kind"        TEXT NOT NULL,
  "contextId"   TEXT,
  "sentAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "markedBy"    TEXT NOT NULL,
  "notes"       TEXT,
  CONSTRAINT "OutreachLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OutreachLog_clinicId_kind_sentAt_idx"
  ON "OutreachLog"("clinicId", "kind", "sentAt");
CREATE INDEX IF NOT EXISTS "OutreachLog_patientId_idx"
  ON "OutreachLog"("patientId");
DO $$ BEGIN
  ALTER TABLE "OutreachLog" ADD CONSTRAINT "OutreachLog_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "OutreachLog" ADD CONSTRAINT "OutreachLog_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
