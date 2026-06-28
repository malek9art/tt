import { Suspense } from "react";
import LoginForm from "./LoginForm";
export const metadata = { title: "تسجيل الدخول" };
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]"><div className="skeleton h-96 w-full max-w-md rounded-xl" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
