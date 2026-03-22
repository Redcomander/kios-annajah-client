import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { APP_DISPLAY_NAME } from './config/appMode'
import { initializeApiBaseUrl } from './config/api'

document.title = APP_DISPLAY_NAME

async function bootstrap() {
  await initializeApiBaseUrl()

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

void bootstrap()

// Remove Preload scripts loading
postMessage({ payload: 'removeLoading' }, '*')
