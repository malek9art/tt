import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";
import { setStaffTabs } from "@/lib/admin/staff";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// PATCH — تحديث التبويبات الممنوحة لموظف موجود
// Body: { tabs: string[] }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin("users:manage");
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { tabs?: string[] };

  await setStaffTabs(svc(), id, body.tabs ?? []);
  return NextResponse.json({ success: true });
}
