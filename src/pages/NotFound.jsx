import { Link } from 'react-router-dom'
import './Menu.css'

export default function NotFound() {
  return (
    <div className="lm-root" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ display: 'grid', gap: 16, justifyItems: 'start', maxWidth: 520 }}>
        <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(32px, 8vw, 56px)', lineHeight: 1, letterSpacing: '-.03em', margin: 0 }}>404</h1>
        <p style={{ margin: 0, color: 'var(--lm-muted)', fontSize: 17 }}>Pagina nu a fost găsită. Verificați adresa sau întoarceți-vă la meniu.</p>
        <Link to="/" className="lm-btn lm-btn--accent">Înapoi la meniu</Link>
      </div>
    </div>
  )
}
