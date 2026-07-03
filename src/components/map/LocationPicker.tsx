"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { HiMapPin, HiXMark } from "react-icons/hi2";
import { Loader2, LocateFixed } from "lucide-react";

export interface GeoPoint { lat: number; lng: number; }

// مركز تعز الافتراضي
const DEFAULT_CENTER: GeoPoint = { lat: 13.5789, lng: 44.0219 };

// أيقونة دبوس بدون ملفات صور (تتجنب مشكلة أصول Leaflet الافتراضية)
const PIN_HTML = `<div style="font-size:34px;line-height:1;transform:translate(-50%,-100%);position:absolute;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))">📍</div>`;

interface Props {
  value: GeoPoint | null;
  onChange: (p: GeoPoint | null) => void;
}

export default function LocationPicker({ value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<LeafletMap | null>(null);
  const markerRef    = useRef<Marker | null>(null);
  const onChangeRef  = useRef(onChange);
  onChangeRef.current = onChange;

  const [ready,      setReady]      = useState(false);
  const [locating,   setLocating]   = useState(false);
  const [geoError,   setGeoError]   = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const start = value ?? DEFAULT_CENTER;
      const map = L.map(containerRef.current, {
        center: [start.lat, start.lng],
        zoom: value ? 16 : 13,
        attributionControl: false,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);
      L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap").addTo(map);

      const icon = L.divIcon({ html: PIN_HTML, className: "", iconSize: [0, 0] });

      const setPoint = (p: GeoPoint) => {
        if (markerRef.current) {
          markerRef.current.setLatLng([p.lat, p.lng]);
        } else {
          markerRef.current = L.marker([p.lat, p.lng], { icon, draggable: true }).addTo(map);
          markerRef.current.on("dragend", () => {
            const ll = markerRef.current!.getLatLng();
            onChangeRef.current({ lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6) });
          });
        }
        onChangeRef.current({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) });
      };

      if (value) setPoint(value);
      map.on("click", (e) => setPoint({ lat: e.latlng.lat, lng: e.latlng.lng }));

      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // نُنشئ الخريطة مرة واحدة فقط
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locateMe = () => {
    if (!navigator.geolocation) { setGeoError("متصفحك لا يدعم تحديد الموقع"); return; }
    setLocating(true); setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const L = (await import("leaflet")).default;
        const map = mapRef.current;
        if (map) {
          map.setView([p.lat, p.lng], 17);
          if (markerRef.current) markerRef.current.setLatLng([p.lat, p.lng]);
          else {
            const icon = L.divIcon({ html: PIN_HTML, className: "", iconSize: [0, 0] });
            markerRef.current = L.marker([p.lat, p.lng], { icon, draggable: true }).addTo(map);
            markerRef.current.on("dragend", () => {
              const ll = markerRef.current!.getLatLng();
              onChangeRef.current({ lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6) });
            });
          }
        }
        onChangeRef.current({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) });
        setLocating(false);
      },
      () => { setGeoError("تعذّر تحديد موقعك — فعّل خدمة الموقع وحاول مجدداً"); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const clear = () => {
    markerRef.current?.remove();
    markerRef.current = null;
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-[var(--border)]">
        <div ref={containerRef} className="h-56 w-full bg-brand-50 dark:bg-brand-900/20" dir="ltr" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)]/60">
            <Loader2 className="animate-spin text-brand-700" size={24} />
          </div>
        )}
        {/* زر موقعي الحالي */}
        <button type="button" onClick={locateMe} disabled={locating}
          className="absolute bottom-3 start-3 z-[1000] flex items-center gap-1.5 rounded-lg bg-white dark:bg-brand-800 px-3 py-2 text-xs font-semibold text-brand-700 dark:text-accent-400 shadow-lg border border-[var(--border)] hover:bg-brand-50 transition-colors">
          {locating ? <Loader2 size={13} className="animate-spin" /> : <LocateFixed size={13} />}
          موقعي الحالي
        </button>
        {value && (
          <button type="button" onClick={clear} aria-label="مسح الموقع"
            className="absolute top-3 start-3 z-[1000] flex h-7 w-7 items-center justify-center rounded-lg bg-white dark:bg-brand-800 text-[var(--text-2)] shadow-lg border border-[var(--border)] hover:text-red-500 transition-colors">
            <HiXMark className="text-sm" />
          </button>
        )}
      </div>

      {geoError && <p className="text-xs text-red-500">{geoError}</p>}
      {value ? (
        <p className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
          <HiMapPin /> تم تحديد الموقع — يمكنك سحب الدبوس لضبطه بدقة
        </p>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          اضغط على الخريطة لتحديد موقع التوصيل، أو استخدم «موقعي الحالي»
        </p>
      )}
    </div>
  );
}
