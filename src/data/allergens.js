/*
 * The 14 allergens EU rules require restaurants to declare (Reg. 1169/2011,
 * Annex II). Fixed list on purpose: the admin ticks codes, and each code's
 * name exists once here in all three languages — so the RO, RU and EN menus
 * can never disagree about what a dish contains.
 */
export const ALLERGENS = [
  { code: 'gluten', ro: 'Gluten', ru: 'Глютен', en: 'Gluten' },
  { code: 'crustaceans', ro: 'Crustacee', ru: 'Ракообразные', en: 'Crustaceans' },
  { code: 'eggs', ro: 'Ouă', ru: 'Яйца', en: 'Eggs' },
  { code: 'fish', ro: 'Pește', ru: 'Рыба', en: 'Fish' },
  { code: 'peanuts', ro: 'Arahide', ru: 'Арахис', en: 'Peanuts' },
  { code: 'soy', ro: 'Soia', ru: 'Соя', en: 'Soy' },
  { code: 'milk', ro: 'Lapte (lactoză)', ru: 'Молоко (лактоза)', en: 'Milk (lactose)' },
  { code: 'nuts', ro: 'Nuci', ru: 'Орехи', en: 'Tree nuts' },
  { code: 'celery', ro: 'Țelină', ru: 'Сельдерей', en: 'Celery' },
  { code: 'mustard', ro: 'Muștar', ru: 'Горчица', en: 'Mustard' },
  { code: 'sesame', ro: 'Susan', ru: 'Кунжут', en: 'Sesame' },
  { code: 'sulphites', ro: 'Sulfiți', ru: 'Сульфиты', en: 'Sulphites' },
  { code: 'lupin', ro: 'Lupin', ru: 'Люпин', en: 'Lupin' },
  { code: 'molluscs', ro: 'Moluște', ru: 'Моллюски', en: 'Molluscs' }
]

export const ALLERGEN_CODES = ALLERGENS.map(a => a.code)

export function allergenName(code, lang) {
  const a = ALLERGENS.find(x => x.code === code)
  return a ? (a[lang] || a.ro) : code
}
