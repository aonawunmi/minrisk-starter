import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import './index.css';
// import PasswordGate from './PasswordGate'  // Temporarily disabled - restore later
import AuthGate from './components/AuthGate';
import PasswordSetup from './components/PasswordSetup';
import AskAI from './AskAI';
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/password-setup", element: _jsx(PasswordSetup, {}) }), _jsx(Route, { path: "/*", element: _jsxs(AuthGate, { children: [_jsx(App, {}), _jsx(AskAI, {})] }) })] }) }) }));
