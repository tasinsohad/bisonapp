-- ============================================================
-- Migration: Add last_synced_at to leads
-- ============================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_synced_at timestamptz DEFAULT now() - interval '1 hour';
