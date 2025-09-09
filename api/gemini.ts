// /api/gemini.ts — Vercel Serverless Function (Node 18+), with CORS
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://minrisk-starter.vercel.app',
];

function setCORS(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) || '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://minrisk-starter.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(req, res);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY on server' });
  }

  // Body can arrive as string or object depending on runtime
  let body: any = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { prompt, history } = (body ?? {}) as {
    prompt?: string;
    history?: Array<{ role: 'user' | 'model'; content: string }>;
  };

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const model = 'gemini-1.5-flash-latest';

  const contents = [
    ...(Array.isArray(history) ? history : []).map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.content ?? '') }],
    })),
    { role: 'user', parts: [{ text: prompt }] },
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents }),
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || 'Gemini API error' });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') ?? '';

    return res.status(200).json({ text });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
