// ---------- Prototype role gate (client-side only, no backend — not secure) ----------
// Blocks the whole app behind a role pick until currentUser is set. This is
// what makes the Authority dashboard actually unreachable from Citizen role,
// rather than just visually hidden.
const USER_KEY = 'civic_user';
let currentUser = null;
try{ currentUser = JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch(e){ currentUser = null; }

// Roles that get Authority-dashboard access: legacy 'officer' plus the
// unified sign-in form's 'government' and 'admin' roles.
function isOfficerRole(role){
  return role==='officer' || role==='government' || role==='admin';
}

function applyRoleUI(){
  const gate = document.getElementById('authGate');
  const appEl = document.querySelector('.app');
  if(!currentUser){
    if(gate) gate.style.display = 'flex';
    if(appEl) appEl.style.display = 'none';
    return;
  }
  if(gate) gate.style.display = 'none';
  if(appEl) appEl.style.display = '';

  const isOfficer = isOfficerRole(currentUser.role);
  const modeToggle = document.querySelector('.mode-toggle');
  if(modeToggle) modeToggle.style.display = isOfficer ? '' : 'none';
  const authorityTile = document.getElementById('authorityTile');
  if(authorityTile) authorityTile.style.display = isOfficer ? '' : 'none';

  const head = document.getElementById('profileHead');
  const sub = document.getElementById('profileSub');
  if(head) head.textContent = `👤 ${currentUser.name}`;
  if(sub) sub.textContent = isOfficer ? currentUser.department : 'Ward 12, Ranchi';

  const officerId = document.getElementById('dashOfficerId');
  if(officerId) officerId.textContent = isOfficer ? `${currentUser.name} · ${currentUser.department}` : '';
}
applyRoleUI();

function saveUser(u){
  currentUser = u;
  localStorage.setItem(USER_KEY, JSON.stringify(u));
  applyRoleUI();
  setMode(isOfficerRole(u.role) ? 'dash' : 'citizen');
}
document.getElementById('signOutBtn')?.addEventListener('click', ()=>{
  currentUser = null;
  localStorage.removeItem(USER_KEY);
  location.reload();
});

// Unified sign-in form: one role picker plus a shared name/university/passcode
// form (the university field only matters for cross-university team roles).
const authRoleSelect = document.getElementById('authRoleSelect');
const authUniGroup = document.getElementById('authUniGroup');
const ROLES_WITH_UNIVERSITY = new Set(['student', 'faculty']);
function syncAuthUniGroup(){
  if(!authRoleSelect || !authUniGroup) return;
  authUniGroup.style.display = ROLES_WITH_UNIVERSITY.has(authRoleSelect.value) ? 'block' : 'none';
}
authRoleSelect?.addEventListener('change', syncAuthUniGroup);
syncAuthUniGroup();

document.getElementById('authSubmit')?.addEventListener('click', ()=>{
  const role = authRoleSelect.value;
  const name = document.getElementById('authNameInput').value.trim() || 'User';
  const university = document.getElementById('authUniInput').value.trim();
  const code = document.getElementById('authPasscode').value;
  const errorEl = document.getElementById('authError');
  if(code !== '1234'){
    errorEl.style.display = 'block';
    return;
  }
  errorEl.style.display = 'none';
  const user = { role, name };
  if(university) user.university = university;
  if(isOfficerRole(role)) user.department = CIVIC.departments ? Object.values(CIVIC.departments)[0] : 'General';
  saveUser(user);
});

// ---------- Shared report helpers (CIVIC.reports is the single source of truth,
// read and mutated by both js/citizen.js and js/authority.js) ----------
function wardInfo(wardId){
  return CIVIC.wards.find(w=>w.id===wardId) || {id:wardId, name:wardId, pop:0, reportRate:0, underReported:false};
}
function citizenStatusBucket(status){
  return {received:'received', assigned:'working', in_progress:'working', resolved:'fixed', queued:'queued'}[status] || 'received';
}
function formatDate(iso){
  return iso ? new Date(iso).toLocaleDateString('en-US', {month:'short', day:'2-digit', year:'numeric'}) : null;
}
function handlePhotoError(imgEl, fallbackClass, fallbackHtml){
  const fb = document.createElement('div');
  fb.className = fallbackClass;
  fb.innerHTML = fallbackHtml;
  imgEl.replaceWith(fb);
}

const CORE_STAGES = ['Report Submitted', 'Assigned to Officer', 'Work in Progress', 'Issue Resolved'];
const CORE_STAGE_HI = {
  'Report Submitted': 'रिपोर्ट दर्ज की गई',
  'Assigned to Officer': 'अधिकारी को सौंपा गया',
  'Work in Progress': 'काम चल रहा है',
  'Issue Resolved': 'समस्या हल हो गई'
};
// Builds the 4-stage timeline the first time a report is rendered, from its
// current status/assignee/resolvedAt. Later actions (assign, resolve, SLA
// breach) mutate entries of the resulting array directly, so this only ever
// runs once per report — it will not overwrite an existing timeline.
function ensureTimeline(r){
  if(r.timeline && r.timeline.length) return r.timeline;
  const doneCount = {received:1, assigned:2, in_progress:2, resolved:4}[r.status] ?? 1;
  const activeIndex = r.status==='in_progress' ? 2 : -1;
  r.timeline = CORE_STAGES.map((step,i)=>({
    step, stepHi: CORE_STAGE_HI[step],
    at: i===0 ? r.submittedAt : (i===3 && r.status==='resolved' ? (r.resolvedAt||null) : null),
    done: i < doneCount,
    active: i === activeIndex,
    note: (i===1 && doneCount>1) ? `Assigned to: ${r.assignee || CIVIC.departments[r.category]}` : undefined
  }));
  return r.timeline;
}
// ---------- Pannable/zoomable static map (offline-safe: no tiles, no network) ----------
// Drives drag-to-pan and the zoom buttons on a map-canvas/map-viewport pair.
// `viewport` holds the SVG background + pins and is the thing that actually
// moves; `canvas` is the fixed-size, overflow:hidden frame around it.
function makePannableMap(canvas, viewport, opts={}){
  let scale = 1, x = 0, y = 0, dragging = false, startX, startY, startPanX, startPanY;
  const minScale = opts.minScale || 1, maxScale = opts.maxScale || 2.5;
  function apply(animated){
    viewport.style.transition = animated ? 'transform .2s ease' : 'none';
    viewport.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }
  function clampPan(){
    const rect = canvas.getBoundingClientRect();
    const maxX = (rect.width * (scale-1)) / 2 + rect.width*0.15;
    const maxY = (rect.height * (scale-1)) / 2 + rect.height*0.15;
    x = Math.max(-maxX, Math.min(maxX, x));
    y = Math.max(-maxY, Math.min(maxY, y));
  }
  function onDown(clientX, clientY){
    dragging = true; startX = clientX; startY = clientY; startPanX = x; startPanY = y;
    canvas.classList.add('dragging');
    opts.onDragStart?.();
  }
  function onMove(clientX, clientY){
    if(!dragging) return;
    x = startPanX + (clientX - startX);
    y = startPanY + (clientY - startY);
    clampPan();
    apply();
  }
  function onUp(){ dragging = false; canvas.classList.remove('dragging'); }
  canvas.addEventListener('mousedown', e=>{ onDown(e.clientX, e.clientY); e.preventDefault(); });
  window.addEventListener('mousemove', e=> onMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', e=>{ const t=e.touches[0]; onDown(t.clientX, t.clientY); }, {passive:true});
  canvas.addEventListener('touchmove', e=>{ const t=e.touches[0]; onMove(t.clientX, t.clientY); }, {passive:true});
  canvas.addEventListener('touchend', onUp);
  return {
    zoomIn(){ scale = Math.min(maxScale, +(scale+0.25).toFixed(2)); clampPan(); apply(true); },
    zoomOut(){ scale = Math.max(minScale, +(scale-0.25).toFixed(2)); clampPan(); apply(true); },
    recenter(){ scale = 1; x = 0; y = 0; apply(true); }
  };
}
// Shared stylised SVG of Ranchi's four seeded wards — no tile service, no
// network, per PROMPT.md. Reused by both the citizen Community Map and the
// authority dashboard's Map tab so they read as the same place.
const WARDS_MAP_SVG = `
  <svg class="map-svg-bg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
    <rect width="400" height="300" fill="#eef6f0"/>
    <path d="M60,190 Q160,140 260,175 Q320,195 365,178" stroke="#ffffff" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M150,90 Q140,150 120,220" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round"/>
    <polygon points="115,15 210,10 235,75 165,105 95,75" fill="#e3cfa1" stroke="#c9ab6c" stroke-width="2"/>
    <text x="130" y="60" font-size="13" fill="#6b4f1f" font-weight="700" font-family="sans-serif">Kanke</text>
    <polygon points="20,145 105,115 145,180 95,235 15,215" fill="#cfe8d8" stroke="#a9d3b8" stroke-width="2"/>
    <text x="45" y="185" font-size="13" fill="#2f5b41" font-weight="700" font-family="sans-serif">Hatia</text>
    <polygon points="235,140 325,120 365,180 320,235 250,215" fill="#d8ecdd" stroke="#a9d3b8" stroke-width="2"/>
    <text x="270" y="185" font-size="13" fill="#2f5b41" font-weight="700" font-family="sans-serif">Doranda</text>
    <polygon points="215,205 300,195 335,250 265,290 205,260" fill="#cfe0ec" stroke="#a7c3d8" stroke-width="2"/>
    <text x="235" y="250" font-size="13" fill="#2c4f66" font-weight="700" font-family="sans-serif">Bariatu</text>
  </svg>`;

// (Duplicate-detection helpers now live in the "Duplicate detection via
// DBSCAN" block below, backed by js/geo-cluster.js.)

// ---------- Duplicate detection via DBSCAN (step 8b) ----------
// Clusters same-category, unresolved, still-within-window reports (see
// js/geo-cluster.js) and checks whether a draft report at (lat, lng)
// would join an existing cluster — the anchor a "Confirm existing
// instead" action should confirm rather than duplicate. Replaces the
// original single fixed-radius pairwise distance check with a real
// density-based clustering pass, so "3 similar issues nearby" reflects
// an actual cluster size rather than a hardcoded display number.
function findDuplicate(category, lat, lng){
  const { radiusM, windowHours, minPts } = CIVIC.dupeCluster;
  const now = Date.now();
  const candidates = CIVIC.reports.filter(r=>
    r.category===category &&
    r.status!=='resolved' &&
    (now - new Date(r.submittedAt).getTime()) <= windowHours*3600*1000
  );
  const hit = GeoCluster.findJoinableCluster(candidates, lat, lng, radiusM, minPts);
  if(!hit) return null;
  hit.nearestMember._clusterSize = hit.cluster.members.length;
  return hit.nearestMember;
}

// ---------- Hotspot overlay (DBSCAN over all unresolved reports) ----------
// The stylised ward SVG (WARDS_MAP_SVG above) was hand-illustrated, not
// generated from real coordinates, so there's no built-in lat/lng->pixel
// projection to reuse. This fits a small least-squares affine transform
// from 4 calibration points — each ward's real report centroid paired
// with that ward's label position in the SVG's 400x300 viewBox — so a
// DBSCAN cluster's real (lat, lng) center can be placed in roughly the
// right spot on the illustrated map. It's necessarily approximate (the
// map itself is illustrative), but good enough to show which ward a
// hotspot is in and roughly where.
const MAP_CALIBRATION = [
  // [lat, lng, svgX, svgY]
  [23.34145, 85.3118, 65, 195],   // Hatia (W12) — avg of its seed reports
  [23.3252,  85.3271, 300, 195],  // Doranda (W07)
  [23.4055,  85.3099, 155, 55],   // Kanke (W04)
  [23.3701,  85.3340, 270, 250],  // Bariatu (W19)
];
function solve3x3Augmented(rows){
  const m = rows.map(r=>r.slice());
  for(let i=0;i<3;i++){
    let piv=i;
    for(let k=i+1;k<3;k++) if(Math.abs(m[k][i])>Math.abs(m[piv][i])) piv=k;
    [m[i],m[piv]]=[m[piv],m[i]];
    const div=m[i][i] || 1e-9;
    for(let j=i;j<4;j++) m[i][j]/=div;
    for(let k=0;k<3;k++){
      if(k===i) continue;
      const factor=m[k][i];
      for(let j=i;j<4;j++) m[k][j]-=factor*m[i][j];
    }
  }
  return [m[0][3], m[1][3], m[2][3]];
}
function fitAffine(points, targetIndex){
  let Sll=0,Slg=0,Sl1=0,Sgg=0,Sg1=0,S11=0,Slt=0,Sgt=0,St=0;
  points.forEach(p=>{
    const lat=p[0], lng=p[1], t=p[targetIndex];
    Sll+=lat*lat; Slg+=lat*lng; Sl1+=lat; Sgg+=lng*lng; Sg1+=lng; S11+=1;
    Slt+=lat*t; Sgt+=lng*t; St+=t;
  });
  return solve3x3Augmented([
    [Sll, Slg, Sl1, Slt],
    [Slg, Sgg, Sg1, Sgt],
    [Sl1, Sg1, S11, St],
  ]);
}
const AFFINE_X = fitAffine(MAP_CALIBRATION, 2);
const AFFINE_Y = fitAffine(MAP_CALIBRATION, 3);
function projectLatLngToMapPct(lat, lng){
  const x = AFFINE_X[0]*lat + AFFINE_X[1]*lng + AFFINE_X[2];
  const y = AFFINE_Y[0]*lat + AFFINE_Y[1]*lng + AFFINE_Y[2];
  return { leftPct: Math.max(2, Math.min(98, x/400*100)), topPct: Math.max(2, Math.min(98, y/300*100)) };
}

// Renders DBSCAN hotspot circles into `layerEl` (expected to already
// contain the WARDS_MAP_SVG background — circles are appended after it).
// Idempotent: clears any hotspot circles it previously drew before
// re-rendering, so it's safe to call again after any report mutation.
function renderHotspots(layerEl){
  if(!layerEl) return;
  layerEl.querySelectorAll('.hotspot-circle').forEach(el=>el.remove());
  const open = CIVIC.reports.filter(r=>r.status!=='resolved' && r.status!=='queued');
  const hotspots = GeoCluster.findHotspots(open, CIVIC.hotspot.radiusM, CIVIC.hotspot.minPts);
  hotspots.forEach(h=>{
    const { leftPct, topPct } = projectLatLngToMapPct(h.center.lat, h.center.lng);
    const size = Math.min(120, 36 + h.count*14);
    const el = document.createElement('div');
    el.className = 'hotspot-circle';
    el.style.left = `${leftPct}%`;
    el.style.top = `${topPct}%`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    const catSummary = Object.entries(h.categories).map(([c,n])=>`${c} ×${n}`).join(', ');
    el.title = `Hotspot: ${h.count} open reports nearby — ${catSummary}`;
    layerEl.appendChild(el);
  });
  return hotspots;
}
// Re-renders hotspot overlays on whichever map canvases currently exist
// in the DOM (citizen Community Map, authority dashboard Map tab). Call
// this after any report data mutation, same as renderQueue()/renderReports().
function refreshAllHotspots(){
  const citizenLayer = document.getElementById('mapViewport');
  if(citizenLayer) renderHotspots(citizenLayer);
  const dashLayer = document.getElementById('dashMapCanvas');
  if(dashLayer && dashLayer.querySelector('svg')) renderHotspots(dashLayer);
}

function showToast(message, duration=2200){
  let el = document.getElementById('toast');
  if(!el){
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> el.classList.remove('show'), duration);
}

// ---------- Offline-first (step 4) ----------
// `isOnline` is a demo control, not a real network check — see the pinned
// DEMO · NETWORK toggle. Offline submissions get status 'queued' and are
// persisted here so a page refresh mid-demo doesn't lose them; they only
// reach the authority queue once flushOfflineQueue() runs them through.
let isOnline = true;
const OFFLINE_QUEUE_KEY = 'civic_offline_queue_v1';
function persistOfflineQueue(){
  const queued = CIVIC.reports.filter(r=>r.status==='queued');
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queued));
}
function loadOfflineQueue(){
  try{
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if(!raw) return;
    JSON.parse(raw).forEach(r=>{
      if(!CIVIC.reports.find(x=>x.id===r.id)) CIVIC.reports.unshift(r);
    });
  } catch(e){ /* corrupt/blocked storage — start clean */ }
}
function updateOfflineStrip(){
  const strip = document.getElementById('offlineStrip');
  const text = document.getElementById('offlineStripText');
  if(!strip || !text) return;
  const count = CIVIC.reports.filter(r=>r.status==='queued').length;
  strip.style.display = count>0 ? 'flex' : 'none';
  text.textContent = `${count} report${count===1?'':'s'} waiting to sync`;
}
function flushOfflineQueue(){
  const queued = CIVIC.reports.filter(r=>r.status==='queued');
  if(queued.length===0) return;
  showToast(`Syncing ${queued.length} queued report${queued.length===1?'':'s'}…`, 900 + queued.length*400);
  queued.forEach((r,i)=>{
    setTimeout(()=>{
      r.status = 'received';
      persistOfflineQueue();
      updateOfflineStrip();
      renderReports(reportsFilter);
      renderQueue();
      if(i === queued.length-1){
        pushNotification('🔄', `Synced ${queued.length} queued report${queued.length===1?'':'s'}`);
      }
    }, (i+1) * 400);
  });
}
function setOnline(online){
  isOnline = online;
  const btn = document.getElementById('networkBtn');
  if(btn){
    btn.textContent = isOnline ? 'ONLINE' : 'OFFLINE';
    btn.className = 'demo-tools-btn ' + (isOnline ? 'online' : 'offline');
  }
  if(isOnline) flushOfflineQueue();
}
document.getElementById('networkBtn')?.addEventListener('click', ()=> setOnline(!isOnline));
loadOfflineQueue();
updateOfflineStrip();

// Step 6: resolve the seed's DEMO_BREACH_SOON placeholder into a real runtime
// deadline, so that report breaches its SLA ~90s after this page loaded.
CIVIC.reports.forEach(r=>{
  if(r.slaDeadline === 'DEMO_BREACH_SOON'){
    r.slaDeadline = new Date(Date.now() + 90*1000).toISOString();
  }
});

// One-time pass so every seed report has a well-formed timeline before first render.
CIVIC.reports.forEach(ensureTimeline);

// ---------- Nav / view switching ----------
function goto(name){
  document.querySelectorAll('.navlinks a').forEach(a=>a.classList.toggle('active', a.dataset.view===name));
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const el = document.getElementById('view-'+name);
  if(el) el.classList.add('active');
  window.scrollTo({top:0, behavior:'smooth'});
}
document.querySelectorAll('.navlinks a').forEach(a=>{
  a.addEventListener('click', ()=>{
    if(a.dataset.view==='track'){ openTrack(currentTrack || CIVIC.reports[0]); }
    else { goto(a.dataset.view); }
  });
});
document.getElementById('topReportBtn').addEventListener('click', ()=>goto('home'));
document.getElementById('newReportBtn').addEventListener('click', ()=>goto('home'));

function setMode(mode){
  // Role gate: the Authority dashboard is unreachable outside the officer
  // role, whether reached via the toggle, the quick-tile, or a direct call.
  if(mode==='dash' && (!currentUser || !isOfficerRole(currentUser.role))){
    mode = 'citizen';
  }
  document.querySelectorAll('.mode-toggle button').forEach(b=>b.classList.toggle('active', b.dataset.mode===mode));
  if(mode==='dash'){
    document.getElementById('navlinks').style.visibility='hidden';
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('view-dash').classList.add('active');
  } else {
    document.getElementById('navlinks').style.visibility='visible';
    goto('home');
  }
}
document.querySelectorAll('.mode-toggle button').forEach(btn=>{
  btn.addEventListener('click', ()=>setMode(btn.dataset.mode));
});

// ---------- Notifications (real, event-driven — not decorative) ----------
const NOTIFICATIONS = [];
function pushNotification(icon, text){
  NOTIFICATIONS.unshift({icon, text, at:new Date().toISOString()});
  const dot = document.getElementById('notifDot');
  if(dot) dot.style.display = 'block';
  renderNotifications();
}
function renderNotifications(){
  const menu = document.getElementById('notifMenu');
  if(!menu) return;
  menu.innerHTML = NOTIFICATIONS.length
    ? NOTIFICATIONS.slice(0, 25).map(n=>`<div class="notif-item"><span class="notif-icon">${n.icon}</span><div><div class="notif-text">${n.text}</div><div class="notif-time">${new Date(n.at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</div></div></div>`).join('')
    : `<div class="notif-empty">No notifications yet.</div>`;
}
renderNotifications();
document.getElementById('notifBtn')?.addEventListener('click', (e)=>{
  e.stopPropagation();
  closeDropdowns('notifMenu');
  document.getElementById('notifMenu')?.classList.toggle('show');
  const dot = document.getElementById('notifDot');
  if(dot) dot.style.display = 'none';
});

// ---------- Profile (demo identity + real, working utilities) ----------
let sessionSubmittedCount = 0;
function bumpSessionSubmitted(){
  sessionSubmittedCount += 1;
  const el = document.getElementById('profileStat');
  if(el) el.textContent = `${sessionSubmittedCount} report${sessionSubmittedCount===1?'':'s'} submitted this session`;
  if(typeof unlockBadge === 'function') unlockBadge('first_submission');
}
document.getElementById('profileBtn')?.addEventListener('click', (e)=>{
  e.stopPropagation();
  closeDropdowns('profileMenu');
  document.getElementById('profileMenu')?.classList.toggle('show');
});
// Reset lives behind a hidden shortcut, not a citizen-facing button —
// it's a dev/presenter control for resetting between demo runs.
function resetDemoData(){
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
  localStorage.removeItem('civic_lang');
  location.reload();
}
document.addEventListener('keydown', (e)=>{
  if(e.ctrlKey && e.shiftKey && e.key.toLowerCase()==='r'){
    e.preventDefault();
    resetDemoData();
  }
});

// Shared dropdown behaviour: opening one closes the others; clicking outside closes all.
function closeDropdowns(exceptId){
  document.querySelectorAll('.lang-menu.show').forEach(m=>{
    if(m.id!==exceptId) m.classList.remove('show');
  });
}
document.addEventListener('click', ()=> closeDropdowns());

// ===== GLOBE + ACCESSIBILITY BUTTONS =====
// Runs after all scripts — guarantees langModal & a11yDrawer exist in DOM
(function setupLangAndA11y(){
  const langBtn   = document.getElementById('langBtn');
  const langModal = document.getElementById('langModal');
  const a11yBtn   = document.getElementById('a11yBtn');
  const a11yDrawer= document.getElementById('a11yDrawer');

  if(langBtn && langModal){
    langBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const isOpen = langModal.style.display === 'flex';
      langModal.style.display = isOpen ? 'none' : 'flex';
      if(!isOpen && typeof render22LanguagesModal === 'function') render22LanguagesModal();
    });
    langModal.addEventListener('click', (e)=>{
      if(e.target === langModal) langModal.style.display = 'none';
    });
  }

  if(a11yBtn && a11yDrawer){
    a11yBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const isOpen = a11yDrawer.style.display === 'flex';
      a11yDrawer.style.display = isOpen ? 'none' : 'flex';
    });
  }

  // Escape closes both
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape'){
      if(langModal)  langModal.style.display  = 'none';
      if(a11yDrawer) a11yDrawer.style.display = 'none';
    }
  });
})();
