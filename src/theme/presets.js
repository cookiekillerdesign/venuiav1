/*
 * Site themes. A theme is two palettes (dark + light) plus a corner radius
 * and the mode a first-time guest sees. The guest can still flip day/night
 * from the menu; the admin decides what both of those look like.
 *
 * Every colour on the public site comes from these ten tokens — nothing in
 * Menu.css is hard-coded — so a theme saved in the admin changes the whole
 * site, not just an accent.
 */

export const TOKENS = [
  { key: 'bg', label: { ro: 'Fundal', ru: 'Фон', en: 'Background' } },
  { key: 'surface', label: { ro: 'Suprafață (panouri)', ru: 'Поверхность (панели)', en: 'Surface (panels)' } },
  { key: 'raised', label: { ro: 'Suprafață ridicată (butoane, câmpuri)', ru: 'Приподнятая поверхность (кнопки, поля)', en: 'Raised surface (buttons, fields)' } },
  { key: 'text', label: { ro: 'Text principal', ru: 'Основной текст', en: 'Main text' } },
  { key: 'muted', label: { ro: 'Text secundar', ru: 'Второстепенный текст', en: 'Secondary text' } },
  { key: 'line', label: { ro: 'Linii și contururi', ru: 'Линии и обводки', en: 'Lines and borders' } },
  { key: 'accent', label: { ro: 'Accent (prețuri, butoane)', ru: 'Акцент (цены, кнопки)', en: 'Accent (prices, buttons)' } },
  { key: 'accentInk', label: { ro: 'Text pe accent', ru: 'Текст на акценте', en: 'Text on accent' } },
  { key: 'accent2', label: { ro: 'Al doilea accent (timp de preparare)', ru: 'Второй акцент (время готовки)', en: 'Second accent (prep time)' } },
  { key: 'danger', label: { ro: 'Avertizare (alergeni, stop)', ru: 'Предупреждение (аллергены, стоп)', en: 'Warning (allergens, sold out)' } }
]

export const PRESETS = [
  {
    id: 'terasa', name: 'Terasa', defaultMode: 'dark', radius: 18,
    dark: { bg: '#0E1B16', surface: '#13241D', raised: '#1A2F26', text: '#F0EADC', muted: '#9FB0A5', line: '#26392F', accent: '#D8B26A', accentInk: '#16110A', accent2: '#8ED1B1', danger: '#FF8A73' },
    light: { bg: '#ECF0EA', surface: '#FFFFFF', raised: '#F4F7F3', text: '#10201A', muted: '#526359', line: '#D2DBD3', accent: '#86652A', accentInk: '#FFFFFF', accent2: '#1C7453', danger: '#BF3A27' }
  },
  {
    id: 'noir', name: 'Noir', defaultMode: 'dark', radius: 14,
    dark: { bg: '#0B0A09', surface: '#151311', raised: '#1E1B18', text: '#F4EEE3', muted: '#A39A8C', line: '#2B2723', accent: '#CFA869', accentInk: '#140F07', accent2: '#E9D7A8', danger: '#FF7B6B' },
    light: { bg: '#F6F3ED', surface: '#FFFFFF', raised: '#FAF8F4', text: '#16130F', muted: '#665E53', line: '#E1DBD1', accent: '#8F6B2E', accentInk: '#FFFFFF', accent2: '#6B5222', danger: '#BA3526' }
  },
  {
    id: 'bordeaux', name: 'Bordeaux', defaultMode: 'dark', radius: 22,
    dark: { bg: '#1A0B10', surface: '#241119', raised: '#2F1621', text: '#F6E9EA', muted: '#C19BA4', line: '#3E2029', accent: '#E8B4A0', accentInk: '#2A0E14', accent2: '#F2D1A8', danger: '#FF8E7E' },
    light: { bg: '#F6EEEE', surface: '#FFFFFF', raised: '#FBF6F6', text: '#2A0E14', muted: '#765260', line: '#E9D8DB', accent: '#8E2B3E', accentInk: '#FFFFFF', accent2: '#A55A26', danger: '#B42318' }
  },
  {
    id: 'cobalt', name: 'Cobalt', defaultMode: 'light', radius: 10,
    dark: { bg: '#080C1F', surface: '#0F1530', raised: '#161E40', text: '#E8ECFF', muted: '#8F98C2', line: '#232C55', accent: '#7C8CFF', accentInk: '#070B1D', accent2: '#3DDBB0', danger: '#FF6B70' },
    light: { bg: '#EEF1F7', surface: '#FFFFFF', raised: '#F5F7FC', text: '#0D1330', muted: '#555E80', line: '#D8DDEB', accent: '#2E4BFF', accentInk: '#FFFFFF', accent2: '#00805F', danger: '#D93036' }
  },
  {
    id: 'contrast', name: 'Contrast', defaultMode: 'dark', radius: 8,
    dark: { bg: '#000000', surface: '#0D0D0D', raised: '#1A1A1A', text: '#FFFFFF', muted: '#D4D4D4', line: '#5C5C5C', accent: '#FFD400', accentInk: '#000000', accent2: '#7CFFB2', danger: '#FF7070' },
    light: { bg: '#FFFFFF', surface: '#FFFFFF', raised: '#F0F0F0', text: '#000000', muted: '#2B2B2B', line: '#8A8A8A', accent: '#0033CC', accentInk: '#FFFFFF', accent2: '#006B3C', danger: '#B00000' }
  }
]

export const DEFAULT_THEME = PRESETS[0]

const HEX = /^#[0-9a-f]{6}$/i

/** Fills anything missing or malformed from the default theme, so a
 *  half-edited or older saved theme can never leave the site uncoloured. */
export function normalizeTheme(t) {
  const base = DEFAULT_THEME
  if (!t || typeof t !== 'object') return base
  const pal = (mode) => {
    const src = (t[mode] && typeof t[mode] === 'object') ? t[mode] : {}
    const out = {}
    TOKENS.forEach(({ key }) => { out[key] = HEX.test(src[key] || '') ? src[key].toUpperCase() : base[mode][key] })
    return out
  }
  const radius = Number.isFinite(Number(t.radius)) ? Math.max(0, Math.min(28, Math.round(Number(t.radius)))) : base.radius
  return {
    id: String(t.id || 'custom'),
    name: String(t.name || 'Custom').slice(0, 40),
    defaultMode: t.defaultMode === 'light' ? 'light' : 'dark',
    radius,
    dark: pal('dark'),
    light: pal('light')
  }
}

/** CSS custom properties for one palette — used by the site (on :root)
 *  and by the admin's live preview (inline on a container). */
export function paletteVars(palette, radius) {
  const vars = {}
  TOKENS.forEach(({ key }) => { vars[`--lm-${key.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}`] = palette[key] })
  vars['--lm-radius'] = `${radius}px`
  return vars
}

function varsToCss(vars) {
  return Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')
}

/** Stylesheet text for both modes. html[data-mode] picks which one is live. */
export function themeCss(theme) {
  const t = normalizeTheme(theme)
  return `:root,:root[data-mode="dark"]{${varsToCss(paletteVars(t.dark, t.radius))};color-scheme:dark}` +
    `:root[data-mode="light"]{${varsToCss(paletteVars(t.light, t.radius))};color-scheme:light}`
}

/* ---- contrast helpers (admin warns when text would be hard to read) ---- */
function lum(hex) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
export function contrast(a, b) {
  if (!HEX.test(a || '') || !HEX.test(b || '')) return 21
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
/** Pairs that must stay readable, with the minimum ratio (WCAG AA). */
export const CONTRAST_CHECKS = [
  ['text', 'bg', 4.5], ['text', 'surface', 4.5], ['muted', 'bg', 3], ['accentInk', 'accent', 4.5], ['accent', 'bg', 3], ['danger', 'surface', 3]
]
