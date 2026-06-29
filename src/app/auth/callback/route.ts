import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code        = searchParams.get("code");
  const type        = searchParams.get("type");
  const redirectTo  = searchParams.get("redirectTo") ?? "/";
  const errorParam  = searchParams.get("error");
  const errorDesc   = searchParams.get("error_description");

  // خطأ من Supabase مباشرة
  if (errorParam) {
    const msg = encodeURIComponent(errorDesc ?? errorParam);
    return NextResponse.redirect(
      new URL(`/login?error=${msg}`, origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", origin)
    );
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs: { name: string; value: string; options: CookieOptions }[]) {
            try {
              cs.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch { /* Server Components */ }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session) {
      console.error("Auth callback error:", error?.message);
      return NextResponse.redirect(
        new URL("/login?error=expired_link", origin)
      );
    }

    // تحديد الوجهة
    const dest = type === "admin"
      ? "/admin"
      : decodeURIComponent(redirectTo);

    return NextResponse.redirect(new URL(dest, origin));

  } catch (err) {
    console.error("Auth callback exception:", err);
    return NextResponse.redirect(
      new URL("/login?error=server_error", origin)
    );
  }
}
