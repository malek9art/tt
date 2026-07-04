-- إصلاح حرج: تعطّل واجهة العميل بالكامل (لا منتجات/بنر/إعدادات للزوّار).
-- السبب: تحصين الدفع سحب EXECUTE على has_permission/has_role من anon، بينما
-- سياسات RLS على جداول عامة كثيرة تستدعيهما (مباشرة أو عبر user_roles/roles).
-- فيفشل تقييم RLS لأي زائر غير مسجّل ولا يُعرض أي صف.

-- 1) قصر سياسات الإدارة/الموظفين على authenticated فلا يقيّمها الزائر أصلاً
ALTER POLICY products_admin_manage    ON public.products         TO authenticated;
ALTER POLICY products_staff_read_all  ON public.products         TO authenticated;
ALTER POLICY variants_admin_manage    ON public.product_variants TO authenticated;
ALTER POLICY images_admin_manage      ON public.product_images   TO authenticated;
ALTER POLICY inventory_admin_manage   ON public.inventory        TO authenticated;
ALTER POLICY inventory_staff_read     ON public.inventory        TO authenticated;
ALTER POLICY categories_admin_manage  ON public.categories       TO authenticated;
ALTER POLICY brands_admin_manage      ON public.brands           TO authenticated;
ALTER POLICY banners_admin_all        ON public.banners          TO authenticated;

-- 2) إعادة EXECUTE لدالتي فحص الصلاحيات (تُرجعان قيمة منطقية فقط) إلى anon —
--    لازم لتقييم RLS في بقية المسارات العامة (settings, orders/تتبع…).
--    الدوال الخطرة (create_driver_account/assign_shipment…) تبقى محظورة على anon.
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO anon;
