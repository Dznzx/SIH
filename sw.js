// CivicSetu service worker — exists for two reasons: it's what makes the
// browser consider the app installable ("Add to Home Screen" / desktop
// install prompt), and it gives the app shell real offline behavior instead
// of just the citizen-report offline *queue* that already existed.
//
// Strategy: network-first, cache as a fallback. Deliberately NOT cache-first
// — this app already got bitten once this project by a browser aggressively
// caching a stale ?v=NN asset after a fix shipped (see git history). A
// network-first service worker can't reintroduce that: it always tries the
// real network before ever touching the cache, so a fresh deploy is always
// picked up when the user is online; the cache only kicks in when there's no
// network at all.
const CACHE_NAME = 'civicsetu-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/app.css?v=15',
  '/js/data.js?v=15',
  '/js/i18n.js?v=15',
  '/js/accessibility.js?v=15',
  '/js/geo-cluster.js?v=15',
  '/js/vendor/tf.min.js?v=15',
  '/js/vendor/mobilenet.min.js?v=15',
  '/js/ml.js?v=15',
  '/js/app.js?v=15',
  '/js/citizen.js?v=15',
  '/js/authority.js?v=15',
  '/js/portfolio.js?v=15',
  '/js/teambuilder.js?v=15',
  '/js/investor.js?v=15',
  '/js/policy.js?v=15',
  '/js/badges.js?v=15',
  '/js/chatbot.js?v=15',
  '/js/supabase-client.js?v=15',
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
    fetch(event.request)
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
