-- اكتُشف عبر get_advisors: الدوال الأربع الجديدة كانت قابلة للاستدعاء من
-- anon/authenticated دون قيد — Supabase يضبط default privileges على مخطط
-- public بحيث تُمنح anon/authenticated/service_role صلاحية EXECUTE تلقائياً
-- وبشكل صريح (لا عبر PUBLIC) لأي دالة جديدة، فـ"REVOKE ... FROM PUBLIC"
-- وحدها غير كافية — يجب السحب الصريح من anon/authenticated تحديداً
-- (تحقّقنا عبر pg_proc.proacl قبل وبعد لتأكيد الإصلاح فعلياً).
--
-- adjust_inventory_by_variant وcheck_rate_limit: تُستدعيان فقط من عميل
-- service-role داخلياً (stock.ts وrate-limit.ts) فلا حاجة لمنحهما لأي دور
-- آخر — كان anon قادراً على استدعاء adjust_inventory_by_variant مباشرة عبر
-- REST والتلاعب بالمخزون بأي دلتا يريدها بلا أي تحقق.
-- increment_coupon_uses/release_coupon_use: تُستدعيان من عميل الجلسة
-- العادي في orders/route.ts، فتبقيان لـauthenticated فقط (لا anon).

REVOKE ALL ON FUNCTION public.adjust_inventory_by_variant(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_inventory_by_variant(uuid, integer) TO service_role;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.increment_coupon_uses(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_coupon_uses(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.release_coupon_use(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_coupon_use(uuid) TO authenticated, service_role;
