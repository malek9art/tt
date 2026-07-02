import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("orders:read");
  if (auth.error) return auth.error;

  const { id } = await params;

  const [{ data: payment, error }, { data: logs }] = await Promise.all([
    sb()
      .from("payments")
      .select(`
        *,
        orders(id, order_number, total_amount,
          profiles(full_name, phone))
      `)
      .eq("id", id)
      .single(),
    sb()
      .from("payment_logs")
      .select("id, event_type, direction, provider_code, status_code, error_message, created_at")
      .eq("payment_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ payment, logs: logs ?? [] });
}
