-- إضافة الرصيد النقدي المتراكم (عهدة الدفع عند الاستلام) لدالة إحصاء
-- المناديب، لعرضه في قائمة /admin/drivers بدون فتح كل مندوب على حدة.
-- DROP مطلوب لأن تغيير شكل صف RETURNS TABLE غير مسموح عبر CREATE OR REPLACE.
DROP FUNCTION public.get_drivers_stats();

CREATE FUNCTION public.get_drivers_stats()
RETURNS TABLE(
  driver_id uuid, full_name text, email text, phone text, vehicle_type text,
  coverage_zone text, status text, is_active boolean, max_orders integer,
  active_shipments bigint, total_deliveries integer, monthly_deliveries bigint,
  completion_rate numeric, rating numeric, joined_at timestamptz,
  last_active_at timestamptz, cash_balance numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    d.id,
    p.full_name,
    au.email,
    COALESCE(d.phone, p.phone),
    d.vehicle_type,
    d.coverage_zone,
    d.status::text,
    d.is_active,
    d.max_orders,
    COUNT(CASE WHEN s.status IN ('assigned','picked_up','out_for_delivery') THEN 1 END),
    d.total_deliveries,
    COUNT(CASE WHEN s.assigned_at >= date_trunc('month', now()) THEN 1 END),
    ROUND(CASE WHEN COUNT(s.id) > 0
      THEN COUNT(CASE WHEN s.status = 'delivered' THEN 1 END) * 100.0 / COUNT(s.id)
      ELSE 0 END, 1),
    d.rating,
    d.joined_at,
    d.last_active_at,
    COALESCE((SELECT SUM(l.amount) FROM public.driver_cash_ledger l WHERE l.driver_id = d.id), 0)
  FROM public.drivers d
  JOIN public.profiles p  ON p.id  = d.id
  JOIN auth.users     au ON au.id = d.id
  LEFT JOIN public.shipments s ON s.driver_id = d.id
  GROUP BY d.id, p.full_name, au.email, d.phone, p.phone,
           d.vehicle_type, d.coverage_zone, d.status, d.is_active,
           d.max_orders, d.total_deliveries, d.rating, d.joined_at, d.last_active_at
  ORDER BY d.is_active DESC, d.joined_at DESC;
$function$;

-- DROP FUNCTION يمسح المِنَح السابقة — يجب إعادة ضبطها صراحةً (نفس درس
-- lock_down_new_function_grants: anon يُمنح EXECUTE تلقائياً وإلا سُحب)
REVOKE ALL ON FUNCTION public.get_drivers_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_drivers_stats() TO authenticated, service_role;
