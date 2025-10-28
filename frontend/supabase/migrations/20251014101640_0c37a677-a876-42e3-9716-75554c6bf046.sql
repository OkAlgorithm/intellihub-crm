-- Drop existing restrictive RLS policies
DROP POLICY IF EXISTS "Users can create their own workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can view their own workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can update their own workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can delete their own workflows" ON public.workflows;

-- Create public RLS policies matching the pattern from other tables
CREATE POLICY "Public can create workflows"
ON public.workflows
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can view workflows"
ON public.workflows
FOR SELECT
USING (true);

CREATE POLICY "Public can update workflows"
ON public.workflows
FOR UPDATE
USING (true);

CREATE POLICY "Public can delete workflows"
ON public.workflows
FOR DELETE
USING (true);