import { Plus, Minus } from '@phosphor-icons/react'

/** "+" to put a dish on the guest's list; once it's there, a − n + stepper.
 *  `size="lg"` is the wide version at the bottom of the dish page. */
export default function AddControl({ qty, onChange, disabled, t, name, size = 'md', label }) {
  if (disabled) {
    return <span className={`lm-add lm-add--${size} lm-add--off`}>{t.badgeOutOfStock}</span>
  }
  if (!qty) {
    return (
      <button
        type="button"
        className={`lm-add lm-add--${size}`}
        onClick={(e) => { e.stopPropagation(); onChange(1) }}
        aria-label={`${t.addToList}: ${name}`}
      >
        <Plus size={size === 'lg' ? 18 : 18} weight="bold" />
        {label && <span>{label}</span>}
      </button>
    )
  }
  return (
    <div className={`lm-step lm-step--${size}`} onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => onChange(qty - 1)} aria-label={`${t.less}: ${name}`}><Minus size={15} weight="bold" /></button>
      <span aria-live="polite">{size === 'lg' ? t.inListCount(qty) : qty}</span>
      <button type="button" onClick={() => onChange(qty + 1)} aria-label={`${t.more}: ${name}`}><Plus size={15} weight="bold" /></button>
    </div>
  )
}
