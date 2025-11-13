import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
// import PasswordGate from './PasswordGate'  // Temporarily disabled - restore later
import AuthGate from './components/AuthGate'
import AskAI from './AskAI'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthGate>
      <App />
      <AskAI />
    </AuthGate>
  </React.StrictMode>,
)
