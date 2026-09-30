import { useEffect, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import SiteFooter from '../SiteFooter.jsx'
import SiteLogo from '../SiteLogo.jsx'
import { SITE_LANGS, SITE_LANG_LABELS, getDict } from '../../i18n/site'
import { LEGAL_KEYS } from './content'
import { useLegalDoc } from '../../content/siteContent'
import '../Menu.css'
import './legal.css'

export default function LegalPage() {
  const { doc } = useParams()
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('look-menu-lang') || 'ro' } catch { return 'ro' } })
  const t = getDict(lang)
  const content = useLegalDoc(LEGAL_KEYS.includes(doc) ? doc : 'terms', lang)

  useEffect(() => { try { localStorage.setItem('look-menu-lang', lang) } catch { /* ignore */ } }, [lang])

  if (!LEGAL_KEYS.includes(doc)) return <Navigate to="/" replace />

  return (
    <div className="lm-root lm-legal">
      <header className="lm-head">
        <div className="lm-wrap lm-head-inner">
          <Link to="/" className="lm-brand" aria-label={t.backToMenu}><SiteLogo /></Link>
          <div className="lm-seg lm-seg--compact" role="group" aria-label={t.switchLang}>
            {SITE_LANGS.map(code => (
              <button type="button" key={code} className={lang === code ? 'is-on' : ''} onClick={() => setLang(code)} aria-pressed={lang === code}>
                {SITE_LANG_LABELS[code]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="lm-wrap lm-legal-main">
        <Link to="/" className="lm-legal-back"><ArrowLeft size={15} weight="bold" />{t.backToMenu}</Link>
        <h1 className="lm-legal-title">{content.title}</h1>
        {content.updated && (
          <p className="lm-legal-updated">{lang === 'ru' ? 'Обновлено' : lang === 'en' ? 'Updated' : 'Actualizat'}: {content.updated}</p>
        )}
        <div className="lm-legal-body">
          {content.sections.map((s, i) => (
            <section key={i} className="lm-legal-section">
              <h2>{s.h}</h2>
              <p>{s.p}</p>
            </section>
          ))}
        </div>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}
