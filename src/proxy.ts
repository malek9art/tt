import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { fetchUserPermissions } from "@/lib/admin/permission-tabs";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // صفحة دخول الإدارة عامة
  if (pathname === "/admin/login") {
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

    // التحقق من الصلاحيات — أي صلاحية فعلية واحدة تكفي (موظف بتبويب واحد
    // فقط، مثل محاسب أو دعم بلا products:read، يجب ألا يُسجَّل خروجه هنا
    // بعد أن سمحت له شاشة الدخول بالدخول أصلاً)
    const permissions = await fetchUserPermissions(supabase, user.id);
    if (permissions.size === 0) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL("/admin/login?error=unauthorized", request.url)
      );
    }

    return response;
  }

  return response;
}

// يعمل فقط على المسارات المحمية — الصفحات العامة (الرئيسية، المنتجات، السلة…)
// لا تمر عبر أي تحقق شبكي، ومسارات API تتحقق من الصلاحيات بنفسها
export const config = {
  matcher: ["/account/:path*", "/checkout", "/admin/:path*"],
};
