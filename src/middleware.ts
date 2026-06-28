import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED = ["/account", "/checkout", "/orders"];
const AUTH_ONLY = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cs) { cs.forEach(({name,value,options})=>response.cookies.set(name,value,options)); },
    }}
  );
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (PROTECTED.some(r => pathname.startsWith(r)) && !user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }
  if (AUTH_ONLY.some(r => pathname.startsWith(r)) && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
