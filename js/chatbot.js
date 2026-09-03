// CivicSetu AI Assistant — floating widget. Talks to /api/chat (a Vercel
// serverless function doing keyword-retrieval + Claude generation). Keeps
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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history.slice(0, -1) })
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
