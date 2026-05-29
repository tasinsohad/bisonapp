-- ============================================================
-- LeadPilot Database Migration
-- ============================================================

-- 1. Settings table (key-value config store)
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz DEFAULT now()
);

-- 2. Leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bison_lead_id integer,
  bison_reply_id integer,
  bison_sender_email_id integer,
  bison_sender_email_name text,
  bison_sender_email_address text,
  bison_campaign_id integer,
  bison_campaign_name text,
  bison_instance_url text,
  email text NOT NULL,
  first_name text,
  last_name text,
  title text,
  company text,
  website text,
  linkedin_url text,
  industry text,
  country text,
  annual_revenue text,
  custom_variables jsonb DEFAULT '[]',
  status text DEFAULT 'new'
    CHECK (status IN ('new','engaged','meeting_scheduled','ghosted','done','unsubscribed')),
  sequence_step_order integer,
  notes text,
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_bison_lead_id ON leads(bison_lead_id);

-- 3. Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  messages jsonb DEFAULT '[]',
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_id);

-- 4. Follow-up sequences table
CREATE TABLE IF NOT EXISTS followup_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  steps jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Follow-up enrollments table
CREATE TABLE IF NOT EXISTS followup_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  sequence_id uuid REFERENCES followup_sequences(id) ON DELETE CASCADE,
  current_step integer DEFAULT 1,
  status text DEFAULT 'active'
    CHECK (status IN ('active','paused','completed','cancelled')),
  next_send_at timestamptz,
  enrolled_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enrollments_next_send ON followup_enrollments(next_send_at)
  WHERE status = 'active';

-- 6. Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  direction text CHECK (direction IN ('inbound','outbound')),
  subject text,
  body_text text,
  body_html text,
  bison_reply_id integer,
  bison_sender_email_id integer,
  bison_sender_email_address text,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed','delivered')),
  error_message text,
  sent_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_lead ON email_logs(lead_id);

-- 7. Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  scheduled_at timestamptz,
  cal_event_id text,
  cal_booking_url text,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled')),
  created_at timestamptz DEFAULT now()
);

-- 8. Webhook logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text,
  bison_instance_url text,
  bison_workspace_name text,
  payload jsonb,
  processed boolean DEFAULT false,
  error_message text,
  received_at timestamptz DEFAULT now()
);

-- 9. Activity feed table (append-only)
CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  lead_email text,
  lead_name text,
  event_type text,
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at DESC);

-- 10. Agent runs table (AI debugging)
CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  agent_type text CHECK (agent_type IN ('appointment_setter','followup')),
  input_prompt text,
  raw_response text,
  parsed_action text,
  parsed_message text,
  success boolean,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "authenticated_full_access" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access" ON followup_sequences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access" ON followup_enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access" ON email_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access" ON meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access" ON webhook_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access" ON activity_feed FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access" ON agent_runs FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Enable Realtime
-- ============================================================

ALTER publication supabase_realtime ADD TABLE activity_feed;
ALTER publication supabase_realtime ADD TABLE leads;
ALTER publication supabase_realtime ADD TABLE meetings;
ALTER publication supabase_realtime ADD TABLE followup_enrollments;

-- ============================================================
-- Seed Data
-- ============================================================

INSERT INTO settings (key, value) VALUES
  ('bison_instance_url', ''),
  ('bison_api_key', ''),
  ('openai_api_key', ''),
  ('openai_model', 'gpt-4o'),
  ('cal_api_key', ''),
  ('cal_event_type_id', ''),
  ('cal_booking_base_url', ''),
  ('firecrawl_api_key', ''),
  ('cc_email_name', ''),
  ('cc_email_address', ''),
  ('app_timezone', 'America/New_York'),
  ('send_window_start', '9'),
  ('send_window_end', '18'),
  ('auto_pause_on_reply', 'true'),
  ('default_sequence_id', ''),
  ('webhook_secret', ''),
  ('appt_setter_system_prompt', E'You are an AI sales assistant handling inbound replies to cold email outreach for a company. Your job is to move conversations toward booking a meeting.\n\nSender identity: {{senderName}} ({{senderEmail}}) — always sign off as this person.\nLead: {{leadName}} ({{leadEmail}}), {{leadTitle}} at {{leadCompany}}\nCampaign: {{campaignName}}\nBooking link: {{calLink}}\nCompany research: {{companyResearch}}\n\nFull email thread:\n{{conversationThread}}\n\nDecide the best action based on context:\n- If the lead is clearly ready: send them the booking link (SEND_LINK)\n- If they seem interested but haven''t committed: ask what time works, tell them you can book it for them (ASK_TIME)\n- If they gave you a specific time: book it (BOOK_MEETING)\n- If meeting is already confirmed or they want to unsubscribe: (DONE)\n- If they asked a question that needs answering first: answer it (REPLY_ONLY)\n\nRules:\n- Keep messages under 100 words\n- No markdown, no double dashes, no asterisks\n- Sound like a real person, not a bot\n- Never mention AI or automation\n- Include booking link only when relevant\n\nRespond ONLY with a valid JSON object, nothing else:\n{\n  \"action\": \"SEND_LINK\" | \"ASK_TIME\" | \"BOOK_MEETING\" | \"DONE\" | \"REPLY_ONLY\",\n  \"message\": \"email body text here\",\n  \"proposedDateTime\": \"ISO8601 only if BOOK_MEETING\",\n  \"reason\": \"one line internal note\"\n}'),
  ('followup_agent_system_prompt', E'You are an AI sales agent sending follow-up emails to leads who have gone quiet after initial outreach.\n\nSender: {{senderName}} — sign off as this person every time.\nLead: {{leadName}} from {{leadCompany}} ({{leadIndustry}})\nCompany research: {{companyResearch}}\nFollow-up number: {{stepNumber}} of {{totalSteps}}\n\nThread so far:\n{{conversationThread}}\n\nWrite follow-up #{{stepNumber}}. Vary the angle:\nStep 1 — Brief, direct check-in\nStep 2 — Value or pain-point angle\nStep 3 — Direct question about interest\nStep 4 — Social proof or urgency\nStep 5 — Final graceful break-up\n\nRules:\n- Under 80 words\n- No markdown, no asterisks, no double dashes\n- Never say \"just following up\" or \"hope you''re well\"\n- Sound human and confident\n- If the thread shows a meeting is already booked or the lead replied recently: return only the word: Done\n\nReturn ONLY the email body text. No subject line. No labels. No commentary.\nIf stopping, return only: Done'),
  ('app_name', 'LeadPilot')
ON CONFLICT (key) DO NOTHING;

INSERT INTO followup_sequences (name, is_active, steps) VALUES (
  'Default 5-Step Follow-up',
  true,
  '[
    {"step_number":1,"delay_days":3,"delay_hours":0,"send_on_weekends":false,"custom_message":""},
    {"step_number":2,"delay_days":5,"delay_hours":0,"send_on_weekends":false,"custom_message":""},
    {"step_number":3,"delay_days":7,"delay_hours":0,"send_on_weekends":false,"custom_message":""},
    {"step_number":4,"delay_days":10,"delay_hours":0,"send_on_weekends":false,"custom_message":""},
    {"step_number":5,"delay_days":14,"delay_hours":0,"send_on_weekends":false,"custom_message":""}
  ]'
);
