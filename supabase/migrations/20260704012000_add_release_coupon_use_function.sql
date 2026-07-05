-- دالة مرافقة لـ increment_coupon_uses — تُستخدم عند التراجع عن طلب حجز
-- كوبون فشل إتمامه لاحقاً (مثل فشل إدراج عناصر الطلب أو الدفعة)، حتى لا
-- يُستهلك عدّاد الكوبون فعلياً بلا طلب ناجح فعلي.
CREATE OR REPLACE FUNCTION public.release_coupon_use(p_coupon_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE coupons
  SET current_uses = GREATEST(0, current_uses - 1)
  WHERE id = p_coupon_id;
END;
$function$;

COMMENT ON FUNCTION public.release_coupon_use IS
  'يُعيد عدّاد استخدام الكوبون خطوة للخلف عند التراجع عن طلب لم يكتمل بعد حجز الكوبون له';

GRANT EXECUTE ON FUNCTION public.release_coupon_use(uuid) TO authenticated, service_role;
