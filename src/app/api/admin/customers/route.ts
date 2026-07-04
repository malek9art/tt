import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";
import { getPureCustomerIds } from "@/lib/admin/customers";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// GET — قائمة العملاء فقط (بلا موظفين/مناديب)، ببريد حقيقي من auth.users،
// وترقيم صفحات وبحث فعليين
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin("users:read");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page   = Number(searchParams.get("page")  ?? 1);
  const limit  = Number(searchParams.get("limit") ?? 20);
  const search = searchParams.get("search");
  const from   = (page - 1) * limit;

  const client = svc();
  const customerIds = await getPureCustomerIds();
  if (customerIds.size === 0) {
    return NextResponse.json({ customers: [], total: 0 });
  }

  let query = client
    .from("profiles")
    .select("id, full_name, phone, created_at", { count: "exact" })
    .in("id", Array.from(customerIds))
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (search) query = query.ilike("full_name", `%${search}%`);

  const { data, count, error: dbErr } = await query;
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // البريد الحقيقي في auth.users — profiles لا يحتوي عمود بريد إطلاقاً
  const { data: authList } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailMap = new Map((authList?.users ?? []).map(u => [u.id, u.email ?? ""]));

  const customers = (data ?? []).map(p => ({ ...p, email: emailMap.get(p.id) ?? "" }));

  return NextResponse.json({ customers, total: count ?? 0 });
}
