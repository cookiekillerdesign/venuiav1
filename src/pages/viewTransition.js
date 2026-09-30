/*
 * Photo morph between the menu row and the dish page, via the browser's
 * View Transitions API (Chrome/Edge, Safari 18+). Everywhere else — and for
 * anyone with "reduce motion" on — the update simply happens instantly.
 *
 * `update` returns a promise that resolves once React has committed the new
 * screen (Menu.jsx resolves it from a layout effect on location change), so
 * the browser captures the finished page, not a half-rendered one.
 */
export const PHOTO_NAME = 'lm-dish-photo'

export function canMorph() {
  return typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function morph(update, { before, after } = {}) {
  if (!canMorph()) { update(); return }
  before && before()
  let vt
  try {
    vt = document.startViewTransition(async () => {
      await update()
      after && after()
    })
  } catch {
    update()
    return
  }
  vt.finished.catch(() => {}).finally(() => {
    document.querySelectorAll('[data-vt-temp]').forEach(el => {
      el.style.viewTransitionName = ''
      el.removeAttribute('data-vt-temp')
    })
  })
}

/** Gives one element the shared photo name for the duration of a transition. */
export function tagPhoto(el) {
  if (!el) return
  el.style.viewTransitionName = PHOTO_NAME
  el.setAttribute('data-vt-temp', '')
}

export function untagPhoto(el) {
  if (!el) return
  el.style.viewTransitionName = ''
  el.removeAttribute('data-vt-temp')
}
