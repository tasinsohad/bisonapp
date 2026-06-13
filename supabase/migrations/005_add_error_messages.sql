-- ============================================================
-- Migration: Add Error Messages to Queues
-- ============================================================

ALTER TABLE reply_queue ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE followup_enrollments ADD COLUMN IF NOT EXISTS error_message text;
