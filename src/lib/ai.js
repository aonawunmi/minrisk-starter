export async function askGemini(prompt, history = []) {
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
        // Call Gemini API directly
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('VITE_GEMINI_API_KEY not configured');
        }
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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
    }
    catch (error) {
        console.error('❌ Gemini API call failed:', error);
        throw new Error(error.message || 'Failed to call Gemini API');
    }
}
