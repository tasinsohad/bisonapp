-- ============================================================
-- Migration: Add draft_message to queues
-- ============================================================

ALTER TABLE reply_queue ADD COLUMN IF NOT EXISTS draft_message text;
ALTER TABLE followup_enrollments ADD COLUMN IF NOT EXISTS draft_message text;
