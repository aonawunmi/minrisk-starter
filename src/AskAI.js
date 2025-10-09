import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
/** Resolve the AI endpoint in this order:
 *  1) window.__MINRISK_AT_PATH (set by App at runtime / logged in console)
 *  2) Vite env VITE_AT_PATH
 *  3) Fallback to /api/gemini (local dev API route)
 */
function getAIEndpoint() {
    try {
        const w = window;
        if (w && typeof w.__MINRISK_AT_PATH === "string" && w.__MINRISK_AT_PATH) {
            return w.__MINRISK_AT_PATH;
        }
    }
    catch {
        /* noop */
    }
    return import.meta.env.VITE_AT_PATH || "/api/gemini";
}
/** Be liberal in what we accept back from the server and normalize to a string */
function normalizeAIResponse(data) {
    // If server already returned a string
    if (typeof data === "string")
        return data;
    // If server returned { text: "..." }
    if (data && typeof data.text === "string")
        return data.text;
    // If a raw Gemini shape was forwarded
    try {
        const d = data;
        const parts = d?.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            const txt = parts.map((p) => p?.text).filter(Boolean).join("\n");
            if (txt)
                return txt;
        }
    }
    catch {
        /* noop */
    }
    // Last resort: JSON stringify so caller sees _something_ helpful
    try {
        return JSON.stringify(data);
    }
    catch {
        return String(data);
    }
}
export default function AskAI() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);
    const listRef = useRef(null);
    useEffect(() => {
        listRef.current?.scrollTo({
            top: listRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [history, open]);
    async function send() {
        const prompt = input.trim();
        if (!prompt || busy)
            return;
        setBusy(true);
        setError(null);
        setHistory((h) => [...h, { role: "user", content: prompt }]);
        setInput("");
        try {
            const url = getAIEndpoint();
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // include prior messages so your API can keep context (safe if ignored)
                body: JSON.stringify({ prompt, history }),
            });
            // Non-2xx: capture any text body so we see the real error
            if (!res.ok) {
                const details = await res.text().catch(() => "");
                throw new Error(details || `AI endpoint error ${res.status} ${res.statusText}`);
            }
            // Some servers return JSON, some return text—handle both
            const raw = await res.text();
            let data;
            try {
                data = raw ? JSON.parse(raw) : "";
            }
            catch {
                data = raw; // plain text
            }
            const text = normalizeAIResponse(data);
            setHistory((h) => [...h, { role: "model", content: text }]);
        }
        catch (e) {
            setError(e?.message || "Request failed");
            // remove the just-added user turn to keep the thread tidy on failure
            setHistory((h) => h.slice(0, -1));
        }
        finally {
            setBusy(false);
        }
    }
    function onKey(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void send();
        }
    }
    return (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => setOpen((v) => !v), className: "fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-md hover:shadow-lg", "aria-label": "Ask AI", children: [_jsx(Sparkles, { className: "h-4 w-4" }), _jsx("span", { className: "text-sm font-medium", children: "Ask AI" })] }), open && (_jsxs("div", { className: "fixed bottom-20 right-6 z-40 w-[380px] rounded-2xl border border-slate-200 bg-white shadow-xl", children: [_jsxs("div", { className: "flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-slate-50 px-4 py-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Sparkles, { className: "h-4 w-4" }), _jsx("span", { className: "text-sm font-semibold", children: "MinRisk \u2014 Ask AI" })] }), _jsx("button", { className: "text-xs text-slate-600 hover:underline", onClick: () => setOpen(false), children: "Close" })] }), _jsxs("div", { ref: listRef, className: "max-h-80 overflow-auto px-4 py-3 space-y-3", children: [history.length === 0 && (_jsx("p", { className: "text-sm text-slate-500", children: "Ask about a risk statement, DIME control scoring, or how to prioritise residual risk." })), history.map((m, i) => (_jsx("div", { className: "rounded-xl px-3 py-2 text-sm " +
                                    (m.role === "user"
                                        ? "bg-slate-900 text-white ml-10"
                                        : "bg-slate-100 text-slate-900 mr-10"), children: m.content }, i))), error && _jsx("div", { className: "text-sm text-red-600", children: error })] }), _jsxs("div", { className: "border-t border-slate-200 p-3", children: [_jsx("textarea", { value: input, onChange: (e) => setInput(e.target.value), onKeyDown: onKey, placeholder: "Type your question\u2026 (Shift+Enter for newline)", className: "h-20 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" }), _jsx("div", { className: "mt-2 flex justify-end", children: _jsx("button", { disabled: busy || !input.trim(), onClick: send, className: "rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50", children: busy ? "Thinking…" : "Send" }) })] })] }))] }));
}
