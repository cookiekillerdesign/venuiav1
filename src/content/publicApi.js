import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from '../lib/supabaseConfig'
import { SEED_CATEGORIES, SEED_ITEMS } from '../data/seedMenu'

/*
 * Read-only access over PostgREST. Deliberately hand-rolled fetch rather
 * than supabase-js: this runs on every guest's phone, and the only thing it
 * needs is two anonymous GETs. Row Level Security still applies — the anon
 * key can read published rows and nothing else.
 */
async function get(path, signal) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    signal,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json'
    }
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}`)
  return res.json()
}

const CACHE_KEY = 'look-menu-cache-v1'

function readCache() {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (v && Array.isArray(v.categories) && Array.isArray(v.items) && v.categories.length) return v
  } catch { /* ignore */ }
  return null
}

/**
 * Loads the menu.
 *   live: true    fresh from the database
 *   offline: true the database didn't answer — showing the last copy this
 *                 phone saw (or the bundled one), and the UI says so, since
 *                 prices and sold-out marks there may be out of date
 * Every successful load is cached on the device, so a failure shows
 * yesterday's real menu rather than the months-old bundled copy.
 */
export async function fetchMenu(signal) {
  if (!isSupabaseConfigured) {
    return { categories: SEED_CATEGORIES, items: SEED_ITEMS, live: false, offline: false }
  }
  try {
    const [categories, items] = await Promise.all([
      get('menu_categories?select=*&published=eq.true&order=sort_order.asc', signal),
      get('menu_items?select=*&published=eq.true&order=sort_order.asc', signal)
    ])
    if (!categories.length) return { categories: SEED_CATEGORIES, items: SEED_ITEMS, live: false, offline: false }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ categories, items, savedAt: Date.now() })) } catch { /* full or private */ }
    return { categories, items, live: true, offline: false }
  } catch (err) {
    if (err && err.name === 'AbortError') throw err
    const cached = readCache()
    if (cached) return { categories: cached.categories, items: cached.items, live: false, offline: true, savedAt: cached.savedAt }
    return { categories: SEED_CATEGORIES, items: SEED_ITEMS, live: false, offline: true }
  }
}
