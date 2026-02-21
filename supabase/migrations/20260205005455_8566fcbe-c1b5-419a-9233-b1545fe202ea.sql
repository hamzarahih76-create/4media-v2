-- Allow designers to delete their own design tasks
CREATE POLICY "Designers can delete their own design tasks"
ON design_tasks FOR DELETE
USING (auth.uid() = assigned_to OR auth.uid() = created_by);