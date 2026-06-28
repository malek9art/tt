"use client";
import { useState, useRef, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
import { Upload, X, Star, Loader2, ImagePlus } from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UploadedImage {
  url:        string;
  path:       string;
  is_primary: boolean;
  alt_ar:     string;
}

interface Props {
  productId:  string;
  initial?:   UploadedImage[];
  onChange?:  (images: UploadedImage[]) => void;
}

export default function ImageUploader({ productId, initial = [], onChange }: Props) {
  const [images,   setImages]   = useState<UploadedImage[]>(initial);
  const [uploading,setUploading]= useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!fileArr.length) return;

    setUploading(true);
    const newImages: UploadedImage[] = [];

    for (const file of fileArr) {
      // اسم فريد: products/{productId}/{timestamp}-{random}.{ext}
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;

      const { error } = await supabase.storage
        .from("products")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (!error) {
        const url = `${SUPABASE_URL}/storage/v1/object/public/products/${path}`;
        newImages.push({
          url,
          path,
          is_primary: images.length === 0 && newImages.length === 0,
          alt_ar: file.name.replace(/\.[^.]+$/, ""),
        });
      }
    }

    const updated = [...images, ...newImages];
    setImages(updated);
    onChange?.(updated);
    setUploading(false);
  }, [images, productId, onChange, SUPABASE_URL]);

  const removeImage = async (idx: number) => {
    const img = images[idx];
    // حذف من Storage
    await supabase.storage.from("products").remove([img.path]);
    const updated = images.filter((_, i) => i !== idx).map((img, i) => ({
      ...img,
      is_primary: i === 0 ? true : (img.is_primary && idx !== 0 ? true : false),
    }));
    // تأكد أن الأولى دائماً primary
    if (updated.length > 0 && !updated.some(i => i.is_primary)) {
      updated[0].is_primary = true;
    }
    setImages(updated);
    onChange?.(updated);
  };

  const setPrimary = (idx: number) => {
    const updated = images.map((img, i) => ({ ...img, is_primary: i === idx }));
    setImages(updated);
    onChange?.(updated);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      {/* منطقة السحب والإفلات */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all ${
          dragOver
            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
            : "border-[var(--border)] hover:border-brand-400 hover:bg-[var(--bg-page)]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={e => e.target.files && uploadFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={32} className="animate-spin text-brand-600" />
            <p className="text-sm text-[var(--text-muted)]">جارٍ رفع الصور...</p>
          </div>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600">
              <ImagePlus size={28} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--text-1)]">اسحب الصور هنا أو اضغط للاختيار</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">JPEG · PNG · WebP · AVIF · حتى 5MB للصورة</p>
            </div>
          </>
        )}
      </div>

      {/* عرض الصور المرفوعة */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img, idx) => (
            <div key={img.path} className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)] bg-brand-50">
              <Image
                src={img.url} alt={img.alt_ar}
                fill sizes="120px" className="object-cover"
              />
              {/* شارة الصورة الرئيسية */}
              {img.is_primary && (
                <div className="absolute top-1 end-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-500">
                  <Star size={10} className="text-brand-900 fill-brand-900" />
                </div>
              )}
              {/* أزرار الإجراءات */}
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {!img.is_primary && (
                  <button
                    onClick={e => { e.stopPropagation(); setPrimary(idx); }}
                    title="تعيين كصورة رئيسية"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-500 text-brand-900 hover:bg-accent-600 transition-colors">
                    <Star size={12} />
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); removeImage(idx); }}
                  title="حذف الصورة"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors">
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          ⭐ الصورة الرئيسية تظهر في القوائم والبطاقات · اضغط ⭐ لتغييرها
        </p>
      )}
    </div>
  );
}
