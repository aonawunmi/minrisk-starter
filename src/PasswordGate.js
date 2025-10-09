import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
export default function PasswordGate({ children }) {
    const [unlocked, setUnlocked] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    // If already unlocked this session, skip the prompt
    useEffect(() => {
        if (sessionStorage.getItem("minrisk_unlocked") === "1") {
            setUnlocked(true);
        }
    }, []);
    const expected = (import.meta.env.VITE_APP_PASSWORD ?? "");
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!expected) {
            setError("Password not configured on server.");
            return;
        }
        if (password === expected) {
            sessionStorage.setItem("minrisk_unlocked", "1");
            setUnlocked(true);
        }
        else {
            setError("Incorrect password. Try again.");
        }
    };
    if (unlocked)
        return _jsx(_Fragment, { children: children });
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-50 p-6", children: _jsxs("div", { className: "w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm", children: [_jsx("h1", { className: "text-xl font-semibold text-slate-900", children: "MinRisk \u2014 Access" }), _jsx("p", { className: "mt-2 text-sm text-slate-600", children: "Enter the access password to continue." }), _jsxs("form", { onSubmit: handleSubmit, className: "mt-5 space-y-3", children: [_jsx("input", { type: "password", value: password, onChange: (e) => {
                                setPassword(e.target.value);
                                setError("");
                            }, placeholder: "Password", className: "w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400" }), error && (_jsx("div", { className: "text-sm text-red-600", children: error })), _jsx("button", { type: "submit", className: "w-full rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-800", children: "Unlock" })] }), _jsxs("p", { className: "mt-3 text-xs text-slate-500", children: ["Tip: You can change the password via ", _jsx("code", { children: ".env.local" }), " and Vercel project settings (key: ", _jsx("code", { children: "VITE_APP_PASSWORD" }), ")."] })] }) }));
}
