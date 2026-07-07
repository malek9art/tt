import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface StoreSettings {
  name:          string;
  tagline:       string;
  phone:         string;
  whatsapp:      string;
  whatsapp_maintenance: string;
  email:         string;
  address:       string;
  governorate:   string;
  logo_url:      string;
  facebook:      string;
  instagram:     string;
  twitter:       string;
  working_hours: string;
}

const DEFAULTS: StoreSettings = {
  name:          "مركز الأحمدي للجوالات",
  tagline:       "جوالك بأفضل الأسعار",
  phone:         "",
  whatsapp:      "",
  whatsapp_maintenance: "",
  email:         "info@ahmadi.ye",
  address:       "تعز، اليمن",
  governorate:   "تعز",
  logo_url:      "",
  facebook:      "",
  instagram:     "",
  twitter:       "",
  working_hours: "",
};

// Cache بسيط لتجنب requests متكررة
let cached: StoreSettings | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

export function useStoreSettings(): StoreSettings {
  const [settings, setSettings] = useState<StoreSettings>(cached ?? DEFAULTS);

  useEffect(() => {
    const now = Date.now();
    if (cached && now - cacheTime < CACHE_TTL) {
      setSettings(cached);
      return;
    }

    sb.from("settings")
      .select("key, value")
      .eq("scope", "global")
      .eq("is_public", true)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string,string> = { ...DEFAULTS } as unknown as Record<string,string>;
        data.forEach(row => {
          const shortKey = row.key.replace("store.", "").replace("shipping.", "shipping_").replace("order.", "order_");
          const raw = typeof row.value === "string" ? row.value : JSON.stringify(row.value);
          map[shortKey] = raw.replace(/^"|"$/g, "");
        });
        const result: StoreSettings = {
          name:          map["name"]          || DEFAULTS.name,
          tagline:       map["tagline"]        || DEFAULTS.tagline,
          phone:         map["phone"]          || DEFAULTS.phone,
          whatsapp:      map["whatsapp"]       || DEFAULTS.whatsapp,
          whatsapp_maintenance: map["whatsapp_maintenance"] || DEFAULTS.whatsapp_maintenance,
          email:         map["email"]          || DEFAULTS.email,
          address:       map["address"]        || DEFAULTS.address,
          governorate:   map["governorate"]    || DEFAULTS.governorate,
          logo_url:      map["logo_url"]       || DEFAULTS.logo_url,
          facebook:      map["facebook"]       || DEFAULTS.facebook,
          instagram:     map["instagram"]      || DEFAULTS.instagram,
          twitter:       map["twitter"]        || DEFAULTS.twitter,
          working_hours: map["working_hours"]  || DEFAULTS.working_hours,
        };
        cached    = result;
        cacheTime = Date.now();
        setSettings(result);
      });
  }, []);

  return settings;
}
