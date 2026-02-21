
-- Add expense_type to distinguish ADS / daily / fixed
ALTER TABLE public.monthly_expenses
  ADD COLUMN IF NOT EXISTS expense_type text NOT NULL DEFAULT 'fixed';

-- Add expense_date for daily expenses
ALTER TABLE public.monthly_expenses
  ADD COLUMN IF NOT EXISTS expense_date date;

-- Update existing rows to 'fixed' type
UPDATE public.monthly_expenses SET expense_type = 'fixed' WHERE expense_type IS NULL;

-- Migrate old 'publicite' category items to ads type
UPDATE public.monthly_expenses SET expense_type = 'ads' WHERE category = 'publicite';
