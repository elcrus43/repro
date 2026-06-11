import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initGlobalErrorLogging } from './utils/logger'

// Initialize global error logging to Supabase app_errors table
initGlobalErrorLogging();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service Worker отключён - вызывает проблемы при разработке

