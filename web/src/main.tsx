import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import '@/core/stores/prefs' // applies the saved Katta shrift choice at boot
import '@/core/pwa' // captures the install prompt event before React mounts

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
