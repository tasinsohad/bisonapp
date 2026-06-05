-- ============================================================
-- Migration: Update Reply Queue Status Constraint
-- ============================================================

-- Drop the old constraint
ALTER TABLE reply_queue DROP CONSTRAINT IF EXISTS reply_queue_status_check;

-- Add the new constraint including 'failed'
ALTER TABLE reply_queue ADD CONSTRAINT reply_queue_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'failed'));
