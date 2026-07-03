-- واجهة المتجر تحتاج قراءة الكمية لعرض حالة التوفر (متوفر/محدود/نفد)
-- القراءة فقط — الكتابة تبقى حكراً على الإدارة وservice_role
CREATE POLICY inventory_public_read ON public.inventory
  FOR SELECT TO anon, authenticated
  USING (true);
