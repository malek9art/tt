-- اكتشاف أثناء فحص شامل: enum payment_status الفعلي في القاعدة يحوي فقط
-- (pending, paid, failed, refunded, partial_refund) بينما كل من
-- manual-wallet.ts وtransfer-points.ts يضبطان الحالة على
-- "awaiting_confirmation" (الحالة الطبيعية لأي تحويل بنكي/محفظة بانتظار
-- مراجعة الأدمن)، وgateway.ts's sweepExpired() يضبطها على "expired" —
-- كلتا القيمتين غير موجودتين في enum القاعدة، فكل تحديث حالة كهذا كان
-- يفشل بصمت (الخطأ غير مُتحقَّق منه في الكود) ويبقي الدفعة عالقة على
-- "pending" مهما فعل العميل أو مهما مرّ من وقت على الموعد النهائي.
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'awaiting_confirmation';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'expired';
