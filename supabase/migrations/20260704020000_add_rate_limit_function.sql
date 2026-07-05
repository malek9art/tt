-- تحصين أمني: لا يوجد أي حد لمعدل الطلبات على /api/auth/forgot (تستدعي
-- listUsers({perPage:1000}) في كل استدعاء — عملية مكلفة قابلة للاستنزاف)،
-- ولا على /api/auth/phone/send من ناحية عدد الأرقام المختلفة من نفس IP
-- (الحد الحالي هناك لكل رقم فقط)، ولا على إنشاء الطلبات /api/orders.
-- جدول+دالة بسيطان لعدّاد نوافذ زمنية ذرّي بدل الاعتماد على ذاكرة العملية
-- (غير موثوقة على Vercel serverless متعدد النسخ).

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count        integer     NOT NULL DEFAULT 0
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- لا سياسات مباشرة — الوصول فقط عبر الدالة أدناه (SECURITY DEFINER)

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
BEGIN
  INSERT INTO rate_limits (key, window_start, count)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    count        = CASE WHEN rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
                         THEN 1 ELSE rate_limits.count + 1 END,
    window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
                         THEN now() ELSE rate_limits.window_start END
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$function$;

COMMENT ON FUNCTION public.check_rate_limit IS
  'عدّاد نافذة زمنية ذرّي لتحديد معدّل الطلبات حسب مفتاح حر (IP، مسار، مستخدم…) — يُعيد false عند تجاوز الحد';

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO anon, authenticated, service_role;
