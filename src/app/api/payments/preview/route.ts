import { NextRequest, NextResponse } from "next/server";
import { PaymentGateway } from "@/lib/payment/gateway";

// معاينة عامة (بدون مصادقة) لتفاصيل الدفع اليدوي — بريد/جوال المحفظة،
// نقاط التحويل، رقم الحساب — قبل أن يؤكد العميل الطلب فعلياً.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code     = searchParams.get("code");
    const amount   = Number(searchParams.get("amount") ?? 0);
    const currency = searchParams.get("currency") ?? "YER";

    if (!code) return NextResponse.json({ error: "code مطلوب" }, { status: 400 });

    const instruction = await PaymentGateway.previewInstruction(code, amount, currency);
    if (!instruction) return NextResponse.json({ error: "مزود الدفع غير متاح" }, { status: 404 });

    return NextResponse.json({ instruction });
  } catch (err) {
    console.error("GET /api/payments/preview:", err);
    return NextResponse.json({ error: "خطأ غير متوقع" }, { status: 500 });
  }
}
