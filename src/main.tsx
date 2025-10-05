import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import PasswordGate from './PasswordGate'
import AuthGate from './components/AuthGate'
import AskAI from './AskAI'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PasswordGate>
      <AuthGate>
        <App />
        <AskAI />
      </AuthGate>
    </PasswordGate>
  </React.StrictMode>,
)
