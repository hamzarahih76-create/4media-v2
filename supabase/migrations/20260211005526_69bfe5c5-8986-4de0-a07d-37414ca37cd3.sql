
-- Add client_user_id to tasks table (video projects)
ALTER TABLE public.tasks ADD COLUMN client_user_id uuid;

-- Add client_user_id to design_tasks table (design projects)
ALTER TABLE public.design_tasks ADD COLUMN client_user_id uuid;

-- Create indexes for efficient client-side queries
CREATE INDEX idx_tasks_client_user_id ON public.tasks(client_user_id);
CREATE INDEX idx_design_tasks_client_user_id ON public.design_tasks(client_user_id);

-- RLS: Allow clients to read their own tasks
CREATE POLICY "Clients can view their own tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (client_user_id = auth.uid());

-- RLS: Allow clients to read their own design tasks
CREATE POLICY "Clients can view their own design tasks"
ON public.design_tasks FOR SELECT
TO authenticated
USING (client_user_id = auth.uid());
