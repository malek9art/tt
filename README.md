# مركز الأحمدي للجوالات ومستلزماتها 🛍️

منصة تجارة إلكترونية احترافية متكاملة — تعز، اليمن

[![CI](https://github.com/malek9art/Ahmadi-Store/actions/workflows/ci.yml/badge.svg)](https://github.com/malek9art/Ahmadi-Store/actions/workflows/ci.yml)

---

## 🏗️ البنية

```
ahmadi-store/                    # Monorepo (pnpm + Turborepo)
├── apps/
│   ├── storefront/              # واجهة العميل (Next.js 15)     → localhost:3000
│   ├── admin/                   # لوحة الإدارة (Next.js 15)     → localhost:3001
│   └── delivery/                # واجهة المناديب PWA (Next.js)  → localhost:3002
├── packages/
│   ├── ui/                      # Design System (Tailwind + shadcn)
│   ├── config/                  # Tailwind preset, TSConfig, ESLint
│   └── lib/                     # Types, Utils, i18n, Constants
└── supabase/                    # Migrations + Edge Functions
```

## ⚡ متطلبات البيئة

- **Node.js** ≥ 20
- **pnpm** ≥ 9 — `npm install -g pnpm`
- **Supabase CLI** — `npm install -g supabase`
- حساب **Supabase Cloud** (Project ID: `pjrxpgjphumukeoeldzc`)
- حساب **Vercel** (3 مشاريع منفصلة)
- حساب **GitHub**

## 🚀 تشغيل المشروع محلياً

### 1. استنساخ المستودع
```bash
git clone https://github.com/malek9art/Ahmadi-Store.git
cd Ahmadi-Store
```

### 2. إعداد متغيرات البيئة
```bash
cp .env.example apps/storefront/.env.local
cp .env.example apps/admin/.env.local
cp .env.example apps/delivery/.env.local
# أضف القيم الحقيقية في كل ملف .env.local
```

### 3. تثبيت المكتبات
```bash
pnpm install
```

### 4. تشغيل التطبيقات
```bash
pnpm dev
# storefront → http://localhost:3000
# admin      → http://localhost:3001
# delivery   → http://localhost:3002
```

## 🗄️ قاعدة البيانات

```bash
# ربط المشروع بـ Supabase Cloud
supabase link --project-ref pjrxpgjphumukeoeldzc

# توليد الأنواع TypeScript (بعد أي تعديل على DB)
supabase gen types typescript --project-id pjrxpgjphumukeoeldzc \
  > packages/lib/src/types/database.types.ts

# رفع migration جديدة
supabase db push
```

## 🧪 الاختبارات والجودة

```bash
pnpm type-check   # TypeScript
pnpm lint         # ESLint
pnpm test         # Vitest
pnpm build        # بناء كل التطبيقات
```

## 🎨 الهوية البصرية

| العنصر | القيمة |
|---|---|
| اللون الأساسي | `#09444C` (تيل) |
| اللون التمييزي | `#FFE100` (أصفر) |
| الخط الأساسي | IBM Plex Sans Arabic |
| الاتجاه | RTL (العربية أولاً) |

## 🔐 الأمان

- **RLS** مفعّل على كل جدول (29 جدول)
- **مفتاح service_role** في الخادم فقط — لا يُكشف للمتصفح
- **لا أسرار** في الكود أو المستودع — فقط في `.env.local` و GitHub Secrets

## 📋 GitHub Secrets المطلوبة

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_ID
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_STOREFRONT_PROJECT_ID
VERCEL_ADMIN_PROJECT_ID
VERCEL_DELIVERY_PROJECT_ID
NEXT_PUBLIC_APP_URL
```

## 📍 خارطة الطريق

- [x] **المرحلة 0** — التأسيس (DB + Monorepo + Design System)
- [ ] **المرحلة 1** — الكتالوج والبحث
- [ ] **المرحلة 2** — السلة والطلبات
- [ ] **المرحلة 3** — الدفع
- [ ] **المرحلة 4** — التوصيل والمناديب
- [ ] **المرحلة 5** — الإشعارات والتسويق
- [ ] **المرحلة 6** — المحاسبة والتحليلات
- [ ] **المرحلة 7** — التحسين والإطلاق

---

**مركز الأحمدي للجوالات ومستلزماتها** · تعز، اليمن
