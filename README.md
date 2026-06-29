# مركز الأحمدي للجوالات ومستلزماتها 🛍️

منصة تجارة إلكترونية احترافية متكاملة — تعز، اليمن

[![Deploy](https://img.shields.io/badge/Vercel-READY-brightgreen)](https://ahmadi-store.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.9-black)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com)

---

## 🌐 الروابط

| | الرابط |
|---|---|
| 🛍️ المتجر | https://ahmadi-store.vercel.app |
| 🔧 لوحة الإدارة | https://ahmadi-store.vercel.app/admin/login |
| 📦 GitHub | https://github.com/malek9art/Ahmadi-Store |

---

## 🏗️ التقنيات المستخدمة

| الطبقة | التقنية |
|---|---|
| الواجهة | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| قاعدة البيانات | Supabase (PostgreSQL + Auth + Storage + RLS) |
| إدارة الحالة | Zustand |
| الاستضافة | Vercel |
| الخط | IBM Plex Sans Arabic |

---

## 📁 هيكل المشروع

```
src/
├── app/
│   ├── (storefront)          # المتجر
│   │   ├── page.tsx          # الرئيسية
│   │   ├── products/         # PLP + PDP
│   │   ├── cart/             # السلة
│   │   ├── checkout/         # الدفع
│   │   └── account/          # الحساب الشخصي
│   ├── admin/
│   │   ├── (auth)/login/     # دخول الإدارة
│   │   └── (dashboard)/      # لوحة الإدارة
│   ├── api/                  # Route Handlers
│   └── auth/callback/        # معالج Magic Link
├── components/
│   ├── layout/               # Header + Footer
│   ├── shop/                 # ProductCard + Skeleton
│   ├── cart/                 # CartDrawer
│   └── admin/                # مكونات الإدارة
├── lib/                      # Supabase + API helpers
├── store/                    # Zustand stores
└── middleware.ts             # حماية المسارات
```

---

## ⚙️ متغيرات البيئة

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# التطبيق
NEXT_PUBLIC_APP_URL=https://ahmadi-store.vercel.app
```

---

## 🔐 دخول لوحة الإدارة

```
URL:      /admin/login
البريد:   ahmadicenterstore@gmail.com
المرور:   [محفوظة في قاعدة البيانات]
```

**الأمان:**
- تسجيل الدخول بـ Email + Password
- التحقق من الصلاحيات عبر `has_permission()` (SECURITY DEFINER)
- حماية كل المسارات عبر `middleware.ts`
- لا يمكن إنشاء حساب إداري من الواجهة

---

## 🗃️ قاعدة البيانات

- **29 جدول** في الـ public schema
- **RLS مفعّل** على كل الجداول
- **8 أدوار**: super_admin, admin, manager, support, driver, accountant, marketer, customer
- **34 صلاحية** مقسّمة على النطاقات
- **Storage Buckets**: products (عام), assets (عام), private (خاص)

---

## 🚀 ميزات المنصة

### المتجر
- ✅ الصفحة الرئيسية مع منتجات مميزة وأحدث الواردات
- ✅ قائمة المنتجات مع فلتر الفئات والترتيب
- ✅ صفحة تفاصيل المنتج مع اختيار المتغيرات
- ✅ سلة تسوق Zustand مع persist
- ✅ درج السلة المنزلق
- ✅ عملية دفع 3 مراحل (شحن → دفع → تأكيد)
- ✅ Dark Mode

### المصادقة
- ✅ Magic Link عبر البريد الإلكتروني (للعملاء)
- ✅ Email + Password (للمسؤولين)
- ✅ حماية المسارات الحساسة

### لوحة الإدارة
- ✅ Dashboard مع إحصاءات حية
- ✅ إدارة المنتجات (إضافة/تعديل/حذف/رفع صور)
- ✅ إدارة الطلبات مع تحديث الحالة
- ✅ قائمة العملاء
- ✅ Supabase Storage للصور

---

## 📋 المهام القادمة

- [ ] إشعارات الطلبات (Resend Email)
- [ ] متغيرات المنتج في لوحة الإدارة
- [ ] كوبونات الخصم
- [ ] تقارير مالية
- [ ] واجهة مندوب التوصيل (PWA)
- [ ] SMS عبر Twilio
- [ ] Domain مخصص
