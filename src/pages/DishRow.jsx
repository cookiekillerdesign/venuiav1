import { memo, useState } from 'react'
import { Timer } from '@phosphor-icons/react'
import { loc } from '../i18n/site'
import { activeBadge, BadgeIcon, effectivePrice } from './menuHelpers.jsx'
import { prepMinutes } from './dishData'
import AddControl from './AddControl.jsx'

export function Badge({ it, t }) {
  const badge = activeBadge(it)
  if (!badge) return null
  return (
    <span className={`lm-badge lm-badge--${badge}`}>
      <i><BadgeIcon type={badge} /></i>
      {badge === 'recommended' && t.recommended}
      {badge === 'new' && t.badgeNew}
      {badge === 'out_of_stock' && t.badgeOutOfStock}
      {badge === 'discount' && t.badgeDiscount(it.discount_percent)}
    </span>
  )
}

export function Price({ it, className = '' }) {
  const hasDiscount = activeBadge(it) === 'discount' && it.discount_percent > 0
  return (
    <span className={`lm-price ${className}`}>
      {hasDiscount && <s>{it.price}</s>}
      <b>{effectivePrice(it)}</b><i>lei</i>
    </span>
  )
}

/** One dish in the menu list. The whole row opens the dish page; the "+"
 *  on the right adds it to the list without leaving the menu. */
function DishRow({ it, lang, t, qty, onQty, onOpen, flashed }) {
  const [imgFailed, setImgFailed] = useState(false)
  const oos = activeBadge(it) === 'out_of_stock'
  const name = loc(it, lang, 'name')
  const desc = loc(it, lang, 'description')
  const prep = prepMinutes(it)
  const hasPhoto = Boolean(it.photo_url) && !imgFailed
  return (
    <article className={`lm-row${oos ? ' is-oos' : ''}${flashed ? ' is-flash' : ''}${hasPhoto ? '' : ' no-photo'}`} id={`item-${it.id}`}>
      <button type="button" className="lm-row-main" onClick={(e) => onOpen(it, e.currentTarget.querySelector('[data-thumb]'))} aria-label={t.openDish(name)}>
        {hasPhoto && (
          <span className="lm-thumb" data-thumb={it.id}>
            <img src={it.photo_url} alt="" loading="lazy" decoding="async" onError={() => setImgFailed(true)} />
            <i className="lm-finder" aria-hidden="true" />
          </span>
        )}
        <span className="lm-row-text">
          {!oos && <Badge it={it} t={t} />}
          <span className="lm-row-name">{name}</span>
          {desc && <span className="lm-row-desc">{desc}</span>}
          {(it.weight || prep) && (
            <span className="lm-row-meta">
              {it.weight && <span>{it.weight}</span>}
              {prep && <span className="lm-prep"><Timer size={13} weight="bold" />{t.prepShort(prep)}</span>}
            </span>
          )}
        </span>
      </button>
      <div className="lm-row-side">
        <Price it={it} />
        <AddControl qty={qty} onChange={(q) => onQty(it.id, q)} disabled={oos} t={t} name={name} />
      </div>
    </article>
  )
}

export default memo(DishRow)
