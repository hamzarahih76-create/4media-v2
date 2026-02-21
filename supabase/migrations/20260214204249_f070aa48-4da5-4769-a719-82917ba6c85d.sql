
-- Add editor_id column to client_rushes to tag rushes to specific editors
ALTER TABLE public.client_rushes ADD COLUMN editor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_client_rushes_editor_id ON public.client_rushes(editor_id);
