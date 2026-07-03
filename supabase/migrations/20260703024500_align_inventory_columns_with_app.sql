-- كل كود التطبيق (الصفحة + مسارات API الخمسة) يستخدم هذه الأسماء
-- بينما الجدول أُنشئ بأسماء مختلفة، فكانت كل استعلامات المخزون تفشل
ALTER TABLE public.inventory RENAME COLUMN reserved_qty TO reserved_quantity;
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS reorder_quantity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS location text;
