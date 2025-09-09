// /api/gemini.ts  — Vercel Serverless Function (Node 18+)
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY on server' });
  }

  try {
    const { prompt, history } = (req.body ?? {}) as {
      prompt?: string;
      history?: Array<{ role: 'user' | 'model'; content: string }>;
    };

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    // Build Gemini payload (v1beta generateContent)
    const contents = [
      ...(Array.isArray(history) ? history : []).map(m => ({
        role: m.role || 'user',
        parts: [{ text: String(m.content || '') }],
      })),
      { role: 'user', parts: [{ text: prompt }] },
    ];

    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' +
      apiKey;

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents }),
    });

    const data = await r.json();

    if (!r.ok) {
      return res
        .status(r.status)
        .json({ error: data?.error?.message || 'Gemini API error' });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p?.text || '')
        .join('') ?? '';

    return res.status(200).json({ text });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
