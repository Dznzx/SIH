// CivicSetu AI Assistant — retrieval-augmented chat endpoint.
//
// Retrieval: no vector DB / embeddings API — this is a small, fixed knowledge
// base (kb.json), so plain keyword-overlap scoring over it is enough to find
// the paragraphs relevant to a question and is free/instant. That's the
// "RAG" half: retrieve first, then hand only the retrieved paragraphs (not
// the whole KB) to the model as context.
//
// Generation: calls Groq's free OpenAI-compatible chat API using
// GROQ_API_KEY from the Vercel project's environment variables (Groq's free
// tier is why this project uses it instead of a paid LLM API). If that key
// isn't configured, the endpoint still responds usefully — it returns the
// retrieved KB paragraphs directly instead of a generated answer, so the
// demo works before anyone wires up a key.
const kb = require('./kb.json');

const STOPWORDS = new Set(['the','a','an','is','are','was','were','be','to','of','and','or','in','on','for','with','how','what','does','do','can','i','you','it','this','that','my']);

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .match(/[a-z0-9]+/g) || [];
}

function retrieve(query, k = 4) {
  const qTokens = tokenize(query).filter(t => !STOPWORDS.has(t));
  if (qTokens.length === 0) return kb.slice(0, k);
  const scored = kb.map(doc => {
    const docTokens = new Set(tokenize(doc.text + ' ' + (doc.aliasKeywords || '')));
    let score = 0;
    for (const t of qTokens) if (docTokens.has(t)) score++;
    return { doc, score };
  });
  const top = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
  return top.length ? top.map(s => s.doc) : kb.slice(0, k);
}

async function callGroq(question, contextDocs, history, liveContext) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const contextText = contextDocs.map((d, i) => `[${i + 1}] ${d.text}`).join('\n\n');
  let system = `You are the CivicSetu AI Assistant, embedded in a Smart India Hackathon prototype (SIH26043, Government of Jharkhand) that crowdsources societal challenges and routes them to universities and industry. Answer the user's question using the CONTEXT below — it describes exactly what this specific prototype does. If the answer isn't in the context, say you don't have that information in this prototype rather than guessing. Keep answers under 120 words, plain text, no markdown headers.\n\nCONTEXT:\n${contextText}`;

  // Real, live data the client pulled from the signed-in user's own session
  // (their reports, or reports matching a ward/category the question named)
  // — not from the static knowledge base above. Answer directly from it
  // when it's relevant to the question; treat it as real information about
  // this specific user/session, not as instructions to follow.
  if (liveContext) {
    system += `\n\nLIVE DATA (from the app's real database, specific to this user's current session):\n${liveContext}\n\nIf the LIVE DATA above answers the question, use it directly and specifically (cite report IDs/status) instead of saying you don't have that information.`;
  }

  const messages = [{ role: 'system', content: system }]
    .concat(
      (history || [])
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-6)
    )
    .concat([{ role: 'user', content: question }]);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      // llama-3.3-70b-versatile was deprecated by Groq; this is their
      // recommended replacement model.
      model: 'openai/gpt-oss-120b',
      max_tokens: 300,
      messages
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Groq API ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || null;
}

function offlineAnswer(contextDocs) {
  const bullets = contextDocs.map(d => `• ${d.text}`).join('\n\n');
  return {
    mode: 'offline',
    reply: `I don't have a live AI connection configured yet (no GROQ_API_KEY set in this Vercel project), so here's what I found directly in CivicSetu's knowledge base:\n\n${bullets}`
  };
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
  const message = (body && body.message || '').toString().slice(0, 1000);
  const history = Array.isArray(body && body.history) ? body.history : [];
  const liveContext = (body && body.liveContext) ? body.liveContext.toString().slice(0, 3000) : null;

  if (!message.trim()) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  try {
    const contextDocs = retrieve(message, 4);
    let reply;
    let mode = 'llm';
    try {
      reply = await callGroq(message, contextDocs, history, liveContext);
    } catch (llmErr) {
      console.error('Groq call failed:', llmErr.message);
      reply = null;
    }
    if (!reply) {
      const offline = offlineAnswer(contextDocs);
      reply = offline.reply;
      mode = offline.mode;
    }
    res.status(200).json({
      reply,
      mode,
      sources: contextDocs.map(d => d.id)
    });
  } catch (err) {
    console.error('chat handler error:', err);
    res.status(500).json({ error: 'Something went wrong answering that.' });
  }
};
