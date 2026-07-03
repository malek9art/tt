-- المرحلة 2: قيمة QR مخصصة اختيارية لنقطة الدفع (تحل محل الهاتف في الرمز عند الحاجة)
ALTER TABLE public.transfer_points
  ADD COLUMN IF NOT EXISTS qr_value text;
