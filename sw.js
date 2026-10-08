/* Laticínio Serra Nova: recebe os avisos (notificações) no celular.
   De propósito, este arquivo NÃO guarda cópia da página (não há "fetch" aqui):
   o sistema continua sempre abrindo a versão mais nova. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

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
