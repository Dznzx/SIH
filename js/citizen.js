// ---------- Home: capture flow ----------
const captureBox = document.getElementById('captureBox');
const submitBtn = document.getElementById('submitBtn');
let captured = false, catSelected = null;

const photoInput = document.getElementById('photoInput');
let capturedPhotoData = null;
let mlSeverityEstimate = null;
let aiSuggestedCategory = null;
const aiSuggestEl = document.getElementById('aiSuggest');
captureBox.addEventListener('click', ()=> photoInput.click());
photoInput.addEventListener('change', ()=>{
  const file = photoInput.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    capturedPhotoData = e.target.result;
    captured = true;
    captureBox.classList.add('captured');
    captureBox.style.backgroundImage = `url(${capturedPhotoData})`;
    captureBox.style.backgroundSize = 'cover';
    captureBox.style.backgroundPosition = 'center';
    captureBox.querySelector('.cam-label').textContent = t('photo_captured');
    checkReady();
    runPhotoAnalysis(capturedPhotoData);
  };
  reader.readAsDataURL(file);
});
// ---------- CNN photo triage (see js/ml.js) ----------
// Runs real MobileNet inference + an image heuristic on the captured
// photo. If the citizen hasn't already picked a category, a confident
// suggestion auto-selects that chip (never overrides a category they
// already chose themselves). Severity always gets an estimate stashed in
// mlSeverityEstimate for use at submit time, whether or not the CNN
// produced a usable category.
function runPhotoAnalysis(dataUrl){
  mlSeverityEstimate = null;
  aiSuggestedCategory = null;
  if(typeof CivicML === 'undefined'){ aiSuggestEl.classList.remove('show'); return; }
  aiSuggestEl.className = 'ai-suggest show';
  aiSuggestEl.innerHTML = `<span class="spinner"></span><span>Analyzing photo…</span>`;
  const baseline = catSelected ? DEFAULT_SEVERITY[catSelected] : 0.5;
  const thisPhoto = dataUrl;
  CivicML.analyzePhoto(dataUrl, baseline).then(result=>{
    if(thisPhoto !== capturedPhotoData) return; // a newer photo was captured meanwhile
    mlSeverityEstimate = result.severity;
    if(result.suggestion){
      aiSuggestedCategory = result.suggestion.category;
      const pct = Math.round(result.suggestion.confidence * 100);
      aiSuggestEl.innerHTML = `<span>🤖</span><span>AI suggests: ${result.suggestion.category} (${pct}%) — tap a different category to override</span>`;
      if(!catSelected){
        const chip = document.querySelector(`.cat-chip[data-cat="${result.suggestion.category}"]`);
        if(chip) chip.click();
      }
    } else {
      aiSuggestEl.classList.remove('show');
    }
  }).catch(()=>{
    if(thisPhoto !== capturedPhotoData) return;
    aiSuggestEl.classList.remove('show');
  });
}
// Fixed demo submission point (Ward 12, same spot as CS-2026-8912) — there's
// no real GPS in this prototype, and reusing that coordinate is what makes
// the duplicate-detection scenario in CIVIC.dupeCluster actually fire.
const DRAFT_LAT = 23.3441, DRAFT_LNG = 85.3096;
let dupeAnchor = null;
let confirmDuplicateMode = false;
document.querySelectorAll('.cat-chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    document.querySelectorAll('.cat-chip').forEach(c=>c.classList.remove('sel'));
    chip.classList.add('sel');
    catSelected = chip.dataset.cat;
    confirmDuplicateMode = false;
    dupeAnchor = findDuplicate(catSelected, DRAFT_LAT, DRAFT_LNG);
    const dupeAlert = document.getElementById('dupeAlert');
    dupeAlert.classList.toggle('show', !!dupeAnchor);
    if(dupeAnchor){
      const clusterSize = dupeAnchor._clusterSize || CIVIC.dupeCluster.memberCount;
      document.getElementById('dupeAlertText').textContent = `⚠️ ${clusterSize} similar issue${clusterSize===1?'':'s'} nearby`;
      const thumb = document.getElementById('dupeThumb');
      thumb.src = dupeAnchor.photo || '';
      thumb.onerror = ()=>{ thumb.style.display = 'none'; };
      thumb.style.display = dupeAnchor.photo ? '' : 'none';
    }
    checkReady();
  });
});
// ---------- Voice input (Web Speech API — degrades to a hidden mic, never a dead one) ----------
const micBtn = document.getElementById('micBtn');
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null, recognizing = false, noSpeechTimer = null;

function micAvailable(){ return !!SpeechRec && navigator.onLine; }
function updateMicVisibility(){ if(micBtn) micBtn.style.display = micAvailable() ? '' : 'none'; }
updateMicVisibility();
window.addEventListener('online', updateMicVisibility);
window.addEventListener('offline', updateMicVisibility);

if(SpeechRec && micBtn){
  recognition = new SpeechRec();
  recognition.continuous = false;
  recognition.interimResults = false;

  function stopListening(){
    recognizing = false;
    micBtn.classList.remove('recording');
    clearTimeout(noSpeechTimer);
    document.getElementById('descInput').placeholder = t('desc_placeholder');
  }
  recognition.onresult = (e)=>{
    const transcript = e.results[0][0].transcript;
    const input = document.getElementById('descInput');
    input.value = transcript;
    checkReady();
    stopListening();
  };
  recognition.onerror = ()=> stopListening();
  recognition.onend = ()=>{ if(recognizing) stopListening(); };

  micBtn.addEventListener('click', ()=>{
    if(!micAvailable()){ updateMicVisibility(); return; }
    if(recognizing){ recognition.stop(); stopListening(); return; }
    recognition.lang = currentLang==='hi' ? 'hi-IN' : 'en-IN';
    try{
      recognition.start();
      recognizing = true;
      micBtn.classList.add('recording');
      document.getElementById('descInput').placeholder = 'Listening… / सुन रहे हैं…';
      noSpeechTimer = setTimeout(()=>{ if(recognizing){ recognition.stop(); stopListening(); } }, 5000);
    } catch(e){
      stopListening();
    }
  });
}
document.getElementById('descInput').addEventListener('input', checkReady);
function checkReady(){ submitBtn.disabled = !(captured && catSelected); }
document.getElementById('confirmInstead').addEventListener('click', (e)=>{
  e.stopPropagation();
  confirmDuplicateMode = true;
  submitBtn.textContent = 'CONFIRM EXISTING ISSUE';
  submitBtn.disabled = false;
  if(typeof unlockBadge === 'function') unlockBadge('problem_validation');
});
function resetCaptureForm(){
  captured = false; capturedPhotoData = null; catSelected = null;
  confirmDuplicateMode = false; dupeAnchor = null;
  mlSeverityEstimate = null; aiSuggestedCategory = null;
  aiSuggestEl.classList.remove('show');
  captureBox.classList.remove('captured');
  captureBox.style.backgroundImage = '';
  captureBox.querySelector('.cam-label').textContent = t('tap_to_capture');
  document.querySelectorAll('.cat-chip').forEach(c=>c.classList.remove('sel'));
  document.getElementById('descInput').value = '';
  document.getElementById('dupeAlert').classList.remove('show');
  submitBtn.textContent = t('submit_report');
  submitBtn.disabled = true;
}
function showRoutingBanner(text){
  const el = document.getElementById('routingBanner');
  el.textContent = text;
  el.classList.add('show');
  setTimeout(()=> el.classList.remove('show'), 1500);
}
const icons = {Pothole:'🕳️',Garbage:'🗑️',Streetlight:'💡',Handpump:'🚰'};
// Default severity per category, standing in for a citizen's implied severity
// until step 3's real scoring; deliberately not random so a demo run is repeatable.
const DEFAULT_SEVERITY = {Pothole:0.65, Garbage:0.5, Streetlight:0.55, Handpump:0.6};
let reportSeq = 8913;
submitBtn.addEventListener('click', ()=>{
  submitBtn.disabled = true;

  if(confirmDuplicateMode && dupeAnchor){
    dupeAnchor.confirms += 1;
    renderQueue();
    showToast(`Confirmed existing issue ${dupeAnchor.id} — now ${dupeAnchor.confirms} confirmations`, 2200);
    pushNotification('🔁', `Confirmed existing issue ${dupeAnchor.id} — now ${dupeAnchor.confirms} confirmations`);
    if(typeof SB !== 'undefined' && SB.client){
      SB.updateReport(dupeAnchor.id, { confirms: dupeAnchor.confirms }).then(result=>{
        const msg = syncFailureMessage(result);
        if(msg) showToast(msg, 5000);
      });
    }
    setTimeout(resetCaptureForm, 900);
    return;
  }

  // Step 8a: show the routing decision before the submitted/queued confirmation.
  const dept = CIVIC.departments[catSelected];
  showRoutingBanner(`${catSelected} + Ward 12 → ${dept}`);

  setTimeout(()=>{
    submitBtn.textContent = isOnline ? t('submitted_ok') : t('queued_offline_ok');

    const desc = document.getElementById('descInput').value.trim();
    const now = new Date();
    reportSeq += 1;
    const slaHours = CIVIC.slaHours[catSelected] || 48;
    const newReport = {
      id: `CS-2026-${reportSeq}`,
      title: desc || `${catSelected} · Ward 12`,
      titleHi: '',
      category: catSelected,
      ward: 'W12',
      lat: DRAFT_LAT, lng: DRAFT_LNG,
      severity: mlSeverityEstimate ?? (DEFAULT_SEVERITY[catSelected] || 0.5),
      confirms: 1,
      proximity: 'none',
      status: isOnline ? 'received' : 'queued',
      assignee: null,
      submittedAt: now.toISOString(),
      slaDeadline: new Date(now.getTime() + slaHours*3600*1000).toISOString(),
      photo: capturedPhotoData || null,
      proofPhoto: null,
      timeline: [],
      comments: []
    };
    ensureTimeline(newReport);
    CIVIC.reports.unshift(newReport);
    renderReports(reportsFilter);
    bumpSessionSubmitted();

    if(isOnline){
      // Nearby Activity feed
      const feed = document.getElementById('feedList');
      const item = document.createElement('div');
      item.className = 'feed-item';
      item.innerHTML = `<div class="feed-icon" style="background:var(--green-lt);">${icons[catSelected]||'📍'}</div>
        <div class="meta"><strong>${catSelected} · Ward 12</strong><span>Just now · you</span></div>
        <span class="pill pill-med">Received</span>`;
      feed.prepend(item);

      // Authority ranked queue — highlight the new arrival for a few seconds.
      renderQueue(newReport.id);
      pushNotification(icons[catSelected] || '📍', `Report submitted: ${newReport.title}`);

      // Persist to the shared Supabase backend so this report is visible to
      // every other signed-in user (e.g. an officer's Authority dashboard on
      // a different device), not just this browser's own localStorage.
      if(typeof SB !== 'undefined' && SB.client){
        SB.insertReport(newReport).then(result=>{
          const msg = syncFailureMessage(result);
          if(msg){
            console.error('Report saved locally but failed to sync to Supabase:', newReport.id, result);
            showToast(msg, 6000);
          }
        });
      }
    } else {
      // Not yet visible to the authority side — it only arrives once synced.
      persistOfflineQueue();
      updateOfflineStrip();
      pushNotification('📴', `Report queued offline: ${newReport.title}`);
    }

    setTimeout(resetCaptureForm, 1600);
  }, 1500);
});

// ---------- seed feed ----------
const seedFeed = [
  {cat:'Pothole', icon:'🕳️', ward:'NH bypass', time:'14 min ago', tag:'pill-high', tagText:'High'},
  {cat:'Drain overflow', icon:'🌊', ward:'Doranda', time:'38 min ago', tag:'pill-med', tagText:'Medium'},
  {cat:'Streetlight out', icon:'💡', ward:'Hatia', time:'1 hr ago', tag:'pill-low', tagText:'Low'},
];
const feedList = document.getElementById('feedList');
seedFeed.forEach(f=>{
  const item = document.createElement('div');
  item.className = 'feed-item';
  item.innerHTML = `<div class="feed-icon" style="background:var(--green-lt);">${f.icon}</div>
    <div class="meta"><strong>${f.cat} · ${f.ward}</strong><span>${f.time}</span></div>
    <span class="pill ${f.tag}">${f.tagText}</span>`;
  feedList.appendChild(item);
});

// ---------- My Reports list (reads CIVIC.reports — the array authority.js writes to) ----------
const statusMeta = {
  received:{label:'Received (प्राप्त हुआ)', cls:'status-received'},
  working:{label:'Working on it (काम चल रहा है)', cls:'status-working'},
  fixed:{label:'Fixed (ठीक हो गया)', cls:'status-fixed'},
  queued:{label:'Queued — offline (क्यू में)', cls:'status-queued'},
};
function reportFootText(r){
  if(r.status==='resolved') return `✅ Resolved${r.resolvedAt ? ' on '+formatDate(r.resolvedAt) : ''}`;
  if(r.status==='queued') return '📴 Queued — waiting to sync';
  if(r.assignee) return `🛠️ Assigned to ${r.assignee}`;
  return '⏳ Awaiting official review';
}
function reportDescText(r){
  const w = wardInfo(r.ward);
  return `${r.category} issue reported in ${w.name} (Ward ${w.id.replace('W','')}).`;
}
function buildThumb(url, altText){
  const box = document.createElement('div');
  box.className = 'report-thumb';
  if(url){
    const img = document.createElement('img');
    img.src = url; img.alt = altText;
    img.addEventListener('error', ()=> handlePhotoError(img, 'thumb-fallback', '📷'), {once:true});
    box.appendChild(img);
  } else {
    const fb = document.createElement('div');
    fb.className = 'thumb-fallback';
    fb.textContent = '📷';
    box.appendChild(fb);
  }
  return box;
}
let reportsFilter = 'all';
function renderReports(filter){
  reportsFilter = filter || reportsFilter;
  const list = document.getElementById('reportsList');
  list.innerHTML = '';
  CIVIC.reports.filter(r => reportsFilter==='all' || citizenStatusBucket(r.status)===reportsFilter).forEach(r=>{
    const bucket = citizenStatusBucket(r.status);
    const sm = statusMeta[bucket];
    const div = document.createElement('div');
    div.className = 'report-card';
    div.onclick = ()=>openTrack(r);

    const thumb = buildThumb(r.photo, r.title);
    const badge = document.createElement('span');
    badge.className = `status-pill ${sm.cls} badge`;
    badge.textContent = sm.label;
    thumb.appendChild(badge);
    div.appendChild(thumb);

    const body = document.createElement('div');
    body.className = 'report-body';
    body.innerHTML = `
      <div class="report-top"><span>🗓️ Submitted: ${formatDate(r.submittedAt)}</span><span>ID: ${r.id}</span></div>
      <h4>${r.title}</h4>
      <p>${reportDescText(r)}</p>
      <div class="report-foot">${reportFootText(r)}</div>`;
    div.appendChild(body);

    list.appendChild(div);
  });
  updateReportCounts();
}
function updateReportCounts(){
  const counts = {all:CIVIC.reports.length, received:0, working:0, fixed:0};
  CIVIC.reports.forEach(r=> counts[citizenStatusBucket(r.status)]++);
  document.querySelectorAll('#filterRow .fchip').forEach(chip=>{
    const f = chip.dataset.f;
    const labels = {all:t('filter_all'), received:t('filter_received'), working:t('filter_working'), fixed:t('filter_fixed')};
    chip.textContent = `${labels[f]} (${counts[f]})`;
  });
  const summary = document.querySelectorAll('.summary-card .val');
  if(summary.length===3){
    summary[0].textContent = counts.received;
    summary[1].textContent = counts.working;
    summary[2].textContent = counts.fixed;
  }
}
// "Completed Projects" — a before/after gallery of resolved reports. The
// container (#resolvedGallery) existed in the HTML with full CSS already
// written for it, but nothing ever populated it, so the nav item silently
// showed an empty page.
function renderResolvedGallery(){
  const grid = document.getElementById('resolvedGallery');
  if(!grid) return;
  const resolved = CIVIC.reports.filter(r=>r.status==='resolved');
  if(resolved.length===0){
    grid.innerHTML = `<div class="inv-empty">No completed projects yet — resolved reports will appear here.</div>`;
    return;
  }
  grid.innerHTML = resolved.map(r=>{
    const ward = wardInfo(r.ward);
    const days = r.resolvedAt ? Math.max(0, Math.round((new Date(r.resolvedAt) - new Date(r.submittedAt)) / 86400000)) : null;
    const splitHtml = r.photo && r.proofPhoto ? `
      <div class="b-a-split">
        <div class="b-a-box"><img src="${r.photo}" alt="Before" loading="lazy"><span class="b-a-label">Before</span></div>
        <div class="b-a-box"><img src="${r.proofPhoto}" alt="After" loading="lazy"><span class="b-a-label">After</span></div>
      </div>` : `
      <div class="b-a-split"><div class="ba-empty"><span>📷</span><span>No before/after photo</span></div></div>`;
    return `
      <div class="resolved-card">
        ${splitHtml}
        <div class="resolved-card-body">
          <div class="resolved-card-head">
            <div>
              <h4 class="resolved-card-title">${r.title}</h4>
              <div class="resolved-card-meta">📍 ${ward.name} · ${r.category}</div>
            </div>
            <span class="resolved-card-badge">Resolved</span>
          </div>
          <div class="resolved-card-stats">
            <div class="resolved-stat-item"><span class="resolved-stat-val">${days!=null ? days+'d' : '—'}</span><span class="resolved-stat-key">Time to fix</span></div>
            <div class="resolved-stat-item"><span class="resolved-stat-val">${r.severity.toFixed(2)}</span><span class="resolved-stat-key">Severity</span></div>
            <div class="resolved-stat-item"><span class="resolved-stat-val">${r.confirms}</span><span class="resolved-stat-key">Confirms</span></div>
          </div>
          ${r.assignee ? `
          <div class="resolved-assignee">
            <span class="resolved-assignee-avatar">🛠️</span>
            <span>Fixed by ${r.assignee}</span>
          </div>` : ''}
        </div>
      </div>`;
  }).join('');
}
renderResolvedGallery();

renderReports('all');
document.getElementById('filterRow').addEventListener('click', (e)=>{
  const chip = e.target.closest('.fchip');
  if(!chip) return;
  document.querySelectorAll('#filterRow .fchip').forEach(c=>c.classList.remove('active'));
  chip.classList.add('active');
  renderReports(chip.dataset.f);
});

// ---------- Track Progress (dynamic) ----------
let currentTrack = null;
function buildPhotoBox(url, labelHtml, altText, noUrlText){
  const wrap = document.createDocumentFragment();
  if(url){
    const img = document.createElement('img');
    img.src = url; img.alt = altText;
    img.addEventListener('error', ()=>{
      const empty = document.createElement('div');
      empty.className = 'ba-empty';
      empty.innerHTML = `📷<span>No photo</span>`;
      img.replaceWith(empty);
    }, {once:true});
    wrap.appendChild(img);
  } else {
    const empty = document.createElement('div');
    empty.className = 'ba-empty';
    empty.innerHTML = `📷<span>${noUrlText}</span>`;
    wrap.appendChild(empty);
  }
  const label = document.createElement('div');
  label.className = 'ba-label';
  label.innerHTML = labelHtml;
  wrap.appendChild(label);
  return wrap;
}
function openTrack(r){
  currentTrack = r;
  const bucket = citizenStatusBucket(r.status);
  const sm = statusMeta[bucket];
  document.getElementById('trackTitle').textContent = `Report ${r.id}`;
  document.getElementById('trackSub').textContent = `${r.title} · 📍 ${wardInfo(r.ward).name}`;
  const pill = document.getElementById('trackStatusPill');
  pill.className = 'status-pill ' + sm.cls;
  pill.textContent = sm.label;
  document.getElementById('trackEta').textContent = r.status==='resolved'
    ? 'Completed'
    : (r.assignee ? 'Assigned — awaiting completion' : 'Pending assignment');

  const beforeBox = document.getElementById('trackBeforeBox');
  beforeBox.innerHTML = '';
  beforeBox.appendChild(buildPhotoBox(r.photo, 'Before / पहले', 'Before', 'No photo'));
  const afterBox = document.getElementById('trackAfterBox');
  afterBox.innerHTML = '';
  afterBox.appendChild(buildPhotoBox(r.proofPhoto, 'After / बाद में', 'After', 'Awaiting Completion / पूरा होने की प्रतीक्षा में'));

  const tl = document.getElementById('trackTimeline');
  tl.innerHTML = '';
  ensureTimeline(r).forEach(step=>{
    const li = document.createElement('li');
    const dotCls = step.done ? 'done' : (step.active ? 'active' : 'pending');
    const dotChar = step.done ? '✓' : (step.active ? '●' : '○');
    const dateLine = step.at ? `<div class="ts">${formatDate(step.at)}</div>`
      : (step.done || step.active ? '' : `<div class="pending-lbl">Pending / लंबित</div>`);
    li.innerHTML = `<div class="tdot ${dotCls}">${dotChar}</div>
      <h4 ${dotCls==='pending'?'style="color:#999;"':''}>${step.step} / ${step.stepHi}</h4>
      ${dateLine}
      ${step.note ? `<span class="note">${step.note}</span>` : ''}`;
    tl.appendChild(li);
  });

  renderComments();
  goto('track');
}
function renderComments(){
  const box = document.getElementById('trackComments');
  box.innerHTML = '';
  if(!currentTrack) return;
  if(currentTrack.comments.length===0){
    box.innerHTML = `<p style="color:var(--muted); font-size:13px;">No comments yet — be the first to add one.</p>`;
  }
  currentTrack.comments.forEach(c=>{
    const initials = c.by.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const div = document.createElement('div');
    div.className = 'comment';
    div.innerHTML = `<div class="avatar">${initials}</div>
      <div class="comment-body"><div class="cname">${c.by} <span>${formatDate(c.at)}</span></div><p>${c.text}</p></div>`;
    box.appendChild(div);
  });
}
document.getElementById('postCommentBtn').addEventListener('click', ()=>{
  const input = document.getElementById('newCommentInput');
  const text = input.value.trim();
  if(!text || !currentTrack) return;
  currentTrack.comments.push({by:'You', at:new Date().toISOString(), text});
  input.value = '';
  renderComments();
});

// ---------- Community Map popup ----------
const popups = {
  handpump:{title:'🚰 Broken Handpump', status:'Open', desc:'Not yielding water for 3 days.'},
  light:{title:'💡 Streetlight Not Working', status:'Working', desc:'Parts awaited from vendor.'},
  pothole:{title:'🕳️ Large Pothole', status:'Resolved', desc:'Filled with gravel, leveled.'},
};
const mapCanvas = document.getElementById('mapCanvas');
function showPopup(key){
  const p = popups[key];
  const marker = document.querySelector(`.map-marker[data-popup="${key}"]`);
  const el = document.getElementById('mapPopup');
  if(marker && mapCanvas){
    // Computed from the marker's actual rendered position, not a fixed
    // percentage, so the popup lands correctly however the map is panned/zoomed.
    const canvasRect = mapCanvas.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    el.style.left = `${markerRect.left - canvasRect.left + markerRect.width/2 + 16}px`;
    el.style.top = `${markerRect.top - canvasRect.top - 70}px`;
  }
  el.style.display = 'block';
  el.innerHTML = `<strong>${p.title}</strong>Status: ${p.status}<br><span style="color:var(--muted);">${p.desc}</span>`;
}
// ---------- Community Map filter & controls ----------
const mapFilterRow = document.getElementById('mapFilterRow');
if(mapFilterRow){
  mapFilterRow.addEventListener('click', (e)=>{
    const chip = e.target.closest('.fchip');
    if(!chip) return;
    document.querySelectorAll('#mapFilterRow .fchip').forEach(c=>c.classList.remove('active'));
    chip.classList.add('active');
    const mf = chip.dataset.mf;
    document.querySelectorAll('.map-item').forEach(item=>{
      item.style.display = (mf==='all' || item.dataset.status===mf) ? 'block' : 'none';
    });
    document.querySelectorAll('.map-marker').forEach(marker=>{
      marker.style.display = (mf==='all' || marker.dataset.status===mf) ? 'flex' : 'none';
    });
    const popup = document.getElementById('mapPopup');
    if(popup) popup.style.display = 'none';
  });
}
const mapViewport = document.getElementById('mapViewport');
renderHotspots(mapViewport);
const pannableMap = (mapCanvas && mapViewport) ? makePannableMap(mapCanvas, mapViewport, {
  onDragStart: ()=>{ const popup = document.getElementById('mapPopup'); if(popup) popup.style.display = 'none'; }
}) : null;
document.getElementById('mapZoomIn')?.addEventListener('click', ()=> pannableMap?.zoomIn());
document.getElementById('mapZoomOut')?.addEventListener('click', ()=> pannableMap?.zoomOut());
document.getElementById('mapRecenter')?.addEventListener('click', ()=> pannableMap?.recenter());
