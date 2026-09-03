// Investor Connect Portal Logic
let activeInvestorDomainFilter = 'all';

// Initialize Investor Portal
function initInvestorPortal() {
  const isInvestor = currentUser && currentUser.role === 'investor';
  
  // Show/Hide Investor Role Banner & Preferences
  const roleBanner = document.getElementById('investorRoleBanner');
  const prefsBox = document.getElementById('investorPreferencesBox');
  if (roleBanner) roleBanner.style.display = isInvestor ? 'flex' : 'none';
  if (prefsBox) {
    prefsBox.style.display = isInvestor ? 'block' : 'none';
    if (isInvestor) renderInvestorPreferences();
  }

  renderInvestors();
  renderShortlistedSolutions();
  renderMyIntros();
}

// Get Saved Introductions
function getIntroRequests() {
  try {
    const data = localStorage.getItem('civic_investor_intros');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

// Save Introductions
function saveIntroRequests(intros) {
  localStorage.setItem('civic_investor_intros', JSON.stringify(intros));
}

// Get Investor Domain Preferences
function getInvestorDomains() {
  try {
    const data = localStorage.getItem('civic_investor_prefs');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return ['Smart Water Management', 'Waste Management', 'Clean Energy', 'Civic Mobility', 'AI for Governance'];
}

// Save Investor Domain Preferences
function saveInvestorPreferences() {
  const checked = [];
  document.querySelectorAll('.inv-domain-checkbox:checked').forEach(cb => {
    checked.push(cb.value);
  });
  localStorage.setItem('civic_investor_prefs', JSON.stringify(checked));
  alert('Your investment domain preferences have been updated!');
  renderInvestors();
}

// Render Investor Preferences Box
function renderInvestorPreferences() {
  const container = document.getElementById('investorDomainCheckboxes');
  if (!container) return;

  const allDomains = ['Smart Water Management', 'Waste Management', 'Clean Energy', 'Civic Mobility', 'AI for Governance'];
  const userDomains = getInvestorDomains();

  container.innerHTML = allDomains.map(domain => `
    <label class="inv-checkbox-item">
      <input type="checkbox" class="inv-domain-checkbox" value="${domain}" ${userDomains.includes(domain) ? 'checked' : ''}>
      <span>${domain}</span>
    </label>
  `).join('');
}

// Filter Investors by Domain
function filterInvestorDomain(domain) {
  activeInvestorDomainFilter = domain;
  document.querySelectorAll('.inv-filter-bar .fchip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.invdomain === domain);
  });
  renderInvestors();
}

// Render Investors Roster
function renderInvestors() {
  const grid = document.getElementById('investorsGrid');
  const countBadge = document.getElementById('investorCountBadge');
  if (!grid) return;

  let investors = CIVIC.investors || [];

  // Filter if specific domain selected
  if (activeInvestorDomainFilter !== 'all') {
    investors = investors.filter(inv => inv.domains.includes(activeInvestorDomainFilter));
  }

  if (countBadge) {
    countBadge.textContent = `${investors.length} Investor${investors.length !== 1 ? 's' : ''}`;
  }

  if (investors.length === 0) {
    grid.innerHTML = `<div class="inv-empty">No registered investors found for this domain filter.</div>`;
    return;
  }

  const intros = getIntroRequests();

  grid.innerHTML = investors.map(inv => {
    // Check if user already requested intro with this investor
    const existingIntro = intros.find(i => i.investorId === inv.id && i.requestedBy === (currentUser ? currentUser.name : ''));

    const domainTags = inv.domains.map(d => `<span class="inv-tag">${d}</span>`).join('');

    return `
      <div class="inv-card">
        <div class="inv-card-head">
          <div>
            <div class="inv-name-row">
              <h3 class="inv-name">${inv.name}</h3>
              ${inv.verified ? '<span class="inv-verified" title="Verified Investor">✓ Verified</span>' : ''}
            </div>
            <div class="inv-firm">${inv.role} · <strong>${inv.firm}</strong></div>
          </div>
          <div class="inv-ticket-pill">${inv.ticketSize}</div>
        </div>

        <p class="inv-bio">${inv.bio}</p>

        <div class="inv-meta-row">
          <span class="inv-stage">📍 ${inv.location}</span>
          <span class="inv-stage">🎯 ${inv.stage}</span>
        </div>

        <div class="inv-domains-box">
          <div class="inv-domains-label">Target Domains:</div>
          <div class="inv-tags-flex">${domainTags}</div>
        </div>

        <div class="inv-card-foot">
          ${existingIntro ? `
            <button class="btn btn-sm btn-disabled" disabled>
              ✓ Intro Requested (${existingIntro.status})
            </button>
          ` : `
            <button class="btn btn-primary btn-sm" onclick="openRequestIntroModal('${inv.id}')">
              🤝 Request Introduction
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// Render Shortlisted Solutions
function renderShortlistedSolutions() {
  const container = document.getElementById('shortlistedSolutionsList');
  if (!container) return;

  const solutions = CIVIC.shortlistedSolutions || [];

  container.innerHTML = solutions.map(sol => `
    <div class="inv-sol-item">
      <div class="inv-sol-head">
        <div class="inv-sol-title">${sol.title}</div>
        <div class="inv-sol-stage">${sol.stage}</div>
      </div>
      <div class="inv-sol-team">👥 ${sol.team} · <span style="color:var(--green); font-weight:700;">${sol.fundingGoal}</span></div>
      <div class="inv-sol-summary">${sol.summary}</div>
      <button class="btn btn-sm btn-secondary" onclick="openRequestIntroModal(null, '${sol.id}')" style="margin-top:8px; width:100%;">
        Connect Solution to Investors
      </button>
    </div>
  `).join('');
}

// Render My Introductions List
function renderMyIntros() {
  const container = document.getElementById('myIntrosList');
  if (!container) return;

  const intros = getIntroRequests();

  if (intros.length === 0) {
    container.innerHTML = `<div class="inv-empty" style="font-size:12px; padding:16px;">No pitch introductions requested yet.</div>`;
    return;
  }

  container.innerHTML = intros.map(i => {
    const investor = CIVIC.investors.find(inv => inv.id === i.investorId) || { name: i.investorName, firm: '' };
    
    let statusClass = 'status-requested';
    if (i.status === 'Accepted') statusClass = 'status-working';
    if (i.status === 'Call Scheduled') statusClass = 'status-resolved';

    return `
      <div class="inv-intro-item">
        <div class="inv-intro-top">
          <strong>${i.solutionTitle || 'Civic Solution Pitch'}</strong>
          <span class="status-pill ${statusClass}">${i.status}</span>
        </div>
        <div class="inv-intro-meta">To: ${investor.name} (${investor.firm})</div>
        ${i.pitchNote ? `<div class="inv-intro-note">"${i.pitchNote}"</div>` : ''}
        <div class="inv-intro-time">Requested on ${new Date(i.requestedAt).toLocaleDateString()}</div>
        ${currentUser && currentUser.role === 'investor' && i.status === 'Requested' ? `
          <div style="display:flex; gap:8px; margin-top:8px;">
            <button class="btn btn-sm btn-primary" onclick="updateIntroStatus('${i.id}', 'Accepted')" style="flex:1;">Accept Intro</button>
            <button class="btn btn-sm btn-secondary" onclick="updateIntroStatus('${i.id}', 'Call Scheduled')" style="flex:1;">Schedule Call</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Modal Logic for Intro Request
function closeInvestorModal() {
  const modal = document.getElementById('investorModal');
  if (modal) modal.style.display = 'none';
}

function openRequestIntroModal(investorId, solutionId) {
  const modal = document.getElementById('investorModal');
  const title = document.getElementById('invModalTitle');
  const body = document.getElementById('invModalBody');

  if (!modal || !body) return;

  const investor = CIVIC.investors.find(inv => inv.id === investorId);
  const solution = CIVIC.shortlistedSolutions.find(sol => sol.id === solutionId);

  const solutionsOptions = (CIVIC.shortlistedSolutions || []).map(sol => `
    <option value="${sol.id}" ${solutionId === sol.id ? 'selected' : ''}>${sol.title} (${sol.team})</option>
  `).join('');

  const investorOptions = (CIVIC.investors || []).map(inv => `
    <option value="${inv.id}" ${investorId === inv.id ? 'selected' : ''}>${inv.name} - ${inv.firm} (${inv.ticketSize})</option>
  `).join('');

  if (title) {
    title.textContent = investor ? `Request Intro with ${investor.name}` : 'Request Investor Introduction';
  }

  body.innerHTML = `
    <div class="form-group" style="margin-bottom:14px;">
      <label style="display:block; font-size:12px; font-weight:700; color:var(--muted); margin-bottom:4px;">Target Investor</label>
      <select id="invModalInvestorSelect" style="width:100%; border:1.5px solid var(--line); border-radius:10px; padding:10px 12px; font-size:14px;">
        ${investorOptions}
      </select>
    </div>

    <div class="form-group" style="margin-bottom:14px;">
      <label style="display:block; font-size:12px; font-weight:700; color:var(--muted); margin-bottom:4px;">Select Solution / Prototype</label>
      <select id="invModalSolutionSelect" style="width:100%; border:1.5px solid var(--line); border-radius:10px; padding:10px 12px; font-size:14px;">
        ${solutionsOptions}
      </select>
    </div>

    <div class="form-group" style="margin-bottom:14px;">
      <label style="display:block; font-size:12px; font-weight:700; color:var(--muted); margin-bottom:4px;">Elevator Pitch Note (Max 280 chars)</label>
      <textarea id="invModalPitchNote" rows="3" placeholder="Briefly describe your solution traction, SIH score, or pilot metrics for the investor..." style="width:100%; border:1.5px solid var(--line); border-radius:10px; padding:10px 12px; font-size:13.5px; font-family:var(--font);"></textarea>
    </div>

    <button class="btn btn-primary" onclick="submitIntroRequest()" style="width:100%; margin-top:8px;">
      🚀 Submit Pitch & Request Intro
    </button>
  `;

  modal.style.display = 'flex';
}

function submitIntroRequest() {
  const investorId = document.getElementById('invModalInvestorSelect').value;
  const solutionId = document.getElementById('invModalSolutionSelect').value;
  const pitchNote = document.getElementById('invModalPitchNote').value.trim();

  const investor = CIVIC.investors.find(inv => inv.id === investorId);
  const solution = CIVIC.shortlistedSolutions.find(sol => sol.id === solutionId);

  if (!investor || !solution) {
    alert('Please select both an investor and a solution.');
    return;
  }

  const intros = getIntroRequests();

  const newIntro = {
    id: 'intro_' + Date.now(),
    investorId: investor.id,
    investorName: investor.name,
    solutionId: solution.id,
    solutionTitle: solution.title,
    teamName: solution.team,
    pitchNote: pitchNote || 'High impact prototype solution from hackathon roster seeking seed grant.',
    requestedBy: currentUser ? currentUser.name : 'Student Innovator',
    requestedAt: new Date().toISOString(),
    status: 'Requested'
  };

  intros.unshift(newIntro);
  saveIntroRequests(intros);
  closeInvestorModal();

  renderInvestors();
  renderMyIntros();
  alert(`Introduction request submitted to ${investor.name} (${investor.firm})!`);
  if(typeof unlockBadge === 'function') unlockBadge('mentoring_hours');
}

function updateIntroStatus(introId, newStatus) {
  const intros = getIntroRequests();
  const intro = intros.find(i => i.id === introId);
  if (intro) {
    intro.status = newStatus;
    saveIntroRequests(intros);
    renderMyIntros();
  }
}

// Hook into DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initInvestorPortal();
});
