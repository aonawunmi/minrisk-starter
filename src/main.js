import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import PasswordGate from './PasswordGate';
import AuthGate from './components/AuthGate';
import AskAI from './AskAI';
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(PasswordGate, { children: _jsxs(AuthGate, { children: [_jsx(App, {}), _jsx(AskAI, {})] }) }) }));
