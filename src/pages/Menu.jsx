import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useMatch, useNavigate } from 'react-router-dom'
import {
  List, X, MagnifyingGlass, ArrowUpRight, Minus, Plus, SlidersHorizontal, Timer, ListChecks, CloudSlash, Check, Copy, Trash
} from '@phosphor-icons/react'
import { fetchMenu } from '../content/publicApi'
import { useContact } from '../content/siteContent'
import { useSiteConfig } from '../content/siteConfig'
import SiteLogo from './SiteLogo.jsx'
import LogoMark from './LogoMark.jsx'
import SiteFooter from './SiteFooter.jsx'
import DishRow from './DishRow.jsx'
import DishView from './DishView.jsx'
import useList from './useList'
import { MENUS, menuName } from '../data/menus'
import { ALLERGENS } from '../data/allergens'
import { fold, activeBadge, effectivePrice } from './menuHelpers.jsx'
import { prepMinutes, allergensOf, FAST_MINUTES } from './dishData'
import { morph, tagPhoto } from './viewTransition'
import { SITE_LANGS, SITE_LANG_LABELS, getDict, loc } from '../i18n/site'
import './Menu.css'

const REFRESH_AFTER = 60e3

/* ------------------------------------------------------------ search --- */
// Every query word must appear somewhere (any order); Cyrillic words of 4+
// letters also match by shared stem (курица ~ куриный). Name matches rank
// above ingredient matches, which rank above category-name matches.
function searchItems(items, catById, query) {
  const qWords = fold(query).trim().split(/\s+/).filter(Boolean)
  if (!qWords.length) return []
  const cyr = /[Ѐ-ӿ]/
  const stemEq = (a, b) => {
    const len = Math.max(3, Math.min(a.length, b.length) - 2)
    return a.length >= len && b.length >= len && a.slice(0, len) === b.slice(0, len)
  }
  const allMatch = (hay) => {
    const words = hay.split(/\s+/).filter(Boolean)
    return qWords.every(w => hay.includes(w) || (w.length >= 4 && cyr.test(w) && words.some(hw => hw.length >= 4 && cyr.test(hw) && stemEq(w, hw))))
  }
  const hay = (parts) => fold(parts.filter(Boolean).join(' '))
  const ranked = []
  items.forEach(it => {
    const tr = it.translations || {}
    const cat = catById[it.category_id]
    const nameHay = hay([it.name, tr.ru?.name, tr.en?.name])
    const bodyHay = hay([nameHay, it.description, it.ingredients, tr.ru?.description, tr.ru?.ingredients, tr.en?.description, tr.en?.ingredients])
    const fullHay = hay([bodyHay, cat?.name, cat?.translations?.ru?.name, cat?.translations?.en?.name])
    const rank = allMatch(nameHay) ? 0 : allMatch(bodyHay) ? 1 : allMatch(fullHay) ? 2 : -1
    if (rank >= 0) ranked.push({ it, rank })
  })
  return ranked.sort((a, b) => a.rank - b.rank).slice(0, 40).map(r => r.it)
}

function passesFilters(it, filters) {
  if (filters.fast) {
    const p = prepMinutes(it)
    if (!p || p > FAST_MINUTES) return false
  }
  if (filters.exclude.length) {
    const a = allergensOf(it)
    if (a === null) return false
    if (a.some(code => filters.exclude.includes(code))) return false
  }
  return true
}

function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return
    const el = document.documentElement
    const prev = el.style.overflow
    el.style.overflow = 'hidden'
    return () => { el.style.overflow = prev }
  }, [locked])
}

export default function Menu() {
  const navigate = useNavigate()
  const location = useLocation()
  const dishMatch = useMatch('/dish/:dishId')
  const dishId = dishMatch?.params.dishId || null
  const { mode, setMode } = useSiteConfig()
  const CONTACT = useContact()

  const [data, setData] = useState({ categories: [], items: [], live: false, offline: false })
  const [loaded, setLoaded] = useState(false)
  const lastLoad = useRef(0)
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('look-menu-lang') || 'ro' } catch { return 'ro' } })
  const list = useList()
  const [activeMenuId, setActiveMenuId] = useState('sala')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState({ fast: false, exclude: [] })
  const [listOpen, setListOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [activeCat, setActiveCat] = useState(null)
  const [flashId, setFlashId] = useState(null)
  const [toast, setToast] = useState('')
  const [headHidden, setHeadHidden] = useState(false)
  const toastTimer = useRef(null)
  const searchInput = useRef(null)
  const spyMuted = useRef(false)
  const spyTimer = useRef(null)
  const navResolve = useRef(null)

  const t = getDict(lang)
  const activeMenu = MENUS.find(m => m.id === activeMenuId) || MENUS[0]
  const { categories, items } = data

  useScrollLock(Boolean(dishId) || searchOpen || filterOpen || listOpen || navOpen)
  useEffect(() => { try { localStorage.setItem('look-menu-lang', lang) } catch { /* ignore */ } document.documentElement.lang = lang }, [lang])

  /* ---- data ---- */
  const load = useCallback((signal) => fetchMenu(signal).then(res => {
    setData(res)
    setLoaded(true)
    lastLoad.current = Date.now()
  }).catch(() => {}), [])

  useEffect(() => {
    const ctrl = new AbortController()
    load(ctrl.signal)
    // A guest who opened the menu an hour ago and comes back to the tab
    // should see this hour's sold-out marks, not the ones from then.
    function onVisible() {
      if (document.visibilityState === 'visible' && Date.now() - lastLoad.current > REFRESH_AFTER) load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => { ctrl.abort(); document.removeEventListener('visibilitychange', onVisible) }
  }, [load])

  const byId = useMemo(() => Object.fromEntries(items.map(it => [it.id, it])), [items])
  const catById = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])
  const allByCategory = useMemo(() => {
    const m = {}
    items.forEach(it => { (m[it.category_id] ||= []).push(it) })
    return m
  }, [items])

  const filterCount = (filters.fast ? 1 : 0) + filters.exclude.length
  const visibleByCategory = useMemo(() => {
    if (!filterCount) return allByCategory
    const m = {}
    items.forEach(it => { if (passesFilters(it, filters)) (m[it.category_id] ||= []).push(it) })
    return m
  }, [items, allByCategory, filters, filterCount])
  const visibleCats = useMemo(() => categories.filter(c => (visibleByCategory[c.id] || []).length), [categories, visibleByCategory])
  const visibleCount = useMemo(() => visibleCats.reduce((a, c) => a + visibleByCategory[c.id].length, 0), [visibleCats, visibleByCategory])
  const hasPrepData = useMemo(() => items.some(it => prepMinutes(it)), [items])
  const hasAllergenData = useMemo(() => items.some(it => allergensOf(it) !== null), [items])
  const canFilter = hasPrepData || hasAllergenData

  // Drop dishes that vanished from the menu or went sold out since the
  // guest put them on their list — they'd otherwise sit there, uncounted
  // in the total but counted in the badge, and break "copy list".
  useEffect(() => {
    if (!loaded) return
    const cur = list.items
    const next = {}
    let removed = 0
    Object.entries(cur).forEach(([id, q]) => {
      const it = byId[id]
      if (it && activeBadge(it) !== 'out_of_stock') next[id] = q; else removed++
    })
    if (removed) {
      list.replace(next)
      showToast(t.listPrunedToast)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, byId])

  const listIds = Object.keys(list.items).filter(id => byId[id])
  const listCount = listIds.reduce((a, id) => a + list.items[id], 0)
  const listTotal = listIds.reduce((a, id) => a + effectivePrice(byId[id]) * list.items[id], 0)
  const listEta = listIds.reduce((a, id) => Math.max(a, prepMinutes(byId[id]) || 0), 0)

  /* ---- toasts ---- */
  function showToast(msg) {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }

  const onQty = useCallback((id, q) => {
    list.setQty(id, q)
  }, [list.setQty]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- header hide on scroll ---- */
  useEffect(() => {
    let lastY = window.scrollY, ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY, d = y - lastY
        if (y < 120) setHeadHidden(false)
        else if (d > 6) setHeadHidden(true)
        else if (d < -6) setHeadHidden(false)
        lastY = y
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ---- scrollspy ---- */
  function muteSpy() {
    spyMuted.current = true
    clearTimeout(spyTimer.current)
    spyTimer.current = setTimeout(() => { spyMuted.current = false }, 160)
  }
  useEffect(() => {
    if (!activeMenu.live || !visibleCats.length) return
    let ticking = false
    function compute() {
      ticking = false
      const nav = document.querySelector('.lm-catbar')
      const refY = (nav ? nav.getBoundingClientRect().bottom : 0) + 12
      let cur = visibleCats[0].id
      for (const c of visibleCats) {
        const el = document.getElementById('sec-' + c.id)
        if (!el) continue
        if (el.getBoundingClientRect().top <= refY) cur = c.id
        else break
      }
      setActiveCat(p => p === cur ? p : cur)
    }
    compute()
    function onScroll() {
      if (spyMuted.current) { muteSpy(); return }
      if (ticking) return
      ticking = true
      requestAnimationFrame(compute)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [activeMenu.live, visibleCats])

  useEffect(() => {
    if (!activeCat) return
    const btn = document.querySelector(`.lm-cat[data-cat="${activeCat}"]`)
    const strip = btn?.parentElement
    if (!btn || !strip) return
    const target = btn.offsetLeft - (strip.clientWidth - btn.offsetWidth) / 2
    strip.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }, [activeCat])

  function scrollToCategory(id) {
    setActiveCat(id)
    muteSpy()
    const el = document.getElementById('sec-' + id)
    if (!el) return
    const bar = document.querySelector('.lm-catbar')
    const y = el.getBoundingClientRect().top + window.scrollY - (bar ? bar.offsetHeight : 0) - 8
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  /* ---- dish page navigation (with photo morph) ---- */
  useLayoutEffect(() => {
    if (navResolve.current) { const r = navResolve.current; navResolve.current = null; r() }
  }, [location.key])

  const waitForNav = (fn) => new Promise(resolve => {
    navResolve.current = resolve
    fn()
    setTimeout(() => { if (navResolve.current === resolve) { navResolve.current = null; resolve() } }, 600)
  })

  const openDish = useCallback((it, thumbEl) => {
    setSearchOpen(false)
    morph(
      () => waitForNav(() => navigate(`/dish/${it.id}`, { state: { fromMenu: true } })),
      { before: () => tagPhoto(thumbEl), after: () => { if (thumbEl) { thumbEl.style.viewTransitionName = '' } } }
    )
  }, [navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  const closeDish = useCallback(() => {
    const id = dishId
    morph(
      () => waitForNav(() => {
        if (location.state && location.state.fromMenu) navigate(-1)
        else navigate('/', { replace: true })
      }),
      { after: () => tagPhoto(document.querySelector(`[data-thumb="${id}"]`)) }
    )
  }, [dishId, location.state, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  const goDish = useCallback((it) => {
    morph(() => waitForNav(() => navigate(`/dish/${it.id}`, { replace: true, state: location.state })))
  }, [navigate, location.state]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- overlays: escape + focus ---- */
  useEffect(() => {
    if (!searchOpen) { setQuery(''); return }
    const id = setTimeout(() => searchInput.current?.focus(), 60)
    return () => clearTimeout(id)
  }, [searchOpen])
  useEffect(() => {
    if (dishId) return
    function onKey(e) {
      if (e.key !== 'Escape') return
      setSearchOpen(false); setFilterOpen(false); setListOpen(false); setNavOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dishId])

  const results = useMemo(() => searchItems(items, catById, query), [items, catById, query])

  async function copyList() {
    if (!listIds.length) { showToast(t.emptyListToast); return }
    const lines = listIds.map(id => `${list.items[id]}× ${loc(byId[id], lang, 'name')} — ${effectivePrice(byId[id]) * list.items[id]} lei`)
    const text = `${t.copyHeader}\n${lines.join('\n')}\n${t.copyTotal}: ${listTotal} lei`
    try { await navigator.clipboard.writeText(text); showToast(t.copiedToast) } catch { showToast(t.copyFailedToast) }
  }

  function toggleExclude(code) {
    setFilters(f => ({ ...f, exclude: f.exclude.includes(code) ? f.exclude.filter(c => c !== code) : [...f.exclude, code] }))
  }

  const sections = useMemo(() => {
    if (!activeMenu.live) return null
    return visibleCats.map(c => (
      <section className="lm-sec" id={`sec-${c.id}`} key={c.id}>
        <header className="lm-sec-head">
          <h2>{c.emoji && <span className="lm-sec-emoji" aria-hidden="true">{c.emoji}</span>}{loc(c, lang, 'name')}</h2>
          <span className="lm-sec-count">{visibleByCategory[c.id].length}</span>
        </header>
        <div className="lm-rows">
          {visibleByCategory[c.id].map(it => (
            <DishRow key={it.id} it={it} lang={lang} t={t} qty={list.items[it.id] || 0} onQty={onQty} onOpen={openDish} flashed={flashId === it.id} />
          ))}
        </div>
      </section>
    ))
  }, [activeMenu.live, visibleCats, visibleByCategory, lang, t, list.items, onQty, openDish, flashId])

  const title = menuName(activeMenu, lang)

  // The emblem on the right of the hero leans toward the pointer (desktop).
  function onHeroPointer(e) {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
    e.currentTarget.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
  }

  return (
    <div className="lm-root" data-dish-open={dishId ? '' : undefined}>
      <header className={`lm-head${headHidden ? ' is-hidden' : ''}`}>
        <div className="lm-wrap lm-head-inner">
          <button type="button" className="lm-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="LOOK Restobar">
            <SiteLogo />
          </button>
          <div className="lm-head-actions">
            {activeMenu.live && (
              <button type="button" className="lm-icon-btn" onClick={() => setSearchOpen(true)} aria-label={t.search}><MagnifyingGlass size={19} weight="bold" /></button>
            )}
            <button type="button" className="lm-icon-btn lm-icon-btn--count" onClick={() => setListOpen(true)} aria-label={t.myList}>
              <ListChecks size={19} weight="bold" />
              {listCount > 0 && <b className="lm-dot-count">{listCount}</b>}
            </button>
            <button type="button" className="lm-icon-btn" onClick={() => setNavOpen(true)} aria-label={t.menuAndSettings}><List size={20} weight="bold" /></button>
          </div>
        </div>
      </header>

      {data.offline && (
        <div className="lm-wrap"><p className="lm-offline"><CloudSlash size={18} weight="bold" />{t.offlineBanner}</p></div>
      )}

      <section className="lm-hero lm-wrap" aria-labelledby="lm-title" onPointerMove={onHeroPointer}>
        <div className="lm-hero-art" aria-hidden="true">
          <i className="lm-finder lm-finder--hero" />
          <LogoMark mono className="lm-hero-eye" />
        </div>
        <h1 id="lm-title" className="lm-hero-title" key={title}>
          {title.split(' ').map((w, i) => <span className="lm-line" key={i}><span style={{ animationDelay: `${i * 90}ms` }}>{w}</span></span>)}
        </h1>
        {activeMenu.live && loaded && (
          <div className="lm-hero-foot">
            <p className="lm-hero-sub">{t.dishCount(items.length, categories.length)}</p>
            <div className="lm-hero-tools">
              <button type="button" className="lm-searchbar" onClick={() => setSearchOpen(true)}>
                <MagnifyingGlass size={18} weight="bold" /><span>{t.searchPlaceholder}</span>
              </button>
              {canFilter && (
                <button type="button" className={`lm-chip-btn${filterCount ? ' is-on' : ''}`} onClick={() => setFilterOpen(true)}>
                  <SlidersHorizontal size={17} weight="bold" /><span>{t.filters}</span>{filterCount > 0 && <b>{filterCount}</b>}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {activeMenu.live && visibleCats.length > 0 && (
        <nav className={`lm-catbar${headHidden ? ' is-top' : ''}`} aria-label={t.drawerCategoriesTitle}>
          <div className="lm-wrap lm-catbar-inner">
            <div className="lm-cats">
              {visibleCats.map(c => (
                <button type="button" key={c.id} data-cat={c.id} className={`lm-cat${activeCat === c.id ? ' is-active' : ''}`} onClick={() => scrollToCategory(c.id)} aria-current={activeCat === c.id ? 'true' : undefined}>
                  {loc(c, lang, 'name')}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      <main id="lm-main" className="lm-wrap lm-main">
        {!loaded && <p className="lm-loading"><span className="lm-spinner" />{t.loading}</p>}

        {!activeMenu.live && (
          <div className="lm-soon">
            <span className="lm-soon-emoji" aria-hidden="true">{activeMenu.emoji}</span>
            <p>{t.menuComingSoonBody}</p>
            <a className="lm-btn lm-btn--accent" href={CONTACT.officialSite} target="_blank" rel="noopener noreferrer">
              {t.menuSeeOfficial}<ArrowUpRight size={15} weight="bold" />
            </a>
          </div>
        )}

        {activeMenu.live && loaded && filterCount > 0 && (
          <div className="lm-filterline">
            <span>{t.filterActive(filterCount)}</span>
            <button type="button" className="lm-link" onClick={() => setFilters({ fast: false, exclude: [] })}>{t.filterClear}</button>
          </div>
        )}
        {activeMenu.live && loaded && filterCount > 0 && visibleCount === 0 && <p className="lm-empty">{t.filterNoResults}</p>}

        {sections}
      </main>

      <SiteFooter lang={lang} />

      {/* Bottom bar: the list, one tap away, whenever it has something in it */}
      <button type="button" className={`lm-listbar${listCount ? ' is-shown' : ''}${dishId ? ' is-under' : ''}`} onClick={() => setListOpen(true)} tabIndex={listCount ? 0 : -1} aria-hidden={listCount ? undefined : 'true'}>
        <span className="lm-listbar-count">{listCount}</span>
        <span className="lm-listbar-label">{t.myList}</span>
        {listEta > 0 && <span className="lm-listbar-eta"><Timer size={14} weight="bold" />{t.prepShort(listEta)}</span>}
        <span className="lm-listbar-total">{listTotal} lei</span>
      </button>

      {/* ---------- search ---------- */}
      <div className={`lm-search${searchOpen ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-label={t.search} aria-hidden={!searchOpen}>
        <div className="lm-wrap lm-search-inner">
          <div className="lm-search-field">
            <MagnifyingGlass size={20} weight="bold" />
            <input ref={searchInput} type="search" inputMode="search" enterKeyHint="search" placeholder={t.searchPlaceholder} value={query} onChange={e => setQuery(e.target.value)} tabIndex={searchOpen ? 0 : -1} />
            <button type="button" className="lm-icon-btn" onClick={() => setSearchOpen(false)} aria-label={t.close} tabIndex={searchOpen ? 0 : -1}><X size={18} weight="bold" /></button>
          </div>
          <div className="lm-search-results">
            {!query.trim() ? <p className="lm-empty">{t.searchHint}</p>
              : results.length === 0 ? <p className="lm-empty">{t.searchEmpty}</p>
                : <div className="lm-rows">{results.map(it => (
                  <DishRow key={it.id} it={it} lang={lang} t={t} qty={list.items[it.id] || 0} onQty={onQty} onOpen={openDish} />
                ))}</div>}
          </div>
        </div>
      </div>

      {/* ---------- filters ---------- */}
      <div className={`lm-scrim${filterOpen ? ' is-open' : ''}`} onClick={() => setFilterOpen(false)} />
      <div className={`lm-sheet${filterOpen ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-label={t.filters} aria-hidden={!filterOpen}>
        <div className="lm-sheet-head">
          <h2>{t.filters}</h2>
          <button type="button" className="lm-icon-btn" onClick={() => setFilterOpen(false)} aria-label={t.close}><X size={18} weight="bold" /></button>
        </div>
        <div className="lm-sheet-body">
          {hasPrepData && (
            <button type="button" className={`lm-toggle${filters.fast ? ' is-on' : ''}`} onClick={() => setFilters(f => ({ ...f, fast: !f.fast }))} aria-pressed={filters.fast}>
              <Timer size={18} weight="bold" /><span>{t.filterFast(FAST_MINUTES)}</span><i className="lm-switch" />
            </button>
          )}
          {hasAllergenData && (
            <>
              <h3 className="lm-sheet-sub">{t.filterExcludeTitle}</h3>
              <div className="lm-chips">
                {ALLERGENS.map(a => (
                  <button type="button" key={a.code} className={`lm-chip${filters.exclude.includes(a.code) ? ' is-on' : ''}`} onClick={() => toggleExclude(a.code)} aria-pressed={filters.exclude.includes(a.code)}>
                    {filters.exclude.includes(a.code) && <X size={12} weight="bold" />}{a[lang] || a.ro}
                  </button>
                ))}
              </div>
              <p className="lm-dnote">{t.filterExcludeHint}</p>
            </>
          )}
        </div>
        <div className="lm-sheet-foot">
          <button type="button" className="lm-btn" onClick={() => setFilters({ fast: false, exclude: [] })} disabled={!filterCount}>{t.filterClear}</button>
          <button type="button" className="lm-btn lm-btn--accent" onClick={() => { setFilterOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>{t.filterShow(visibleCount)}</button>
        </div>
      </div>

      {/* ---------- list ---------- */}
      <div className={`lm-scrim${listOpen ? ' is-open' : ''}`} onClick={() => setListOpen(false)} />
      <div className={`lm-sheet lm-sheet--list${listOpen ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-label={t.waiterTitle} aria-hidden={!listOpen}>
        <div className="lm-sheet-head">
          <div><h2>{t.waiterTitle}</h2><p>{t.waiterSubtitle}</p></div>
          <button type="button" className="lm-icon-btn" onClick={() => setListOpen(false)} aria-label={t.close}><X size={18} weight="bold" /></button>
        </div>
        <div className="lm-sheet-body">
          {listIds.length === 0 ? (
            <div className="lm-empty lm-empty--list"><Plus size={22} weight="bold" /><p>{t.emptyListTitle}<br />{t.emptyListHint}</p></div>
          ) : (
            <ul className="lm-list">
              {listIds.map(id => {
                const it = byId[id]
                const q = list.items[id]
                return (
                  <li key={id} className="lm-list-row">
                    {it.photo_url && <img src={it.photo_url} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />}
                    <button type="button" className="lm-list-name" onClick={() => { setListOpen(false); openDish(it, null) }}>
                      <b>{loc(it, lang, 'name')}</b>
                      <span>{effectivePrice(it)} lei{it.weight ? `, ${it.weight}` : ''}{prepMinutes(it) ? `, ${t.prepShort(prepMinutes(it))}` : ''}</span>
                    </button>
                    <div className="lm-step">
                      <button type="button" onClick={() => onQty(id, q - 1)} aria-label={t.less}>{q === 1 ? <Trash size={14} weight="bold" /> : <Minus size={14} weight="bold" />}</button>
                      <span>{q}</span>
                      <button type="button" onClick={() => onQty(id, q + 1)} aria-label={t.more}><Plus size={14} weight="bold" /></button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {listEta > 0 && (
            <div className="lm-eta">
              <Timer size={20} weight="bold" />
              <div><b>{t.listEta(listEta)}</b><span>{t.listEtaHint}</span></div>
            </div>
          )}
        </div>
        <div className="lm-sheet-foot lm-sheet-foot--list">
          <div className="lm-total"><span>{t.estimatedTotal}</span><b>{listTotal} lei</b></div>
          <div className="lm-sheet-actions">
            <button type="button" className="lm-btn" onClick={list.clear} disabled={!listIds.length}>{t.clear}</button>
            <button type="button" className="lm-btn lm-btn--accent" onClick={copyList} disabled={!listIds.length}><Copy size={16} weight="bold" />{t.copyList}</button>
          </div>
        </div>
      </div>

      {/* ---------- menus + settings ---------- */}
      <div className={`lm-scrim${navOpen ? ' is-open' : ''}`} onClick={() => setNavOpen(false)} />
      <aside className={`lm-drawer${navOpen ? ' is-open' : ''}`} aria-label={t.menuAndSettings} aria-hidden={!navOpen}>
        <div className="lm-sheet-head">
          <h2>{t.menuAndSettings}</h2>
          <button type="button" className="lm-icon-btn" onClick={() => setNavOpen(false)} aria-label={t.close}><X size={18} weight="bold" /></button>
        </div>
        <div className="lm-sheet-body">
          <h3 className="lm-sheet-sub">{t.drawerMenusTitle}</h3>
          <div className="lm-menus">
            {MENUS.map(m => (
              <button type="button" key={m.id} className={`lm-menu-item${m.id === activeMenuId ? ' is-on' : ''}`} onClick={() => { setActiveMenuId(m.id); setNavOpen(false); window.scrollTo({ top: 0 }) }}>
                <span aria-hidden="true">{m.emoji}</span>
                <b>{menuName(m, lang)}</b>
                {!m.live ? <i>{t.menuComingSoon}</i> : m.id === activeMenuId ? <Check size={16} weight="bold" /> : null}
              </button>
            ))}
          </div>

          {activeMenu.live && visibleCats.length > 0 && (
            <>
              <h3 className="lm-sheet-sub">{t.drawerCategoriesTitle}</h3>
              <div className="lm-chips">
                {visibleCats.map(c => (
                  <button type="button" key={c.id} className="lm-chip" onClick={() => { setNavOpen(false); setTimeout(() => scrollToCategory(c.id), 260) }}>
                    {c.emoji ? `${c.emoji} ` : ''}{loc(c, lang, 'name')}
                  </button>
                ))}
              </div>
            </>
          )}

          <h3 className="lm-sheet-sub">{t.switchLang}</h3>
          <div className="lm-seg" role="group" aria-label={t.switchLang}>
            {SITE_LANGS.map(code => (
              <button type="button" key={code} className={lang === code ? 'is-on' : ''} onClick={() => setLang(code)} aria-pressed={lang === code}>{SITE_LANG_LABELS[code]}</button>
            ))}
          </div>

          <h3 className="lm-sheet-sub">{t.theme}</h3>
          <div className="lm-seg" role="group" aria-label={t.theme}>
            <button type="button" className={mode === 'dark' ? 'is-on' : ''} onClick={() => setMode('dark')} aria-pressed={mode === 'dark'}>{t.themeDark}</button>
            <button type="button" className={mode === 'light' ? 'is-on' : ''} onClick={() => setMode('light')} aria-pressed={mode === 'light'}>{t.themeLight}</button>
          </div>
        </div>
      </aside>

      {dishId && (
        <DishView
          key="dish"
          dishId={dishId} loaded={loaded} byId={byId} catById={catById} itemsByCategory={allByCategory}
          lang={lang} t={t} selection={list.items} onQty={onQty} onClose={closeDish} onGo={goDish}
        />
      )}

      <div className={`lm-toast${toast ? ' is-shown' : ''}`} role="status">{toast}</div>
    </div>
  )
}
