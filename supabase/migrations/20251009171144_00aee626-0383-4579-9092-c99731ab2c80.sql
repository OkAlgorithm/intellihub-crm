-- Create enum for deal stages
CREATE TYPE public.deal_stage AS ENUM ('lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost');

-- Create deals/pipeline table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  stage deal_stage NOT NULL DEFAULT 'lead',
  value DECIMAL(10, 2),
  probability INTEGER DEFAULT 0,
  expected_close_date DATE,
  notes TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create contact knowledge base table for RAG
CREATE TABLE public.contact_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create audio messages table
CREATE TABLE public.audio_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  transcription TEXT,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public access for now, adjust based on auth needs)
CREATE POLICY "Public can view deals" ON public.deals FOR SELECT USING (true);
CREATE POLICY "Public can insert deals" ON public.deals FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update deals" ON public.deals FOR UPDATE USING (true);
CREATE POLICY "Public can delete deals" ON public.deals FOR DELETE USING (true);

CREATE POLICY "Public can view knowledge" ON public.contact_knowledge FOR SELECT USING (true);
CREATE POLICY "Public can insert knowledge" ON public.contact_knowledge FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update knowledge" ON public.contact_knowledge FOR UPDATE USING (true);
CREATE POLICY "Public can delete knowledge" ON public.contact_knowledge FOR DELETE USING (true);

CREATE POLICY "Public can view audio messages" ON public.audio_messages FOR SELECT USING (true);
CREATE POLICY "Public can insert audio messages" ON public.audio_messages FOR INSERT WITH CHECK (true);

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-messages', 'audio-messages', true);

-- Storage policies
CREATE POLICY "Public can view audio files" ON storage.objects FOR SELECT USING (bucket_id = 'audio-messages');
CREATE POLICY "Public can upload audio files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio-messages');

-- Update trigger for deals
CREATE OR REPLACE FUNCTION public.update_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_deals_updated_at();

-- Insert sample deals data
INSERT INTO public.deals (contact_name, company, email, phone, stage, value, probability, expected_close_date, notes) VALUES
('Sarah Johnson', 'TechCorp Inc', 'sarah.j@techcorp.com', '(555) 123-4567', 'qualified', 45000, 75, '2025-11-15', 'Interested in enterprise plan'),
('Michael Chen', 'StartupXYZ', 'mchen@startupxyz.io', '(555) 234-5678', 'proposal', 28000, 60, '2025-11-30', 'Needs custom integration'),
('Emily Rodriguez', 'Global Solutions', 'emily.r@globalsol.com', '(555) 345-6789', 'negotiation', 85000, 80, '2025-11-10', 'Final pricing discussion'),
('David Kim', 'Innovation Labs', 'david@innovlabs.com', '(555) 456-7890', 'lead', 15000, 25, '2025-12-20', 'Initial contact made'),
('Lisa Wang', 'Enterprise Co', 'lwang@enterpriseco.com', '(555) 567-8901', 'qualified', 120000, 70, '2025-11-25', 'Large team deployment');

-- Insert sample knowledge base entries
INSERT INTO public.contact_knowledge (deal_id, content, metadata) 
SELECT id, 
  'Previous conversation: Discussed pricing and implementation timeline. Client mentioned budget of $' || value || '. Key decision maker is ' || contact_name || '. Company size: 50-100 employees. Industry: Technology. Pain points: Manual data entry, lack of automation.',
  jsonb_build_object('source', 'conversation', 'date', '2025-10-01')
FROM public.deals
WHERE contact_name IN ('Sarah Johnson', 'Michael Chen', 'Emily Rodriguez');