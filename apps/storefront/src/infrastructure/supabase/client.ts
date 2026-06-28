/**
 * Supabase Client Factory — @supabase/ssr
 * ثلاثة clients: Browser / Server / Middleware
 * المفتاح service_role في الخادم فقط — لا يصل المتصفح أبداً
 */
import { createBrowserClient }  from "@supabase/ssr";
import { createServerClient }   from "@supabase/ssr";
import { cookies }               from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { Database }         from "@ahmadi/lib/types/database.types";

// ===== Browser Client (Client Components) =====
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ===== Server Client (Server Components / Route Handlers) =====
export async function createServerComponentClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // يحدث في Server Components — مقبول
          }
        },
      },
    }
  );
}

// ===== Admin Client (service_role — Edge Functions فقط) =====
// ⚠️ هذا الـ client يتجاوز RLS — استخدمه بحذر شديد
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "⛔ createAdminClient لا يُستخدم في المتصفح أبداً. استخدمه في Edge Functions فقط."
    );
  }
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ===== Middleware Client =====
export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );
}
