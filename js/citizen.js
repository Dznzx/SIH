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
// Demo submission point (Ward 12, same spot as CS-2026-8912) — reusing this
// exact coordinate is what makes the duplicate-detection scenario in
// CIVIC.dupeCluster actually fire, so it's kept as the fallback whenever
// real GPS isn't usable: permission denied, unsupported, or (the common
// case for anyone testing this outside Ranchi) too far from any ward this
// demo actually covers.
const DRAFT_LAT = 23.3441, DRAFT_LNG = 85.3096;

// Real geolocation. Ward centers below are the average coordinates of this
// ward's own seed reports already in CIVIC.reports (data.js) — not invented
// geodata, just the centroid of points already in the dataset.
const WARD_CENTERS = {
  W12: { lat: 23.3429, lng: 85.3109 }, // Hatia
  W07: { lat: 23.3252, lng: 85.3271 }, // Doranda
  W04: { lat: 23.4055, lng: 85.3099 }, // Kanke
  W19: { lat: 23.3701, lng: 85.3340 }, // Bariatu
};
const SERVICE_AREA_RADIUS_KM = 15; // generous radius around the covered wards
function haversineKm(lat1, lng1, lat2, lng2){
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function nearestWard(lat, lng){
  let best = null, bestDist = Infinity;
  for(const [id, c] of Object.entries(WARD_CENTERS)){
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if(d < bestDist){ bestDist = d; best = id; }
  }
  return { wardId: best, distanceKm: bestDist };
}

let currentLat = DRAFT_LAT, currentLng = DRAFT_LNG, currentWardId = 'W12';
const gpsLabelEl = document.getElementById('gpsLabel');
function setGpsLabel(text){ if(gpsLabelEl) gpsLabelEl.textContent = text; }

function initGps(){
  if(!('geolocation' in navigator)){
    setGpsLabel(' GPS unavailable on this device — using demo location (Ward 12, Ranchi)');
    return;
  }
  setGpsLabel(' Locating…');
  navigator.geolocation.getCurrentPosition(
    (pos)=>{
      const { latitude, longitude } = pos.coords;
      const { wardId, distanceKm } = nearestWard(latitude, longitude);
      // Always use the real GPS fix — this app is a Ranchi-specific
      // prototype, but demo testers/judges can be anywhere in the world, and
      // silently swapping their real location for a fixed Ranchi fallback
      // just because they're outside a 15km radius reads as "GPS is broken".
      // Show real distance-from-service-area context instead of hiding it.
      currentLat = latitude; currentLng = longitude; currentWardId = wardId;
      if(distanceKm <= SERVICE_AREA_RADIUS_KM){
        setGpsLabel(` GPS · ${wardInfo(wardId).name}, Ranchi`);
      } else {
        setGpsLabel(` GPS · ${Math.round(distanceKm)}km from Ranchi — mapped to nearest ward (${wardInfo(wardId).name}) for this demo`);
      }
    },
    ()=>{
      setGpsLabel(' Location permission denied — using demo location (Ward 12, Ranchi)');
    },
    { timeout: 8000, maximumAge: 60000 }
  );
}
initGps();

let dupeAnchor = null;
let confirmDuplicateMode = false;
document.querySelectorAll('.cat-chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    document.querySelectorAll('.cat-chip').forEach(c=>c.classList.remove('sel'));
    chip.classList.add('sel');
    catSelected = chip.dataset.cat;
    confirmDuplicateMode = false;
    dupeAnchor = findDuplicate(catSelected, currentLat, currentLng);
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
// Was a fixed `let reportSeq = 8913` — every fresh page load restarted the
// counter from the same number, so the *first* report anyone submitted in
// any session always tried to insert id "CS-2026-8914". That collides with
// the real, shared Supabase table the moment more than one submission ever
// happens (this exact id already exists in production) — the insert then
// fails on a primary-key conflict, which looks identical to "it didn't
// save" from the citizen's side. Deriving it from the highest id actually
// in CIVIC.reports (seed data + everything Supabase has synced in) keeps
// it unique across sessions instead of just within one.
function nextReportSeq(){
  let max = 8913;
  CIVIC.reports.forEach(r=>{
    const m = /^CS-2026-(\d+)$/.exec(r.id);
    if(m){ const n = parseInt(m[1], 10); if(n > max) max = n; }
  });
  return max + 1;
}
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
  const wardName = wardInfo(currentWardId).name;
  showRoutingBanner(`${catSelected} + ${wardName} → ${dept}`);

  setTimeout(()=>{
    submitBtn.textContent = isOnline ? t('submitted_ok') : t('queued_offline_ok');

    const desc = document.getElementById('descInput').value.trim();
    const now = new Date();
    const reportSeq = nextReportSeq();
    const slaHours = CIVIC.slaHours[catSelected] || 48;
    const newReport = {
      id: `CS-2026-${reportSeq}`,
      title: desc || `${catSelected} · ${wardName}`,
      titleHi: '',
      category: catSelected,
      ward: currentWardId,
      lat: currentLat, lng: currentLng,
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
      comments: [],
      reporterEmail: currentUser?.email || null
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
// "My Reports" must actually mean the signed-in citizen's own reports — old
// reports predating this field (or ones synced before a reporterEmail was
// ever recorded) have no owner on file, so they're shown too rather than
// disappearing silently; anything with a *different* owner is excluded.
function myReports(){
  const email = (typeof currentUser !== 'undefined' && currentUser?.email) || null;
  return CIVIC.reports.filter(r => !r.reporterEmail || r.reporterEmail === email);
}
function renderReports(filter){
  reportsFilter = filter || reportsFilter;
  const list = document.getElementById('reportsList');
  list.innerHTML = '';
  myReports().filter(r => reportsFilter==='all' || citizenStatusBucket(r.status)===reportsFilter).forEach(r=>{
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
  const mine = myReports();
  const counts = {all:mine.length, received:0, working:0, fixed:0};
  mine.forEach(r=> counts[citizenStatusBucket(r.status)]++);
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

// ---------- Community Map (Leaflet, real reports) ----------
// #citizenMap used to be dead space: the JS that drew on it (`mapViewport`,
// a hand-illustrated SVG, pan/zoom-by-CSS-transform) targeted DOM ids that
// no longer exist in index.html, so nothing ever rendered — and the list
// beside it was three hardcoded demo cards regardless of what was actually
// reported. This replaces both with a real Leaflet map (matching the
// officer dashboard's) and a list driven by CIVIC.reports.
let citizenMap = null;
let citizenMapMarkers = [];
function citizenPinBucket(r){
  return citizenStatusBucket(r.status)==='fixed' ? 'resolved' : (citizenStatusBucket(r.status)==='working' ? 'working' : 'open');
}
function citizenPinColor(r){
  return { open:'#c0392b', working:'#c9922b', resolved:'#1f7a4d' }[citizenPinBucket(r)];
}
function initCitizenMap(){
  const el = document.getElementById('citizenMap');
  if(!el || citizenMap || typeof L === 'undefined') return;
  citizenMap = L.map('citizenMap').setView([23.3441, 85.3096], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(citizenMap);
}
let mapFilter = 'all';
function renderCitizenMap(){
  initCitizenMap();
  renderMapList();
  if(!citizenMap) return;
  citizenMapMarkers.forEach(m=>citizenMap.removeLayer(m));
  citizenMapMarkers = [];
  CIVIC.reports.filter(r=>r.status!=='queued' && (mapFilter==='all' || citizenPinBucket(r)===mapFilter)).forEach(r=>{
    const icon = L.divIcon({
      html: `<div style="background:${citizenPinColor(r)}; width:18px; height:18px; border-radius:50%; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,.3);"></div>`,
      className: '', iconSize: [18,18], iconAnchor: [9,9]
    });
    const marker = L.marker([r.lat, r.lng], { icon }).addTo(citizenMap);
    marker.bindPopup(`<strong>${r.title}</strong><br>${wardInfo(r.ward).name} · ${r.category}<br><span style="text-transform:capitalize;">${citizenPinBucket(r)}</span>`);
    marker._reportId = r.id;
    citizenMapMarkers.push(marker);
  });
  if(typeof refreshAllHotspots==='function') refreshAllHotspots();
}
function renderMapList(){
  const list = document.getElementById('mapItemList');
  if(!list) return;
  list.innerHTML = '';
  const rows = CIVIC.reports.filter(r=>r.status!=='queued' && (mapFilter==='all' || citizenPinBucket(r)===mapFilter));
  if(rows.length===0){
    list.innerHTML = `<div class="inv-empty">No reports match this filter.</div>`;
    return;
  }
  rows.forEach(r=>{
    const bucket = citizenPinBucket(r);
    const div = document.createElement('div');
    div.className = 'map-item';
    div.dataset.status = bucket;
    div.innerHTML = `
      <div class="map-item-top"><strong>${icons[r.category]||'📍'} ${r.title}</strong><span class="status-pill status-${bucket}">${bucket[0].toUpperCase()+bucket.slice(1)}</span></div>
      <div class="loc">${wardInfo(r.ward).name}</div>
      <p>${reportDescText(r)}</p>
      <div class="foot">🕒 Reported ${formatDate(r.submittedAt)}</div>`;
    div.addEventListener('click', ()=>{
      if(!citizenMap) return;
      citizenMap.setView([r.lat, r.lng], 15);
      const marker = citizenMapMarkers.find(m=>m._reportId===r.id);
      marker?.openPopup();
    });
    list.appendChild(div);
  });
}
document.getElementById('mapFilterRow')?.addEventListener('click', (e)=>{
  const chip = e.target.closest('.fchip');
  if(!chip) return;
  document.querySelectorAll('#mapFilterRow .fchip').forEach(c=>c.classList.remove('active'));
  chip.classList.add('active');
  mapFilter = chip.dataset.mf;
  renderCitizenMap();
});
