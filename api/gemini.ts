// api/gemini.ts
// Edge/WHATWG Request+Response with CORS + retry + model fallback.

export const runtime = "edge";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const PRIMARY_MODELS = [
  "gemini-1.5-flash",     // preferred
  "gemini-1.5-flash-8b",  // fast fallback
  // You can add "gemini-1.5-flash-latest" here if you want another fallback
];

const isOverloaded = (status: number, data: any) => {
  const msg =
    (data?.error?.message || data?.error || "").toString().toLowerCase();
  const code =
    (data?.error?.status || data?.error?.code || "").toString().toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    msg.includes("overload") ||
    msg.includes("resource") && msg.includes("exhaust") ||
    code.includes("resource_exhausted")
  );
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default async function handler(req: Request): Promise<Response> {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const prompt: string = body?.prompt ?? "";
    const history: Array<{ content?: string }> = Array.isArray(body?.history) ? body.history : [];
    // allow client to request a model, but default to our list
    const requestedModel: string | undefined = body?.model;

    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    if (!prompt && history.length === 0) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Build contents once
    const contents: Array<{ parts: Array<{ text: string }> }> = [];
    for (const m of history) contents.push({ parts: [{ text: String(m?.content ?? "") }] });
    contents.push({ parts: [{ text: String(prompt) }] });

    // Choose models to try (requested model first, else our defaults)
    const modelsToTry = requestedModel
      ? [requestedModel, ...PRIMARY_MODELS.filter(m => m !== requestedModel)]
      : PRIMARY_MODELS;

    // Retry settings
    const MAX_ATTEMPTS_PER_MODEL = 3;
    const BASE_DELAY = 400; // ms

    let lastError: any = null;

    for (const model of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${apiKey}`;

      for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt++) {
        try {
          const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents }),
          });

          const data = await r.json().catch(() => ({}));

          if (!r.ok) {
            if (isOverloaded(r.status, data) && attempt < MAX_ATTEMPTS_PER_MODEL - 1) {
              // exponential backoff + jitter
              const delay = BASE_DELAY * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
              await sleep(delay);
              continue; // retry same model
            }
            // Not overloaded or retries exhausted -> try next model or fail
            lastError = data?.error?.message || `${r.status} ${r.statusText}`;
          } else {
            // success
            const text =
              data?.candidates?.[0]?.content?.parts
                ?.map((p: any) => p?.text ?? "")
                .join("") ?? "";
            return new Response(JSON.stringify({ text, modelUsed: model }), {
              status: 200,
              headers: { ...CORS, "Content-Type": "application/json" },
            });
          }
        } catch (err: any) {
          lastError = err?.message || String(err);
          // small delay before retry on transport error
          const delay = BASE_DELAY * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
          await sleep(delay);
        }
      }
      // exhausted retries for this model → try next model
    }

    // All models failed
    return new Response(JSON.stringify({ error: String(lastError || "Model unavailable") }), {
      status: 502,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Server error" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
}
