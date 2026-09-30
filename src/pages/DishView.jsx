import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CaretLeft, CaretRight, Timer, Scales, WarningCircle, CheckCircle } from '@phosphor-icons/react'
import { loc } from '../i18n/site'
import { activeBadge } from './menuHelpers.jsx'
import { ingredientList, hasOwnIngredients, nutrition, prepMinutes, allergensOf } from './dishData'
import { allergenName } from '../data/allergens'
import { Badge, Price } from './DishRow.jsx'
import AddControl from './AddControl.jsx'
import LogoMark from './LogoMark.jsx'
import { PHOTO_NAME } from './viewTransition'

function fmt(n) {
  if (n === null || n === undefined) return '–'
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '')
}

function Nutrition({ it, t }) {
  const n = nutrition(it)
  if (!n) return null
  const parts = [
    ['protein', n.protein, 4],
    ['fat', n.fat, 9],
    ['carbs', n.carbs, 4]
  ].filter(([, v]) => v !== null)
  const energy = parts.reduce((a, [, v, k]) => a + v * k, 0) || 1
  return (
    <section className="lm-dsec">
      <h2 className="lm-dsec-title">{t.nutrition}<span>{t.perPortion(it.weight)}</span></h2>
      <div className="lm-nutri">
        {n.kcal !== null && (
          <div className="lm-kcal">
            <b>{fmt(n.kcal)}</b><span>{t.kcal}{n.estimated ? '*' : ''}</span>
          </div>
        )}
        <div className="lm-macros">
          {parts.map(([key, v, k]) => (
            <div className={`lm-macro lm-macro--${key}`} key={key}>
              <div className="lm-macro-top"><span>{t[key]}</span><b>{fmt(v)} {t.grams}</b></div>
              <div className="lm-macro-bar"><i style={{ width: `${Math.max(4, Math.round((v * k / energy) * 100))}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
      {n.estimated && <p className="lm-dnote">* {t.estimatedKcal}</p>}
    </section>
  )
}

function Allergens({ it, t, lang }) {
  const list = allergensOf(it)
  return (
    <section className="lm-dsec">
      <h2 className="lm-dsec-title">{t.allergens}</h2>
      {list === null && (
        <p className="lm-allergen-state is-unknown"><WarningCircle size={18} weight="bold" />{t.allergensUnknown}</p>
      )}
      {list !== null && list.length === 0 && (
        <p className="lm-allergen-state is-none"><CheckCircle size={18} weight="bold" />{t.allergensNone}</p>
      )}
      {list !== null && list.length > 0 && (
        <>
          <ul className="lm-allergens">
            {list.map(code => <li key={code}>{allergenName(code, lang)}</li>)}
          </ul>
          <p className="lm-dnote">{t.allergensNote}</p>
        </>
      )}
    </section>
  )
}

/** Full-screen dish page, layered over the menu so the menu keeps its
 *  scroll position underneath. Deep-linkable at /dish/:id. */
export default function DishView({ dishId, loaded, byId, catById, itemsByCategory, lang, t, selection, onQty, onClose, onGo }) {
  const it = byId[dishId]
  const backRef = useRef(null)
  const scrollRef = useRef(null)
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => { setImgFailed(false); scrollRef.current?.scrollTo(0, 0) }, [dishId])
  useEffect(() => { backRef.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => {
    const prev = document.title
    if (it) document.title = `${loc(it, lang, 'name')} · LOOK Restobar`
    return () => { document.title = prev }
  }, [it, lang])

  const siblings = it ? (itemsByCategory[it.category_id] || []) : []
  const idx = siblings.findIndex(x => x.id === dishId)
  const prevIt = idx > 0 ? siblings[idx - 1] : null
  const nextIt = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null
  const cat = it ? catById[it.category_id] : null

  let body
  if (!it) {
    body = (
      <div className="lm-dish-missing">
        {loaded ? <p>{t.dishNotFound}</p> : <p className="lm-loading"><span className="lm-spinner" />{t.loading}</p>}
        <button type="button" className="lm-btn" onClick={onClose}>{t.back}</button>
      </div>
    )
  } else {
    const name = loc(it, lang, 'name')
    const oos = activeBadge(it) === 'out_of_stock'
    const prep = prepMinutes(it)
    const ingredients = ingredientList(it, lang)
    const own = hasOwnIngredients(it, lang)
    const desc = loc(it, lang, 'description')
    const hasPhoto = Boolean(it.photo_url) && !imgFailed
    const related = siblings.filter(x => x.id !== it.id).slice(0, 8)
    body = (
      <>
        <div className="lm-dish-grid">
          <figure className={`lm-dish-media${hasPhoto ? '' : ' is-empty'}`}>
            {hasPhoto ? (
              <img src={it.photo_url} alt={name} style={{ viewTransitionName: PHOTO_NAME }} onError={() => setImgFailed(true)} />
            ) : (
              <div className="lm-dish-noimg" aria-hidden="true">
                <LogoMark mono className="lm-dish-noimg-mark" />
                <span>{cat ? loc(cat, lang, 'name') : ''}</span>
              </div>
            )}
            <i className="lm-finder lm-finder--lg" aria-hidden="true" />
          </figure>

          <div className="lm-dish-info">
            <div className="lm-dish-kicker">
              {cat && <span>{cat.emoji ? `${cat.emoji} ` : ''}{loc(cat, lang, 'name')}</span>}
              <Badge it={it} t={t} />
            </div>
            <h1 className="lm-dish-name">{name}</h1>
            <Price it={it} className="lm-price--xl" />

            {(it.weight || prep) && (
              <div className="lm-facts">
                {it.weight && (
                  <div className="lm-fact"><Scales size={18} weight="bold" /><span><b>{it.weight}</b><i>{t.perPortion(null)}</i></span></div>
                )}
                {prep && (
                  <div className="lm-fact lm-fact--prep"><Timer size={18} weight="bold" /><span><b>{t.prepShort(prep)}</b><i>{t.prepLabel}</i></span></div>
                )}
              </div>
            )}
            {prep && <p className="lm-dnote">{t.prepHint}</p>}

            {own && desc && <p className="lm-dish-desc">{desc}</p>}

            {ingredients.length > 0 && (
              <section className="lm-dsec">
                <h2 className="lm-dsec-title">{t.ingredients}</h2>
                <ul className="lm-ingredients">
                  {ingredients.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </section>
            )}

            <Allergens it={it} t={t} lang={lang} />
            <Nutrition it={it} t={t} />

            {related.length > 0 && (
              <section className="lm-dsec">
                <h2 className="lm-dsec-title">{t.moreFrom(cat ? loc(cat, lang, 'name') : '')}</h2>
                <div className="lm-related">
                  {related.map(r => (
                    <button type="button" key={r.id} className="lm-related-item" onClick={() => onGo(r)}>
                      {r.photo_url ? <img src={r.photo_url} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} /> : <span className="lm-related-dot" aria-hidden="true" />}
                      <span className="lm-related-name">{loc(r, lang, 'name')}</span>
                      <Price it={r} />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        <div className="lm-dish-bar">
          <div className="lm-dish-bar-inner">
            <div className="lm-dish-bar-name"><span>{name}</span><Price it={it} /></div>
            <AddControl
              size="lg" qty={selection[it.id] || 0} onChange={(q) => onQty(it.id, q)}
              disabled={oos} t={t} name={name} label={t.addToList}
            />
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="lm-dish" role="dialog" aria-modal="true" aria-label={it ? loc(it, lang, 'name') : t.loading} ref={scrollRef}>
      <div className="lm-dish-top">
        <button type="button" ref={backRef} className="lm-chip-btn" onClick={onClose}>
          <ArrowLeft size={16} weight="bold" /><span>{t.back}</span>
        </button>
        {it && (
          <div className="lm-dish-nav">
            <button type="button" className="lm-icon-btn" disabled={!prevIt} onClick={() => prevIt && onGo(prevIt, true)} aria-label={t.prevDish}><CaretLeft size={18} weight="bold" /></button>
            <span className="lm-dish-pos">{idx + 1}/{siblings.length}</span>
            <button type="button" className="lm-icon-btn" disabled={!nextIt} onClick={() => nextIt && onGo(nextIt, true)} aria-label={t.nextDish}><CaretRight size={18} weight="bold" /></button>
          </div>
        )}
      </div>
      {body}
    </div>
  )
}
