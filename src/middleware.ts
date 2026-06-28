import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PROTECTED  = ["/account", "/checkout", "/orders"];
const AUTH_ONLY  = ["/login", "/register"];
const ADMIN_ONLY = ["/admin"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cs: { name: string; value: string; options: CookieOptions }[]) {
          cs.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // حماية صفحات العملاء
  if (PROTECTED.some(r => pathname.startsWith(r)) && !user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // إعادة توجيه المسجّلين
  if (AUTH_ONLY.some(r => pathname.startsWith(r)) && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // حماية لوحة الإدارة
  if (ADMIN_ONLY.some(r => pathname.startsWith(r))) {
    if (pathname === "/admin/login") return response;

    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const { data: isAdmin } = await supabase.rpc("has_permission", {
      _user_id: user.id,
      _perm: "products:read",
    });

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/admin/login?error=unauthorized", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};