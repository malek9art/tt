-- أُطبّق هذا الـmigration على قاعدة البيانات بتاريخ 2026-07-03
-- 1) تحقق صلاحية داخلي في دوال المناديب (كانت قابلة للاستدعاء من أي زائر بدون أي تحقق)
-- 2) إصلاح اسم جدول التدقيق: كانت الدالة تُدرج في audit_logs غير الموجود (الصحيح audit_log)
--    ما كان يُفشل إسناد الشحنات للمناديب
-- 3) سحب EXECUTE من anon/public على الدوال الحساسة
-- 4) تثبيت search_path لدالة cleanup_phone_otps

CREATE OR REPLACE FUNCTION public.assign_shipment_to_driver(_shipment_id uuid, _driver_id uuid, _admin_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _is_active  bool;
  _max_orders int;
  _cur_load   int;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'delivery:manage') THEN
    RETURN jsonb_build_object('error', 'غير مصرح');
  END IF;

  SELECT is_active, max_orders INTO _is_active, _max_orders
  FROM public.drivers WHERE id = _driver_id;

  IF NOT COALESCE(_is_active, false) THEN
    RETURN jsonb_build_object('error', 'المندوب غير نشط');
  END IF;

  SELECT COUNT(*) INTO _cur_load
  FROM public.shipments
  WHERE driver_id = _driver_id
    AND status IN ('assigned','picked_up','out_for_delivery');

  IF _cur_load >= COALESCE(_max_orders, 5) THEN
    RETURN jsonb_build_object(
      'error', 'المندوب وصل للحد الأقصى ' || COALESCE(_max_orders,5)::text || ' طلبات'
    );
  END IF;

  UPDATE public.shipments
  SET driver_id = _driver_id, status = 'assigned',
      assigned_at = now(), updated_at = now()
  WHERE id = _shipment_id;

  UPDATE public.drivers
  SET status = 'busy', last_active_at = now()
  WHERE id = _driver_id;

  UPDATE public.orders o
  SET status = 'out_for_delivery', updated_at = now()
  FROM public.shipments s
  WHERE s.id = _shipment_id AND s.order_id = o.id;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, after)
  VALUES (
    _admin_id, 'UPDATE', 'shipments', _shipment_id::text,
    jsonb_build_object('event', 'assign_driver', 'driver_id', _driver_id)
  );

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.unassign_shipment(_shipment_id uuid, _admin_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _driver_id uuid;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'delivery:manage') THEN
    RETURN jsonb_build_object('error', 'غير مصرح');
  END IF;

  SELECT driver_id INTO _driver_id FROM public.shipments WHERE id = _shipment_id;

  UPDATE public.shipments
  SET driver_id = NULL, status = 'pending', assigned_at = NULL, updated_at = now()
  WHERE id = _shipment_id;

  IF _driver_id IS NOT NULL THEN
    UPDATE public.drivers d
    SET status = CASE
      WHEN (SELECT COUNT(*) FROM public.shipments
            WHERE driver_id = _driver_id
              AND status IN ('assigned','picked_up','out_for_delivery')) > 0
      THEN 'busy' ELSE 'available' END
    WHERE id = _driver_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_driver_account(_email text, _full_name text, _phone text, _password text, _vehicle text DEFAULT 'motorcycle'::text, _zone text DEFAULT 'تعز'::text, _max_orders integer DEFAULT 5)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id        uuid;
  _driver_role_id uuid;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'delivery:manage') THEN
    RETURN jsonb_build_object('error', 'غير مصرح');
  END IF;

  SELECT id INTO _driver_role_id FROM public.roles WHERE name = 'driver';

  SELECT id INTO _user_id FROM auth.users WHERE email = lower(_email);
  IF _user_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'البريد الإلكتروني مستخدم بالفعل');
  END IF;

  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, role, aud
  ) VALUES (
    gen_random_uuid(), lower(_email),
    crypt(_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', _full_name),
    now(), now(), 'authenticated', 'authenticated'
  )
  RETURNING id INTO _user_id;

  UPDATE public.profiles
  SET full_name = _full_name, phone = _phone, status = 'active'
  WHERE id = _user_id;

  INSERT INTO public.drivers (
    id, vehicle_type, coverage_zone, status,
    max_orders, is_active, phone, total_deliveries, joined_at
  ) VALUES (
    _user_id, _vehicle, _zone, 'offline',
    _max_orders, true, _phone, 0, now()
  );

  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (_user_id, _driver_role_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'user_id', _user_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_driver_account(text,text,text,text,text,text,integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.assign_shipment_to_driver(uuid,uuid,uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.unassign_shipment(uuid,uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_drivers_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.has_permission(uuid,text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid,text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_roles() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated, service_role;

ALTER FUNCTION public.cleanup_phone_otps() SET search_path = public;
