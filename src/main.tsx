import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { useAuthStore } from './store/authStore'

function Boot() {
  const restoreSession = useAuthStore((s) => s.restoreSession)

  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Boot />
  </BrowserRouter>,
)
