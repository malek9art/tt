"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Save, ArrowRight, Trash2, Eye, Loader2, CheckCircle } from "lucide-react";
import ImageUploader from "@/components/admin/products/ImageUploader";

interface UploadedImage { url: string; path: string; is_primary: boolean; alt_ar: string; }

export default function EditProductPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const [product, setProduct] = useState<Record<string,unknown>|null>(null);
  const [images,  setImages]  = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");
  const [form, setForm] = useState({
    name_ar:"", description:"", base_price:0,
    status:"draft", is_featured:false, warranty:"", cod_eligible:true,
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/products/${id}`).then(r=>r.json()),
      fetch(`/api/admin/products/${id}/images`).then(r=>r.json()),
    ]).then(([p, imgs]) => {
      setProduct(p);
      setForm({
        name_ar:     String(p.name_ar     ?? ""),
        description: String(p.description ?? ""),
        base_price:  Number(p.base_price  ?? 0),
        status:      String(p.status      ?? "draft"),
        is_featured: Boolean(p.is_featured ?? false),
        warranty:    String(p.warranty    ?? ""),
        cod_eligible: Boolean(p.cod_eligible ?? true),
      });
      // تحويل صور DB لصيغة ImageUploader
      const dbImgs = (imgs as {url:string;alt_ar:string|null;is_primary:boolean}[]).map(img => ({
        url:        img.url,
        path:       img.url.split("/products/").pop() ?? "",
        is_primary: img.is_primary,
        alt_ar:     img.alt_ar ?? "",
      }));
      setImages(dbImgs);
      setLoading(false);
    });
  }, [id]);

  const setF = (k:string, v:unknown) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError("");

    // حفظ البيانات
    const r1 = await fetch(`/api/admin/products/${id}`,{
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ ...form, base_price:Number(form.base_price) }),
    });

    // حفظ الصور
    const r2 = await fetch(`/api/admin/products/${id}/images`,{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify(images),
    });

    if (!r1.ok || !r2.ok) {
      setError("حدث خطأ أثناء الحفظ");
    } else {
      setSaved(true);
      setTimeout(()=>setSaved(false), 3000);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("هل تريد حذف هذا المنتج نهائياً؟")) return;
    await fetch(`/api/admin/products/${id}`,{ method:"DELETE" });
    router.replace("/admin/products");
  };

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";
  const productSlug = typeof product?.slug === "string" ? product.slug : null;

  if (loading) return (
    <div className="space-y-4 max-w-3xl">
      <div className="skeleton h-10 w-48"/>
      {[1,2,3].map(i=><div key={i} className="skeleton h-32 w-full"/>)}
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300 transition-colors">
            <ArrowRight size={16}/>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-1)] line-clamp-1">{form.name_ar}</h1>
            <p className="text-xs text-[var(--text-muted)]">تعديل المنتج</p>
          </div>
        </div>
        <div className="flex gap-2">
          {productSlug && (
            <Link href={`/products/${productSlug}`} target="_blank"
              className="btn-ghost border border-[var(--border)] gap-1.5 text-sm">
              <Eye size={14}/> عرض
            </Link>
          )}
          <button onClick={handleDelete}
            className="btn-ghost border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1.5 text-sm">
            <Trash2 size={14}/> حذف
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600">⚠ {error}</div>}

      <div className="grid gap-5 md:grid-cols-3">
        <div className="md:col-span-2 space-y-5">
          <div className="card-base p-5 space-y-4">
            <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">المعلومات الأساسية</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">اسم المنتج</label>
              <input type="text" value={form.name_ar} onChange={e=>setF("name_ar",e.target.value)} className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الوصف</label>
              <textarea rows={5} value={form.description} onChange={e=>setF("description",e.target.value)}
                className={iCls+" resize-none"}/>
            </div>
          </div>

          {/* إدارة الصور */}
          <div className="card-base p-5 space-y-3">
            <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">
              صور المنتج
              <span className="mr-2 text-xs font-normal text-[var(--text-muted)]">({images.length} صورة)</span>
            </h2>
            <ImageUploader
              productId={id}
              initial={images}
              onChange={setImages}
            />
          </div>

          <div className="card-base p-5 space-y-4">
            <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">التسعير</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">السعر (YER)</label>
                <div className="relative">
                  <span className="absolute top-2.5 start-3 text-sm text-[var(--text-muted)]">﷼</span>
                  <input type="number" min="0" dir="ltr" value={form.base_price}
                    onChange={e=>setF("base_price",Number(e.target.value))} className={iCls+" ps-8"}/>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الضمان</label>
                <input type="text" value={form.warranty} onChange={e=>setF("warranty",e.target.value)} className={iCls}/>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card-base p-5 space-y-4">
            <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">الحالة</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">حالة النشر</label>
              <select value={form.status} onChange={e=>setF("status",e.target.value)} className={iCls}>
                <option value="draft">مسودة</option>
                <option value="published">منشور</option>
                <option value="archived">مؤرشف</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_featured}
                onChange={e=>setF("is_featured",e.target.checked)}
                className="h-4 w-4 rounded text-brand-700"/>
              <span className="text-sm text-[var(--text-1)]">منتج مميّز</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.cod_eligible}
                onChange={e=>setF("cod_eligible",e.target.checked)}
                className="h-4 w-4 rounded text-brand-700"/>
              <span className="text-sm text-[var(--text-1)]">يقبل الدفع عند الاستلام (COD)</span>
            </label>
          </div>

          <button onClick={handleSave} disabled={saving}
            className={`w-full justify-center text-base py-3 ${saved ? "btn-ghost border border-green-400 text-green-600" : "btn-primary"}`}>
            {saving  ? <><Loader2 size={16} className="animate-spin"/> جارٍ الحفظ...</>
             : saved ? <><CheckCircle size={16}/> تم الحفظ بنجاح</>
             :         <><Save size={16}/> حفظ التعديلات</>}
          </button>

          <div className="card-base p-4 space-y-1.5 text-xs text-[var(--text-muted)]">
            {productSlug && <p dir="ltr" className="truncate">/{productSlug}</p>}
            <p>الإنشاء: {product?.created_at ? new Date(String(product.created_at)).toLocaleDateString("ar-YE") : "—"}</p>
            <p>آخر تعديل: {product?.updated_at ? new Date(String(product.updated_at)).toLocaleDateString("ar-YE") : "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
