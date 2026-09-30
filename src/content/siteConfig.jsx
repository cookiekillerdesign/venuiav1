import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from '../lib/supabaseConfig'
import { normalizeTheme, themeCss, DEFAULT_THEME } from '../theme/presets'

/*
 * Theme + logo set from the admin "Design" page (site_content rows 'theme'
 * and 'brand'). The last copy is cached on the guest's phone and applied
 * before React even renders (see applyCachedConfig in main.jsx), so a
 * returning guest never sees the default colours flash before theirs.
 */

const CACHE_KEY = 'look-site-config-v1'
const MODE_KEY = 'look-menu-theme' // same key the old day/night toggle used: '' | 'light' | 'dark'

export const DEFAULT_BRAND = { logo: null, logoLight: null, height: 34 }

export function normalizeBrand(b) {
  if (!b || typeof b !== 'object') return DEFAULT_BRAND
  const img = (x) => (x && typeof x.url === 'string' && x.url ? { url: x.url, path: x.path || null } : null)
  const h = Number(b.height)
  return { logo: img(b.logo), logoLight: img(b.logoLight), height: Number.isFinite(h) ? Math.max(20, Math.min(72, Math.round(h))) : 34 }
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    return { theme: normalizeTheme(v.theme), brand: normalizeBrand(v.brand) }
  } catch { return null }
}

function writeCache(cfg) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cfg)) } catch { /* private mode */ }
}

export function applyTheme(theme) {
  let el = document.getElementById('lm-theme-vars')
  if (!el) {
    el = document.createElement('style')
    el.id = 'lm-theme-vars'
    document.head.appendChild(el)
  }
  el.textContent = themeCss(theme)
}

export function readModePref() {
  try { const v = localStorage.getItem(MODE_KEY); return v === 'light' || v === 'dark' ? v : '' } catch { return '' }
}

export function applyMode(mode, theme) {
  document.documentElement.setAttribute('data-mode', mode)
  // Phone browser chrome (address bar) follows the site background.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta && theme) meta.setAttribute('content', normalizeTheme(theme)[mode === 'light' ? 'light' : 'dark'].bg)
}

/** Called from main.jsx before the first render. */
export function applyCachedConfig() {
  const cfg = readCache() || { theme: DEFAULT_THEME, brand: DEFAULT_BRAND }
  applyTheme(cfg.theme)
  applyMode(readModePref() || cfg.theme.defaultMode, cfg.theme)
  return cfg
}

async function fetchConfig(signal) {
  if (!isSupabaseConfigured) return null
  const res = await fetch(`${SUPABASE_URL}/rest/v1/site_content?select=id,data&id=in.(theme,brand)`, {
    signal,
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}`)
  const rows = await res.json()
  const byId = Object.fromEntries((rows || []).map(r => [r.id, r.data]))
  return {
    theme: normalizeTheme(byId.theme?.current || DEFAULT_THEME),
    brand: normalizeBrand(byId.brand)
  }
}

const Ctx = createContext(null)

export function SiteConfigProvider({ children, initial }) {
  const [cfg, setCfg] = useState(initial || readCache() || { theme: DEFAULT_THEME, brand: DEFAULT_BRAND })
  const [modePref, setModePref] = useState(readModePref)
  const mode = modePref || cfg.theme.defaultMode

  useEffect(() => {
    const ctrl = new AbortController()
    fetchConfig(ctrl.signal).then(next => {
      if (!next) return
      setCfg(next)
      writeCache(next)
    }).catch(() => { /* keep the cached/default look */ })
    return () => ctrl.abort()
  }, [])

  useEffect(() => { applyTheme(cfg.theme) }, [cfg.theme])
  useEffect(() => { applyMode(mode, cfg.theme) }, [mode, cfg.theme])

  const setMode = useCallback((m) => {
    setModePref(m)
    try { localStorage.setItem(MODE_KEY, m) } catch { /* ignore */ }
  }, [])

  return <Ctx.Provider value={{ ...cfg, mode, setMode }}>{children}</Ctx.Provider>
}

export function useSiteConfig() {
  const v = useContext(Ctx)
  if (!v) return { theme: DEFAULT_THEME, brand: DEFAULT_BRAND, mode: 'dark', setMode: () => {} }
  return v
}
