-- يعالج سباقين حقيقيين (TOCTOU) مؤكَّدين من فحص شامل للمتجر:
-- 1) خصم/إرجاع المخزون في src/lib/admin/stock.ts كان قراءة ثم كتابة في
--    خطوتين منفصلتين من التطبيق — طلبان متزامنان على نفس المتغيّر قد
--    يفقدان أحد التحديثين (lost update). الدالة أدناه تقفل الصف (FOR UPDATE)
--    وتحدّثه ذرّياً داخل استدعاء واحد.
-- 2) src/app/api/orders/route.ts كان يستدعي increment_coupon_uses وهي
--    غير موجودة إطلاقاً في القاعدة (تحقّقنا مباشرة عبر pg_proc) — أي أن
--    حد الاستخدام الأقصى للكوبونات لم يكن مُطبَّقاً إطلاقاً. الدالة الجديدة
--    ذرّية (شرط current_uses < max_uses ضمن نفس UPDATE).

CREATE OR REPLACE FUNCTION public.adjust_inventory_by_variant(p_variant_id uuid, p_delta integer)
 RETURNS TABLE(inventory_id uuid, quantity_before integer, quantity_after integer, reorder_level integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id     uuid;
  v_before int;
  v_after  int;
  v_reorder int;
BEGIN
  SELECT id, quantity, inventory.reorder_level INTO v_id, v_before, v_reorder
  FROM inventory
  WHERE variant_id = p_variant_id
  ORDER BY updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_id IS NULL THEN
    RETURN;
  END IF;

  v_after := GREATEST(0, v_before + p_delta);

  UPDATE inventory SET quantity = v_after, updated_at = now() WHERE id = v_id;

  inventory_id     := v_id;
  quantity_before  := v_before;
  quantity_after   := v_after;
  reorder_level    := v_reorder;
  RETURN NEXT;
END;
$function$;

COMMENT ON FUNCTION public.adjust_inventory_by_variant IS
  'خصم/إرجاع ذرّي لكمية المخزون حسب variant_id — يقفل الصف لمنع فقدان تحديثات عند تزامن بيعتين على نفس المتغيّر';

GRANT EXECUTE ON FUNCTION public.adjust_inventory_by_variant(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.increment_coupon_uses(p_coupon_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ok boolean := false;
BEGIN
  UPDATE coupons
  SET current_uses = current_uses + 1
  WHERE id = p_coupon_id
    AND is_active
    AND (max_uses IS NULL OR current_uses < max_uses)
  RETURNING true INTO v_ok;

  RETURN COALESCE(v_ok, false);
END;
$function$;

COMMENT ON FUNCTION public.increment_coupon_uses IS
  'زيادة ذرّية لعداد استخدام الكوبون بشرط عدم تجاوز max_uses — تُعيد false إن كان الكوبون استُنفد أو أُلغي بين التحقق والتنفيذ';

GRANT EXECUTE ON FUNCTION public.increment_coupon_uses(uuid) TO authenticated, service_role;
