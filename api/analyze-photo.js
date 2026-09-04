// CivicSetu photo authenticity check — verifies an uploaded photo actually
// shows a real civic infrastructure issue (pothole/garbage/streetlight/
// handpump/drainage), not a random or staged image someone is using to
// file a fraudulent report. Uses Google's Gemini API (GEMINI_API_KEY from
// Vercel's environment variables, server-side only — never sent to the
// browser) since the Groq project wired up for the rest of this app's AI
// features has no vision-capable model available on it (confirmed live:
// meta-llama/llama-4-scout-17b-16e-instruct returned 404 model_not_found,
// and the account's full /v1/models list has zero multimodal entries).
//
// Never blocks report submission: the client submits the report first and
// calls this after, so a failure here (no key, bad JSON, network, a photo
// Gemini can't parse) just means the citizen doesn't get an authenticity
// flag — the report itself is unaffected.

function extractJson(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch (e) { return null; }
}

async function callGemini(base64Data, mimeType, category) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are a fraud-detection reviewer for CivicSetu, a municipal civic-issue reporting app. A citizen submitted this photo as evidence of a "${category || 'civic infrastructure'}" issue. Look carefully at the actual image and respond with ONLY a JSON object (no markdown, no prose outside the JSON):
{
  "authentic": true or false,
  "matches_category": true or false,
  "detected_subject": "a short, plain description of what the photo actually shows",
  "confidence": "Low, Medium, or High",
  "reasoning": "one short sentence explaining the verdict",
  "message": "one short, friendly sentence for the citizen — if authentic, briefly confirm what you see; if not, explain what's actually wrong (e.g. a stock/downloaded image, an unrelated object, a screenshot, signs of digital editing) and ask them to upload a real photo of the issue"
}
Mark authentic:false for: stock photos or images that look downloaded from the internet rather than freshly captured, screenshots, obviously staged or unrelated scenes, images with visible signs of digital manipulation, or anything that isn't a real photo of an actual civic infrastructure problem. A genuine phone photo of a real pothole/garbage pile/broken streetlight/handpump/drainage issue — even if low quality or oddly framed — should be authentic:true.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Data } }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 400 }
      })
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return extractJson(text);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const imageDataUrl = (body.imageDataUrl || '').toString();
  const category = (body.category || '').toString().slice(0, 60);

  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!match) {
    res.status(400).json({ ok: false, error: 'imageDataUrl must be a base64 data:image/... URL' });
    return;
  }
  const [, mimeType, base64Data] = match;
  // Vercel's default body size limit is ~4.5MB — a captured phone photo
  // easily exceeds that as base64, so cap here with a clear error rather
  // than letting the platform reject the request with an opaque one.
  if (base64Data.length > 4_000_000) {
    res.status(200).json({ ok: false, mode: 'skipped', reason: 'image_too_large' });
    return;
  }

  try {
    let result = null;
    try {
      result = await callGemini(base64Data, mimeType, category);
    } catch (err) {
      console.error('analyze-photo Gemini call failed:', err.message);
    }

    if (!result || typeof result !== 'object') {
      res.status(200).json({ ok: false, mode: 'offline' });
      return;
    }

    res.status(200).json({
      ok: true,
      mode: 'llm',
      authentic: result.authentic !== false,
      matchesCategory: result.matches_category !== false,
      detectedSubject: typeof result.detected_subject === 'string' ? result.detected_subject.slice(0, 200) : null,
      confidence: typeof result.confidence === 'string' ? result.confidence.slice(0, 20) : null,
      reasoning: typeof result.reasoning === 'string' ? result.reasoning.slice(0, 300) : null,
      message: typeof result.message === 'string' ? result.message.slice(0, 300) : null
    });
  } catch (err) {
    console.error('analyze-photo handler error:', err);
    res.status(200).json({ ok: false, mode: 'offline' });
  }
};
