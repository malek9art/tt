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
    .from("shipping_rules")
    .select("id, governorate, category_id, fee, is_active, categories(name_ar)")
    .order("governorate");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin("settings:manage");
  if (auth.error) return auth.error;

  const body = await request.json() as {
    governorate?: string;
    category_id?: string | null;
    fee?: number;
  };

  if (!body.governorate?.trim()) return NextResponse.json({ error: "المحافظة مطلوبة" }, { status: 400 });
  if (body.fee == null || body.fee < 0) return NextResponse.json({ error: "رسم الشحن غير صالح" }, { status: 400 });

  const { data, error } = await sb()
    .from("shipping_rules")
    .insert({
      governorate: body.governorate.trim(),
      category_id: body.category_id || null,
      fee:         body.fee,
    })
    .select("id, governorate, category_id, fee, is_active")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "توجد قاعدة بنفس المحافظة والفئة مسبقاً" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
