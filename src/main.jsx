import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import { ensureAnonymousUser } from './utils/supabase'

const AUTH_TIMEOUT_MS = 5000;

const authWithTimeout = Promise.race([
  ensureAnonymousUser(),
  new Promise((resolve) => setTimeout(() => {
    console.warn('Supabase auth timed out after 5s — rendering app without auth');
    resolve();
  }, AUTH_TIMEOUT_MS)),
]);

authWithTimeout.then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
