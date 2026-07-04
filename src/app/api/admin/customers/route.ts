import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const { error, supabase } = await requireAdmin("users:read");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page   = Number(searchParams.get("page")  ?? 1);
  const limit  = Number(searchParams.get("limit") ?? 20);
  const search = searchParams.get("search");
  const from   = (page - 1) * limit;

  let query = supabase
    .from("profiles")
    .select("id, full_name, phone, created_at, email:id", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (search) query = query.ilike("full_name", `%${search}%`);

  const { data, count, error: dbErr } = await query;
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ customers: data ?? [], total: count ?? 0 });
}
