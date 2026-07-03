"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import { HiPlus, HiPencilSquare, HiTrash, HiEye, HiEyeSlash, HiPhoto, HiLink, HiArrowUpTray } from "react-icons/hi2";

const sbc = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  link_label?: string;
  badge_text?: string;
  sort_order: number;
  is_active: boolean;
  starts_at?: string;
  ends_at?: string;
}

const EMPTY: Omit<Banner, "id"> = {
  title: "", subtitle: "", image_url: "", link_url: "", link_label: "",
  badge_text: "", sort_order: 0, is_active: true, starts_at: "", ends_at: "",
};

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState<Omit<Banner,"id">>(EMPTY);
  const [editId,  setEditId]  = useState<string | null>(null);
  const [error,   setError]   = useState("");
  const [imgMode, setImgMode] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);

  // رابط الزر: بحث عن منتج أو رابط مخصص
  const [linkMode,    setLinkMode]    = useState<"product" | "custom">("product");
  const [prodQuery,   setProdQuery]   = useState("");
  const [prodResults, setProdResults] = useState<{ id: string; name_ar: string; slug: string; base_price: number }[]>([]);
  const [prodSearching, setProdSearching] = useState(false);

  useEffect(() => {
    if (linkMode !== "product" || prodQuery.trim().length < 2) { setProdResults([]); return; }
    setProdSearching(true);
    const t = setTimeout(async () => {
      const { data } = await sbc
        .from("products")
        .select("id, name_ar, slug, base_price")
        .eq("status", "published")
        .ilike("name_ar", `%${prodQuery.trim()}%`)
        .limit(8);
      setProdResults(data ?? []);
      setProdSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [prodQuery, linkMode]);

  const pickProduct = (p: { name_ar: string; slug: string }) => {
    setForm(f => ({
      ...f,
      link_url: `/products/${p.slug}`,
      link_label: f.link_label?.trim() ? f.link_label : "اشترِ الآن",
    }));
    setProdQuery(p.name_ar);
    setProdResults([]);
  };

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/banners");
    const d   = await res.json();
    setBanners(d.banners ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm(EMPTY); setEditId(null); setError(""); setImgMode("upload");
    setLinkMode("product"); setProdQuery(""); setProdResults([]);
    setModal(true);
  };

  const openEdit = (b: Banner) => {
    const { id, ...rest } = b;
    setForm({ ...rest, starts_at: rest.starts_at?.slice(0,16) ?? "", ends_at: rest.ends_at?.slice(0,16) ?? "" });
    setEditId(id); setError(""); setImgMode("url");
    // إن كان الرابط الحالي يشير لمنتج نبقى في وضع البحث، وإلا وضع الرابط المخصص
    setLinkMode(b.link_url?.startsWith("/products/") ? "product" : "custom");
    setProdQuery(""); setProdResults([]);
    setModal(true);
  };

  const uploadBannerImage = async (file: File) => {
    setUploading(true); setError("");
    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `banners/${Date.now()}.${ext}`;
    const { error: upErr } = await sbc.storage.from("assets").upload(path, file, {
      upsert: true, contentType: file.type,
    });
    if (upErr) { setError("فشل رفع الصورة — حاول مجدداً"); setUploading(false); return; }
    const url = sbc.storage.from("assets").getPublicUrl(path).data.publicUrl;
    setForm(f => ({ ...f, image_url: url }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError("العنوان مطلوب"); return; }
    if (!form.image_url.trim()) { setError("رابط الصورة مطلوب"); return; }
    setSaving(true);
    const url    = editId ? `/api/admin/banners/${editId}` : "/api/admin/banners";
    const method = editId ? "PATCH" : "POST";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d      = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error ?? "حدث خطأ"); return; }
    setModal(false);
    load();
  };

  const toggleActive = async (b: Banner) => {
    await fetch(`/api/admin/banners/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !b.is_active }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا البنر؟")) return;
    await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    load();
  };

  const F = (k: keyof typeof form, v: string | number | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">إدارة البنرات الإعلانية</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">تظهر في الصفحة الرئيسية للمتجر</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 transition-colors shadow-sm">
          <HiPlus className="text-lg"/> إضافة بنر
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1,2].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-[var(--border)] animate-pulse"/>
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-16 text-center">
          <HiPhoto className="text-5xl text-[var(--text-muted)] mx-auto mb-3 opacity-40"/>
          <p className="font-semibold text-[var(--text-1)]">لا توجد بنرات بعد</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">أضف أول بنر إعلاني لمتجرك</p>
          <button onClick={openAdd}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 transition-colors">
            <HiPlus/> إضافة بنر
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {banners.map(b => (
            <div key={b.id}
              className={`flex items-center gap-4 rounded-2xl border p-4 transition-all ${
                b.is_active
                  ? "border-[var(--border)] bg-[var(--bg-card)]"
                  : "border-dashed border-[var(--border)] bg-[var(--bg-main)] opacity-60"
              }`}>
              {/* الصورة */}
              <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-brand-50">
                <Image src={b.image_url} alt={b.title} fill sizes="128px" className="object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display="none"; }}/>
              </div>
              {/* المعلومات */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-[var(--text-1)]">{b.title}</h3>
                  {b.badge_text && (
                    <span className="text-xs bg-accent-500/20 text-accent-600 dark:text-accent-400 rounded-full px-2 py-0.5">
                      {b.badge_text}
                    </span>
                  )}
                  <span className={`text-xs rounded-full px-2 py-0.5 ${
                    b.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"
                  }`}>
                    {b.is_active ? "نشط" : "متوقف"}
                  </span>
                </div>
                {b.subtitle && <p className="text-sm text-[var(--text-muted)] mt-1 truncate">{b.subtitle}</p>}
                <div className="flex gap-3 mt-1 text-xs text-[var(--text-muted)]">
                  <span>ترتيب: {b.sort_order}</span>
                  {b.link_url && <span>رابط: {b.link_url}</span>}
                </div>
              </div>
              {/* الأزرار */}
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleActive(b)} title={b.is_active ? "إيقاف" : "تفعيل"}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    b.is_active
                      ? "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800"
                  }`}>
                  {b.is_active ? <HiEye className="text-base"/> : <HiEyeSlash className="text-base"/>}
                </button>
                <button onClick={() => openEdit(b)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 transition-colors">
                  <HiPencilSquare className="text-base"/>
                </button>
                <button onClick={() => handleDelete(b.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 transition-colors">
                  <HiTrash className="text-base"/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal إضافة/تعديل */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl" dir="rtl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h2 className="font-bold text-[var(--text-1)]">{editId ? "تعديل البنر" : "إضافة بنر جديد"}</h2>
              <button onClick={() => setModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-1)] text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-2">{error}</p>}

              {/* معاينة الصورة */}
              {form.image_url && (
                <div className="relative h-40 w-full rounded-xl overflow-hidden bg-brand-50">
                  <Image src={form.image_url} alt="معاينة" fill sizes="480px" className="object-cover"/>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--text-2)]">صورة البنر *</label>
                {/* اختيار الطريقة */}
                <div className="flex rounded-xl border border-[var(--border)] overflow-hidden">
                  <button type="button" onClick={() => setImgMode("upload")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                      imgMode === "upload" ? "bg-brand-700 text-white" : "bg-[var(--bg-page)] text-[var(--text-2)]"
                    }`}>
                    <HiArrowUpTray className="text-sm"/> رفع من الجهاز
                  </button>
                  <button type="button" onClick={() => setImgMode("url")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                      imgMode === "url" ? "bg-brand-700 text-white" : "bg-[var(--bg-page)] text-[var(--text-2)]"
                    }`}>
                    <HiLink className="text-sm"/> رابط خارجي
                  </button>
                </div>

                {imgMode === "upload" ? (
                  <label className={`block w-full rounded-xl border-2 border-dashed px-4 py-5 text-sm text-center cursor-pointer transition-colors ${
                    uploading ? "border-amber-300 bg-amber-50 text-amber-700"
                    : form.image_url ? "border-green-400 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400"
                  }`}>
                    <input type="file" accept="image/*" className="hidden" disabled={uploading}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadBannerImage(f); }}/>
                    <HiPhoto className="text-2xl mx-auto mb-1"/>
                    {uploading ? "جاري الرفع..." : form.image_url ? "تم الرفع ✓ — اضغط للتغيير" : "اضغط لاختيار صورة من هاتفك أو جهازك"}
                  </label>
                ) : (
                  <input value={form.image_url} onChange={e => F("image_url", e.target.value)}
                    placeholder="https://example.com/banner.jpg"
                    dir="ltr"
                    className="input-base w-full"/>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-1">العنوان الرئيسي *</label>
                <input value={form.title} onChange={e => F("title", e.target.value)}
                  placeholder="مثال: أفضل عروض الجوالات"
                  className="input-base w-full"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-1">العنوان الفرعي</label>
                <input value={form.subtitle || ""} onChange={e => F("subtitle", e.target.value)}
                  placeholder="مثال: خصومات تصل إلى 30%"
                  className="input-base w-full"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-1">نص الشارة (اختياري)</label>
                <input value={form.badge_text || ""} onChange={e => F("badge_text", e.target.value)}
                  placeholder="مثال: عرض محدود"
                  className="input-base w-full"/>
              </div>
              {/* رابط الزر — بحث عن منتج أو رابط مخصص */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-[var(--text-2)]">رابط الزر</label>
                  <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-xs">
                    <button type="button" onClick={() => setLinkMode("product")}
                      className={`px-3 py-1 font-medium transition-colors ${linkMode === "product" ? "bg-brand-700 text-white" : "text-[var(--text-2)]"}`}>
                      🔍 منتج
                    </button>
                    <button type="button" onClick={() => setLinkMode("custom")}
                      className={`px-3 py-1 font-medium transition-colors ${linkMode === "custom" ? "bg-brand-700 text-white" : "text-[var(--text-2)]"}`}>
                      رابط مخصص
                    </button>
                  </div>
                </div>

                {linkMode === "product" ? (
                  <div className="relative">
                    <input value={prodQuery}
                      onChange={e => setProdQuery(e.target.value)}
                      placeholder="ابحث عن منتج بالاسم..."
                      className="input-base w-full"/>
                    {prodSearching && (
                      <span className="absolute top-1/2 -translate-y-1/2 start-3 text-xs text-[var(--text-muted)]">يبحث…</span>
                    )}
                    {prodResults.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xl overflow-hidden">
                        {prodResults.map(p => (
                          <button key={p.id} type="button" onClick={() => pickProduct(p)}
                            className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-right hover:bg-[var(--bg-page)] transition-colors border-b border-[var(--border)] last:border-0">
                            <span className="text-[var(--text-1)] truncate">{p.name_ar}</span>
                            <span className="shrink-0 text-xs text-brand-700 dark:text-accent-400 font-semibold">
                              {new Intl.NumberFormat("ar-YE").format(p.base_price)} ﷼
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {prodQuery.trim().length >= 2 && !prodSearching && prodResults.length === 0 && !form.link_url?.startsWith("/products/") && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">لا نتائج — جرّب اسماً آخر</p>
                    )}
                    {form.link_url?.startsWith("/products/") && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        ✓ الزر يفتح: <span dir="ltr" className="font-mono">{form.link_url}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <input value={form.link_url || ""} onChange={e => F("link_url", e.target.value)}
                    placeholder="/products?cat=smartphones أو رابط خارجي"
                    dir="ltr"
                    className="input-base w-full"/>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-1">نص الزر</label>
                <input value={form.link_label || ""} onChange={e => F("link_label", e.target.value)}
                  placeholder="تسوّق الآن"
                  className="input-base w-full"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-2)] mb-1">الترتيب</label>
                  <input type="number" value={form.sort_order} onChange={e => F("sort_order", Number(e.target.value))}
                    className="input-base w-full"/>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.is_active} onChange={e => F("is_active", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 accent-brand-700"/>
                    <span className="text-sm font-medium text-[var(--text-2)]">نشط</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-2)] mb-1">تاريخ البداية</label>
                  <input type="datetime-local" value={form.starts_at || ""} onChange={e => F("starts_at", e.target.value)}
                    className="input-base w-full"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-2)] mb-1">تاريخ الانتهاء</label>
                  <input type="datetime-local" value={form.ends_at || ""} onChange={e => F("ends_at", e.target.value)}
                    className="input-base w-full"/>
                </div>
              </div>
            </div>
            <div className="flex gap-3 border-t border-[var(--border)] px-6 py-4">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 rounded-xl bg-brand-700 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60 transition-colors">
                {saving ? "جارٍ الحفظ..." : editId ? "حفظ التعديلات" : "إضافة البنر"}
              </button>
              <button onClick={() => setModal(false)}
                className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--border)] transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
