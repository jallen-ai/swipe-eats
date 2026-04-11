import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import { ensureAnonymousUser } from './utils/supabase'

// Start auth immediately (retries internally with backoff)
ensureAnonymousUser();

// Render the app right away — components that need auth await authReadyPromise
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
