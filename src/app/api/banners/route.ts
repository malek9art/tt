import { NextResponse } from "next/server";
import { createSupabaseServer as createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("banners")
    .select("id, title, subtitle, image_url, link_url, link_label, badge_text, sort_order")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ banners: data ?? [] });
}
