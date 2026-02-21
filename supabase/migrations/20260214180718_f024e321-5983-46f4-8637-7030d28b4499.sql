
CREATE TABLE public.client_rushes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  external_link TEXT NOT NULL,
  link_type TEXT DEFAULT 'drive',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_rushes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and PMs can manage client rushes"
  ON public.client_rushes FOR ALL
  USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Team members can view client rushes"
  ON public.client_rushes FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      client_user_id IN (
        SELECT dt.client_user_id FROM design_tasks dt
        WHERE dt.assigned_to = auth.uid() AND dt.client_user_id IS NOT NULL
      )
      OR client_user_id IN (
        SELECT t.client_user_id FROM tasks t
        WHERE (t.assigned_to = auth.uid() OR t.copywriter_id = auth.uid()) AND t.client_user_id IS NOT NULL
      )
      OR client_user_id IN (
        SELECT cp.user_id FROM client_profiles cp
        WHERE cp.copywriter_id = auth.uid() OR cp.designer_id = auth.uid()::text
      )
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.client_rushes;
