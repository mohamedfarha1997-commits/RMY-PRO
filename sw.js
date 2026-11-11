// Service worker: لازم يكون فيه fetch handler عشان المتصفح يعتبر الموقع قابل للتثبيت.
// الشبكة أولًا، ولو مفيش نت يرجع النسخة المخزنة (البيانات الحية ما بتتخزنش قديمة).
const CACHE = 'rmy-shell-v279';
const SHELL = [
  './',
  './index.html',
  './invoice.html',
  './maintenance.html',
  './manifest.webmanifest',
  './config/supabase-config.js',
  './icons/apple-touch-icon.png',
  './icons/badge-96.png',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/maskable-512.png',
  './icons/rmy-logo-256.png',
  './icons/rmy-logo.png',
  './icons/rmy-wordmark.png',
  './css/app.css',
  './css/dark-mode.css',
  './css/overrides.css',
  './css/maintenance.css',
  './js/core/000-app-info.js',
  './js/core/001-boot.js',
  './js/ui/003-nav-groups-palette.js',
  './js/core/005-core-role-tick.js',
  './js/core/calc-engine.js',
  './js/core/006-main-app.js',
  './js/ui/093-ui-remember-tab.js',
  './js/ui/007-ui-enhancements.js',
  './js/ui/008-ui-smooth-nav.js',
  './js/cloud/009-cloud-live-presence.js',
  './js/menu/010-menu-categories.js',
  './js/auth/011-auth-login-errors.js',
  './js/sales/012-sales-menu-cart-roles.js',
  './js/invoices/013-invoices-close-clean.js',
  './js/reports/015-reports-excel-export.js',
  './js/cloud/016-multiuser-realtime.js',
  './js/ui/018-home-layout-visibility.js',
  './js/core/020-core-tour-cleanup.js',
  './js/ui/022-ui-topbar.js',
  './js/admin/023-admin-wipe-data.js',
  './js/ui/024-tap-guard-fullscreen.js',
  './js/inventory/026-inventory-links-prices.js',
  './js/core/027-core-ready-checks.js',
  './js/invoices/028-invoices-settings.js',
  './js/messages/030-messages-core.js',
  './js/ui/032-ui-app-nav-sync.js',
  './js/menu/034-menu-v2.js',
  './js/ui/035-ui-bottom-dock.js',
  './js/reports/036-reports-bento-home.js',
  './js/ui/037-ui-toast-queue.js',
  './js/auth/039-auth-autologin-pin.js',
  './js/ui/042-sheets-fab.js',
  './js/sales/046-sales-lock.js',
  './js/customers/047-customers-core.js',
  './js/reports/048-reports-audit-filter.js',
  './js/ui/049-ui-back-navigation.js',
  './js/sales/050-sales-cart-drawer.js',
  './js/ui/051-ui-header-scroll.js',
  './js/recipes/053-recipes-costing-auto.js',
  './js/parties/054-parties-core.js',
  './js/parties/055-parties-orders.js',
  './js/parties/190-party-upcoming.js',
  './js/sales/056-sales-invoices.js',
  './js/barista/057-barista-drink-queue.js',
  './js/invoices/058-invoices-manual-close.js',
  './js/reports/059-reports-analytics.js',
  './js/menu/060-menu-qty.js',
  './js/ui/061-toast-dock.js',
  './js/barista/063-barista-order-alerts.js',
  './js/invoices/064-invoices-open-badge.js',
  './js/cloud/065-cloud-save-timeout.js',
  './js/customers/066-customers-phone-autofill.js',
  './js/ui/068-notifications-dock-nav.js',
  './js/customers/071-customers-blocked-sync.js',
  './js/pwa/072-register-install.js',
  './js/invoices/230-thermal-print.js',
  './js/sales/240-order-sent-card.js',
  './js/pwa/241-update-notice.js',
  './js/parties/242-party-balance-reminder.js',
  './js/auth/073-auth-view-only.js',
  './js/admin/074-maintenance-diagnostics.js',
  './js/reports/076-reports-accountant.js',
  './js/admin/078-admin-self-check.js',
  './js/ui/079-ui-tools-group.js',
  './js/admin/080-admin-only-tools.js',
  './js/ui/081-ui-theme-label.js',
  './js/invoices/083-invoices-language.js',
  './js/ui/085-ui-notifications-bell.js',
  './js/cloud/087-cloud-auto-restore.js',
  './js/invoices/088-invoices-settings-fold.js',
  './js/ui/091-header-sounds-tables.js',
  './js/sales/135-ready-delivery.js',
  './js/recipes/145-recipe-smart-entry.js',
  './js/sales/146-payment-breakdown.js',
  './js/menu/147-menu-admin-collapse.js',
  './js/parties/148-cart-party-hide-pay.js',
  './js/reports/194-accounts-review.js',
  './js/parties/196-sheet-dashboard.js',
  './js/pwa/198-auto-update.js',
  './js/sales/199-offline-sales.js',
  './js/ui/211-ui-dark-guard.js',
  './js/reports/215-daily-closing-report.js',
  './js/ui/216-nav-groups-badges.js',
  './js/recipes/218-recipe-keyboard.js',
  './js/ui/210-ui-theme-toggle.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch((err) => { console.warn('[sw] precache failed:', u, err); return null; }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const NAV_TIMEOUT_MS = 4000;
function withTimeout(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}
function putCopy(req, res) {
  if (res && res.status === 200) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API / CDN: للشبكة مباشرة

  // 1) الصفحة الرئيسية: الشبكة بمهلة قصيرة، وبعدين النسخة المخزّنة.
  //    شبكة المحل الضعيفة ما تأخرش فتح التطبيق.
  if (req.mode === 'navigate') {
    e.respondWith(
      withTimeout(fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
        }
        return res;
      }), NAV_TIMEOUT_MS).catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // 2) الصور والأيقونات: من الكاش فورًا، وتتحدّث في الخلفية
  if (/\.(png|jpe?g|webp|svg|ico)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req, { ignoreSearch: true }).then((cached) => {
          const network = fetch(req).then((res) => {
            if (res && res.status === 200) c.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // 3) الكود والستايل والمانيفست: من الكاش فورًا (التطبيق بيفتح بسرعة وأوفلاين)، وتحديث في الخلفية
  if (/\.(js|css|webmanifest)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req, { ignoreSearch: true }).then((cached) => {
          const network = fetch(req).then((res) => {
            if (res && res.status === 200) c.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // 4) أي حاجة تانية: الشبكة، وفي الفشل الكاش
  e.respondWith(
    fetch(req).then((res) => putCopy(req, res))
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});

/* الضغط على إشعار النظام يفتح التطبيق، أو يرجّع التبويب اللي فيه التطبيق لو مفتوح */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
