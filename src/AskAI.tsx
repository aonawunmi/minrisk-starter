import React, { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { askClaude } from "@/lib/ai";

type Msg = { role: "user" | "assistant"; content: string };

export default function AskAI() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Msg[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [history, open]);

  async function send() {
    const prompt = input.trim();
    if (!prompt || busy) return;

    setBusy(true);
    setError(null);
    setHistory((h) => [...h, { role: "user", content: prompt }]);
    setInput("");

    try {
      // Call Claude AI directly
      const text = await askClaude(prompt, history);
      setHistory((h) => [...h, { role: "assistant", content: text }]);
    } catch (e: any) {
      setError(e?.message || "Request failed");
      // remove the just-added user turn to keep the thread tidy on failure
      setHistory((h) => h.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-md hover:shadow-lg"
        aria-label="Ask AI"
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium">Ask AI</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-40 w-[380px] rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-slate-50 px-4 py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">MinRisk — Ask AI</span>
            </div>
            <button
              className="text-xs text-slate-600 hover:underline"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <div ref={listRef} className="max-h-80 overflow-auto px-4 py-3 space-y-3">
            {history.length === 0 && (
              <p className="text-sm text-slate-500">
                Ask about a risk statement, DIME control scoring, or how to prioritise residual risk.
              </p>
            )}
            {history.map((m, i) => (
              <div
                key={i}
                className={
                  "rounded-xl px-3 py-2 text-sm " +
                  (m.role === "user"
                    ? "bg-slate-900 text-white ml-10"
                    : "bg-slate-100 text-slate-900 mr-10")
                }
              >
                {m.content}
              </div>
            ))}
            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>

          <div className="border-t border-slate-200 p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Type your question… (Shift+Enter for newline)"
              className="h-20 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <div className="mt-2 flex justify-end">
              <button
                disabled={busy || !input.trim()}
                onClick={send}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                {busy ? "Thinking…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
