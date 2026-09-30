import { useSiteConfig } from '../content/siteConfig'
import logoHorizontal from '../assets/logo-horizontal.svg'

/** The venue logo — the one uploaded in admin → Design, or the bundled
 *  LOOK wordmark until someone uploads their own. A separate light-mode
 *  version is used on the light theme when one was uploaded. */
export default function SiteLogo({ className = '', scale = 1 }) {
  const { brand, mode } = useSiteConfig()
  const custom = (mode === 'light' && brand.logoLight) || brand.logo
  const src = custom ? custom.url : logoHorizontal
  return (
    <img
      src={src}
      alt="LOOK Restobar & Terrace"
      className={`lm-logo ${className}`}
      style={{ height: Math.round(brand.height * scale) }}
      decoding="async"
    />
  )
}
