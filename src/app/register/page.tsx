import { Suspense } from "react";
import RegisterForm from "./RegisterForm";
export const metadata = { title: "إنشاء حساب" };
export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="skeleton h-96 w-full max-w-md" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
