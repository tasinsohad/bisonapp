-- ============================================================
-- Migration: Add Reply Queue
-- ============================================================

CREATE TABLE IF NOT EXISTS reply_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  send_after timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reply_queue_status_time ON reply_queue(status, send_after);
CREATE INDEX IF NOT EXISTS idx_reply_queue_lead ON reply_queue(lead_id);

ALTER TABLE reply_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON reply_queue FOR ALL USING (true) WITH CHECK (true);

-- Add default delay setting
INSERT INTO settings (key, value) VALUES
  ('inbound_reply_delay_minutes', '0')
ON CONFLICT (key) DO NOTHING;
