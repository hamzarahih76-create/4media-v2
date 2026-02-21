
-- 1. Add 'copywriter' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'copywriter';

-- 2. Add 'access_copywriter' to the permission_type enum
ALTER TYPE public.permission_type ADD VALUE IF NOT EXISTS 'access_copywriter';
