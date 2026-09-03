// Government Policy Insight Reports Logic
let activePolicyMinistryFilter = 'all';

// Initialize Policy Reports Module
function initPolicyReports() {
  renderInstitutionalParticipation();
  renderPainPointMatrix();
  renderPolicyBriefs();
}

// SIH26043 explicitly asks for analytics tracking "institutional
// participation" — how many of the reported societal problems actually
// became university challenges, how many teams/universities engaged, and
// how many industry/MSME/investor partners are registered to fund them.
function renderInstitutionalParticipation(){
  const row = document.getElementById('institutionalParticipationRow');
  if(!row) return;

  const challenges = getAllChallenges();
  const escalated = challenges.filter(c => c.sourceReportId);
  const teams = (function(){
    try{ return JSON.parse(localStorage.getItem('civic_teams') || '[]'); } catch(e){ return []; }
  })();
  const universities = new Set();
  teams.forEach(t => Object.values(t.members || {}).forEach(m => { if(m.uni) universities.add(m.uni); }));
  const partnerTypes = new Set((CIVIC.investors || []).map(i => i.type || 'Investor / VC'));

  row.innerHTML = `
    <div class="kpi"><div class="num">${escalated.length}</div><div class="lbl">Reports escalated to university challenges</div></div>
    <div class="kpi"><div class="num">${teams.length}</div><div class="lbl">Student teams formed</div></div>
    <div class="kpi"><div class="num">${universities.size}</div><div class="lbl">Universities represented</div></div>
    <div class="kpi"><div class="num">${partnerTypes.size}</div><div class="lbl">Partner types engaged (VC / MSME / Lab)</div></div>
  `;
}

// Filter Policy Briefs by Ministry
function filterPolicyMinistry(ministry) {
  activePolicyMinistryFilter = ministry;
  document.querySelectorAll('.pol-filter-bar .fchip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.polministry === ministry);
  });
  renderPolicyBriefs();
}

// Render Societal Pain Point Concentration Matrix
function renderPainPointMatrix() {
  const grid = document.getElementById('painPointMatrixGrid');
  if (!grid) return;

  const wards = CIVIC.wards || [];
  const reports = CIVIC.reports || [];

  grid.innerHTML = wards.map(w => {
    const wardReports = reports.filter(r => r.ward === w.id);
    const openCount = wardReports.filter(r => r.status !== 'resolved' && r.status !== 'queued').length;
    const highSevCount = wardReports.filter(r => r.severity >= 0.65).length;
    const breachedCount = wardReports.filter(r => r.slaDeadline !== 'DEMO_BREACH_SOON' && r.slaDeadline && new Date(r.slaDeadline) < new Date()).length;

    // Calculate Concentration Index (0 to 100)
    let concentrationIndex = Math.min(100, Math.round((openCount * 15) + (highSevCount * 20) + (breachedCount * 25) + (w.underReported ? 20 : 0)));
    
    let levelClass = 'pol-level-low';
    let levelText = 'Low Concentration';
    if (concentrationIndex >= 65) {
      levelClass = 'pol-level-high';
      levelText = 'Critical Pain Point';
    } else if (concentrationIndex >= 35) {
      levelClass = 'pol-level-med';
      levelText = 'Moderate Distress';
    }

    return `
      <div class="pol-matrix-item ${levelClass}">
        <div class="pol-matrix-item-head">
          <div>
            <strong class="pol-ward-name">${w.name}</strong>
            <span class="pol-ward-id">(${w.id})</span>
          </div>
          <span class="pol-level-pill ${levelClass}">${levelText}</span>
        </div>

        <div class="pol-matrix-metrics">
          <div class="pol-m-col">
            <span class="pol-m-val">${openCount}</span>
            <span class="pol-m-lbl">Open Issues</span>
          </div>
          <div class="pol-m-col">
            <span class="pol-m-val" style="color:var(--red);">${highSevCount}</span>
            <span class="pol-m-lbl">High Severity</span>
          </div>
          <div class="pol-m-col">
            <span class="pol-m-val" style="color:#d32f2f;">${breachedCount}</span>
            <span class="pol-m-lbl">SLA Breached</span>
          </div>
        </div>

        <div class="pol-bar-box">
          <div class="pol-bar-label">
            <span>Distress Density Index</span>
            <strong>${concentrationIndex}/100</strong>
          </div>
          <div class="pol-bar-track">
            <div class="pol-bar-fill ${levelClass}" style="width:${concentrationIndex}%;"></div>
          </div>
        </div>

        ${w.underReported ? `
          <div class="pol-equity-tag">
            ⚠️ Equity Gap Detected: Low baseline report rate — Priority Boost (+0.5) applied.
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Render Policy Briefs
function renderPolicyBriefs() {
  const container = document.getElementById('policyBriefsList');
  if (!container) return;

  let briefs = CIVIC.policyBriefs || [];

  if (activePolicyMinistryFilter !== 'all') {
    briefs = briefs.filter(b => b.ministry.includes(activePolicyMinistryFilter) || b.id.includes(activePolicyMinistryFilter.toLowerCase()));
  }

  if (briefs.length === 0) {
    container.innerHTML = `<div class="pol-empty">No policy briefs found for the selected ministry filter.</div>`;
    return;
  }

  container.innerHTML = briefs.map(b => `
    <div class="pol-brief-card">
      <div class="pol-brief-head">
        <div>
          <span class="pol-code-pill">${b.code}</span>
          <h3 class="pol-brief-title">${b.title}</h3>
          <div class="pol-ministry-name">🏛️ ${b.ministry}</div>
        </div>
        <div class="pol-brief-date">${b.date}</div>
      </div>

      <div class="pol-summary-box">
        <strong>Executive Summary:</strong>
        <p>${b.executiveSummary}</p>
      </div>

      <div class="pol-pain-highlights">
        <div class="pol-highlights-label">Concentrated Pain Points:</div>
        ${b.painPoints.map(p => `
          <div class="pol-pain-chip">
            <strong>${p.area}</strong> · ${p.category} (<span style="color:var(--red); font-weight:700;">${p.breachRate}</span>)
          </div>
        `).join('')}
      </div>

      <div class="pol-scheme-box">
        <strong>Statutory Scheme Linkage:</strong> ${b.metrics.statutoryScheme}
      </div>

      <div class="pol-card-foot">
        <button class="btn btn-primary btn-sm" onclick="openPolicyBriefModal('${b.id}')">
          📜 View Formal Policy Brief Document
        </button>
        <button class="btn btn-secondary btn-sm" onclick="exportPolicyBrief('${b.id}')">
          📥 Download Brief
        </button>
      </div>
    </div>
  `).join('');
}

// Open Formal Policy Document Modal
function openPolicyBriefModal(briefId) {
  const modal = document.getElementById('policyModal');
  const body = document.getElementById('polModalBody');
  const title = document.getElementById('polModalTitle');

  if (!modal || !body) return;

  const b = (CIVIC.policyBriefs || []).find(item => item.id === briefId);
  if (!b) return;

  if (title) title.textContent = `${b.code} — Policy Brief`;

  body.innerHTML = `
    <div class="pol-doc-container">
      <div class="pol-doc-header">
        <div class="pol-emblem">🏛️</div>
        <div>
          <div class="pol-doc-org">GOVERNMENT POLICY INSIGHT & ACTION BRIEF</div>
          <div class="pol-doc-sub">${b.ministry}</div>
          <div class="pol-doc-meta">Ref: <strong>${b.code}</strong> · Date: <strong>${b.date}</strong> · Author: <strong>${b.author}</strong></div>
        </div>
      </div>

      <hr class="pol-doc-divider">

      <div class="pol-doc-section">
        <h3>1. SUBJECT & PURPOSE</h3>
        <h4>${b.title}</h4>
        <p>${b.executiveSummary}</p>
      </div>

      <div class="pol-doc-section">
        <h3>2. AGGREGATED EVIDENCE BASE & METRICS</h3>
        <div class="pol-doc-kpis">
          <div class="pol-kpi-item">
            <div class="pol-kpi-val">${b.metrics.totalReportsAnalyzed}</div>
            <div class="pol-kpi-lbl">Citizen Reports Analyzed</div>
          </div>
          <div class="pol-kpi-item">
            <div class="pol-kpi-val">${b.metrics.avgResolutionTime}</div>
            <div class="pol-kpi-lbl">Avg Resolution Time</div>
          </div>
          <div class="pol-kpi-item">
            <div class="pol-kpi-val" style="color:var(--red);">${b.metrics.repeatDistressRate}</div>
            <div class="pol-kpi-lbl">Repeat Distress Rate</div>
          </div>
        </div>
      </div>

      <div class="pol-doc-section">
        <h3>3. GEOGRAPHICAL PAIN POINT CONCENTRATION</h3>
        <table class="pol-doc-table">
          <thead>
            <tr>
              <th>Target Location / Corridor</th>
              <th>Category</th>
              <th>Breach Rate</th>
              <th>Severity Index</th>
            </tr>
          </thead>
          <tbody>
            ${b.painPoints.map(p => `
              <tr>
                <td><strong>${p.area}</strong></td>
                <td>${p.category}</td>
                <td><span style="color:var(--red); font-weight:700;">${p.breachRate}</span></td>
                <td><strong>${p.severityIndex}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="pol-doc-section">
        <h3>4. MANDATORY POLICY DIRECTIVES & ACTION PLAN</h3>
        <ol class="pol-directives-list">
          ${b.directives.map(d => `<li>${d}</li>`).join('')}
        </ol>
      </div>

      <div class="pol-doc-section">
        <h3>5. RECOMMENDED STATUTORY SCHEME ALLOCATION</h3>
        <div class="pol-allocation-box">
          <strong>Framework:</strong> ${b.metrics.statutoryScheme}<br>
          <strong>Recommendation:</strong> Fast-track budgetary release and mandate digital SLA proof-of-work before releasing contractor milestones.
        </div>
      </div>

      <div class="pol-doc-foot">
        <button class="btn btn-primary" onclick="window.print()">🖨️ Print Policy Brief</button>
        <button class="btn btn-secondary" onclick="exportPolicyBrief('${b.id}')">📋 Copy Summary to Clipboard</button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

// Close Modal
function closePolicyModal() {
  const modal = document.getElementById('policyModal');
  if (modal) modal.style.display = 'none';
}

// Export Policy Brief
function exportPolicyBrief(briefId) {
  const b = (CIVIC.policyBriefs || []).find(item => item.id === briefId);
  if (!b) return;

  const text = `
==================================================
GOVERNMENT POLICY INSIGHT BRIEF: ${b.code}
MINISTRY: ${b.ministry}
DATE: ${b.date}
SUBJECT: ${b.title}
==================================================

EXECUTIVE SUMMARY:
${b.executiveSummary}

KEY METRICS:
- Reports Analyzed: ${b.metrics.totalReportsAnalyzed}
- Avg Resolution Time: ${b.metrics.avgResolutionTime}
- Repeat Distress Rate: ${b.metrics.repeatDistressRate}
- Scheme Linkage: ${b.metrics.statutoryScheme}

POLICY DIRECTIVES:
${b.directives.map((d, i) => `${i + 1}. ${d}`).join('\n')}
==================================================
`.trim();

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    alert(`Policy Brief ${b.code} copied to clipboard!`);
  } else {
    alert(text);
  }
}

// Export All Summaries
function exportCurrentPolicySummary() {
  const count = (CIVIC.policyBriefs || []).length;
  alert(`Exporting ${count} Government Policy Briefs to executive summary format...`);
}

// DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
  initPolicyReports();
});
