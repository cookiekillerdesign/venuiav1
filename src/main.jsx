import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/unbounded'
import '@fontsource-variable/onest'
import '@fontsource-variable/tiktok-sans/wght.css'
import App from './App.jsx'
import { applyCachedConfig, SiteConfigProvider } from './content/siteConfig'
import './index.css'

// Paint the saved theme before React renders, so a returning guest never
// sees the default colours flash first.
const initial = applyCachedConfig()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SiteConfigProvider initial={initial}>
        <App />
      </SiteConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
)
