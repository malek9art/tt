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

const ALLOWED_TYPES = ["manual_wallet", "bank_transfer", "transfer_point"];

export async function GET() {
  const auth = await requireAdmin("settings:read");
  if (auth.error) return auth.error;

  const { data, error } = await sb()
    .from("payment_providers")
    .select("id, code, name, is_active, is_test_mode, display_order, metadata, config")
    .order("display_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ providers: data ?? [] });
}

// POST — add a new manual provider (wallet / bank account / transfer network)
// Body: { name_ar, type, description?, logo_url?, config? }
export async function POST(request: NextRequest) {
  const auth = await requireAdmin("settings:manage");
  if (auth.error) return auth.error;

  const body = await request.json() as {
    name_ar?: string;
    type?: string;
    description?: string;
    logo_url?: string;
    config?: Record<string, string>;
  };

  const nameAr = body.name_ar?.trim();
  if (!nameAr) return NextResponse.json({ error: "اسم وسيلة الدفع مطلوب" }, { status: 400 });
  if (!body.type || !ALLOWED_TYPES.includes(body.type)) {
    return NextResponse.json({ error: "نوع وسيلة الدفع غير صالح" }, { status: 400 });
  }

  // Unique machine code from timestamp (custom providers only)
  const code = `custom_${Date.now().toString(36)}`;
  const confirmation = "manual";

  const { data: maxRow } = await sb()
    .from("payment_providers")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await sb()
    .from("payment_providers")
    .insert({
      code,
      name:          nameAr,
      is_active:     false,
      is_test_mode:  false,
      display_order: (maxRow?.display_order ?? 0) + 1,
      metadata: {
        name_ar:      nameAr,
        description:  body.description ?? "",
        type:         body.type,
        confirmation,
        logo_url:     body.logo_url ?? "",
        custom:       true,
      },
      config: body.config ?? {},
    })
    .select("id, code, name, is_active, is_test_mode, display_order, metadata, config")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
