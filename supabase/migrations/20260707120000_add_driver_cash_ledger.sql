-- دفتر أستاذ كامل لعهدة المندوب النقدية (تحصيلات الدفع عند الاستلام)
-- الرصيد المتراكم = SUM(amount) وقت القراءة، بدون عمود رصيد منفصل لتفادي
-- تعارض التزامن بين حركة تحصيل وتسوية متزامنتين.
CREATE TABLE public.driver_cash_ledger (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id     uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  entry_type    text NOT NULL CHECK (entry_type IN ('collection', 'settlement', 'adjustment')),
  amount        numeric NOT NULL, -- موجب = تحصيل (يزيد العهدة)، سالب = تسوية/تسليم للصندوق
  order_id      uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  shipment_id   uuid REFERENCES public.shipments(id) ON DELETE SET NULL,
  settled_by    uuid REFERENCES auth.users(id),
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX driver_cash_ledger_driver_idx ON public.driver_cash_ledger(driver_id, created_at);

ALTER TABLE public.driver_cash_ledger ENABLE ROW LEVEL SECURITY;

-- المندوب يقرأ حركاته الخاصة فقط (بلا كتابة — التحصيل يُسجَّل من كود
-- الخادم بعميل service-role فقط، والتسوية عبر RPC أدناه)
CREATE POLICY driver_cash_ledger_own_select ON public.driver_cash_ledger
  FOR SELECT
  USING (driver_id = auth.uid());

-- الإدارة (finance:read) تقرأ كل الحركات
CREATE POLICY driver_cash_ledger_staff_read ON public.driver_cash_ledger
  FOR SELECT
  USING (has_permission(auth.uid(), 'finance:read'::text));

-- RPC تسوية رصيد المندوب — SECURITY DEFINER بفحص صلاحية finance:manage،
-- بنفس نمط assign_shipment_to_driver. يُدرج حركة تسوية سالبة بمقدار
-- الرصيد الحالي بالكامل (تسليم كل العهدة للصندوق دفعة واحدة).
CREATE FUNCTION public.settle_driver_cash(_driver_id uuid, _admin_id uuid, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _balance numeric;
BEGIN
  IF NOT public.has_permission(_admin_id, 'finance:manage') THEN
    RETURN jsonb_build_object('error', 'غير مصرح');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO _balance
  FROM public.driver_cash_ledger WHERE driver_id = _driver_id;

  IF _balance <= 0 THEN
    RETURN jsonb_build_object('error', 'لا يوجد رصيد نقدي لتسويته');
  END IF;

  INSERT INTO public.driver_cash_ledger (driver_id, entry_type, amount, settled_by, note)
  VALUES (_driver_id, 'settlement', -_balance, _admin_id, _note);

  RETURN jsonb_build_object('success', true, 'settled_amount', _balance);
END;
$$;

-- REVOKE الصريح من anon ضروري — Supabase يمنح anon/authenticated تنفيذ أي
-- دالة جديدة بشكل صريح تلقائياً (وليس عبر PUBLIC)، فـ"FROM PUBLIC" وحدها
-- غير كافية لمنع anon من استدعائها (نفس الدرس من lock_down_new_function_grants)
REVOKE ALL ON FUNCTION public.settle_driver_cash(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_driver_cash(uuid, uuid, text) TO authenticated, service_role;
