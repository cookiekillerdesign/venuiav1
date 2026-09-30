import { useCallback, useEffect, useState } from 'react'

/*
 * The guest's list, kept on their phone. It expires 12 hours after the last
 * change — a list from last week's visit shouldn't greet them at the table
 * today. (The old unversioned key held a bare {id: qty} map with no age, so
 * it's simply left behind.)
 */
const KEY = 'look-menu-list-v2'
const TTL = 12 * 3600e3

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (v && v.items && typeof v.items === 'object' && Date.now() - (v.ts || 0) < TTL) return v.items
  } catch { /* ignore */ }
  return {}
}

export default function useList() {
  const [items, setItems] = useState(read)
  useEffect(() => {
    try {
      if (Object.keys(items).length) localStorage.setItem(KEY, JSON.stringify({ items, ts: Date.now() }))
      else localStorage.removeItem(KEY)
    } catch { /* private mode */ }
  }, [items])

  const setQty = useCallback((id, qty) => {
    setItems(cur => {
      const q = Math.max(0, Math.min(99, Math.round(qty) || 0))
      if ((cur[id] || 0) === q) return cur
      const next = { ...cur }
      if (q === 0) delete next[id]; else next[id] = q
      return next
    })
  }, [])

  const clear = useCallback(() => setItems({}), [])

  return { items, setQty, clear, replace: setItems }
}
