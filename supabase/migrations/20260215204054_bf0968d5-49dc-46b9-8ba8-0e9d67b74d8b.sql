
-- Table for client payments (encaissements)
CREATE TABLE public.client_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and PMs can manage client payments"
  ON public.client_payments FOR ALL
  USING (is_admin_or_pm(auth.uid()));

-- Table for monthly expenses (charges)
CREATE TABLE public.monthly_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month DATE NOT NULL, -- first of month
  category TEXT NOT NULL, -- 'salaires', 'outils', 'publicite', 'freelancers', 'autres'
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and PMs can manage monthly expenses"
  ON public.monthly_expenses FOR ALL
  USING (is_admin_or_pm(auth.uid()));

-- Enable realtime for payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_expenses;
