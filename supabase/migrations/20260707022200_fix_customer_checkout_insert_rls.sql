-- خطأ إنتاجي حرج: لا توجد أي سياسة INSERT تسمح للعميل بالكتابة في
-- order_items/payments/shipments لطلبه الخاص (فقط SELECT للعميل، وALL
-- للموظفين). orders_customer_insert تسمح بإنشاء صف الطلب نفسه، لكن
-- الخطوة التالية مباشرة (حفظ عناصر الطلب في src/app/api/orders/route.ts)
-- تفشل حتماً بسبب غياب هذه السياسة — أي أن أي عميل حقيقي يحاول إتمام
-- طلب يفشل في هذه المرحلة، تاركاً طلباً فارغاً عالقاً (فشل rollback
-- أيضاً لنفس السبب — انظر migration التالية لإصلاح ذلك).
-- تأكيد فعلي: 3 من آخر 4 طلبات حقيقية في قاعدة البيانات موجودة بلا أي
-- عناصر (order_items فارغ تماماً) بسبب هذا الخلل بالضبط.

CREATE POLICY order_items_customer_insert ON public.order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.customer_id = auth.uid())
  );

CREATE POLICY payments_customer_insert ON public.payments
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = payments.order_id AND o.customer_id = auth.uid())
  );

CREATE POLICY shipments_customer_insert ON public.shipments
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = shipments.order_id AND o.customer_id = auth.uid())
  );
