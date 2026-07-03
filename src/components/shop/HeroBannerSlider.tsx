"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import { HiArrowLeft } from "react-icons/hi2";

interface Banner {
  id: string;
  title: string | null;
  subtitle?: string | null;
  image_url: string;
  link_url?: string | null;
  link_label?: string | null;
  badge_text?: string | null;
  sort_order: number;
}

interface Props { banners: Banner[]; }

export default function HeroBannerSlider({ banners }: Props) {
  const [current, setCurrent] = useState(0);
  const [dir,     setDir]     = useState(1);

  const go = useCallback((idx: number) => {
    setDir(idx > current ? 1 : -1);
    setCurrent(idx);
  }, [current]);

  const next = useCallback(() => go((current + 1) % banners.length), [go, current, banners.length]);
  const prev = useCallback(() => go((current - 1 + banners.length) % banners.length), [go, current, banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next, banners.length]);

  if (!banners.length) return null;

  const banner = banners[current];

  return (
    <section className="relative overflow-hidden bg-brand-900" style={{ minHeight: 380 }}>
      <AnimatePresence initial={false} custom={dir}>
        <motion.div
          key={banner.id}
          custom={dir}
          variants={{
            enter:  (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit:   (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
          }}
          initial="enter" animate="center" exit="exit"
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          {/* صورة الخلفية */}
          <Image
            src={banner.image_url}
            alt={banner.title ?? "بانر"}
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
          {/* تدرج الشفافية */}
          <div className="absolute inset-0 bg-gradient-to-l from-brand-900/80 via-brand-900/50 to-transparent"/>
          <div className="absolute inset-0 bg-gradient-to-t from-brand-900/60 via-transparent to-transparent"/>

          {/* المحتوى */}
          <div className="relative h-full container-main flex items-center py-16 md:py-24">
            <div className="max-w-lg" dir="rtl">
              {banner.badge_text && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent-500/20 border border-accent-500/40 px-4 py-1.5 text-sm text-accent-400 font-medium">
                  {banner.badge_text}
                </motion.div>
              )}
              <motion.h2
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-3">
                {banner.title}
              </motion.h2>
              {banner.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="text-base md:text-lg text-brand-200 leading-relaxed mb-6">
                  {banner.subtitle}
                </motion.p>
              )}
              {banner.link_url && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                  <Link href={banner.link_url}
                    className="btn-accent inline-flex items-center gap-2 shadow-lg shadow-accent-500/20">
                    {banner.link_label || "تسوّق الآن"}
                    <HiArrowLeft className="text-base"/>
                  </Link>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* أزرار التنقل */}
      {banners.length > 1 && (
        <>
          <button onClick={prev}
            className="absolute start-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition-all">
            <HiChevronRight className="text-xl"/>
          </button>
          <button onClick={next}
            className="absolute end-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition-all">
            <HiChevronLeft className="text-xl"/>
          </button>

          {/* نقاط التنقل */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {banners.map((_, i) => (
              <button key={i} onClick={() => go(i)}
                className={`transition-all duration-300 rounded-full ${
                  i === current
                    ? "w-6 h-2 bg-accent-500"
                    : "w-2 h-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
