-- إضافة إمكانية تعطيل "الدفع عند الاستلام" لمنتج معيّن (منتجات ذات قيمة
-- عالية أو طلب خاص قد لا ترغب الإدارة بقبول COD لها). الافتراضي true
-- حفاظاً على السلوك الحالي لكل المنتجات الموجودة.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cod_eligible boolean NOT NULL DEFAULT true;
