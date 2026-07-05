-- تعديل adjust_inventory_by_variant لإعادة reorder_level أيضاً — يُستخدم
-- لتحديد وقت إرسال إشعار "مخزون منخفض/نافد" مباشرة بعد كل خصم بيع فعلي
-- (بدل الاعتماد على عتبة ثابتة في التطبيق لا تراعي عتبة كل منتج).
DROP FUNCTION IF EXISTS public.adjust_inventory_by_variant(uuid, integer);

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
