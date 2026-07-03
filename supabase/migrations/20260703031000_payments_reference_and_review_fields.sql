-- طبقة الدفع الموحّدة — المرحلة 1:
-- مرجع دفع فريد لكل عملية + المبلغ المدفوع فعلاً + ملاحظة المراجعة للعميل
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS reference_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS paid_amount numeric,
  ADD COLUMN IF NOT EXISTS review_note text;
