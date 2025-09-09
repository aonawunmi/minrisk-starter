// src/lib/ai.ts
export type ChatMsg = { role: 'user' | 'model'; content: string };
export async function askGemini(
  prompt: string,
  history: ChatMsg[] = []
): Promise<string> {
  // In dev there is no local /api, so call production.
  const base = import.meta.env.DEV ? 'https://minrisk-starter.vercel.app' : '';
  const r = await fetch(`${base}/api/gemini`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, history }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || 'Gemini error');
  return String(data?.text ?? '');
}
