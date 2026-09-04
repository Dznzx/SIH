// CivicSetu AI Assistant — floating widget. Talks to /api/chat (a Vercel
// serverless function doing keyword-retrieval + Groq/Llama generation). Keeps
// its own short chat history in localStorage so a refresh doesn't lose it.
(function(){
  const HISTORY_KEY = 'civic_chat_history';
  let history = [];
  try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch(e) { history = []; }

  let panelEl, logEl, inputEl, sendBtn, toggleBtn;
  let sending = false;

  function saveHistory(){
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-20)));
  }

  function escapeHtml(s){
    return (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function renderMessage(role, text){
    const row = document.createElement('div');
    row.className = 'cbot-msg cbot-' + role;
    row.innerHTML = `<div class="cbot-bubble">${escapeHtml(text).replace(/\n/g,'<br>')}</div>`;
    logEl.appendChild(row);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function renderAll(){
    logEl.innerHTML = '';
    if(history.length === 0){
      renderMessage('assistant', "Hi! I'm the CivicSetu AI Assistant. Ask me how citizen reports become university challenges, who can endorse a solution, or anything else about this SIH26043 prototype.");
      return;
    }
    history.forEach(m => renderMessage(m.role, m.content));
  }

  async function send(){
    const text = inputEl.value.trim();
    if(!text || sending) return;
    inputEl.value = '';
    history.push({ role:'user', content:text });
    saveHistory();
    renderMessage('user', text);
    sending = true;
    sendBtn.disabled = true;
    const typingRow = document.createElement('div');
    typingRow.className = 'cbot-msg cbot-assistant cbot-typing';
    typingRow.innerHTML = `<div class="cbot-bubble">…</div>`;
    logEl.appendChild(typingRow);
    logEl.scrollTop = logEl.scrollHeight;

    try {
      const liveContext = buildLiveContext(text);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history.slice(0, -1), liveContext })
      });
      const data = await res.json();
      typingRow.remove();
      const reply = data.reply || "Sorry, I couldn't generate an answer just now.";
      history.push({ role:'assistant', content:reply });
      saveHistory();
      renderMessage('assistant', reply);
    } catch(err){
      typingRow.remove();
      renderMessage('assistant', "I couldn't reach the assistant backend just now — please try again in a moment.");
    } finally {
      sending = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  // Grounds the assistant in real, live data instead of only the static
  // knowledge base — this is what makes "check my reports" or "verify
  // pothole Doranda" answerable instead of always "I don't have that
  // information in this prototype". Built client-side (CIVIC.reports is
  // already loaded here) and sent as extra context for api/chat.js's
  // system prompt to use; never sent as ground truth the model must obey,
  // just data it's allowed to summarize.
  function summarizeReport(r){
    const ward = (typeof wardInfo === 'function') ? wardInfo(r.ward).name : r.ward;
    return `${r.id}: ${r.title} — ${r.category} in ${ward}, status ${r.status}, ${r.confirms} confirmation${r.confirms===1?'':'s'}${r.assignee ? ', assigned to '+r.assignee : ''}`;
  }
  function buildLiveContext(text){
    if(typeof CIVIC === 'undefined' || !Array.isArray(CIVIC.reports)) return null;
    const lower = text.toLowerCase();
    const parts = [];

    if(/\bmy reports?\b|\bmy issues?\b/.test(lower) && typeof myReports === 'function'){
      const mine = myReports().filter(r => r.status !== 'queued').slice(0, 8);
      parts.push(mine.length
        ? `The signed-in user's own reports:\n${mine.map(summarizeReport).join('\n')}`
        : `The signed-in user has no reports on file.`);
    }

    if(Array.isArray(CIVIC.wards)){
      const wardHit = CIVIC.wards.find(w => lower.includes(w.name.toLowerCase()));
      if(wardHit){
        const matches = CIVIC.reports
          .filter(r => r.ward === wardHit.id && r.status !== 'queued' && (typeof isPublicVisible !== 'function' || isPublicVisible(r)))
          .slice(0, 8);
        parts.push(matches.length
          ? `Public reports in ${wardHit.name}:\n${matches.map(summarizeReport).join('\n')}`
          : `No public reports currently on file for ${wardHit.name}.`);
      }
    }

    const categories = ['pothole','garbage','streetlight','handpump','drainage'];
    const catHit = categories.find(c => lower.includes(c));
    if(catHit){
      const matches = CIVIC.reports
        .filter(r => r.category.toLowerCase() === catHit && r.status !== 'queued' && (typeof isPublicVisible !== 'function' || isPublicVisible(r)))
        .slice(0, 8);
      if(matches.length) parts.push(`Public ${catHit} reports:\n${matches.map(summarizeReport).join('\n')}`);
    }

    return parts.length ? parts.join('\n\n') : null;
  }

  function toggle(open){
    const willOpen = open != null ? open : panelEl.style.display === 'none';
    panelEl.style.display = willOpen ? 'flex' : 'none';
    if(willOpen) inputEl.focus();
  }

  function build(){
    const wrap = document.createElement('div');
    wrap.id = 'cbotWidget';
    wrap.innerHTML = `
      <button id="cbotToggle" class="cbot-fab" title="CivicSetu AI Assistant" aria-label="Open AI Assistant">💬</button>
      <div id="cbotPanel" class="cbot-panel" style="display:none;">
        <div class="cbot-head">
          <span>🤖 CivicSetu AI Assistant</span>
          <button id="cbotClose" class="cbot-close" aria-label="Close">✕</button>
        </div>
        <div id="cbotLog" class="cbot-log"></div>
        <div class="cbot-inputrow">
          <input id="cbotInput" type="text" placeholder="Ask about CivicSetu…" autocomplete="off">
          <button id="cbotSend" class="btn btn-primary btn-sm">Send</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    toggleBtn = document.getElementById('cbotToggle');
    panelEl = document.getElementById('cbotPanel');
    logEl = document.getElementById('cbotLog');
    inputEl = document.getElementById('cbotInput');
    sendBtn = document.getElementById('cbotSend');

    toggleBtn.addEventListener('click', () => toggle());
    document.getElementById('cbotClose').addEventListener('click', () => toggle(false));
    sendBtn.addEventListener('click', send);
    inputEl.addEventListener('keydown', e => { if(e.key === 'Enter') send(); });

    renderAll();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
