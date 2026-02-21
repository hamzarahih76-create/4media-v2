-- Update tasks status check to include 'new' 
-- First drop the existing constraint if it exists
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add new status check that includes 'new'
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('new', 'active', 'in_progress', 'in_review', 'revision_requested', 'completed', 'cancelled'));

-- Add created_by column to track who created the task (editor for B2C, admin/PM for B2B)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Add RLS policy for editors to create B2C tasks
CREATE POLICY "Editors can create B2C tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by 
  AND client_type = 'b2c'
);

-- Update RLS policy for editors to view tasks they created
DROP POLICY IF EXISTS "Editors can view assigned tasks" ON public.tasks;
CREATE POLICY "Editors can view assigned or created tasks" 
ON public.tasks 
FOR SELECT 
USING (auth.uid() = assigned_to OR auth.uid() = created_by);

-- Update RLS policy for editors to update their tasks
DROP POLICY IF EXISTS "Editors can update their tasks status" ON public.tasks;
CREATE POLICY "Editors can update their tasks status" 
ON public.tasks 
FOR UPDATE 
USING (auth.uid() = assigned_to OR auth.uid() = created_by)
WITH CHECK (auth.uid() = assigned_to OR auth.uid() = created_by);