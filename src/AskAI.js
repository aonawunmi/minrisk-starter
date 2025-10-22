import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { askClaude } from "@/lib/ai";
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
            // Call Claude AI directly
            const text = await askClaude(prompt, history);
            setHistory((h) => [...h, { role: "assistant", content: text }]);
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
