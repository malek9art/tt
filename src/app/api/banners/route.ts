import { NextResponse } from "next/server";
import { getBanners } from "@/lib/api";

export const revalidate = 60;

export async function GET() {
  const banners = await getBanners();
  return NextResponse.json({ banners });
}
