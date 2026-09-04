// CivicSetu Supabase wiring — the one real, shared backend behind the demo.
//
// Everything else in this app (teams, portfolio, badges, investor intros,
// escalated challenges) intentionally lives in localStorage: it's per-user
// state a hackathon demo doesn't need to share. Reports are different — the
// entire premise of the app is "citizen reports it, an officer somewhere
// else sees it" — so reports are the one thing that must live in a real,
// shared database, not a browser's own storage. That's what this file wires
// up: a Supabase project the reports table already existed in. RLS allows
// anyone to read, but insert/update require a real authenticated session
// (see the `profiles` table's policies) — Google sign-in via Supabase Auth
// is what makes that role real.
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
      comments: row.comments || [],
      reporterEmail: row.reporterEmail || null,
      userId: row.user_id || null,
      visibility: row.visibility || 'public',
      aiSummary: row.ai_summary || null,
      aiCategory: row.ai_category || null,
      aiDepartment: row.ai_department || null,
      aiPriority: row.ai_priority || null,
      aiNextSteps: row.ai_next_steps || null,
      aiGeneratedAt: row.ai_generated_at || null
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
      comments: r.comments || [],
      reporterEmail: r.reporterEmail || null,
      // user_id is NOT trusted from the client for authorization — RLS's
      // `with check (user_id = auth.uid())` on INSERT is what actually
      // enforces ownership. Sending it here just has to match the signed-in
      // session, or the insert is rejected.
      user_id: r.userId || null,
      visibility: r.visibility === 'private' ? 'private' : 'public'
    };
  }

  async function listReports() {
    if (!client) return null;
    const { data, error } = await client.from('reports').select('*').order('submittedAt', { ascending: false });
    if (error) { console.error('SB.listReports failed:', error.message); return null; }
    return data.map(rowToReport);
  }

  // Writes (insert/update) require role `authenticated` under RLS. A PATCH
  // sent under the anon key doesn't error — PostgREST just matches 0 rows
  // and returns 204 "success" — so a caller that only checks `error` can
  // believe a write worked when RLS silently discarded it. This is why a
  // session gets verified/refreshed *before* every write, not just relied
  // on implicitly.
  async function ensureSession() {
    if (!client) return null;
    const { data: { session } } = await client.auth.getSession();
    if (session) return session;
    // No session, or the SDK's local copy is stale — try one refresh before
    // giving up, in case only the access token (not the underlying login)
    // has lapsed.
    const { data: { session: refreshed } } = await client.auth.refreshSession().catch(() => ({ data: { session: null } }));
    return refreshed || null;
  }

  async function insertReport(report) {
    if (!client) return { ok: false, reason: 'offline' };
    const session = await ensureSession();
    if (!session) return { ok: false, reason: 'signed_out' };
    const { error } = await client.from('reports').insert(reportToRow(report));
    if (error) { console.error('SB.insertReport failed:', error.message); return { ok: false, reason: 'error', message: error.message }; }
    return { ok: true };
  }

  async function updateReport(id, patch) {
    if (!client) return { ok: false, reason: 'offline' };
    const session = await ensureSession();
    if (!session) return { ok: false, reason: 'signed_out' };
    const row = {};
    if ('status' in patch) row.status = patch.status;
    if ('assignee' in patch) row.assignee = patch.assignee;
    if ('timeline' in patch) row.timeline = patch.timeline;
    if ('resolvedAt' in patch) row.resolvedAt = patch.resolvedAt;
    if ('proofPhoto' in patch) row.proofPhoto = patch.proofPhoto;
    if ('confirms' in patch) row.confirms = patch.confirms;
    if ('visibility' in patch) row.visibility = patch.visibility === 'private' ? 'private' : 'public';
    if ('aiSummary' in patch) row.ai_summary = patch.aiSummary;
    if ('aiCategory' in patch) row.ai_category = patch.aiCategory;
    if ('aiDepartment' in patch) row.ai_department = patch.aiDepartment;
    if ('aiPriority' in patch) row.ai_priority = patch.aiPriority;
    if ('aiNextSteps' in patch) row.ai_next_steps = patch.aiNextSteps;
    if ('aiGeneratedAt' in patch) row.ai_generated_at = patch.aiGeneratedAt;
    const { error, count } = await client.from('reports').update(row, { count: 'exact' }).eq('id', id);
    if (error) { console.error('SB.updateReport failed:', error.message); return { ok: false, reason: 'error', message: error.message }; }
    if (count === 0) { console.error('SB.updateReport matched 0 rows (RLS likely blocked it) for', id); return { ok: false, reason: 'blocked' }; }
    return { ok: true };
  }

  // Confirming someone else's report ("3 similar issues nearby, confirm
  // instead") is the one legitimate cross-owner write a citizen makes. RLS
  // restricts direct UPDATEs to a report's own owner/an authority, so this
  // goes through a SECURITY DEFINER RPC that can only ever increment
  // `confirms` on a row the caller is allowed to see.
  async function confirmReport(id) {
    if (!client) return { ok: false, reason: 'offline' };
    const session = await ensureSession();
    if (!session) return { ok: false, reason: 'signed_out' };
    const { error } = await client.rpc('confirm_report', { report_id: id });
    if (error) { console.error('SB.confirmReport failed:', error.message); return { ok: false, reason: 'error', message: error.message }; }
    return { ok: true };
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

  return { client, listReports, insertReport, updateReport, confirmReport, subscribeReports };
})();
