-- اكتُشف أثناء فحص شامل للمتجر:
-- 1) payments_staff_manage كانت تشترط orders:manage فقط، بينما مسارات API
--    الدفع تحوّلت في جلسة سابقة لاستخدام finance:manage/finance:read لتمكين
--    دور "محاسب" (لا يملك orders:manage) من معالجة الدفعات. غير مؤثر حالياً
--    لأن التعديلات تمر عبر عميل service-role يتجاوز RLS، لكنه فخ كامن لو
--    استُخدم يوماً عميل الجلسة العادي مباشرة على هذا الجدول.
-- 2) payment_logs_admin_read تتحقق من عضوية دور نصية `manager` غير موجود
--    أصلاً في نظام الأدوار الحالي (خُلِّف عن مرحلة قبل نظام الصلاحيات
--    الدقيقة)، ما يمنع أي موظف "محاسب" من قراءة سجلات الدفع رغم امتلاكه
--    صلاحية finance:read الفعلية.

DROP POLICY IF EXISTS payments_staff_manage ON public.payments;
CREATE POLICY payments_staff_manage ON public.payments
  FOR ALL
  USING (has_permission(auth.uid(), 'orders:manage') OR has_permission(auth.uid(), 'finance:manage'));

DROP POLICY IF EXISTS payment_logs_admin_read ON public.payment_logs;
CREATE POLICY payment_logs_admin_read ON public.payment_logs
  FOR SELECT
  USING (has_permission(auth.uid(), 'finance:read') OR has_permission(auth.uid(), 'finance:manage'));
