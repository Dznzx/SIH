// CivicSetu service worker — exists for two reasons: it's what makes the
// browser consider the app installable ("Add to Home Screen" / desktop
// install prompt), and it gives the app shell real offline behavior instead
// of just the citizen-report offline *queue* that already existed.
//
// Strategy: network-first, cache as a fallback. Deliberately NOT cache-first
// — this app already got bitten once by a browser aggressively caching a
// stale ?v=NN asset after a fix shipped. A network-first service worker
// can't reintroduce that on its own... but it CAN if this file itself never
// changes: a browser only checks sw.js for updates on navigation, and only
// installs a new worker if the *bytes of this file* differ. Editing
// app.js/etc without also touching this file (or its PRECACHE_URLS/
// CACHE_NAME) leaves an already-installed worker running forever, still
// serving whatever it precached at its original install — exactly what
// happened here. CACHE_NAME below must be bumped on every deploy that
// changes any precached file, not just when this file's own logic changes.
const CACHE_NAME = 'civicsetu-v4';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/app.css?v=18',
  '/js/data.js?v=18',
  '/js/i18n.js?v=18',
  '/js/accessibility.js?v=18',
  '/js/geo-cluster.js?v=18',
  '/js/vendor/tf.min.js?v=18',
  '/js/vendor/mobilenet.min.js?v=18',
  '/js/ml.js?v=18',
  '/js/app.js?v=18',
  '/js/citizen.js?v=18',
  '/js/authority.js?v=18',
  '/js/portfolio.js?v=18',
  '/js/teambuilder.js?v=18',
  '/js/investor.js?v=18',
  '/js/policy.js?v=18',
  '/js/badges.js?v=18',
  '/js/chatbot.js?v=18',
  '/js/supabase-client.js?v=18',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests for the static app shell. Supabase
  // (data/auth/realtime), Groq-backed /api/chat, and cross-origin CDN
  // scripts must always hit the network directly — caching those would
  // mean stale reports, a broken auth flow, or a chatbot answering from a
  // frozen knowledge base.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    // `cache: 'reload'` forces this past the browser's own HTTP cache layer
    // (separate from the Cache API below) — network-first should mean
    // actually asking the network, not a same-tab HTTP cache hit standing
    // in for it.
    fetch(event.request, { cache: 'reload' })
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('/index.html'))
      )
  );
});
