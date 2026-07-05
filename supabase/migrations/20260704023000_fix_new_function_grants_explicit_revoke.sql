-- المحاولة السابقة (REVOKE ALL ... FROM PUBLIC) لم تكفِ: Supabase يضبط
-- default privileges على مخطط public بحيث تُمنح anon/authenticated EXECUTE
-- تلقائياً وبشكل صريح (لا عبر PUBLIC) لأي دالة جديدة ينشئها دور postgres —
-- فتحقق pg_proc.proacl أثبت بقاء anon/authenticated في القائمة رغم REVOKE
-- FROM PUBLIC. الإصلاح الصحيح: سحب صريح من anon وauthenticated تحديداً.

REVOKE ALL ON FUNCTION public.adjust_inventory_by_variant(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_inventory_by_variant(uuid, integer) TO service_role;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.increment_coupon_uses(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_coupon_uses(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.release_coupon_use(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_coupon_use(uuid) TO authenticated, service_role;
