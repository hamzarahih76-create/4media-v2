-- 1. Add 'designer' role to app_role enum (separate transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'designer';