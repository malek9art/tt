-- سجل بسيط لأخطاء مزوّدي الخدمات الخارجية (واتساب، بريد، إلخ) القابلة للفحص
-- من لوحة الإدارة دون الحاجة للوصول لسجلات Vercel/Supabase مباشرة.
create table if not exists public.provider_errors (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null,           -- مثال: 'fonnte', 'meta', 'supabase_auth'
  context     text not null,           -- مثال: 'phone_otp_send', 'email_signup'
  identifier  text,                    -- الرقم/البريد المرتبط بالمحاولة (بدون بيانات حساسة أخرى)
  error       text not null,           -- رسالة الخطأ الفعلية من المزوّد
  created_at  timestamptz not null default now()
);

alter table public.provider_errors enable row level security;

-- service_role فقط (الخادم) يكتب ويقرأ — لا وصول مباشر من العميل
create policy provider_errors_service_all
  on public.provider_errors
  for all
  to service_role
  using (true)
  with check (true);

-- المسؤولون الذين يملكون صلاحية عرض النظام يمكنهم القراءة من لوحة الإدارة
create policy provider_errors_admin_read
  on public.provider_errors
  for select
  to authenticated
  using (has_permission(auth.uid(), 'users:manage'));

create index if not exists idx_provider_errors_created_at on public.provider_errors (created_at desc);
