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

export async function GET() {
  const auth = await requireAdmin("settings:read");
  if (auth.error) return auth.error;

  const { data, error } = await sb()
    .from("transfer_points")
    .select("*")
    .order("display_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ points: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin("settings:manage");
  if (auth.error) return auth.error;

  const body = await request.json() as {
    provider_code: string; label: string; phone: string;
    account_name?: string; notes?: string; display_order?: number;
    icon_url?: string;
  };

  if (!body.provider_code || !body.label || !body.phone) {
    return NextResponse.json({ error: "الحقول الإلزامية ناقصة" }, { status: 400 });
  }

  const { data, error } = await sb()
    .from("transfer_points")
    .insert({
      provider_code: body.provider_code,
      label:         body.label,
      phone:         body.phone,
      account_name:  body.account_name ?? null,
      notes:         body.notes ?? null,
      icon_url:      body.icon_url ?? null,
      display_order: body.display_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ point: data }, { status: 201 });
}
