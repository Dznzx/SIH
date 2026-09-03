// ================================================================
// portfolio.js — Portfolio & Project Showcase feature
// Persists per-user in localStorage keyed to the user's name+role.
// ================================================================

const PORTFOLIO_KEY = () => `civic_portfolio_${currentUser ? currentUser.name + '_' + currentUser.role : 'guest'}`;

const ROLE_LABELS = {
  student: 'Student', citizen: 'Citizen', faculty: 'Faculty',
  industry: 'Industry Partner', government: 'Government Officer',
  ngo: 'NGO Representative', mentor: 'Mentor', admin: 'Platform Admin',
  officer: 'Municipal Officer',
};
const ROLE_AVATARS = {
  student: '🎓', citizen: '🙋', faculty: '👨‍🏫', industry: '🏭',
  government: '🏛️', ngo: '🤝', mentor: '💡', admin: '⚙️', officer: '🧭',
};
const LEVEL_THRESHOLDS = [
  { min: 0,   label: 'Rookie',      color: '#9e9e9e' },
  { min: 50,  label: 'Explorer',    color: '#2196f3' },
  { min: 150, label: 'Innovator',   color: '#4caf50' },
  { min: 350, label: 'Champion',    color: '#ff9800' },
  { min: 700, label: 'Visionary',   color: '#9c27b0' },
  { min: 1200,label: 'Legend',      color: '#f44336' },
];
const ITEM_SCORE = { problem: 30, team: 40, paper: 50, prototype: 60 };
const TYPE_META = {
  problem:   { label:'Problem Solved', icon:'🔧', container:'portfolioProblems' },
  team:      { label:'Team Led',       icon:'👥', container:'portfolioTeams' },
  paper:     { label:'Paper Published',icon:'📄', container:'portfolioPapers' },
  prototype: { label:'Prototype Built',icon:'🚀', container:'portfolioPrototypes' },
};

let _currentType = 'problem';

// ---- Data helpers -------------------------------------------------------
function loadPortfolio() {
  try {
    const raw = localStorage.getItem(PORTFOLIO_KEY());
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return { items: [] };
}

function savePortfolioData(data) {
  try { localStorage.setItem(PORTFOLIO_KEY(), JSON.stringify(data)); } catch(e) {}
}

function calcReputation(items) {
  return items.reduce((acc, it) => acc + (ITEM_SCORE[it.type] || 20), 0);
}

function getLevel(score) {
  let level = LEVEL_THRESHOLDS[0];
  for (const t of LEVEL_THRESHOLDS) { if (score >= t.min) level = t; }
  return level;
}

// ---- Render ---------------------------------------------------------------
function renderPortfolio() {
  if (!currentUser) return;

  const data = loadPortfolio();
  const score = calcReputation(data.items);
  const level = getLevel(score);
  const nextLevel = LEVEL_THRESHOLDS.find(t => t.min > score);
  const maxScore = nextLevel ? nextLevel.min : score + 1;
  const pct = Math.min(100, Math.round((score / maxScore) * 100));

  // Hero section
  document.getElementById('portfolioAvatar').textContent = ROLE_AVATARS[currentUser.role] || '👤';
  document.getElementById('portfolioName').textContent = currentUser.name || 'User';
  document.getElementById('portfolioRoleTag').textContent = ROLE_LABELS[currentUser.role] || currentUser.role;
  document.getElementById('portfolioRepBar').style.width = pct + '%';
  document.getElementById('portfolioRepBar').style.background = `linear-gradient(90deg, ${level.color}, ${level.color}cc)`;
  document.getElementById('portfolioRepScore').textContent = `${score} pts${nextLevel ? ' · ' + (nextLevel.min - score) + ' to next level' : ' · MAX'}`;
  const badge = document.getElementById('portfolioLevel');
  badge.textContent = level.label;
  badge.style.background = level.color;

  // Stat counters
  const byType = (t) => data.items.filter(i => i.type === t);
  document.getElementById('statProblems').textContent   = byType('problem').length;
  document.getElementById('statTeams').textContent      = byType('team').length;
  document.getElementById('statPapers').textContent     = byType('paper').length;
  document.getElementById('statPrototypes').textContent = byType('prototype').length;

  // Item lists
  ['problem','team','paper','prototype'].forEach(type => {
    const items = byType(type);
    const meta = TYPE_META[type];
    const container = document.getElementById(meta.container);
    if (!container) return;
    if (items.length === 0) {
      container.innerHTML = `<div class="portfolio-empty">No ${meta.label.toLowerCase()}s yet. Click + Add!</div>`;
      return;
    }
    container.innerHTML = items.map((item, idx) => `
      <div class="portfolio-item-card" style="animation-delay:${idx * 60}ms">
        <div class="portfolio-item-top">
          <span class="portfolio-item-icon">${meta.icon}</span>
          <div class="portfolio-item-info">
            <div class="portfolio-item-title">${escHtml(item.title)}</div>
            <div class="portfolio-item-date">${escHtml(item.date || '')}</div>
          </div>
          <div class="portfolio-item-pts">+${ITEM_SCORE[type]} pts</div>
          <button class="portfolio-item-del" title="Remove" onclick="deletePortfolioItem('${item.id}')">✕</button>
        </div>
        ${item.desc ? `<div class="portfolio-item-desc">${escHtml(item.desc)}</div>` : ''}
        ${item.tags && item.tags.length ? `<div class="portfolio-item-tags">${item.tags.map(t=>`<span class="p-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
        ${item.link ? `<a class="portfolio-item-link" href="${escHtml(item.link)}" target="_blank" rel="noopener">🔗 View</a>` : ''}
      </div>
    `).join('');
  });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- Modal ----------------------------------------------------------------
function openPortfolioModal(type) {
  _currentType = type;
  const meta = TYPE_META[type];
  document.getElementById('portfolioModalTitle').textContent = `Add ${meta.label}`;
  document.getElementById('pModalTitle').value = '';
  document.getElementById('pModalDesc').value  = '';
  document.getElementById('pModalDate').value  = '';
  document.getElementById('pModalLink').value  = '';
  document.getElementById('pModalTags').value  = '';
  document.getElementById('portfolioModalOverlay').style.display = 'flex';
  setTimeout(() => document.getElementById('pModalTitle').focus(), 50);
}

function closePortfolioModal() {
  document.getElementById('portfolioModalOverlay').style.display = 'none';
}

function savePortfolioItem() {
  const title = document.getElementById('pModalTitle').value.trim();
  if (!title) { document.getElementById('pModalTitle').focus(); return; }
  const desc  = document.getElementById('pModalDesc').value.trim();
  const date  = document.getElementById('pModalDate').value.trim();
  const link  = document.getElementById('pModalLink').value.trim();
  const tags  = document.getElementById('pModalTags').value.split(',').map(t=>t.trim()).filter(Boolean);

  const data = loadPortfolio();
  data.items.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    type: _currentType, title, desc, date, link, tags,
    createdAt: new Date().toISOString()
  });
  savePortfolioData(data);
  closePortfolioModal();
  renderPortfolio();
  if (typeof showToast === 'function') {
    showToast(`🏆 ${TYPE_META[_currentType].label} added! +${ITEM_SCORE[_currentType]} reputation pts`, 2500);
  }
  if(typeof unlockBadge === 'function') unlockBadge('solution_milestones');
}

function deletePortfolioItem(id) {
  const data = loadPortfolio();
  data.items = data.items.filter(i => i.id !== id);
  savePortfolioData(data);
  renderPortfolio();
}

// ---- Close modal on overlay click -----------------------------------------
document.getElementById('portfolioModalOverlay')?.addEventListener('click', function(e) {
  if (e.target === this) closePortfolioModal();
});

// ---- Hook into goto() navigation ------------------------------------------
const _origGoto = typeof goto === 'function' ? goto : null;
window.gotoPortfolio = function() { renderPortfolio(); };

// Patch: re-render portfolio whenever the view becomes active
(function patchGoto() {
  const navLinks = document.querySelectorAll('.navlinks a');
  navLinks.forEach(a => {
    if (a.dataset.view === 'portfolio') {
      a.addEventListener('click', () => setTimeout(renderPortfolio, 0));
    }
  });
})();

// Initial render if portfolio view is already active on page load
if (document.getElementById('view-portfolio')?.classList.contains('active')) {
  renderPortfolio();
}
