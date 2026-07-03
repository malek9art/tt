"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation } from "lucide-react";

const PIN_HTML = `<div style="font-size:34px;line-height:1;transform:translate(-50%,-100%);position:absolute;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))">📍</div>`;

/** خريطة للعرض فقط مع زر ملاحة — تُستخدم في لوحة الإدارة وواجهة المندوب */
export default function LocationView({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, {
        center: [lat, lng], zoom: 16,
        attributionControl: false, scrollWheelZoom: false,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap").addTo(map);
      const icon = L.divIcon({ html: PIN_HTML, className: "", iconSize: [0, 0] });
      L.marker([lat, lng], { icon }).addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, [lat, lng]);

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-[var(--border)]">
        <div ref={containerRef} className="h-48 w-full bg-brand-50 dark:bg-brand-900/20" dir="ltr" />
        {!ready && <div className="absolute inset-0 skeleton" />}
      </div>
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
        target="_blank" rel="noreferrer"
        className="btn-primary w-full justify-center gap-2 text-sm">
        <Navigation size={15} /> {label ?? "ابدأ الملاحة إلى العميل"}
      </a>
    </div>
  );
}
