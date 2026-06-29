import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // ===== استثناءات: لا تحتاج تحقق =====
  const publicPaths = [
    "/admin/login",
    "/login",
    "/register",
    "/auth/callback",
    "/",
  ];

  // المسارات العامة تمر مباشرة
  if (publicPaths.some(p => pathname === p || pathname.startsWith("/products"))) {
    return response;
  }

  // إنشاء Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cs: { name: string; value: string; options: CookieOptions }[]) {
          cs.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // ===== حماية صفحات العملاء =====
  if (pathname.startsWith("/account") || pathname.startsWith("/checkout")) {
    if (!user) {
      const url = new URL("/login", request.url);
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // ===== حماية لوحة الإدارة =====
  // /admin/login مُستثنى في الأعلى
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // التحقق من صلاحيات الإدارة
    const { data: isAdmin } = await supabase.rpc("has_permission", {
      _user_id: user.id,
      _perm: "products:read",
    });

    if (!isAdmin) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL("/admin/login?error=unauthorized", request.url)
      );
    }

    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
