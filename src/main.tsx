import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import './index.css'
// import PasswordGate from './PasswordGate'  // Temporarily disabled - restore later
import AuthGate from './components/AuthGate'
import PasswordSetup from './components/PasswordSetup'
import AskAI from './AskAI'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/password-setup" element={<PasswordSetup />} />
        <Route path="/*" element={
          <AuthGate>
            <App />
            <AskAI />
          </AuthGate>
        } />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
