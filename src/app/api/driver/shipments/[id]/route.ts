import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getDriverSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs: { name: string; value: string; options: CookieOptions }[]) {
          try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* */ }
        },
      },
    }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getDriverSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;

  // التحقق من أن المندوب هو صاحب الشحنة
  const { data: shipment } = await supabase
    .from("shipments")
    .select("driver_id, status")
    .eq("id", id)
    .single();

  if (!shipment || shipment.driver_id !== user.id) {
    return NextResponse.json({ error: "غير مصرح لهذه الشحنة" }, { status: 403 });
  }

  const body = await request.json();
  const { status, carrier_notes, proof_photo_url } = body;

  const VALID_STATUSES = ["picked_up","out_for_delivery","delivered","failed","returned"];
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
  }

  const updates: Record<string,unknown> = { status, carrier_notes: carrier_notes || null };
  const now = new Date().toISOString();
  if (status === "picked_up")        updates.picked_up_at = now;
  if (status === "delivered")        updates.delivered_at = now;
  if (proof_photo_url)               updates.proof_photo_url = proof_photo_url;

  const { error: dbErr } = await supabase
    .from("shipments").update(updates).eq("id", id);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ success: true, status });
}
