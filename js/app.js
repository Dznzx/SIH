// ---------- Real sign-in: Supabase Auth (Google OAuth) ----------
// Blocks the whole app behind a real session until currentUser is set. This
// is what makes the Authority dashboard actually unreachable from Citizen
// role, rather than just visually hidden. Google only ever tells us name/
// email/photo — role and university are app-specific, so those live in a
// `profiles` row keyed by the Supabase Auth user id (see js/supabase-client.js
// and the `profiles` table/RLS policies) and get collected in a one-time
// "complete your profile" step right after a brand-new sign-in.
let currentUser = null;

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

  // Stakeholder-specific dashboards (faculty endorsement queue, industry CSR
  // portal, NGO fieldwork, mentor queue, admin panel) only make sense for
  // the matching role — everyone else never even sees the nav link.
  document.querySelectorAll('.role-only').forEach(el=>{
    el.style.display = (el.dataset.forrole === currentUser.role) ? '' : 'none';
  });
}
applyRoleUI();

// Roles with their own dedicated landing dashboard, rather than the
// citizen home screen, once signed in.
const ROLE_LANDING_VIEW = { faculty: 'faculty', industry: 'industry', ngo: 'ngo', mentor: 'mentor', admin: 'admin' };
// route: true only right after a fresh sign-in/profile-completion, not when
// merely restoring an existing session on page load (matches the old
// behavior, where a reload never forced you off whatever view you had open).
function setCurrentUser(profile, route){
  currentUser = {
    id: profile.id,
    name: profile.name || (profile.email ? profile.email.split('@')[0] : 'User'),
    email: profile.email,
    avatar_url: profile.avatar_url,
    role: profile.role,
    university: profile.university,
    uni: profile.university // teambuilder.js reads currentUser.uni
  };
  if(isOfficerRole(currentUser.role)) currentUser.department = CIVIC.departments ? Object.values(CIVIC.departments)[0] : 'General';
  applyRoleUI();
  if(typeof initTeamBuilder==='function') initTeamBuilder();
  if(!route) return;
  if(isOfficerRole(currentUser.role) && currentUser.role !== 'admin'){
    setMode('dash');
  } else if(ROLE_LANDING_VIEW[currentUser.role]){
    setMode('citizen');
    goto(ROLE_LANDING_VIEW[currentUser.role]);
  } else {
    setMode('citizen');
  }
}

function showAuthStep(step){
  ['authGoogleStep','authProfileStep','authLoadingStep'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.style.display = (id===step) ? '' : 'none';
  });
}

async function loadProfileAndEnter(session, route){
  const { data: profile, error } = await SB.client.from('profiles').select('*').eq('id', session.user.id).single();
  if(error || !profile){
    console.error('Failed to load profile:', error?.message);
    showAuthStep('authGoogleStep');
    return;
  }
  if(!profile.role){
    // Brand-new sign-in — the auth trigger created a bare row (name/email/
    // avatar from Google) but role/university still need collecting.
    const greet = document.getElementById('authProfileGreetName');
    if(greet) greet.textContent = profile.name || profile.email || 'there';
    showAuthStep('authProfileStep');
    window.__pendingProfile = profile;
    return;
  }
  setCurrentUser(profile, route);
}

document.getElementById('authGoogleBtn')?.addEventListener('click', async ()=>{
  if(!SB.client){ alert('Sign-in is unavailable right now — could not reach the auth service.'); return; }
  const { error } = await SB.client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
  // A successful call navigates away to Google immediately — this only
  // runs if it couldn't even start (e.g. the Google provider hasn't been
  // enabled in the Supabase project yet).
  if(error){
    console.error('Google sign-in failed to start:', error.message);
    alert('Google sign-in isn\'t set up yet on this deployment (' + error.message + ').');
  }
});

document.getElementById('authProfileSubmit')?.addEventListener('click', async ()=>{
  const role = document.getElementById('authRoleSelect').value;
  const university = document.getElementById('authUniInput').value.trim();
  const profile = window.__pendingProfile;
  if(!profile) return;
  const { error } = await SB.client.from('profiles').update({ role, university: university || null }).eq('id', profile.id);
  if(error){ console.error('Failed to save profile:', error.message); alert('Could not save your profile — please try again.'); return; }
  setCurrentUser({ ...profile, role, university: university || null }, true);
});

document.getElementById('signOutBtn')?.addEventListener('click', async ()=>{
  if(SB.client) await SB.client.auth.signOut();
  currentUser = null;
  location.reload();
});

// Drives the whole gate: fires once on load with whatever session already
// exists (or none), and again the instant a Google OAuth redirect completes.
if(SB.client){
  showAuthStep('authLoadingStep');
  SB.client.auth.onAuthStateChange((event, session)=>{
    if(session && (event==='INITIAL_SESSION' || event==='SIGNED_IN' || event==='TOKEN_REFRESHED')){
      if(!currentUser) loadProfileAndEnter(session, event==='SIGNED_IN');
    } else if(event==='SIGNED_OUT' || (event==='INITIAL_SESSION' && !session)){
      currentUser = null;
      showAuthStep('authGoogleStep');
      applyRoleUI();
    }
  });
} else {
  showAuthStep('authGoogleStep');
  document.getElementById('authGoogleStep').innerHTML = '<p style="text-align:center; color:var(--red); font-size:13px;">Sign-in is unavailable — could not reach the authentication service. Check your connection and reload.</p>';
}

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
// Both real maps (citizen Community Map's `citizenMap`, authority dashboard's
// `dashMap`, both Leaflet instances) use real lat/lng, so hotspot circles are
// drawn as actual L.circle layers at their real radius in meters — no pixel
// projection needed. Idempotent per map: clears the circles it previously
// drew on that map before re-rendering, so it's safe to call again after any
// report mutation.
const hotspotLayersByMap = new Map(); // Leaflet map instance -> L.circle[]
function renderHotspotsOnMap(map, publicOnly){
  if(!map || typeof L === 'undefined') return;
  (hotspotLayersByMap.get(map) || []).forEach(c => map.removeLayer(c));
  const open = CIVIC.reports.filter(r=>r.status!=='resolved' && r.status!=='queued' && (!publicOnly || r.visibility !== 'private'));
  const hotspots = GeoCluster.findHotspots(open, CIVIC.hotspot.radiusM, CIVIC.hotspot.minPts);
  const circles = hotspots.map(h=>{
    const catSummary = Object.entries(h.categories).map(([c,n])=>`${c} ×${n}`).join(', ');
    return L.circle([h.center.lat, h.center.lng], {
      radius: CIVIC.hotspot.radiusM,
      color: '#c0392b', weight: 1, fillColor: '#c0392b', fillOpacity: 0.15
    }).bindTooltip(`Hotspot: ${h.count} open reports nearby — ${catSummary}`).addTo(map);
  });
  hotspotLayersByMap.set(map, circles);
  return hotspots;
}
// Re-renders hotspot overlays on whichever real maps currently exist (citizen
// Community Map, authority dashboard Map tab). Call after any report
// mutation, same as renderQueue()/renderReports().
function refreshAllHotspots(){
  // civic:reportsUpdated can fire (via an async Supabase fetch resolving)
  // before every later <script> tag has finished executing. `dashMap`/
  // `citizenMap` are `let` bindings in authority.js/citizen.js — accessing
  // one still in its temporal dead zone throws a ReferenceError, not just
  // "undefined", so `typeof` alone isn't a safe guard here; wrap each in
  // try/catch and just skip it for this call if its script hasn't run yet.
  try { if(typeof citizenMap !== 'undefined' && citizenMap) renderHotspotsOnMap(citizenMap, true); } catch(e){}
  try { if(typeof dashMap !== 'undefined' && dashMap) renderHotspotsOnMap(dashMap, false); } catch(e){}
}

// Fires whenever js/data.js merges fresh rows in from Supabase (initial
// load, or a realtime insert/update from ANY browser). Every screen that
// reads CIVIC.reports needs to redraw — this is what makes a citizen's
// report actually show up on an already-open Authority dashboard, and vice
// versa, without either side reloading the page.
//
// This listener is registered before citizen.js/authority.js/policy.js have
// necessarily finished defining these functions — usually the async network
// round trip before the first fire is enough time for every later <script>
// tag to have run, but it isn't guaranteed. Checking `typeof fn==='function'`
// is a safe guard for the function declarations below (fully hoisted, never
// in a temporal dead zone), but `citizenMap`/`reportsFilter` are `let`
// bindings — reading one still in its TDZ throws a ReferenceError even
// through `typeof`, which would otherwise abort every render call after it
// in this same listener call. Each call is wrapped separately so one
// failing (script not loaded yet) can't block the others.
window.addEventListener('civic:reportsUpdated', ()=>{
  try { if(typeof renderQueue==='function') renderQueue(); } catch(e){}
  try {
    if(typeof renderReports==='function'){
      let filter = 'all';
      try { if(typeof reportsFilter!=='undefined') filter = reportsFilter; } catch(e){}
      renderReports(filter);
    }
  } catch(e){}
  try { if(typeof renderResolvedGallery==='function') renderResolvedGallery(); } catch(e){}
  try { if(typeof renderInstitutionalParticipation==='function') renderInstitutionalParticipation(); } catch(e){}
  try { if(typeof renderIndustryPortal==='function') renderIndustryPortal(); } catch(e){}
  // Only re-render the Community Map if it's already been initialized (the
  // user has visited it at least once) — calling renderCitizenMap() before
  // that would create a Leaflet instance inside a still-hidden view, the
  // same zero-size-container bug the ward heatmap had.
  try {
    if(typeof citizenMap!=='undefined' && citizenMap && typeof renderCitizenMap==='function') renderCitizenMap();
  } catch(e){}
  refreshAllHotspots();
});

// Fires when the challenges table changes (an officer escalates a report,
// or a faculty member approves/rejects one) — same try/catch-per-call
// reasoning as civic:reportsUpdated above.
window.addEventListener('civic:challengesUpdated', ()=>{
  try { if(typeof renderQueue==='function') renderQueue(); } catch(e){}
  try { if(typeof renderFacultyQueue==='function') renderFacultyQueue(); } catch(e){}
  try { if(typeof renderChallenges==='function') renderChallenges(); } catch(e){}
  try { if(typeof renderInstitutionalParticipation==='function') renderInstitutionalParticipation(); } catch(e){}
  try { if(typeof renderIndustryPortal==='function') renderIndustryPortal(); } catch(e){}
});

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

// SB.insertReport/updateReport return {ok, reason} instead of a bare
// boolean specifically so a failed write can say WHY — "you're signed out"
// needs a different fix from "the network dropped", and both need to be
// visible to the user rather than a console.error nobody sees. Without
// this, a write silently discarded by Row Level Security (a session gone
// stale — see js/supabase-client.js's ensureSession) looked identical to a
// real save: the local UI already showed the change, so nothing seemed
// wrong until the next reload quietly reverted it.
function syncFailureMessage(result){
  if(!result || result.ok) return null;
  if(result.reason === 'signed_out') return "⚠️ Your session expired — this didn't save. Please sign out and sign in again.";
  if(result.reason === 'blocked') return "⚠️ This didn't save (permission denied) — try signing out and back in.";
  if(result.reason === 'offline') return "⚠️ Not connected — this only saved on this device.";
  return "⚠️ This didn't save to the server — try again.";
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
      // A queued report was never inserted into Supabase — only now that
      // it's "back online" does it actually become visible to other users.
      // Skip the attempt (and stay silent) until someone is actually signed
      // in: without a session this always fails with reason:'signed_out',
      // which used to surface a "session expired" toast to a visitor who
      // never even signed in, on every single page load.
      if(typeof SB !== 'undefined' && SB.client && currentUser){
        SB.insertReport(r).then(result=>{
          const msg = syncFailureMessage(result);
          if(msg){
            console.error('Queued report synced locally but failed to reach Supabase:', r.id, result);
            showToast(msg, 6000);
          }
        });
      }
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
  // Leaflet sizes itself off its container at init time — a map that was
  // ever initialized while its view was hidden (display:none) measures 0x0
  // and renders blank forever unless told to re-measure after becoming
  // visible. Same class of bug as the officer dashboard's ward heatmap.
  if(name==='map' && typeof renderCitizenMap==='function'){
    renderCitizenMap();
    setTimeout(()=> citizenMap?.invalidateSize(), 100);
  }
  if(name==='home' && typeof citizenWardMap!=='undefined'){
    setTimeout(()=> citizenWardMap?.invalidateSize(), 100);
  }
}
document.querySelectorAll('.navlinks a').forEach(a=>{
  a.addEventListener('click', ()=>{
    if(a.dataset.view==='track'){ openTrack(currentTrack || CIVIC.reports[0]); }
    else { goto(a.dataset.view); }
    // These two screens read live localStorage state (teams, escalated
    // challenges) that can change elsewhere in the same session, so
    // refresh them on every visit rather than only at page load.
    if(a.dataset.view==='teambuilder' && typeof renderChallenges==='function') renderChallenges();
    if(a.dataset.view==='policy' && typeof renderInstitutionalParticipation==='function') renderInstitutionalParticipation();
  });
});
document.getElementById('topReportBtn').addEventListener('click', ()=>goto('report'));
document.getElementById('newReportBtn').addEventListener('click', ()=>goto('report'));

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

// ===== DARK MODE =====
// The actual theme was already applied pre-paint by the tiny inline script
// in <head> (avoids a flash of the wrong theme on load) — this just wires
// the toggle button up to match and persist further changes.
const THEME_KEY = 'civic_theme';
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggleBtn');
  if(btn){
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('aria-pressed', theme === 'dark');
  }
}
function initThemeToggle(){
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(current);
  document.getElementById('themeToggleBtn')?.addEventListener('click', ()=>{
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try{ localStorage.setItem(THEME_KEY, next); }catch(e){}
    if(typeof announceToScreenReader === 'function') announceToScreenReader(next === 'dark' ? 'Dark mode enabled' : 'Light mode enabled');
  });
}
initThemeToggle();

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

  // Escape closes ANY currently-open modal/drawer — not just lang+a11y.
  // .modal-overlay covers tbModal/investorModal/policyModal/langModal/
  // badgesModal; .portfolio-modal-overlay and #a11yDrawer are their own
  // classes. Each already has its own close function for its own state
  // cleanup (there isn't any beyond hiding, for any of them), but closing
  // by directly clearing display here works uniformly without needing to
  // know each one's function name.
  document.addEventListener('keydown', (e)=>{
    if(e.key !== 'Escape') return;
    document.querySelectorAll('.modal-overlay, .portfolio-modal-overlay').forEach(m=>{
      if(getComputedStyle(m).display !== 'none') m.style.display = 'none';
    });
    if(a11yDrawer) a11yDrawer.style.display = 'none';
  });

  // Click-outside (on the overlay's own backdrop, not its content box)
  // closes any .modal-overlay that doesn't already have its own such
  // handler (langModal and badgesModal wire their own above/elsewhere).
  document.querySelectorAll('.modal-overlay').forEach(overlay=>{
    if(overlay.id === 'langModal' || overlay.id === 'badgesModal') return;
    overlay.addEventListener('click', (e)=>{
      if(e.target === overlay) overlay.style.display = 'none';
    });
  });
})();
