-- Create team_members table for managing editors/team
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  position TEXT DEFAULT 'Video Editor',
  department TEXT DEFAULT 'Production',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  payment_method TEXT CHECK (payment_method IN ('iban', 'rib', 'paypal', 'other')),
  iban TEXT,
  rate_per_video NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  activated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and PMs can view all team members"
ON public.team_members FOR SELECT
USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Admins and PMs can manage team members"
ON public.team_members FOR ALL
USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Users can view their own team record"
ON public.team_members FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_team_members_status ON public.team_members(status);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);

-- Update trigger for updated_at
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_task_updated_at();