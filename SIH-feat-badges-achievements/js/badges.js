// badges.js
const BADGE_DEFINITIONS = {
  first_submission: {
    id: 'first_submission',
    title: 'Civic Starter',
    desc: 'Earned for submitting your first community report.',
    icon: '🏆',
    color: '#ffcc00' // Gold
  },
  problem_validation: {
    id: 'problem_validation',
    title: 'Problem Validator',
    desc: 'Earned for upvoting and validating a community issue.',
    icon: '✅',
    color: '#00ff88' // Green
  },
  team_leadership: {
    id: 'team_leadership',
    title: 'Team Leader',
    desc: 'Earned for creating a team to tackle civic issues.',
    icon: '🤝',
    color: '#00ccff' // Blue
  },
  mentoring_hours: {
    id: 'mentoring_hours',
    title: 'Civic Mentor',
    desc: 'Earned for contributing mentorship hours to teams.',
    icon: '🎓',
    color: '#9933ff' // Purple
  },
  solution_milestones: {
    id: 'solution_milestones',
    title: 'Solution Architect',
    desc: 'Earned for contributing to a completed project milestone.',
    icon: '🏗️',
    color: '#ff4444' // Red
  }
};

let userBadges = JSON.parse(localStorage.getItem('civic_badges') || '[]');

function saveBadges() {
  localStorage.setItem('civic_badges', JSON.stringify(userBadges));
}

function unlockBadge(badgeId) {
  if (userBadges.includes(badgeId)) return; // Already unlocked

  const badge = BADGE_DEFINITIONS[badgeId];
  if (!badge) return;

  userBadges.push(badgeId);
  saveBadges();

  // Notify the user globally
  if (typeof pushNotification === 'function') {
    pushNotification(badge.icon, `Badge Unlocked: ${badge.title}`);
  }

  // If modal is open, re-render
  renderBadgesModal();
}

function renderBadgesModal() {
  const container = document.getElementById('badgesGrid');
  if (!container) return;

  container.innerHTML = '';
  
  Object.values(BADGE_DEFINITIONS).forEach(badge => {
    const isUnlocked = userBadges.includes(badge.id);
    const card = document.createElement('div');
    card.className = `badge-card ${isUnlocked ? 'unlocked' : 'locked'}`;
    card.style.borderColor = isUnlocked ? badge.color : 'var(--line)';
    
    card.innerHTML = `
      <div class="badge-icon" style="background: ${isUnlocked ? badge.color + '22' : 'var(--surface)'}; border-color: ${isUnlocked ? badge.color : 'var(--line)'};">
        ${isUnlocked ? badge.icon : '🔒'}
      </div>
      <div class="badge-title" style="color: ${isUnlocked ? badge.color : 'var(--muted)'};">${badge.title}</div>
      <div class="badge-desc">${badge.desc}</div>
    `;
    container.appendChild(card);
  });
}

function openBadgesModal() {
  const modal = document.getElementById('badgesModal');
  if (modal) {
    renderBadgesModal();
    modal.style.display = 'flex';
  }
}

function closeBadgesModal() {
  const modal = document.getElementById('badgesModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Global hook for modal overlay click
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('badgesModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'badgesModal') {
        closeBadgesModal();
      }
    });
  }
});
