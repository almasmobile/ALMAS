const CACHE_NAME = 'almas-v14';

const ASSETS = [
  './', './index.html', './apple.html', './transfer.html',
  './subscription.html', './gallery-dump.html', './gift.html', './laptop.html', './repair.html',
  './update.html', './backup-restore.html', './forgot-password.html',
  './new-order.html', './404.html', './assets/style.css', './assets/app.js',
  './assets/logo-black.png', './assets/icon-192.png', './assets/icon-512.png', './assets/apple-touch-icon.png', './assets/favicon-32.png', './assets/fonts/Koodak.woff2.ttf', './manifest.json'
];

// دریافت فایل‌های نسخه جدید؛ نسخه جدید تا زمان درخواست کاربر در انتظار می‌ماند.
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(ASSETS.map((asset) => cache.add(asset)));
  })());
});

// فعال‌سازی نسخه جدید فقط با کلیک روی دکمه بروزرسانی
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('almas-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

// شبکه در اولویت است؛ در صورت قطع اینترنت از نسخه ذخیره‌شده استفاده می‌شود.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request, { cache: 'no-cache' });
      if (response && response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;

      if (request.mode === 'navigate') {
        const fallback = await cache.match('./404.html');
        if (fallback) return fallback;
      }

      return new Response('Offline', {
        status: 503,
        statusText: 'Offline'
      });
    }
  })());
});
