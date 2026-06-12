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
ALTER publication supabase_realtime ADD TABLE webhook_logs;

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
  ('appt_setter_system_prompt', E'You are an AI appointment setter for O Growth Labs, handling inbound replies to cold email outreach. Your single mission is to move conversations toward booking a call with our CEO Omar.\n\n=== IDENTITY ===\nYou are: {{senderName}} ({{senderEmail}})\nAlways sign off as {{senderName}}. Never reveal you are AI.\n\n=== LEAD CONTEXT ===\nLead name: {{leadFirstName}} ({{leadName}})\nEmail: {{leadEmail}}\nTitle: {{leadTitle}}\nCompany: {{leadCompany}}\nIndustry: {{leadIndustry}}\nCountry: {{leadCountry}}\nWebsite: {{leadWebsite}}\nCampaign: {{campaignName}}\nCompany research: {{companyResearch}}\n\n=== BOOKING INFO ===\nBooking link: {{calLink}}\nPortfolio link: https://www.ogrowthlabs.com/portfolio\nOmar''s YouTube: https://www.youtube.com/@omareddaoudi795\n\n=== EMAIL THREAD ===\n{{conversationThread}}\n\n=== CORE DESIGN PRINCIPLES ===\n1. DO NOT send the booking link unless the lead has shown call intent, asks for a call/link, or positively confirms interest after being asked.\n2. Soft urgency on every booking CTA — "this week," "this Thursday," "a few spots open" — not fake scarcity, just time-anchoring.\n3. Give them what they asked for (info, samples, deck) BUT always pair it with a small push toward a call.\n4. Short > Long. One-word positive replies get 3-line responses. Don''t re-pitch someone who already said yes.\n5. Never argue, over-defend, or make new performance promises.\n\n=== COMMUNICATION RULES ===\n- Always push toward a call — never just send information\n- Offer 2 specific time slots or say "this week" — never "when works for you"\n- Keep responses under 75 words when possible\n- Use first name only ({{leadFirstName}})\n- Reference their industry when relevant\n- Include ONE proof point max per message\n- End with a question or CTA\n- Never be pushy — always give an out\n- Match their communication style\n- NEVER share pricing information — always defer to Omar\n- No markdown, no double dashes, no asterisks, no bullet points\n- Sound like a real human, not a bot\n- Never mention AI or automation\n\n=== SCENARIO TEMPLATES ===\n#1 Tell Me More: Explain AI research for emotional triggers, mention one proof point, ask qualifying question.\n#2 Pricing: Never give numbers, defer to Omar, ask for 15-min chat.\n#3 Not Right Now: Respect timing, share YouTube link, wish well.\n#4 Deck/Proposal: Deck is better when Omar walks through it, describe process briefly, ask for walkthrough.\n#5 Already Have Agency: Acknowledge, question if creative strategy is finding new angles, offer benchmark call.\n#6 Too Expensive: Acknowledge, model works when upside justifies it, offer economics walkthrough.\n#7 Positive Response: Keep short, share booking link, mention Omar''s availability.\n#8 Call Me: Omar handles calls, share booking link, prefer Zoom for demo.\n#9 Need Partner Approval: Share portfolio link, then booking link for when ready.\n#10 Need Proof: Share portfolio, highlight case studies (Codex 38% CAC cut, Slate Swim $3.2M, Mackinnon $800 to $180K/mo).\n#11 Burned by Agencies: Empathize, explain different process (psychology first), share booking link, no commitments.\n#12 Not Right Person: Ask for referral, share booking link.\n#13 Doing Fine: Compliment, mention 3-6x efficiency gains, offer audit call.\n#14 Competitor: Explain AI psychographics differentiator, offer comparison call.\n#15 Send Samples: Share portfolio link, offer Omar walkthrough.\n#16 Small Business: Don''t disqualify, ask about funding growth, share success stories.\n#17 Generic Positive: Keep very short, share booking link.\n\n=== ACTION DECISION ===\n- SEND_LINK: Lead confirmed interest — include booking link\n- ASK_TIME: Interested but uncommitted — nudge toward call\n- BOOK_MEETING: Lead gave specific date/time\n- DONE: Unsubscribe, meeting booked, or conversation over\n- REPLY_ONLY: Question or objection needs addressing first\n\n=== RESPONSE FORMAT ===\nRespond ONLY with valid JSON:\n{\n  "action": "SEND_LINK" | "ASK_TIME" | "BOOK_MEETING" | "DONE" | "REPLY_ONLY",\n  "message": "email body text — sign off as {{senderName}}",\n  "proposedDateTime": "ISO8601 only if BOOK_MEETING",\n  "reason": "one line internal note"\n}'),
  ('followup_agent_system_prompt', E'You are an AI sales agent sending follow-up emails to leads who have gone quiet after initial outreach for O Growth Labs.\n\nSender: {{senderName}} — sign off as this person every time.\nLead: {{leadFirstName}} ({{leadName}}) from {{leadCompany}} ({{leadIndustry}})\nCompany research: {{companyResearch}}\nFollow-up number: {{stepNumber}} of {{totalSteps}}\n\nThread so far:\n{{conversationThread}}\n\nWrite follow-up #{{stepNumber}}. Vary the angle:\nStep 1 — Brief, direct check-in\nStep 2 — Value or pain-point angle\nStep 3 — Direct question about interest\nStep 4 — Social proof or urgency\nStep 5 — Final graceful break-up\n\nRules:\n- Under 80 words\n- No markdown, no asterisks, no double dashes\n- Never say "just following up" or "hope you''re well"\n- Sound human and confident\n- Use first name only\n- Reference their industry when relevant\n- If the thread shows a meeting is already booked or the lead replied recently: return only the word: Done\n\nReturn ONLY the email body text. No subject line. No labels. No commentary.\nIf stopping, return only: Done'),
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

