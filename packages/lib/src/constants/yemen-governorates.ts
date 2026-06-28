/**
 * محافظات اليمن — للاستخدام في نماذج العناوين
 */
export const YEMEN_GOVERNORATES = [
  { code: "taiz",        name_ar: "تعز",           name_en: "Taiz"          },
  { code: "sanaa",       name_ar: "صنعاء",          name_en: "Sanaa"         },
  { code: "aden",        name_ar: "عدن",            name_en: "Aden"          },
  { code: "hadhramaut",  name_ar: "حضرموت",         name_en: "Hadhramaut"    },
  { code: "hudaydah",    name_ar: "الحديدة",        name_en: "Hudaydah"      },
  { code: "ibb",         name_ar: "إب",             name_en: "Ibb"           },
  { code: "lahj",        name_ar: "لحج",            name_en: "Lahj"          },
  { code: "shabwah",     name_ar: "شبوة",           name_en: "Shabwah"       },
  { code: "marib",       name_ar: "مأرب",           name_en: "Marib"         },
  { code: "abyan",       name_ar: "أبين",           name_en: "Abyan"         },
  { code: "dhale",       name_ar: "الضالع",         name_en: "Dhale"         },
  { code: "amran",       name_ar: "عمران",          name_en: "Amran"         },
  { code: "dhamar",      name_ar: "ذمار",           name_en: "Dhamar"        },
  { code: "hajjah",      name_ar: "حجة",            name_en: "Hajjah"        },
  { code: "mahwit",      name_ar: "المحويت",        name_en: "Mahwit"        },
  { code: "bayda",       name_ar: "البيضاء",        name_en: "Bayda"         },
  { code: "jawf",        name_ar: "الجوف",          name_en: "Al Jawf"       },
  { code: "mahrah",      name_ar: "المهرة",         name_en: "Al Mahrah"     },
  { code: "saadah",      name_ar: "صعدة",           name_en: "Saadah"        },
  { code: "socotra",     name_ar: "سقطرى",          name_en: "Socotra"       },
  { code: "sanaa_city",  name_ar: "أمانة العاصمة", name_en: "Sanaa City"    },
] as const;

export type GovernorateCode = typeof YEMEN_GOVERNORATES[number]["code"];

/** الحصول على المحافظة بالكود */
export function getGovernorate(code: GovernorateCode) {
  return YEMEN_GOVERNORATES.find((g) => g.code === code);
}
