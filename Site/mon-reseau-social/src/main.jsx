import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // IMPORTANT : pour appliquer le reset CSS
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
