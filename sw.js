/* Laticínio Serra Nova: avisos (notificações) no celular e cópia da página para abrir sem internet.
   A cópia é usada SÓ quando não há internet: com internet, a página vem sempre do site
   (versão mais nova) e a cópia é renovada. Os dados do Supabase não passam por aqui:
   quem guarda a cópia dos dados é a própria página. */
const COPIA = 'sn-pagina-v2';
// Endereços de fora do site que a página precisa para abrir (biblioteca do Supabase e fontes).
const DE_FORA = ['https://cdn.jsdelivr.net/npm/@supabase/', 'https://fonts.googleapis.com/', 'https://fonts.gstatic.com/'];

// Na instalação já guarda a página e o que ela precisa: basta abrir o sistema uma vez com internet.
const ARQUIVOS = ['./', 'manifest.webmanifest', 'icon-192.png', 'favicon.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js'];
self.addEventListener('install', (e) => e.waitUntil((async () => {
  const copia = await caches.open(COPIA);
  await Promise.all(ARQUIVOS.map((u) => copia.add(new Request(u, { mode: u.startsWith('http') ? 'cors' : 'same-origin', cache: 'reload' })).catch(() => {})));
  await self.skipWaiting();
})()));
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  const nomes = await caches.keys();
  await Promise.all(nomes.filter((n) => n.startsWith('sn-pagina-') && n !== COPIA).map((n) => caches.delete(n)));
  await self.clients.claim();
})()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const doSite = url.origin === self.location.origin;
  if (!doSite && !DE_FORA.some((p) => req.url.startsWith(p))) return;
  e.respondWith(daRedeOuCopia(req, req.mode === 'navigate'));
});

async function daRedeOuCopia(req, pagina) {
  const copia = await caches.open(COPIA);
  // A página é guardada sempre no mesmo endereço (sem #, sem ?), para abrir por qualquer link.
  const chave = pagina ? new URL('./', self.registration.scope).href : req;
  const daRede = fetch(req).then((resp) => {
    if (resp.ok || resp.type === 'opaque') copia.put(chave, resp.clone()).catch(() => {});
    return resp;
  });
  try {
    // Internet fraca (comum na fábrica): se a página demorar mais de 8 segundos, abre a cópia.
    // A busca continua e, quando chega, a cópia é renovada para a próxima vez.
    if (pagina) {
      const guardada = await copia.match(chave, { ignoreSearch: true });
      if (guardada) {
        return await Promise.race([daRede, new Promise((ok) => setTimeout(() => ok(guardada), 8000))]);
      }
    }
    return await daRede;
  } catch (err) {
    const guardada = await copia.match(chave, { ignoreSearch: pagina });
    if (guardada) return guardada;
    throw err;
  }
}

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { texto: e.data ? e.data.text() : '' }; }
  const titulo = d.titulo || 'Laticínio Serra Nova';
  e.waitUntil(self.registration.showNotification(titulo, {
    body: d.texto || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || './' }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const alvo = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abertas) {
      if (c.url.startsWith(self.registration.scope)) {
        await c.focus();
        try { await c.navigate(alvo); } catch (err) { /* algumas versões não deixam navegar */ }
        return;
      }
    }
    await self.clients.openWindow(alvo);
  })());
});
