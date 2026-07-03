-- سجل حركات المخزون — كل تغيير كمية له تاريخ ونوع وسبب ومنفّذ ومرجع
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id      uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name    text,                          -- لقطة تبقى بعد حذف المنتج
  movement_type   text NOT NULL CHECK (movement_type IN
    ('add','deduct','sale','return','damage','transfer','adjust','initial')),
  quantity        integer NOT NULL,              -- موجب دائماً — الاتجاه من النوع
  quantity_before integer,
  quantity_after  integer,
  reason          text,
  reference_type  text,                          -- order | manual | import | quick_add
  reference_id    text,
  created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_movements_variant ON public.inventory_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_created ON public.inventory_movements(created_at DESC);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY inv_movements_staff_read ON public.inventory_movements
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'inventory:read'));

CREATE POLICY inv_movements_admin_insert ON public.inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'inventory:manage'));

-- لا حذف ولا تعديل — السجل دفتر قيد دائم
