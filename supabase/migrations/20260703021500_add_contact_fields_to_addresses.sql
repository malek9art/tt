-- التطبيق يحفظ الاسم والهاتف مع كل عنوان لكن الجدول لم يكن يملك العمودين —
-- ما كان يُفشل حفظ العناوين كلياً في صفحة الحساب وصفحة الدفع.
-- (geo_lat / geo_lng موجودان مسبقاً وتستخدمهما ميزة الخريطة)
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text;
