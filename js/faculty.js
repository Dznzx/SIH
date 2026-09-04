// ---------- Faculty Review Queue ----------
// Real data: reads reportChallenges (Supabase-synced, see js/data.js) —
// this used to be a hardcoded HTML card with onclick="alert(...)" buttons
// that did nothing. Approve/reject now write to the actual challenges
// table (RLS: only role faculty/admin can update status), and an approval
// is what makes a citizen-report challenge visible to students in Team
// Builder — the whole point of this screen existing.

function formatReviewDate(iso){
  return iso ? new Date(iso).toLocaleDateString('en-US', { month:'short', day:'2-digit', year:'numeric' }) : '';
}

function renderFacultyQueue(){
  const pendingList = document.getElementById('facultyQueueList');
  const reviewedList = document.getElementById('facultyReviewedList');
  if(!pendingList || !reviewedList) return; // not on this view

  const pending = getPendingChallenges();
  const reviewed = reportChallenges
    .filter(c => c.status === 'approved' || c.status === 'rejected')
    .sort((a,b)=> new Date(b.reviewedAt||0) - new Date(a.reviewedAt||0))
    .slice(0, 15);

  const pendingCountEl = document.getElementById('facultyPendingCount');
  const approvedCountEl = document.getElementById('facultyApprovedCount');
  const rejectedCountEl = document.getElementById('facultyRejectedCount');
  if(pendingCountEl) pendingCountEl.textContent = pending.length;
  if(approvedCountEl) approvedCountEl.textContent = reportChallenges.filter(c=>c.status==='approved').length;
  if(rejectedCountEl) rejectedCountEl.textContent = reportChallenges.filter(c=>c.status==='rejected').length;

  pendingList.innerHTML = pending.length ? pending.map(c => `
    <div class="inv-sol-item">
      <div class="inv-sol-head"><div class="inv-sol-title">${c.title}</div><div class="inv-sol-stage">Pending Review</div></div>
      <div class="inv-sol-team">📍 ${wardInfo(c.sourceWard).name} · from report ${c.sourceReportId} · ${c.domain}</div>
      <p style="font-size:12px; margin:6px 0;">${c.description || ''}</p>
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button class="btn btn-primary btn-sm" data-approve="${c.id}">✓ Approve — open to students</button>
        <button class="btn btn-secondary btn-sm" data-reject="${c.id}">✕ Reject</button>
      </div>
    </div>`).join('') : `<div class="inv-empty">Nothing pending — escalated reports from the Authority dashboard will appear here.</div>`;

  reviewedList.innerHTML = reviewed.length ? reviewed.map(c => `
    <div class="inv-sol-item">
      <div class="inv-sol-head"><div class="inv-sol-title">${c.title}</div><div class="inv-sol-stage" style="background:${c.status==='approved' ? 'var(--green-lt)' : 'var(--red-lt)'}; color:${c.status==='approved' ? 'var(--green-dk)' : 'var(--red)'};">${c.status==='approved' ? 'Approved' : 'Rejected'}</div></div>
      <div class="inv-sol-team">📍 ${wardInfo(c.sourceWard).name} · reviewed ${formatReviewDate(c.reviewedAt)}</div>
    </div>`).join('') : `<div class="inv-empty">No reviews yet.</div>`;
}

document.getElementById('facultyQueueList')?.addEventListener('click', (e)=>{
  const approveId = e.target.dataset.approve;
  const rejectId = e.target.dataset.reject;
  const id = approveId || rejectId;
  if(!id) return;
  const status = approveId ? 'approved' : 'rejected';
  e.target.disabled = true;
  e.target.textContent = status === 'approved' ? 'Approving…' : 'Rejecting…';
  SB.reviewChallenge(id, status).then(result=>{
    if(!result.ok){
      const msg = typeof syncFailureMessage === 'function' ? syncFailureMessage(result) : null;
      showToast(msg || '⚠️ Could not save this review — try again.', 5000);
      renderFacultyQueue();
      return;
    }
    showToast(status === 'approved' ? '✓ Approved — now visible to students in Team Builder' : 'Challenge rejected', 3500);
    bootstrapChallengesFromSupabase();
  });
});

renderFacultyQueue();
