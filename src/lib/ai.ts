// src/lib/ai.ts
export type ChatMsg = { role: 'user' | 'model'; content: string };

export async function askGemini(
  prompt: string,
  history: ChatMsg[] = []
): Promise<string> {
  console.log('🤖 Calling Gemini API with prompt:', prompt.substring(0, 50) + '...');

  // Build the request body in Gemini API format
  const contents = [
    ...history.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    })),
    {
      role: 'user',
      parts: [{ text: prompt }]
    }
  ];

  try {
    // Use local proxy (configured in vite.config.ts)
    const r = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });

    if (!r.ok) {
      const errorText = await r.text();
      console.error('❌ Gemini API error:', r.status, errorText);
      throw new Error(`API request failed: ${r.status} - ${errorText}`);
    }

    const data = await r.json();
    console.log('✅ Gemini API response received');

    // Extract text from Gemini response format
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.text || '';

    if (!text) {
      console.error('❌ No text in response:', data);
      throw new Error('No text in Gemini response');
    }

    return String(text);
  } catch (error: any) {
    console.error('❌ Gemini API call failed:', error);
    throw new Error(error.message || 'Failed to call Gemini API');
  }
}
