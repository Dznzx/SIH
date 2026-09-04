// CivicSetu photo relevance check — verifies an uploaded photo actually
// shows a real municipal issue (pothole/garbage/streetlight/handpump/
// drainage) rather than something unrelated (a selfie, a receipt, a random
// object, a screenshot). Same GROQ_API_KEY/server-only pattern as
// api/chat.js and api/analyze-report.js, using Groq's multimodal model.
//
// Never blocks report submission: a failure here (no key, bad JSON,
// network) just means the citizen doesn't get a relevance warning — the
// report itself is unaffected.

function extractJson(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch (e) { return null; }
}

async function callGroqVision(imageDataUrl, category) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const system = `You verify photos submitted to CivicSetu, a municipal civic-issue reporting app. Look at the image and respond with ONLY a JSON object (no markdown, no prose outside the JSON):
{
  "relevant": true or false,
  "detected_category": "one of Pothole, Garbage, Streetlight, Handpump, Drainage, Other",
  "subject": "a short, plain description of what is actually shown in the photo",
  "message": "one short, friendly sentence for the citizen — if relevant, briefly confirm what you see; if not, say what the photo actually shows and ask them to upload a photo of the issue"
}
The citizen selected the category "${category || '(none selected yet)'}". Mark relevant:true only if the photo plausibly shows a real civic infrastructure issue (it does not have to exactly match the selected category — any of the five categories counts as relevant). Mark relevant:false for things like people/selfies, unrelated objects, screenshots, receipts, blank/dark/blurry images with no identifiable subject, or anything that isn't a civic infrastructure issue.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 250,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Check this photo.' },
            { type: 'image_url', image_url: { url: imageDataUrl } }
          ]
        }
      ]
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Groq vision API ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
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

  if (!imageDataUrl.startsWith('data:image/')) {
    res.status(400).json({ ok: false, error: 'imageDataUrl (a data: image URL) is required' });
    return;
  }
  // Vercel's default body size limit is ~4.5MB — a captured phone photo
  // easily exceeds that as base64, so cap here with a clear error rather
  // than letting the platform reject the request with an opaque one.
  if (imageDataUrl.length > 4_000_000) {
    res.status(200).json({ ok: false, mode: 'skipped', reason: 'image_too_large' });
    return;
  }

  try {
    let result = null;
    try {
      result = await callGroqVision(imageDataUrl, category);
    } catch (err) {
      console.error('analyze-photo Groq call failed:', err.message);
    }

    if (!result || typeof result !== 'object') {
      res.status(200).json({ ok: false, mode: 'offline' });
      return;
    }

    res.status(200).json({
      ok: true,
      mode: 'llm',
      relevant: result.relevant !== false,
      detectedCategory: typeof result.detected_category === 'string' ? result.detected_category.slice(0, 40) : null,
      subject: typeof result.subject === 'string' ? result.subject.slice(0, 200) : null,
      message: typeof result.message === 'string' ? result.message.slice(0, 300) : null
    });
  } catch (err) {
    console.error('analyze-photo handler error:', err);
    res.status(200).json({ ok: false, mode: 'offline' });
  }
};
