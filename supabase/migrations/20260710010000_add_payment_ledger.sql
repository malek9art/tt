-- دفتر أستاذ لتأكيدات المدفوعات اليدوية (محفظة/تحويل بنكي/نقاط تحويل) —
-- منفصل عن driver_cash_ledger (عهدة نقدية للمندوب COD فقط). سجل ثابت
-- بلا رصيد منفصل، بنفس روح driver_cash_ledger.
CREATE TABLE public.payment_ledger (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id            uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  order_id              uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider_code         text NOT NULL,
  method_name_snapshot  text,
  amount                numeric NOT NULL,
  receipt_url           text,
  confirmed_by          uuid REFERENCES auth.users(id),
  note                  text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payment_ledger_order_idx ON public.payment_ledger(order_id, created_at);

ALTER TABLE public.payment_ledger ENABLE ROW LEVEL SECURITY;

-- قراءة فقط لمن يملك finance:read — الإدراج حصراً من كود الخادم
-- (PaymentGateway.confirmManual عبر عميل service-role، يتجاوز RLS)
CREATE POLICY payment_ledger_staff_read ON public.payment_ledger
  FOR SELECT
  USING (has_permission(auth.uid(), 'finance:read'::text));
