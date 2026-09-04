/* CivicSetu — seed data. Single source of truth for the demo.
   Both citizen and authority views read from CIVIC.reports. One array, two renderers.
   Do not duplicate this data anywhere else. */

const CIVIC = {

  wards: [
    // reportRate is reports per 1000 residents. underReported drives equity correction.
    { id: 'W12', name: 'Hatia',   pop: 48000, reportRate: 8.4, underReported: false },
    { id: 'W07', name: 'Doranda', pop: 39000, reportRate: 4.1, underReported: false },
    { id: 'W04', name: 'Kanke',   pop: 52000, reportRate: 0.9, underReported: true  },
    { id: 'W19', name: 'Bariatu', pop: 31000, reportRate: 2.6, underReported: false }
  ],

  // issue type -> owning department. Routing is type + ward geofence.
  departments: {
    Pothole:     'PWD — Roads Division',
    Garbage:     'Solid Waste Management Cell',
    Streetlight: 'Electrical Maintenance Wing',
    Handpump:    'Public Health Engineering Dept',
    Drainage:    'Drainage & Sewerage Division'
  },

  // hours until SLA breach, by category
  slaHours: { Pothole: 72, Garbage: 24, Streetlight: 48, Handpump: 24, Drainage: 48 },

  // Maps each civic-report category to the broader societal-challenge domain
  // SIH26043 asks for (education/healthcare/agriculture/water/energy/etc.),
  // so a citizen's pothole photo and a university's research discipline can
  // be talked about in the same vocabulary.
  domains: {
    Pothole:     'Urban Infrastructure',
    Garbage:     'Sanitation & Environment',
    Streetlight: 'Energy & Urban Infrastructure',
    Handpump:    'Water Resources',
    Drainage:    'Water Resources & Urban Infrastructure'
  },

  // Proximity multiplier applied when an issue sits near sensitive infrastructure.
  proximityWeights: { school: 1.25, hospital: 1.30, busStop: 1.10, none: 1.0 },

  // Hackathons and civic challenges for cross-university team builder
  challenges: [
    {
      id: 'CH-SIH-2026',
      title: 'Smart India Hackathon 2026',
      description: 'Develop innovative civic-tech solutions for urban mobility and solid waste management.',
      deadline: '2026-10-15T23:59:00',
      teamSizeLimit: 6,
      roleSlots: { 'Frontend Developer': 2, 'Backend Developer': 2, 'UI/UX Designer': 1, 'Data Scientist': 1 }
    },
    {
      id: 'CH-WATER-01',
      title: 'Jal Jeevan Mission Innovation Challenge',
      description: 'Create scalable IoT prototypes to monitor water quality and leakage in rural pipelines.',
      deadline: '2026-11-20T23:59:00',
      teamSizeLimit: 4,
      roleSlots: { 'Hardware Engineer': 2, 'Software Engineer': 1, 'Project Manager': 1 }
    },
    {
      id: 'CH-AI-CIVIC',
      title: 'AI for Civic Good',
      description: 'Train models on municipal data to predict pothole formation and infrastructure decay.',
      deadline: '2026-09-30T23:59:00',
      teamSizeLimit: 3,
      roleSlots: { 'ML Engineer': 2, 'Data Analyst': 1 }
    }
  ],

  reports: [
    {
      id: 'CS-2026-8912', title: 'Deep pothole near Main Market',
      titleHi: 'मुख्य बाजार के पास गहरा गड्ढा',
      category: 'Pothole', ward: 'W12', lat: 23.3441, lng: 85.3096,
      severity: 0.91, confirms: 14, proximity: 'school',
      status: 'assigned', assignee: 'R. Kumar · PWD',
      submittedAt: '2026-08-24T10:30:00', slaDeadline: '2026-08-27T10:30:00',
      photo: 'assets/pothole.jpg', proofPhoto: null,
      timeline: [
        { step: 'Report Submitted', stepHi: 'रिपोर्ट दर्ज की गई', at: '2026-08-24T10:30:00', done: true },
        { step: 'Auto-routed to PWD', stepHi: 'PWD को भेजा गया',   at: '2026-08-24T10:31:00', done: true },
        { step: 'Assigned to Officer', stepHi: 'अधिकारी को सौंपा गया', at: '2026-08-25T14:15:00', done: true, note: 'R. Kumar, PWD Roads' },
        { step: 'Work in Progress',   stepHi: 'काम चल रहा है',      at: null, done: false },
        { step: 'Issue Resolved',     stepHi: 'समस्या हल हो गई',    at: null, done: false }
      ],
      comments: [
        { by: 'Sunita Devi', at: '2026-08-25T09:00:00',
          text: 'Two-wheelers are skidding here every morning. Please fix soon.' }
      ]
    },
    {
      // Second member of the Hatia pothole cluster — see CIVIC.dupeCluster
      // (memberCount: 3). Without this and CS-2026-8899, CS-2026-8912 is the
      // only unresolved Pothole report and DBSCAN (minPts: 2) can never form
      // a cluster, so findDuplicate() always returns null.
      id: 'CS-2026-8905', title: 'Pothole widening near Main Market',
      titleHi: 'मुख्य बाजार के पास गड्ढा और चौड़ा हो गया',
      category: 'Pothole', ward: 'W12', lat: 23.3447, lng: 85.3098,
      severity: 0.78, confirms: 6, proximity: 'school',
      status: 'received', assignee: null,
      submittedAt: '2026-08-25T09:00:00', slaDeadline: '2026-08-28T09:00:00',
      photo: 'assets/pothole.jpg', proofPhoto: null,
      timeline: [], comments: []
    },
    {
      id: 'CS-2026-8899', title: 'Second pothole, same stretch near Main Market',
      titleHi: 'मुख्य बाजार के पास उसी सड़क पर दूसरा गड्ढा',
      category: 'Pothole', ward: 'W12', lat: 23.3438, lng: 85.3103,
      severity: 0.66, confirms: 4, proximity: 'school',
      status: 'received', assignee: null,
      submittedAt: '2026-08-25T18:00:00', slaDeadline: '2026-08-28T18:00:00',
      photo: 'assets/pothole.jpg', proofPhoto: null,
      timeline: [], comments: []
    },
    {
      id: 'CS-2026-8907', title: 'Drain overflow near bus stand',
      titleHi: 'बस स्टैंड के पास नाली का बहाव',
      category: 'Drainage', ward: 'W07', lat: 23.3252, lng: 85.3271,
      severity: 0.84, confirms: 9, proximity: 'busStop',
      status: 'in_progress', assignee: 'M. Oraon · Drainage',
      submittedAt: '2026-08-25T08:10:00', slaDeadline: '2026-08-27T08:10:00',
      photo: 'assets/drain.jpg', proofPhoto: null,
      timeline: [], comments: []
    },
    {
      // This one breaches SLA during the demo. Deadline is intentionally near-past.
      id: 'CS-2026-8890', title: 'Streetlight out on Kanke Road',
      titleHi: 'कांके रोड पर स्ट्रीटलाइट बंद',
      category: 'Streetlight', ward: 'W04', lat: 23.4012, lng: 85.3187,
      severity: 0.62, confirms: 5, proximity: 'none',
      status: 'received', assignee: null,
      submittedAt: '2026-08-24T19:00:00', slaDeadline: 'DEMO_BREACH_SOON',
      photo: 'assets/light.jpg', proofPhoto: null,
      timeline: [], comments: []
    },
    {
      id: 'CS-2026-8875', title: 'Garbage pile behind community hall',
      titleHi: 'सामुदायिक भवन के पीछे कचरे का ढेर',
      category: 'Garbage', ward: 'W12', lat: 23.3388, lng: 85.3140,
      severity: 0.48, confirms: 3, proximity: 'none',
      status: 'received', assignee: null,
      submittedAt: '2026-08-26T07:45:00', slaDeadline: '2026-08-27T07:45:00',
      photo: 'assets/garbage.jpg', proofPhoto: null,
      timeline: [], comments: []
    },
    {
      // Low volume + under-reported ward. Equity correction must visibly lift this.
      id: 'CS-2026-8862', title: 'Broken handpump, Ward 4 primary school',
      titleHi: 'वार्ड 4 प्राथमिक विद्यालय में टूटा हैंडपंप',
      category: 'Handpump', ward: 'W04', lat: 23.4098, lng: 85.3011,
      severity: 0.71, confirms: 2, proximity: 'school',
      status: 'received', assignee: null,
      submittedAt: '2026-08-26T11:20:00', slaDeadline: '2026-08-27T11:20:00',
      photo: 'assets/handpump.jpg', proofPhoto: null,
      timeline: [], comments: []
    },
    {
      id: 'CS-2026-8801', title: 'Large pothole filled, connecting road to NH',
      titleHi: 'NH को जोड़ने वाली सड़क का गड्ढा भरा गया',
      category: 'Pothole', ward: 'W19', lat: 23.3701, lng: 85.3340,
      severity: 0.55, confirms: 7, proximity: 'none',
      status: 'resolved', assignee: 'S. Mahto · PWD',
      submittedAt: '2026-08-18T16:00:00', slaDeadline: '2026-08-21T16:00:00',
      resolvedAt: '2026-08-20T12:00:00',
      photo: 'assets/pothole2.jpg', proofPhoto: 'assets/pothole2-fixed.jpg',
      timeline: [], comments: []
    }
  ],

  /* Duplicate cluster: submitting a Pothole within ~150m of CS-2026-8912
     must trigger the "3 similar issues nearby — confirm instead" path.
     minPts is a DBSCAN parameter (see js/geo-cluster.js) — 2 means "this
     point plus at least 1 real neighbour" forms a cluster. */
  dupeCluster: { anchorId: 'CS-2026-8912', radiusM: 150, windowHours: 72, memberCount: 3, minPts: 2 },

  /* Hotspot overlay: DBSCAN over ALL unresolved reports regardless of
     category — a wider radius than dupeCluster since a hotspot is "lots
     of issues in this area", not "the same pothole reported 3 times".
     800m so CS-2026-8912 + CS-2026-8875 (both Hatia, ~740m apart) form a
     visible hotspot out of the box, same as dupeCluster is pre-seeded to
     visibly trigger. */
  hotspot: { radiusM: 800, minPts: 2 },

  investors: [
    {
      id: 'inv_1',
      name: 'Ananya Sharma',
      firm: 'Surge / Peak XV Partners',
      role: 'Partner & Lead Investor',
      type: 'Investor / VC',
      domains: ['Smart Water Management', 'Clean Energy', 'AI for Governance'],
      ticketSize: '₹25L – ₹1Cr',
      stage: 'Seed / Pre-Seed',
      bio: 'Focusing on deep-tech civic infrastructure and sustainable water systems across tier-2 Indian cities.',
      location: 'Bengaluru / Remote',
      verified: true
    },
    {
      id: 'msme_1',
      name: 'Jharkhand Precision Fabricators Pvt. Ltd.',
      firm: 'MSME · IoT Hardware Manufacturing',
      role: 'Deployment & Manufacturing Partner',
      type: 'MSME',
      domains: ['Smart Water Management', 'Clean Energy', 'Waste Management'],
      ticketSize: 'In-kind fabrication + pilot deployment',
      stage: 'Prototype to Pilot',
      bio: 'Ranchi-based MSME that manufactures and field-deploys low-cost IoT sensor enclosures for municipal bodies; can take a university prototype to a 50-unit pilot in 6 weeks.',
      location: 'Ranchi, Jharkhand',
      verified: true
    },
    {
      id: 'msme_2',
      name: 'Sahyog Rural Tech Solutions',
      firm: 'MSME · Rural Water & Sanitation Systems',
      role: 'Field Implementation Partner',
      type: 'MSME',
      domains: ['Smart Water Management', 'Waste Management'],
      ticketSize: 'In-kind installation + local workforce',
      stage: 'Pilot / Scale-up',
      bio: 'Installs and maintains handpump and drainage retrofit hardware across rural Jharkhand wards; the on-ground partner for last-mile deployment of university solutions.',
      location: 'Hazaribagh, Jharkhand',
      verified: true
    },
    {
      id: 'lab_1',
      name: 'Centre for Disaster & Civic Resilience, BIT Mesra',
      firm: 'University Research Lab',
      role: 'Research & Mentorship Partner',
      type: 'Research Lab',
      domains: ['Civic Mobility', 'Smart Water Management', 'AI for Governance'],
      ticketSize: 'Mentorship + lab access, no funding',
      stage: 'Any stage',
      bio: 'Provides faculty mentorship, lab equipment, and academic validation for student teams working on infrastructure-resilience and civic-AI problems.',
      location: 'Ranchi, Jharkhand',
      verified: true
    },
    {
      id: 'inv_2',
      name: 'Rohan Mehta',
      firm: 'CleanTech Angels India',
      role: 'Angel Investor & Advisor',
      type: 'Investor / VC',
      domains: ['Waste Management', 'Clean Energy', 'Civic Mobility'],
      ticketSize: '₹10L – ₹35L',
      stage: 'Pre-Seed / Prototype Grant',
      bio: 'Ex-utility executive backing climate tech, IoT waste management, and green urban mobility solutions.',
      location: 'Mumbai / Pune',
      verified: true
    },
    {
      id: 'inv_3',
      name: 'Dr. Meera Nair',
      firm: 'Bharat Impact Innovation Fund',
      role: 'Managing Director',
      type: 'Investor / VC',
      domains: ['Smart Water Management', 'Waste Management', 'AI for Governance'],
      ticketSize: '₹50L – ₹2Cr',
      stage: 'Seed / Series A',
      bio: 'Investing in civic tech startups backed by university research teams and public-private partnerships.',
      location: 'New Delhi / Hyderabad',
      verified: true
    },
    {
      id: 'inv_4',
      name: 'Vikramaditya Rao',
      firm: 'Urban Infra Accelerator VC',
      role: 'Principal Investor',
      type: 'Investor / VC',
      domains: ['Civic Mobility', 'Smart Water Management', 'Clean Energy'],
      ticketSize: '₹15L – ₹50L',
      stage: 'Prototype to Pilot Grant',
      bio: 'Helping smart city innovations transition from university labs to Municipal Corporation pilots.',
      location: 'Ranchi / Kolkata',
      verified: true
    }
  ],

  shortlistedSolutions: [
    {
      id: 'sol_1',
      title: 'IoT Real-Time Handpump Contamination Sensor',
      team: 'HydraShield (IIT ISM Dhanbad)',
      domain: 'Smart Water Management',
      summary: 'Low-cost solar-powered water purity sensor with LoRaWAN mesh node for rural ward handpumps.',
      stage: 'Working Prototype (SIH Winner)',
      fundingGoal: '₹20L Seed Grant / Angel Round',
      prototypeUrl: '#'
    },
    {
      id: 'sol_2',
      title: 'DBSCAN Urban Garbage Accumulation Heatmap AI',
      team: 'Chaos Crew (NIT Jamshedpur)',
      domain: 'Waste Management',
      summary: 'Computer vision & MobileNet ML pipeline for automated illegal dump detection via citizen reports.',
      stage: 'Pilot Deployed (Ward 12 Ranchi)',
      fundingGoal: '₹15L Pilot Expansion Grant',
      prototypeUrl: '#'
    },
    {
      id: 'sol_3',
      title: 'GridSense Solar Streetlight SLA Monitoring',
      team: 'EcoGrid (BIT Mesra)',
      domain: 'Clean Energy',
      summary: 'Hardware retrofit module for municipal streetlights ensuring instant outage detection and auto-routing.',
      stage: 'Lab Tested Prototype',
      fundingGoal: '₹30L Pre-Seed Funding',
      prototypeUrl: '#'
    }
  ],

  policyBriefs: [
    {
      id: 'pb_mohua_2026_01',
      title: 'Monsoonal Road Asset Degradation & Contractor SLA Enforcement Brief',
      ministry: 'Ministry of Housing and Urban Affairs (MoHUA)',
      code: 'MoHUA-PB-2026-089',
      date: '2026-08-28',
      author: 'CivicSetu Policy Analytics Cell',
      executiveSummary: 'Aggregated report analysis reveals that 42% of urban road distress points reoccur within 180 days of pothole filling due to sub-standard bitumen compaction. Concentrated distress in Ward 4 & Ward 19 requires mandatory 24-month contractor defect liability clauses under AMRUT 2.0.',
      painPoints: [
        { area: 'Ward 19 (NH Feeder Road)', category: 'Potholes & Drainage', breachRate: '38% Overdue', severityIndex: 0.84 },
        { area: 'Ward 4 (Kanke Corridor)', category: 'Road Edge Erosion', breachRate: '29% Overdue', severityIndex: 0.76 }
      ],
      metrics: {
        totalReportsAnalyzed: 128,
        avgResolutionTime: '4.2 Days',
        repeatDistressRate: '42%',
        statutoryScheme: 'AMRUT 2.0 Sub-Scheme for Urban Road Durability'
      },
      directives: [
        'Mandate IoT geo-tagged proof-of-work before releasing contractor payments.',
        'Implement DBSCAN spatial clustering to prioritize roads with >3 confirmations/100m.',
        'Allocate ₹1.5Cr for storm-water drainage integration along Kanke Road.'
      ]
    },
    {
      id: 'pb_jal_2026_02',
      title: 'Under-Reported Ward Drinking Water Reliability & Handpump Failure Policy',
      ministry: 'Ministry of Jal Shakti',
      code: 'MJS-JJM-2026-042',
      date: '2026-08-26',
      author: 'CivicSetu Rural-Urban Water Cell',
      executiveSummary: 'Equity correction analysis identified a critical reporting gap in Ward 12 & Ward 4. Handpumps near primary schools exhibit a 71% failure severity score due to ground-water table drop and mechanical valve wear.',
      painPoints: [
        { area: 'Ward 4 (Primary School Complex)', category: 'Handpump Breakage', breachRate: '52% Overdue', severityIndex: 0.71 },
        { area: 'Ward 12 (Hatia Basti)', category: 'Water Purity & Pressure', breachRate: '44% Overdue', severityIndex: 0.68 }
      ],
      metrics: {
        totalReportsAnalyzed: 94,
        avgResolutionTime: '6.1 Days',
        repeatDistressRate: '31%',
        statutoryScheme: 'Jal Jeevan Mission (Urban-Rural Convergence)'
      },
      directives: [
        'Deploy low-cost solar telemetry water purity sensors on all school handpumps.',
        'Apply automated Equity Boost (+0.5 priority score) to under-reported ward grievances.',
        'Establish 24-hour rapid repair squads for school & hospital water points.'
      ]
    },
    {
      id: 'pb_moefcc_2026_03',
      title: 'Municipal Solid Waste Accumulation & Micro-Hotspot Mitigation Policy Brief',
      ministry: 'Ministry of Environment, Forest and Climate Change (MoEFCC)',
      code: 'MoEFCC-SBM-2026-114',
      date: '2026-08-25',
      author: 'CivicSetu Environmental Analytics Cell',
      executiveSummary: 'DBSCAN spatial clustering identified 3 persistent open dump hotspots within an 800m radius of residential wards. MobileNet visual ML classification confirms 68% of uncollected waste consists of non-biodegradable single-use plastics.',
      painPoints: [
        { area: 'Ward 12 (Community Hall Rear)', category: 'Unsanctioned Waste Pile', breachRate: '35% Overdue', severityIndex: 0.64 },
        { area: 'Ward 19 (Market Perimeter)', category: 'Commercial Dumping', breachRate: '28% Overdue', severityIndex: 0.59 }
      ],
      metrics: {
        totalReportsAnalyzed: 156,
        avgResolutionTime: '2.8 Days',
        repeatDistressRate: '54%',
        statutoryScheme: 'Swachh Bharat Mission Urban 2.0 (Dump Site Remediation)'
      },
      directives: [
        'Integrate MobileNet automated garbage volume estimation into municipal compactor dispatch.',
        'Enforce heavy fines on commercial vendors dumping within 100m of community halls.',
        'Install CCTV micro-surveillance at top 5 DBSCAN garbage cluster anchors.'
      ]
    },
    {
      id: 'pb_mnre_2026_04',
      title: 'Public Energy Infrastructure & Solar Streetlight SLA Optimization Brief',
      ministry: 'Ministry of Power & MNRE',
      code: 'MNRE-SL-2026-077',
      date: '2026-08-24',
      author: 'CivicSetu Energy Cell',
      executiveSummary: 'Dark street corridors account for 38% of safety-related citizen alerts. Automated SLA countdown tracking reveals solar streetlight repairs average 5.8 days due to delayed battery component logistics.',
      painPoints: [
        { area: 'Kanke Road Secondary Corridor', category: 'Dark Stretch & Outages', breachRate: '61% Overdue', severityIndex: 0.62 }
      ],
      metrics: {
        totalReportsAnalyzed: 82,
        avgResolutionTime: '5.8 Days',
        repeatDistressRate: '22%',
        statutoryScheme: 'Street Lighting National Programme (SLNP)'
      },
      directives: [
        'Mandate smart remote telemetry nodes for instant grid fault detection.',
        'Stock ward-level spare inventory for rapid 24-hour battery replacements.',
        'Prioritize streetlight repairs on primary school and transit access routes.'
      ]
    }
  ]
};

/* ---------- Citizen report -> university challenge bridge ----------
   This is the mechanic SIH26043 actually asks for: a societal problem a
   citizen reports must be routable to a university team for solving, not
   just to a municipal officer. CIVIC.challenges above are the seed/demo
   challenges; escalated ones (created from a real report in the Authority
   dashboard) are layered on top from localStorage so they survive reloads
   without needing a backend. getAllChallenges() is what every screen
   (Team Builder, Policy Insights participation stats) should read from —
   never read CIVIC.challenges directly once a report has been escalated. */
const EXTRA_CHALLENGES_KEY = 'civic_extra_challenges';
function getExtraChallenges(){
  try{ return JSON.parse(localStorage.getItem(EXTRA_CHALLENGES_KEY) || '[]'); }
  catch(e){ return []; }
}
function saveExtraChallenges(list){
  localStorage.setItem(EXTRA_CHALLENGES_KEY, JSON.stringify(list));
}
function getAllChallenges(){
  return CIVIC.challenges.concat(getExtraChallenges());
}
// Turns a citizen's report into a university-facing challenge. Returns the
// new challenge, or null if this report was already escalated.
function createChallengeFromReport(report){
  const extra = getExtraChallenges();
  if(extra.some(c => c.sourceReportId === report.id)) return null;
  const domain = CIVIC.domains[report.category] || 'Urban Infrastructure';
  const deadline = new Date(Date.now() + 45*24*3600*1000).toISOString();
  const challenge = {
    id: 'CH-RPT-' + report.id,
    title: `${report.category} distress: ${report.title}`,
    description: `Citizen-reported problem in ${wardInfo(report.ward).name} (severity ${report.severity.toFixed(2)}, ${report.confirms} confirmations). Needs a scalable, deployable solution — not a one-off repair.`,
    domain,
    deadline,
    teamSizeLimit: 4,
    roleSlots: { 'Research Lead': 1, 'Engineer': 2, 'Domain Expert': 1 },
    sourceReportId: report.id,
    sourceWard: report.ward,
    createdAt: new Date().toISOString()
  };
  extra.push(challenge);
  saveExtraChallenges(extra);
  return challenge;
}

/* Re-anchor the seed timestamps above to "now".
   Every submittedAt/slaDeadline/resolvedAt/timeline/comment date above was
   authored relative to 2026-08-26T11:20:00 (CS-2026-8862, the most recent
   seed report). Left as absolute strings, they silently go stale: run the
   prototype even a few days after they were written and every SLA deadline
   is already in the past, every report shows BREACHED on first paint, and
   CS-2026-8912 falls outside dupeCluster.windowHours so the "3 similar
   issues nearby" flow never fires. Shifting every date by the same offset
   preserves all the authored gaps (SLA windows, the dupe cluster's 72h
   window, "resolved 2 days after submit", etc.) so the demo narrative holds
   no matter when this is actually opened. DEMO_BREACH_SOON is untouched —
   app.js resolves it to a real deadline relative to page-load time. */
(function reanchorSeedDates(){
  const AUTHORED_NOW = new Date('2026-08-26T11:20:00').getTime();
  const offset = Date.now() - AUTHORED_NOW;
  function shift(iso){
    if(!iso || iso === 'DEMO_BREACH_SOON') return iso;
    return new Date(new Date(iso).getTime() + offset).toISOString();
  }
  CIVIC.reports.forEach(r=>{
    r.submittedAt = shift(r.submittedAt);
    r.slaDeadline = shift(r.slaDeadline);
    if(r.resolvedAt) r.resolvedAt = shift(r.resolvedAt);
    (r.timeline||[]).forEach(step=>{ if(step.at) step.at = shift(step.at); });
    (r.comments||[]).forEach(c=>{ if(c.at) c.at = shift(c.at); });
  });
})();

/* ---------- Reports: shared Supabase backend, not a local seed array ----------
   Everything above is a local fallback so the demo still renders instantly
   and works offline. As soon as Supabase answers, its rows become
   authoritative (merged in by id — a Supabase row overwrites a local seed
   row with the same id, and any row Supabase has that isn't in the local
   seed is a real report from another user/browser and gets added). A
   realtime subscription re-runs this merge on every insert/update from
   ANY client, which is what makes a citizen's report show up on an
   already-open Authority dashboard without a refresh. */
async function bootstrapReportsFromSupabase(){
  if(typeof SB === 'undefined' || !SB.client) return;
  try{
    const rows = await SB.listReports();
    if(!rows) return; // fetch failed (offline, RLS, etc.) — keep local fallback data
    const byId = new Map(CIVIC.reports.map(r=>[r.id, r]));
    rows.forEach(row => {
      const existing = byId.get(row.id);
      const merged = Object.assign({}, existing, row);
      // Supabase has no column for the client-resolved DEMO_BREACH_SOON
      // deadline or the in-memory `escalated` flag. A null/undefined
      // slaDeadline on the row means "not tracked server-side", not "no
      // deadline" — falling back to it would permanently read as breached
      // (new Date(null) is 1970) and re-trigger auto-escalation forever on
      // every realtime refresh. Keep whatever the client already resolved.
      if(row.slaDeadline == null && existing && existing.slaDeadline) merged.slaDeadline = existing.slaDeadline;
      if(existing && existing.escalated) merged.escalated = true;
      byId.set(row.id, merged);
    });
    CIVIC.reports.length = 0;
    CIVIC.reports.push(...Array.from(byId.values()));
    window.dispatchEvent(new CustomEvent('civic:reportsUpdated'));
  } catch(e){
    console.error('Supabase reports bootstrap failed:', e);
  }
}
bootstrapReportsFromSupabase();
if(typeof SB !== 'undefined' && SB.client){
  SB.subscribeReports(() => bootstrapReportsFromSupabase());
}
