// Cross-University Team Builder Logic
let selectedChallengeId = null;

// Initialize Team Builder
function initTeamBuilder() {
  if (currentUser && (currentUser.role === 'student' || currentUser.role === 'faculty')) {
    document.querySelectorAll('.student-only').forEach(el => el.style.display = 'flex');
    renderChallenges();
  }
}

// Get Teams from localStorage
function getTeams() {
  const teamsJSON = localStorage.getItem('civic_teams');
  return teamsJSON ? JSON.parse(teamsJSON) : [];
}

// Save Teams to localStorage
function saveTeams(teams) {
  localStorage.setItem('civic_teams', JSON.stringify(teams));
}

// Render Challenges List
function renderChallenges() {
  const listEl = document.getElementById('tbChallengesList');
  if (!listEl) return;
  listEl.innerHTML = '';

  getAllChallenges().forEach(challenge => {
    const card = document.createElement('div');
    card.className = `tb-challenge-card ${selectedChallengeId === challenge.id ? 'active' : ''}`;
    card.onclick = () => selectChallenge(challenge.id);

    // Calculate open slots across all teams for this challenge
    const teams = getTeams().filter(t => t.challengeId === challenge.id);
    let totalSlots = 0;
    let filledSlots = 0;
    teams.forEach(t => {
       totalSlots += challenge.teamSizeLimit;
       filledSlots += Object.keys(t.members).length;
    });
    const openSlots = totalSlots - filledSlots;

    card.innerHTML = `
      <div class="tb-challenge-title">${challenge.title}</div>
      ${challenge.domain ? `<div class="tb-challenge-domain">${challenge.domain}</div>` : ''}
      <div class="tb-challenge-desc">${challenge.description}</div>
      ${challenge.sourceReportId ? `<div class="tb-challenge-origin">🔗 From citizen report ${challenge.sourceReportId} (${wardInfo(challenge.sourceWard).name})</div>` : ''}
      <div class="tb-challenge-meta">
        <span>📅 ${new Date(challenge.deadline).toLocaleDateString()}</span>
        <span>👥 Max ${challenge.teamSizeLimit} per team</span>
      </div>
      <div class="tb-challenge-stats">
        ${teams.length} Teams forming · ${openSlots > 0 ? `<span style="color:var(--green);">${openSlots} open slots</span>` : 'No open slots'}
      </div>
    `;
    listEl.appendChild(card);
  });
}

// Select a Challenge
function selectChallenge(challengeId) {
  selectedChallengeId = challengeId;
  renderChallenges(); // Update active state
  renderTeamsForChallenge(challengeId);
}

// Render Teams for Selected Challenge
function renderTeamsForChallenge(challengeId) {
  const panel = document.getElementById('tbTeamsPanel');
  const container = document.getElementById('tbTeamsContainer');
  const challenge = getAllChallenges().find(c => c.id === challengeId);

  if (!panel || !container || !challenge) return;
  
  panel.style.display = 'flex';
  document.getElementById('tbSelectedChallengeTitle').textContent = challenge.title;
  document.getElementById('tbSelectedChallengeMeta').textContent = `Max ${challenge.teamSizeLimit} members per team`;
  
  container.innerHTML = '';
  
  const teams = getTeams().filter(t => t.challengeId === challengeId);
  
  if (teams.length === 0) {
    container.innerHTML = `<div class="tb-empty">No teams formed yet for this challenge. Be the first!</div>`;
    return;
  }
  
  teams.forEach(team => {
    const card = document.createElement('div');
    card.className = 'tb-team-card';
    
    let membersHtml = '';
    let isFull = true;
    let userInTeam = false;
    
    // Check members against role slots
    const roleSlots = challenge.roleSlots;
    for (const [role, count] of Object.entries(roleSlots)) {
      const membersInRole = Object.values(team.members).filter(m => m.teamRole === role);
      for (let i = 0; i < count; i++) {
        const member = membersInRole[i];
        if (member) {
          if (member.name === currentUser.name) userInTeam = true;
          membersHtml += `
            <div class="tb-member-slot filled">
              <div class="tb-member-info">
                <div class="tb-member-name">${member.name}</div>
                <div class="tb-member-uni">🎓 ${member.uni}</div>
              </div>
              <div class="tb-member-role">${role}</div>
            </div>
          `;
        } else {
          isFull = false;
          membersHtml += `
            <div class="tb-member-slot empty">
              <div class="tb-member-info">
                <div class="tb-empty-slot">Open Slot</div>
              </div>
              <div class="tb-member-role">${role}</div>
              ${!userInTeam ? `<button class="btn btn-sm" onclick="openJoinModal('${team.id}', '${role}')">Join</button>` : ''}
            </div>
          `;
        }
      }
    }
    
    card.innerHTML = `
      <div class="tb-team-head">
        <h3 class="tb-team-name">${team.name}</h3>
        <div class="tb-team-status ${isFull ? 'full' : 'recruiting'}">${isFull ? 'Full' : 'Recruiting'}</div>
      </div>
      <div class="tb-team-members">
        ${membersHtml}
      </div>
    `;
    container.appendChild(card);
  });
}

// Modal Logic
function closeTbModal() {
  document.getElementById('tbModal').style.display = 'none';
}

function openCreateTeamModal() {
  const challenge = getAllChallenges().find(c => c.id === selectedChallengeId);
  if (!challenge) return;
  
  document.getElementById('tbModalTitle').textContent = 'Create New Team';
  let rolesOptions = '';
  for (const role of Object.keys(challenge.roleSlots)) {
    rolesOptions += `<option value="${role}">${role}</option>`;
  }
  
  document.getElementById('tbModalBody').innerHTML = `
    <div class="form-group" style="margin-bottom:16px;">
      <label style="display:block; font-size:12px; font-weight:700; color:var(--muted); margin-bottom:4px;">Team Name</label>
      <input type="text" id="tbNewTeamName" placeholder="e.g. Code Ninjas" style="width:100%; border:1.5px solid var(--line); border-radius:10px; padding:10px 12px; font-size:14px;">
    </div>
    <div class="form-group" style="margin-bottom:16px;">
      <label style="display:block; font-size:12px; font-weight:700; color:var(--muted); margin-bottom:4px;">Your Role</label>
      <select id="tbNewTeamRole" style="width:100%; border:1.5px solid var(--line); border-radius:10px; padding:10px 12px; font-size:14px;">
        ${rolesOptions}
      </select>
    </div>
    <button class="btn btn-primary" onclick="createTeam()" style="width:100%; margin-top:16px;">Create Team</button>
  `;
  document.getElementById('tbModal').style.display = 'flex';
}

function createTeam() {
  const name = document.getElementById('tbNewTeamName').value.trim();
  const role = document.getElementById('tbNewTeamRole').value;
  if (!name) {
    alert("Please enter a team name.");
    return;
  }
  
  const teams = getTeams();
  // Check if user is already in a team for this challenge
  const existingTeam = teams.find(t => t.challengeId === selectedChallengeId && Object.values(t.members).some(m => m.name === currentUser.name));
  if(existingTeam) {
    alert("You are already in a team for this challenge.");
    closeTbModal();
    return;
  }

  const newTeam = {
    id: 'team_' + Date.now(),
    challengeId: selectedChallengeId,
    name: name,
    members: {
      [currentUser.name]: {
        name: currentUser.name,
        uni: currentUser.uni || 'Unknown University',
        teamRole: role
      }
    }
  };
  
  teams.push(newTeam);
  saveTeams(teams);
  closeTbModal();
  renderTeamsForChallenge(selectedChallengeId);
  if(typeof unlockBadge === 'function') unlockBadge('team_leadership');
}

function openJoinModal(teamId, role) {
  const teams = getTeams();
  // Check if user is already in a team for this challenge
  const existingTeam = teams.find(t => t.challengeId === selectedChallengeId && Object.values(t.members).some(m => m.name === currentUser.name));
  if(existingTeam) {
    alert("You are already in a team for this challenge.");
    return;
  }
  
  const team = teams.find(t => t.id === teamId);
  if(!team) return;

  document.getElementById('tbModalTitle').textContent = `Join ${team.name}`;
  document.getElementById('tbModalBody').innerHTML = `
    <div style="margin-bottom:20px; font-size:15px; color:var(--ink);">
      You are about to join <strong>${team.name}</strong> as a <strong>${role}</strong>.
    </div>
    <button class="btn btn-primary" onclick="joinTeam('${teamId}', '${role}')" style="width:100%;">Confirm Join</button>
  `;
  document.getElementById('tbModal').style.display = 'flex';
}

function joinTeam(teamId, role) {
  const teams = getTeams();
  const teamIndex = teams.findIndex(t => t.id === teamId);
  if (teamIndex === -1) return;
  
  teams[teamIndex].members[currentUser.name] = {
    name: currentUser.name,
    uni: currentUser.uni || 'Unknown University',
    teamRole: role
  };
  
  saveTeams(teams);
  closeTbModal();
  renderTeamsForChallenge(selectedChallengeId);
}

document.addEventListener('DOMContentLoaded', initTeamBuilder);
