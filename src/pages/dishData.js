import { loc } from '../i18n/site'

/** Ingredients as a clean list. Uses the dedicated `ingredients` field when
 *  filled; otherwise the description — on this menu the description IS the
 *  ingredient list, copied from the printed menu. */
export function ingredientList(it, lang) {
  const own = loc(it, lang, 'ingredients')
  const src = own || loc(it, lang, 'description')
  return String(src || '')
    .split(/[,;\n]+/)
    .map(s => s.trim().replace(/\.$/, ''))
    .filter(Boolean)
}

/** True when the dish has its own ingredients field, so the description can
 *  be shown as prose above it without repeating the same words. */
export function hasOwnIngredients(it, lang) {
  return Boolean(loc(it, lang, 'ingredients'))
}

const num = (v) => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)

/** Nutrition per portion. kcal is computed from the macros (4/9/4) when
 *  only those were filled in, and flagged as estimated. */
export function nutrition(it) {
  const protein = num(it.protein), fat = num(it.fat), carbs = num(it.carbs)
  let kcal = num(it.kcal)
  let estimated = false
  if (kcal === null && protein !== null && fat !== null && carbs !== null) {
    kcal = Math.round(protein * 4 + fat * 9 + carbs * 4)
    estimated = true
  }
  if (kcal === null && protein === null && fat === null && carbs === null) return null
  return { kcal, protein, fat, carbs, estimated }
}

export function prepMinutes(it) {
  const n = num(it.prep_minutes)
  return n && n > 0 ? Math.round(n) : null
}

/** null = not specified; [] = checked, none of the 14. */
export function allergensOf(it) {
  return Array.isArray(it.allergens) ? it.allergens : null
}

export const FAST_MINUTES = 15
