// Service worker بسيط — يُثبّت لتفعيل شرط "قابلية التثبيت" في المتصفحات (PWA)
// ويخزّن الأصول الثابتة مؤقتاً لتسريع الزيارات المتكررة. لا يتدخل في طلبات
// API أو صفحات Supabase حتى لا يُقدّم بيانات قديمة (أسعار، مخزون، طلبات).
const CACHE = "ahmadi-store-v1";
const PRECACHE_URLS = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // لا تتدخّل في نداءات API أو Supabase — البيانات يجب أن تكون حيّة دائماً
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase.co")) return;
  // فقط أصول الصور/الأيقونات الثابتة تُخزَّن (cache-first)؛ باقي الصفحات تمر مباشرة للشبكة
  if (request.destination === "image" || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, clone));
        return res;
      }).catch(() => cached))
    );
  }
});
