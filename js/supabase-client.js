// CivicSetu Supabase wiring — the one real, shared backend behind the demo.
//
// Everything else in this app (teams, portfolio, badges, investor intros,
// escalated challenges) intentionally lives in localStorage: it's per-user
// state a hackathon demo doesn't need to share. Reports are different — the
// entire premise of the app is "citizen reports it, an officer somewhere
// else sees it" — so reports are the one thing that must live in a real,
// shared database, not a browser's own storage. That's what this file wires
// up: a Supabase project the reports table already existed in, with RLS
// policies already allowing anon select/insert/update (this is a public
// prototype with a fake passcode gate, not a real multi-tenant app — see the
// "not secure" banner on sign-in).
//
// The publishable/anon key below is meant to be embedded in client code —
// it's authorization-scoped by Postgres Row Level Security policies on the
// project, the same way a Stripe publishable key or a Firebase config
// object is safe to ship in a bundle. It is not a secret.
const SUPABASE_URL = 'https://yhzjnyihaghnuktsclws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloempueWloYWdobnVrdHNjbHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxODA5MTcsImV4cCI6MjEwMzc1NjkxN30.yPdzukwm3-E0LgGfJvUABRD4PgcC87mBmq7yUiM8HEQ';

const SB = (function () {
  const client = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  // DB row -> app report shape. The DB stores timeline/comments as jsonb
  // arrays directly, so this is mostly just field passthrough.
  function rowToReport(row) {
    return {
      id: row.id,
      title: row.title,
      titleHi: row.titleHi || '',
      category: row.category,
      ward: row.ward,
      lat: row.lat,
      lng: row.lng,
      severity: row.severity,
      confirms: row.confirms,
      proximity: row.proximity || 'none',
      status: row.status || 'received',
      assignee: row.assignee || null,
      submittedAt: row.submittedAt,
      slaDeadline: row.slaDeadline,
      photo: row.photo || null,
      proofPhoto: row.proofPhoto || null,
      resolvedAt: row.resolvedAt || null,
      timeline: row.timeline || [],
      comments: row.comments || []
    };
  }

  // App report shape -> DB row for insert. lat/lng/severity default to
  // null-safe values; jsonb columns take the arrays directly.
  function reportToRow(r) {
    return {
      id: r.id,
      title: r.title,
      titleHi: r.titleHi || null,
      category: r.category,
      ward: r.ward,
      lat: r.lat,
      lng: r.lng,
      severity: r.severity,
      confirms: r.confirms,
      proximity: r.proximity,
      status: r.status,
      assignee: r.assignee,
      submittedAt: r.submittedAt,
      slaDeadline: r.slaDeadline === 'DEMO_BREACH_SOON' ? null : r.slaDeadline,
      photo: r.photo,
      proofPhoto: r.proofPhoto,
      resolvedAt: r.resolvedAt || null,
      timeline: r.timeline || [],
      comments: r.comments || []
    };
  }

  async function listReports() {
    if (!client) return null;
    const { data, error } = await client.from('reports').select('*').order('submittedAt', { ascending: false });
    if (error) { console.error('SB.listReports failed:', error.message); return null; }
    return data.map(rowToReport);
  }

  async function insertReport(report) {
    if (!client) return false;
    const { error } = await client.from('reports').insert(reportToRow(report));
    if (error) { console.error('SB.insertReport failed:', error.message); return false; }
    return true;
  }

  async function updateReport(id, patch) {
    if (!client) return false;
    const row = {};
    if ('status' in patch) row.status = patch.status;
    if ('assignee' in patch) row.assignee = patch.assignee;
    if ('timeline' in patch) row.timeline = patch.timeline;
    if ('resolvedAt' in patch) row.resolvedAt = patch.resolvedAt;
    if ('proofPhoto' in patch) row.proofPhoto = patch.proofPhoto;
    if ('confirms' in patch) row.confirms = patch.confirms;
    const { error } = await client.from('reports').update(row).eq('id', id);
    if (error) { console.error('SB.updateReport failed:', error.message); return false; }
    return true;
  }

  // Fires `onChange` whenever ANY client inserts or updates a report row —
  // this is what makes an already-open Authority dashboard pick up a new
  // citizen report live, without a manual refresh.
  function subscribeReports(onChange) {
    if (!client) return null;
    return client
      .channel('reports-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, onChange)
      .subscribe();
  }

  return { client, listReports, insertReport, updateReport, subscribeReports };
})();
