// ---------- Industry Adoption & CSR Portal ----------
// Was a hardcoded HTML card (fake "GridSense" company, onclick="alert(...)")
// unconnected to anything. Now shows the real citizen-report -> challenge
// pipeline (RLS already grants 'industry' role read access to it, same as
// officer/faculty — see can_view_challenge_pipeline() in Supabase) and
// real resolved reports as completed projects available to adopt.
//
// "Sponsor / Adopt" interest follows the same pattern as the existing
// Investor Connect intro requests (js/investor.js) — per-viewer localStorage
// state, consistent with how this app already treats non-report actions
// that don't need a shared backend for a hackathon demo.
const INDUSTRY_INTERESTS_KEY = 'civic_industry_interests';
function getIndustryInterests(){
  try{ return JSON.parse(localStorage.getItem(INDUSTRY_INTERESTS_KEY) || '[]'); }
  catch(e){ return []; }
}
function saveIndustryInterest(entry){
  const list = getIndustryInterests();
  list.push(entry);
  localStorage.setItem(INDUSTRY_INTERESTS_KEY, JSON.stringify(list));
}

function renderIndustryPortal(){
  const challengeList = document.getElementById('industryChallengeList');
  const completedList = document.getElementById('industryCompletedList');
  if(!challengeList || !completedList) return; // not on this view

  const pending = getPendingChallenges();
  const approved = reportChallenges.filter(c => c.status === 'approved');
  const resolved = CIVIC.reports.filter(r => r.status === 'resolved' && isPublicVisible(r));

  document.getElementById('industryPendingCount').textContent = pending.length;
  document.getElementById('industryApprovedCount').textContent = approved.length;
  document.getElementById('industryResolvedCount').textContent = resolved.length;

  const pipeline = pending.map(c => ({ c, stage: 'In Faculty Review' }))
    .concat(approved.map(c => ({ c, stage: 'Open to Student Teams' })));

  challengeList.innerHTML = pipeline.length ? pipeline.map(({c, stage}) => `
    <div class="inv-sol-item">
      <div class="inv-sol-head"><div class="inv-sol-title">${c.title}</div><div class="inv-sol-stage">${stage}</div></div>
      <div class="inv-sol-team">📍 ${wardInfo(c.sourceWard).name} · ${c.domain}</div>
      <p style="font-size:12px; margin:6px 0;">${c.description || ''}</p>
      <button class="btn btn-primary btn-sm" style="width:100%; margin-top:8px;" data-interest="${c.id}" data-title="${c.title.replace(/"/g,'&quot;')}">🚀 Show Sponsorship Interest</button>
    </div>`).join('') : `<div class="inv-empty">No challenges in the pipeline right now — check back once an officer escalates a citizen report.</div>`;

  completedList.innerHTML = resolved.length ? resolved.slice(0, 10).map(r => `
    <div class="inv-sol-item">
      <div class="inv-sol-head"><div class="inv-sol-title">${r.title}</div><div class="inv-sol-stage" style="background:var(--green-lt); color:var(--green-dk);">Resolved</div></div>
      <div class="inv-sol-team">📍 ${wardInfo(r.ward).name} · ${r.category}${r.assignee ? ' · Fixed by '+r.assignee : ''}</div>
    </div>`).join('') : `<div class="inv-empty">No completed projects yet.</div>`;
}

document.getElementById('industryChallengeList')?.addEventListener('click', (e)=>{
  const id = e.target.dataset.interest;
  if(!id) return;
  saveIndustryInterest({
    challengeId: id,
    title: e.target.dataset.title,
    by: (typeof currentUser !== 'undefined' && currentUser?.name) || 'Industry partner',
    at: new Date().toISOString()
  });
  e.target.disabled = true;
  e.target.textContent = '✓ Interest recorded';
  showToast('🚀 Sponsorship interest recorded — the officer who escalated this can follow up.', 4000);
});

renderIndustryPortal();
