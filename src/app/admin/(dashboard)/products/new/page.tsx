"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { Save, ArrowRight, Plus, X, Loader2 } from "lucide-react";
import ImageUploader from "@/components/admin/products/ImageUploader";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function slugify(ar: string): string {
  return ar.trim().replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]/g, "").toLowerCase()
    + "-" + Math.random().toString(36).slice(2, 6);
}

interface UploadedImage { url: string; path: string; is_primary: boolean; alt_ar: string; }

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<{id:string;name_ar:string}[]>([]);
  const [brands,     setBrands]     = useState<{id:string;name:string}[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [tag,        setTag]        = useState("");
  const [images,     setImages]     = useState<UploadedImage[]>([]);
  const [savedId,    setSavedId]    = useState<string|null>(null);

  const [form, setForm] = useState({
    name_ar:"", name_en:"", slug:"", sku:"", description:"",
    category_id:"", brand_id:"", type:"physical", condition:"new",
    status:"draft", warranty:"", base_price:0, currency:"YER",
    is_featured:false, tags:[] as string[],
  });

  useEffect(() => {
    Promise.all([
      supabase.from("categories").select("id,name_ar").eq("is_active",true).order("sort_order"),
      supabase.from("brands").select("id,name").eq("is_active",true).order("sort_order"),
    ]).then(([{data:c},{data:b}])=>{ setCategories(c??[]); setBrands(b??[]); });
  }, []);

  const setF = (k:string, v:unknown) => setForm(f=>({...f,[k]:v}));
  const addTag = () => {
    const t = tag.trim();
    if (t && !form.tags.includes(t)) { setF("tags",[...form.tags,t]); setTag(""); }
  };

  const createProduct = async (): Promise<string|null> => {
    if (savedId) return savedId;
    const res = await fetch("/api/admin/products",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        ...form, slug:form.slug.trim()||slugify(form.name_ar),
        base_price:Number(form.base_price),
        category_id:form.category_id||null, brand_id:form.brand_id||null,
        name_en:form.name_en||null, sku:form.sku||null, warranty:form.warranty||null,
        status:"draft",
      }),
    });
    if (!res.ok) return null;
    const d = await res.json() as {id:string};
    setSavedId(d.id);
    return d.id;
  };

  const handleSubmit = async () => {
    if (!form.name_ar.trim()) { setError("اسم المنتج إلزامي"); return; }
    if (form.base_price<=0)   { setError("السعر يجب أن يكون أكبر من صفر"); return; }
    setLoading(true); setError("");

    const id = await createProduct();
    if (!id) { setError("فشل في حفظ المنتج، حاول مجدداً"); setLoading(false); return; }

    // تحديث البيانات بالحالة المختارة — بدون slug حتى لا يُعاد توليده
    const { slug: _slug, ...patchForm } = form as typeof form & { slug?: string };
    void _slug;
    await fetch(`/api/admin/products/${id}`,{
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        ...patchForm, base_price:Number(form.base_price),
        category_id:form.category_id||null, brand_id:form.brand_id||null,
        status: form.status,
      }),
    });

    // حفظ الصور
    if (images.length > 0) {
      await fetch(`/api/admin/products/${id}/images`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify(images),
      });
    }

    router.replace(`/admin/products/${id}`);
  };

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300 transition-colors">
          <ArrowRight size={16}/>
        </Link>
        <h1 className="text-xl font-bold text-[var(--text-1)]">إضافة منتج جديد</h1>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600">⚠ {error}</div>}

      <div className="grid gap-5 md:grid-cols-3">
        <div className="md:col-span-2 space-y-5">
          <div className="card-base p-5 space-y-4">
            <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">المعلومات الأساسية</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">اسم المنتج *</label>
              <input type="text" placeholder="iPhone 15 Pro Max..." value={form.name_ar}
                onChange={e=>setF("name_ar",e.target.value)} className={iCls}/>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الاسم بالإنجليزي</label>
                <input type="text" dir="ltr" value={form.name_en}
                  onChange={e=>setF("name_en",e.target.value)} className={iCls}/>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">SKU</label>
                <input type="text" dir="ltr" placeholder="IPH15PM-BK-256" value={form.sku}
                  onChange={e=>setF("sku",e.target.value)} className={iCls}/>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الوصف التفصيلي</label>
              <textarea rows={4} value={form.description}
                onChange={e=>setF("description",e.target.value)}
                placeholder="المواصفات، المميزات، التفاصيل..."
                className={iCls+" resize-none"}/>
            </div>
          </div>

          <div className="card-base p-5 space-y-3">
            <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">صور المنتج</h2>
            <ImageUploader
              productId={savedId ?? `temp-${Date.now()}`}
              onChange={setImages}
            />
          </div>

          <div className="card-base p-5 space-y-4">
            <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">التسعير</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">السعر (YER) *</label>
                <div className="relative">
                  <span className="absolute top-2.5 start-3 text-sm text-[var(--text-muted)]">﷼</span>
                  <input type="number" min="0" dir="ltr" placeholder="0"
                    value={form.base_price||""}
                    onChange={e=>setF("base_price",Number(e.target.value))}
                    className={iCls+" ps-8"}/>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الضمان</label>
                <input type="text" placeholder="سنة واحدة" value={form.warranty}
                  onChange={e=>setF("warranty",e.target.value)} className={iCls}/>
              </div>
            </div>
          </div>

          <div className="card-base p-5 space-y-3">
            <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">الوسوم</h2>
            <div className="flex gap-2">
              <input type="text" placeholder="أضف وسم..." value={tag}
                onChange={e=>setTag(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),addTag())}
                className={iCls+" flex-1"}/>
              <button onClick={addTag} className="btn-ghost border border-[var(--border)] px-3">
                <Plus size={14}/>
              </button>
            </div>
            {form.tags.length>0&&(
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map(t=>(
                  <span key={t} className="flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-900/30 px-2.5 py-1 text-xs text-brand-700 dark:text-accent-400">
                    {t}<button onClick={()=>setF("tags",form.tags.filter(x=>x!==t))}><X size={10}/></button>
                  </span>
                ))}
              </div>
            )}
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
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">النوع</label>
              <select value={form.type} onChange={e=>setF("type",e.target.value)} className={iCls}>
                <option value="physical">منتج مادي</option>
                <option value="service">خدمة</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الحالة</label>
              <select value={form.condition} onChange={e=>setF("condition",e.target.value)} className={iCls}>
                <option value="new">جديد</option>
                <option value="used_certified">مستعمل مضمون</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_featured}
                onChange={e=>setF("is_featured",e.target.checked)}
                className="h-4 w-4 rounded text-brand-700"/>
              <span className="text-sm text-[var(--text-1)]">منتج مميّز (الرئيسية)</span>
            </label>
          </div>

          <div className="card-base p-5 space-y-4">
            <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">التصنيف</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الفئة</label>
              <select value={form.category_id} onChange={e=>setF("category_id",e.target.value)} className={iCls}>
                <option value="">اختر الفئة</option>
                {categories.map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">العلامة التجارية</label>
              <select value={form.brand_id} onChange={e=>setF("brand_id",e.target.value)} className={iCls}>
                <option value="">اختر العلامة</option>
                {brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className="btn-primary w-full justify-center text-base py-3">
            {loading
              ?<><Loader2 size={16} className="animate-spin"/> جارٍ الحفظ...</>
              :<><Save size={16}/> حفظ المنتج</>}
          </button>
        </div>
      </div>
    </div>
  );
}
