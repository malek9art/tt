-- تحصين أمني: كل واجهات الرفع تكتب مباشرة إلى Supabase Storage من المتصفح
-- بفحص MIME من جهة العميل فقط (قابل للتزييف بالكامل عبر تعديل الطلب). أغلب
-- الحاويات (products، assets، private) مضبوطة أصلاً بقيود mimetype/size على
-- مستوى الحاوية نفسها — الاستثناءان الوحيدان بلا أي قيد كانا
-- payment-receipts (تُستخدم من ReceiptAttach.tsx وصفحة المدفوعات) وpayment-logos
-- (شعارات وسائل الدفع/نقاط التحويل)، فيُطبَّق التحقق هنا لأول مرة.
UPDATE storage.buckets
SET file_size_limit = 10485760, -- 10MB
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','application/pdf']
WHERE id = 'payment-receipts';

UPDATE storage.buckets
SET file_size_limit = 2097152, -- 2MB
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']
WHERE id = 'payment-logos';
