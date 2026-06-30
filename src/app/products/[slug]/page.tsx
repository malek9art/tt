import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getProductBySlug, getLatestProducts } from "@/lib/api";
import ProductDetails from "./ProductDetails";
import type { Product } from "@/lib/supabase";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product  = await getProductBySlug(slug);
  if (!product) return { title: "المنتج غير موجود" };
  return {
    title: product.name_ar,
    description: product.description?.slice(0, 160) ?? `${product.name_ar} — مركز الأحمدي للجوالات`,
    openGraph: {
      title: product.name_ar,
      images: product.product_images?.[0]?.url ? [product.product_images[0].url] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, related] = await Promise.all([
    getProductBySlug(slug),
    getLatestProducts(8),
  ]);

  if (!product) notFound();

  const relatedFiltered = (related as Product[]).filter(x => x.id !== product.id).slice(0, 4);

  return (
    <div className="min-h-screen">
      <Header />
      <ProductDetails product={product as Product} related={relatedFiltered} />
      <Footer />
    </div>
  );
}
