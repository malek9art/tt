export const YEMEN_GOVERNORATES = [
  { code: "taiz",       name_ar: "تعز" },
  { code: "sanaa",      name_ar: "صنعاء" },
  { code: "aden",       name_ar: "عدن" },
  { code: "hadhramaut", name_ar: "حضرموت" },
  { code: "hudaydah",   name_ar: "الحديدة" },
  { code: "ibb",        name_ar: "إب" },
  { code: "lahj",       name_ar: "لحج" },
  { code: "shabwah",    name_ar: "شبوة" },
  { code: "marib",      name_ar: "مأرب" },
  { code: "abyan",      name_ar: "أبين" },
  { code: "dhale",      name_ar: "الضالع" },
  { code: "amran",      name_ar: "عمران" },
  { code: "dhamar",     name_ar: "ذمار" },
  { code: "hajjah",     name_ar: "حجة" },
  { code: "bayda",      name_ar: "البيضاء" },
  { code: "jawf",       name_ar: "الجوف" },
  { code: "saadah",     name_ar: "صعدة" },
  { code: "socotra",    name_ar: "سقطرى" },
  { code: "sanaa_city", name_ar: "أمانة العاصمة" },
] as const;

export type GovernorateCode = typeof YEMEN_GOVERNORATES[number]["code"];
