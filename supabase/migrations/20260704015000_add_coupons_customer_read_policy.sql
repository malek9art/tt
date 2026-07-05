-- اكتُشف أثناء إصلاح منطق الكوبونات في checkout: لا توجد أي سياسة RLS تسمح
-- لعميل عادي بقراءة صف كوبون نشط بواسطة الكود — السياسة الوحيدة الموجودة
-- (coupons_admin_manage) تشترط marketing:manage. أي أن أي عميل يكتب كود
-- كوبون صحيح عند الدفع كان يحصل على صف فارغ (RLS تصفّيه بصمت، لا خطأ ظاهر)
-- ولا يُطبَّق الخصم إطلاقاً — بغضّ النظر عن إصلاح أسماء الأعمدة الأخرى.
CREATE POLICY coupons_customer_read_active ON public.coupons
  FOR SELECT
  TO authenticated
  USING (is_active = true);
