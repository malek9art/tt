-- رسوم شحن مرنة حسب محافظة العميل × فئة المنتج بدل الرسم الثابت المُبرمَج
-- يدوياً في api/orders/route.ts. category_id = NULL يعني "كل الفئات" لتلك
-- المحافظة (قاعدة احتياطية قبل القيمة الافتراضية الثابتة في الكود).
CREATE TABLE public.shipping_rules (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  governorate   text NOT NULL,
  category_id   uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  fee           integer NOT NULL CHECK (fee >= 0),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (governorate, category_id)
);

ALTER TABLE public.shipping_rules ENABLE ROW LEVEL SECURITY;

-- إدارة كاملة (قراءة+كتابة) لمن يملك settings:manage — بنفس نمط جدول settings
CREATE POLICY shipping_rules_admin_manage ON public.shipping_rules
  FOR ALL
  USING (has_permission(auth.uid(), 'settings:manage'::text));

-- قراءة لمن يملك settings:read فقط (بدون كتابة) — بنفس نمط settings_staff_read
CREATE POLICY shipping_rules_staff_read ON public.shipping_rules
  FOR SELECT
  USING (has_permission(auth.uid(), 'settings:read'::text));

-- الخادم (route.ts) يحسب الشحن بعميل الجلسة العادي للعميل — لذا يحتاج قراءة
-- عامة للقواعد الفعّالة فقط (لا كتابة)، تماماً كقراءة المنتجات/الفئات
-- العامة الأخرى المستخدمة في نفس المسار.
CREATE POLICY shipping_rules_public_read ON public.shipping_rules
  FOR SELECT
  USING (is_active = true);
