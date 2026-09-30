import { useEffect, useMemo, useState } from 'react'
import { Moon, Sun, Check, Trash, ArrowCounterClockwise, FloppyDisk, RocketLaunch, Timer, WarningCircle } from '@phosphor-icons/react'
import { getSiteContent, saveSiteContent, removeStorageObjects } from '../api'
import { PRESETS, TOKENS, DEFAULT_THEME, normalizeTheme, paletteVars, contrast, CONTRAST_CHECKS } from '../../theme/presets'
import { normalizeBrand, DEFAULT_BRAND } from '../../content/siteConfig'
import MediaDrop from '../components/MediaDrop'
import Confirm from '../components/Confirm'
import { useToast } from '../components/Toasts'
import { useAdminLang } from '../i18n.jsx'
import logoDefault from '../../assets/logo-horizontal.svg'

const LOGO_MIME = 'image/svg+xml,image/png,image/jpeg,image/webp'
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function Swatches({ theme, mode }) {
  const p = theme[mode]
  return (
    <span className="adm-tswatch" style={{ background: p.bg }}>
      <i style={{ background: p.surface }} />
      <i style={{ background: p.text }} />
      <i style={{ background: p.accent }} />
      <i style={{ background: p.accent2 }} />
    </span>
  )
}

/** A miniature of the public menu, painted with the draft palette. */
function ThemePreview({ theme, mode, logo }) {
  const p = theme[mode]
  const style = { ...paletteVars(p, theme.radius) }
  return (
    <div className="adm-tp" style={style}>
      <div className="adm-tp-head">
        <img src={logo} alt="" />
        <span className="adm-tp-ic" /><span className="adm-tp-ic" />
      </div>
      <div className="adm-tp-title">Meniu Sala</div>
      <div className="adm-tp-search">Caută un preparat…</div>
      <div className="adm-tp-cats"><b>Gustări</b><span>Salate</span><span>Supe</span></div>
      <div className="adm-tp-sec">Gustări</div>
      {[['Vitello Tonnato', 'Mușchiuleț de vită, capere, sos tonnato', 200, 15, 'recommended'], ['Tartar de somon', 'Somon, avocado, castraveți, susan', 190, 10, null]].map(([n, d, pr, pm, b], i) => (
        <div className="adm-tp-row" key={n}>
          <div>
            {b && <span className="adm-tp-badge">★ Recomandat</span>}
            <b>{n}</b>
            <small>{d}</small>
            <em><Timer size={11} weight="bold" /> {pm} min</em>
          </div>
          <div className="adm-tp-side">
            <strong>{pr}</strong>
            {i === 0 ? <span className="adm-tp-step">−  1  +</span> : <span className="adm-tp-add">+</span>}
          </div>
        </div>
      ))}
      <div className="adm-tp-allergen"><i />Gluten</div>
      <div className="adm-tp-bar"><span>1</span><b>Lista mea</b><strong>200 lei</strong></div>
    </div>
  )
}

export default function DesignPage() {
  const { t, lang } = useAdminLang()
  const d = t.design
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [published, setPublished] = useState(DEFAULT_THEME)
  const [saved, setSaved] = useState([])
  const [draft, setDraft] = useState(DEFAULT_THEME)
  const [mode, setMode] = useState('dark')
  const [busy, setBusy] = useState(false)
  const [naming, setNaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [brand, setBrand] = useState(DEFAULT_BRAND)
  const [heightDraft, setHeightDraft] = useState(DEFAULT_BRAND.height)

  useEffect(() => {
    let cancelled = false
    Promise.all([getSiteContent('theme'), getSiteContent('brand')])
      .then(([themeRow, brandRow]) => {
        if (cancelled) return
        const cur = normalizeTheme(themeRow?.data?.current || DEFAULT_THEME)
        setPublished(cur)
        setDraft(cur)
        setMode(cur.defaultMode)
        setSaved(Array.isArray(themeRow?.data?.saved) ? themeRow.data.saved.map(normalizeTheme) : [])
        const b = normalizeBrand(brandRow?.data)
        setBrand(b)
        setHeightDraft(b.height)
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const dirty = !same(draft, published)
  const warnings = useMemo(() => {
    const label = (k) => (TOKENS.find(x => x.key === k)?.label[lang]) || k
    const out = []
    ;['dark', 'light'].forEach(m => {
      CONTRAST_CHECKS.forEach(([a, b, min]) => {
        const r = contrast(draft[m][a], draft[m][b])
        if (r < min) out.push({ m, text: d.contrastWarn(label(a), label(b), r.toFixed(1)) })
      })
    })
    return out
  }, [draft, lang, d])

  async function persistTheme(nextCurrent, nextSaved) {
    await saveSiteContent('theme', { current: nextCurrent, saved: nextSaved })
  }

  async function publish() {
    setBusy(true)
    try {
      await persistTheme(draft, saved)
      setPublished(draft)
      toast.success(d.publishedToast)
    } catch (err) { toast.error(err) }
    setBusy(false)
  }

  async function saveAsMine() {
    const name = newName.trim()
    if (!name) return
    const theme = normalizeTheme({ ...draft, id: `custom-${Date.now().toString(36)}`, name })
    const nextSaved = [...saved, theme]
    setBusy(true)
    try {
      await persistTheme(published, nextSaved)
      setSaved(nextSaved)
      setDraft(theme)
      setNaming(false)
      setNewName('')
      toast.success(d.savedToast)
    } catch (err) { toast.error(err) }
    setBusy(false)
  }

  async function deleteMine() {
    const target = pendingDelete
    const nextSaved = saved.filter(x => x.id !== target.id)
    setBusy(true)
    try {
      await persistTheme(published, nextSaved)
      setSaved(nextSaved)
      setPendingDelete(null)
    } catch (err) { toast.error(err) }
    setBusy(false)
  }

  function load(theme) {
    setDraft(normalizeTheme(theme))
    setMode(theme.defaultMode || 'dark')
  }

  function setToken(key, value) {
    setDraft(cur => ({ ...cur, [mode]: { ...cur[mode], [key]: value } }))
  }

  async function saveBrand(next, oldPaths = []) {
    const clean = normalizeBrand(next)
    try {
      await saveSiteContent('brand', clean)
      setBrand(clean)
      if (oldPaths.length) await removeStorageObjects(oldPaths.filter(Boolean))
      toast.success(d.logoSavedToast)
    } catch (err) { toast.error(err) }
  }

  if (error) return <div className="adm-note adm-note--danger"><b>{t.common.error}</b>{error}</div>
  if (loading) return <div className="adm-loading"><span className="adm-spinner" />{t.common.loading}</div>

  const logoForPreview = (mode === 'light' && brand.logoLight?.url) || brand.logo?.url || logoDefault
  const cardState = (th) => [
    same(normalizeTheme(th), published) && d.live,
    same(normalizeTheme(th), draft) && d.inEditor
  ].filter(Boolean).join(', ')

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>{d.title}</h1>
          <p className="adm-lede" style={{ marginBottom: 0 }}>{d.lede}</p>
        </div>
      </div>

      {/* ------------------------------------------------ themes */}
      <div className="adm-panel" style={{ marginBottom: 18 }}>
        <div className="adm-panel-head"><h2>{d.themesTitle}</h2></div>
        <span className="adm-label">{d.builtIn}</span>
        <div className="adm-tgrid">
          {PRESETS.map(th => (
            <button type="button" key={th.id} className={`adm-tcard${same(normalizeTheme(th), draft) ? ' on' : ''}`} onClick={() => load(th)}>
              <Swatches theme={th} mode={th.defaultMode} />
              <b>{th.name}</b>
              <small>{cardState(th) || '\u00a0'}</small>
            </button>
          ))}
        </div>
        <span className="adm-label" style={{ marginTop: 18, display: 'block' }}>{d.myThemes}</span>
        {saved.length === 0 ? <p className="adm-hint">{d.noMyThemes}</p> : (
          <div className="adm-tgrid">
            {saved.map(th => (
              <div key={th.id} className={`adm-tcard${same(th, draft) ? ' on' : ''}`}>
                <button type="button" className="adm-tcard-main" onClick={() => load(th)}>
                  <Swatches theme={th} mode={th.defaultMode} />
                  <b>{th.name}</b>
                  <small>{cardState(th) || '\u00a0'}</small>
                </button>
                <button type="button" className="adm-tcard-del" onClick={() => setPendingDelete(th)} aria-label={`${d.deleteTheme}: ${th.name}`}><Trash size={13} weight="bold" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------ editor + preview */}
      <div className="adm-design">
        <div className="adm-panel">
          <div className="adm-panel-head">
            <h2>{d.editorTitle}</h2>
            <span className={`adm-pill ${dirty ? 'adm-pill--warn' : 'adm-pill--live'}`}>{dirty ? d.dirtyState : d.publishedState}</span>
          </div>

          <div className="adm-tabs">
            <button type="button" className={`adm-tab${mode === 'dark' ? ' active' : ''}`} onClick={() => setMode('dark')}><Moon size={13} weight="bold" style={{ verticalAlign: -2, marginRight: 6 }} />{d.modeDark}</button>
            <button type="button" className={`adm-tab${mode === 'light' ? ' active' : ''}`} onClick={() => setMode('light')}><Sun size={13} weight="bold" style={{ verticalAlign: -2, marginRight: 6 }} />{d.modeLight}</button>
          </div>

          <div className="adm-colors">
            {TOKENS.map(({ key, label }) => (
              <label className="adm-color" key={key}>
                <input type="color" value={draft[mode][key]} onChange={e => setToken(key, e.target.value.toUpperCase())} aria-label={label[lang] || label.ro} />
                <span className="adm-color-label">{label[lang] || label.ro}</span>
                <input
                  className="adm-input adm-color-hex" value={draft[mode][key]} spellCheck={false} maxLength={7}
                  onChange={e => { const v = e.target.value.trim(); if (/^#[0-9a-f]{6}$/i.test(v)) setToken(key, v.toUpperCase()); else setDraft(cur => ({ ...cur, [mode]: { ...cur[mode], [key]: v } })) }}
                  onBlur={() => setDraft(cur => normalizeTheme({ ...cur, [mode]: { ...cur[mode], [key]: /^#[0-9a-f]{6}$/i.test(cur[mode][key]) ? cur[mode][key] : published[mode][key] } }))}
                />
              </label>
            ))}
          </div>

          <div className="adm-row" style={{ marginTop: 18 }}>
            <label className="adm-field">
              <span className="adm-label">{d.radius}: {draft.radius}px</span>
              <input type="range" min="0" max="28" step="1" value={draft.radius} onChange={e => setDraft(cur => ({ ...cur, radius: Number(e.target.value) }))} className="adm-range" />
            </label>
            <label className="adm-field">
              <span className="adm-label">{d.defaultMode}</span>
              <select className="adm-select" value={draft.defaultMode} onChange={e => setDraft(cur => ({ ...cur, defaultMode: e.target.value }))}>
                <option value="dark">{d.modeDark}</option>
                <option value="light">{d.modeLight}</option>
              </select>
            </label>
          </div>

          {warnings.length > 0 && (
            <div className="adm-note" style={{ marginTop: 6 }}>
              {warnings.map((w, i) => <div key={i}><WarningCircle size={13} weight="bold" style={{ verticalAlign: -2, marginRight: 6, color: 'var(--a-warn)' }} />{w.m === 'dark' ? d.modeDark : d.modeLight}: {w.text}</div>)}
            </div>
          )}

          <div className="adm-actions" style={{ marginTop: 18, flexWrap: 'wrap' }}>
            <button type="button" className="adm-btn adm-btn--primary" disabled={busy || !dirty} onClick={publish}><RocketLaunch size={14} weight="bold" />{d.publish}</button>
            <button type="button" className="adm-btn" disabled={busy} onClick={() => setNaming(n => !n)}><FloppyDisk size={14} weight="bold" />{d.saveAs}</button>
            <button type="button" className="adm-btn adm-btn--ghost" disabled={busy || !dirty} onClick={() => load(published)}><ArrowCounterClockwise size={14} weight="bold" />{d.revert}</button>
          </div>

          {naming && (
            <div className="adm-row" style={{ marginTop: 14, alignItems: 'end' }}>
              <label className="adm-field" style={{ marginBottom: 0 }}>
                <span className="adm-label">{d.themeName}</span>
                <input className="adm-input" autoFocus value={newName} placeholder={d.themeNamePh} maxLength={40} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveAsMine() }} />
              </label>
              <div><button type="button" className="adm-btn adm-btn--primary" disabled={busy || !newName.trim()} onClick={saveAsMine}><Check size={14} weight="bold" />{d.save}</button></div>
            </div>
          )}
        </div>

        <div className="adm-panel adm-design-preview">
          <div className="adm-panel-head"><h2>{d.preview}</h2><span className="adm-hint">{mode === 'dark' ? d.modeDark : d.modeLight}</span></div>
          <ThemePreview theme={normalizeTheme(draft)} mode={mode} logo={logoForPreview} />
        </div>
      </div>

      {/* ------------------------------------------------ logo */}
      <div className="adm-panel" style={{ marginTop: 18 }}>
        <div className="adm-panel-head"><h2>{d.logoTitle}</h2></div>
        <p className="adm-hint" style={{ marginTop: -6, marginBottom: 18 }}>{d.logoLede}</p>

        <div className="adm-logo-grid">
          <div>
            <span className="adm-label">{d.logoMain}</span>
            <div className="adm-logo-previews">
              <div className="adm-logo-prev is-dark"><img src={brand.logo?.url || logoDefault} alt="" style={{ height: heightDraft }} /><small>{d.onDark}</small></div>
              <div className="adm-logo-prev is-light"><img src={brand.logoLight?.url || brand.logo?.url || logoDefault} alt="" style={{ height: heightDraft }} /><small>{d.onLight}</small></div>
            </div>
            {!brand.logo && <p className="adm-hint" style={{ margin: '8px 0 12px' }}>{d.logoDefault}</p>}
            <MediaDrop
              folder="brand" accept={LOGO_MIME} maxDimension={1200}
              title={d.logoDrop} subtitle={d.logoDropSub}
              onUploaded={(r) => saveBrand({ ...brand, logo: { url: r.url, path: r.path } }, [brand.logo?.path])}
            />
            {brand.logo && (
              <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" style={{ marginTop: 10 }} onClick={() => saveBrand({ ...brand, logo: null }, [brand.logo?.path])}>
                <ArrowCounterClockwise size={12} weight="bold" />{d.logoReset}
              </button>
            )}
          </div>

          <div>
            <span className="adm-label">{d.logoLight}</span>
            <p className="adm-hint" style={{ margin: '2px 0 12px' }}>{d.logoLightHint}</p>
            <MediaDrop
              folder="brand" accept={LOGO_MIME} maxDimension={1200}
              title={d.logoDrop} subtitle={d.logoDropSub}
              onUploaded={(r) => saveBrand({ ...brand, logoLight: { url: r.url, path: r.path } }, [brand.logoLight?.path])}
            />
            {brand.logoLight && (
              <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" style={{ marginTop: 10 }} onClick={() => saveBrand({ ...brand, logoLight: null }, [brand.logoLight?.path])}>
                <Trash size={12} weight="bold" />{d.logoRemove}
              </button>
            )}

            <label className="adm-field" style={{ marginTop: 22 }}>
              <span className="adm-label">{d.logoHeight}: {heightDraft}px</span>
              <input
                type="range" min="20" max="72" step="1" className="adm-range" value={heightDraft}
                onChange={e => setHeightDraft(Number(e.target.value))}
                onMouseUp={() => heightDraft !== brand.height && saveBrand({ ...brand, height: heightDraft })}
                onTouchEnd={() => heightDraft !== brand.height && saveBrand({ ...brand, height: heightDraft })}
                onKeyUp={() => heightDraft !== brand.height && saveBrand({ ...brand, height: heightDraft })}
              />
            </label>
          </div>
        </div>
      </div>

      <Confirm
        open={Boolean(pendingDelete)}
        title={pendingDelete ? d.deleteThemeTitle(pendingDelete.name) : ''}
        body={d.deleteThemeBody}
        busy={busy}
        onConfirm={deleteMine}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}

