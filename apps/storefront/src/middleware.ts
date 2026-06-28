import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/infrastructure/supabase/client";

/**
 * مسارات تتطلب تسجيل دخول
 */
const PROTECTED_ROUTES = [
  "/account",
  "/checkout",
  "/orders",
];

/**
 * مسارات لا يراها المستخدم المسجّل (login/register)
 */
const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, response);

  // تحديث الجلسة (ضروري مع @supabase/ssr)
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // إذا المسار محمي والمستخدم غير مسجّل → توجيه لصفحة الدخول
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // إذا المستخدم مسجّل وحاول الوصول لـ login/register → الرئيسية
  const isAuthRoute = AUTH_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * تجاهل:
     * - _next/static
     * - _next/image
     * - favicon.ico
     * - ملفات الأصول
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
