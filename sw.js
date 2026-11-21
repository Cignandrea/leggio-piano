// Service worker del Leggio: cache versionata per l'uso offline.
// Rete prima per le pagine e i dati (piano, esercizi, quaderno cifrato), così le novità arrivano alla riapertura;
// cache prima per icone, librerie e manifest.
// L'origine cignandrea.github.io è condivisa con le altre app dell'account: si toccano solo le cache «leggio-».
const VERSION = '2.1.0';
const CACHE = `leggio-${VERSION}`;
const ASSETS = ['./', './index.html', './quaderno.html', './piano.json', './esercizi.json', './quaderno.cifrato.json', './manifest.webmanifest',
  './vendor/marked.min.js', './vendor/purify.min.js', './vendor/abcjs-basic-min.js',
  './icons/favicon-64.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];
const nuovo = (u) => new Request(u, { cache: 'reload' });   // salta la cache HTTP del browser

// Se un'altra app dello stesso sito ha svuotato la nostra cache, la si riempie di nuovo alla prima apertura in rete.
async function curaCache() {
  const c = await caches.open(CACHE);
  const ci = new Set((await c.keys()).map((r) => r.url));
  const manca = ASSETS.map((u) => new URL(u, self.registration.scope).href).filter((u) => !ci.has(u));
  await Promise.all(manca.map((u) => c.add(nuovo(u)).catch(() => {})));
}

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map(nuovo))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('leggio-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const p = url.pathname;
  const pagina = req.mode === 'navigate';
  const fresh = pagina || p.endsWith('/') || p.endsWith('.html') || p.endsWith('.json');
  if (fresh) {
    // la chiave di cache ignora #… e ?…; per le pagine usa il percorso, così index e quaderno restano distinti
    const key = url.origin + (p.endsWith('/') ? p + 'index.html' : p);
    const rete = pagina ? fetch(key, { cache: 'no-cache' }) : fetch(req);
    e.respondWith(rete.then((res) => {
      if (res.ok) { const copy = res.clone(); e.waitUntil(caches.open(CACHE).then((c) => c.put(key, copy))); }
      return res;
    }).catch(() => caches.open(CACHE).then((c) => c.match(key).then((r) => r || (pagina ? c.match(new URL('./index.html', self.registration.scope).href) : null)))
      .then((r) => r || Response.error())));
    if (pagina) e.waitUntil(rete.then(curaCache, () => {}));
    return;
  }
  e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((r) => r || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); e.waitUntil(c.put(req, copy)); }
    return res;
  }))));
});
