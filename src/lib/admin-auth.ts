import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies }     from "next/headers";
import { NextResponse } from "next/server";

export async function requireAdmin(permission = "products:read") {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "غير مصرح" }, { status: 401 }), supabase, user: null };

  const { data: ok } = await supabase.rpc("has_permission", { _user_id: user.id, _perm: permission });
  if (!ok) return { error: NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 }), supabase, user: null };

  return { error: null, supabase, user };
}
