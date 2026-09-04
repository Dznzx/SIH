// CivicSetu AI report auto-processing — summarize/categorize a freshly
// submitted report using the same Groq setup as api/chat.js (GROQ_API_KEY
// from Vercel's environment variables; never exposed to the browser).
//
// This endpoint only ever returns AI-derived fields; it never writes to the
// database itself. The client (already an authenticated, RLS-authorized
// session as the report's own owner) is the one that persists the result via
// SB.updateReport(id, {aiSummary, ...}) — so this endpoint needs no
// privileged Supabase credentials at all, and a citizen's own report is the
// only thing their own client is ever allowed to write it onto.
//
// Failure here must never break report creation: the caller submits the
// report to Supabase first and calls this after, so if Groq is unreachable,
// misconfigured, or returns something unparseable, the report already
// exists — this just leaves its ai_* columns null.

const DEPARTMENTS = {
  Pothole: 'PWD — Roads Division',
  Garbage: 'Solid Waste Management Cell',
  Streetlight: 'Electrical Maintenance Wing',
  Handpump: 'Public Health Engineering Dept',
  Drainage: 'Drainage & Sewerage Division'
};

function offlineFallback(category) {
  return {
    summary: null,
    category: category || null,
    department: DEPARTMENTS[category] || null,
    priority: null,
    next_steps: null,
    mode: 'offline'
  };
}

// The model is asked for strict JSON but LLMs sometimes wrap it in a
// markdown fence or add stray prose — extract the first {...} block rather
// than trusting JSON.parse on the raw string.
function extractJson(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch (e) { return null; }
}

async function callGroq(payload) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const system = `You triage civic infrastructure reports for CivicSetu, a municipal issue-reporting system. Given a citizen's report, respond with ONLY a JSON object (no markdown, no prose outside the JSON) with exactly these keys:
{
  "summary": "one clear sentence describing the issue for an official's queue",
  "category": "one of Pothole, Garbage, Streetlight, Handpump, Drainage, Other",
  "department": "the municipal department that should handle this",
  "priority": "one of Low, Medium, High, Critical",
  "next_steps": "one short, concrete recommended next action for the assigned officer"
}
Base priority on real safety/severity signals in the text (e.g. near a school, blocking a road, a health hazard), not just the category.`;

  const userText = `Title: ${payload.title || '(none)'}
Category (citizen-selected): ${payload.category || '(none)'}
Ward: ${payload.ward || '(unknown)'}
Description: ${payload.description || '(no description provided)'}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      max_tokens: 300,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userText }
      ]
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Groq API ${res.status}: ${errText.slice(0, 300)}`);
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

  const payload = {
    title: (body.title || '').toString().slice(0, 200),
    description: (body.description || '').toString().slice(0, 1000),
    category: (body.category || '').toString().slice(0, 60),
    ward: (body.ward || '').toString().slice(0, 60)
  };

  if (!payload.title && !payload.description) {
    res.status(400).json({ ok: false, error: 'title or description is required' });
    return;
  }

  try {
    let ai = null;
    try {
      ai = await callGroq(payload);
    } catch (llmErr) {
      console.error('analyze-report Groq call failed:', llmErr.message);
    }

    if (!ai || typeof ai !== 'object') {
      const fallback = offlineFallback(payload.category);
      res.status(200).json({ ok: true, mode: fallback.mode, ai: fallback });
      return;
    }

    res.status(200).json({
      ok: true,
      mode: 'llm',
      ai: {
        summary: typeof ai.summary === 'string' ? ai.summary.slice(0, 500) : null,
        category: typeof ai.category === 'string' ? ai.category.slice(0, 60) : payload.category || null,
        department: typeof ai.department === 'string' ? ai.department.slice(0, 120) : DEPARTMENTS[payload.category] || null,
        priority: typeof ai.priority === 'string' ? ai.priority.slice(0, 20) : null,
        next_steps: typeof ai.next_steps === 'string' ? ai.next_steps.slice(0, 500) : null
      }
    });
  } catch (err) {
    console.error('analyze-report handler error:', err);
    // Still 200 with ok:false rather than 500 — the frontend treats this as
    // "no AI metadata this time," not a report-creation failure.
    res.status(200).json({ ok: false, ai: offlineFallback(payload.category) });
  }
};
