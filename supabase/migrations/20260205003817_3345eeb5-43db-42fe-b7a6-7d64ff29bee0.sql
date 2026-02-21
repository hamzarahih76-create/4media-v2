-- Allow designers to read their own design tasks (assigned to them or created by them)
CREATE POLICY "Designers can view their own design tasks"
ON design_tasks FOR SELECT
USING (
  auth.uid() = assigned_to 
  OR auth.uid() = created_by
);

-- Allow designers to create design tasks for themselves
CREATE POLICY "Designers can create their own design tasks"
ON design_tasks FOR INSERT
WITH CHECK (
  auth.uid() = assigned_to 
  AND auth.uid() = created_by
  AND client_type = 'b2c'
);

-- Allow designers to update their own design tasks
CREATE POLICY "Designers can update their own design tasks"
ON design_tasks FOR UPDATE
USING (
  auth.uid() = assigned_to 
  OR auth.uid() = created_by
);