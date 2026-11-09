// Service worker: لازم يكون فيه fetch handler عشان المتصفح يعتبر الموقع قابل للتثبيت.
// الشبكة أولًا، ولو مفيش نت يرجع النسخة المخزنة (البيانات الحية ما بتتخزنش قديمة).
const CACHE = 'rmy-shell-v239';
const SHELL = [
  './',
  './js/000-app-info.js',
  './index.html',
  './invoice.html',
  './maintenance.html',
  './manifest.webmanifest',
  './supabase-config.js',
  './ICONS/icon-192.png',
  './ICONS/apple-touch-icon.png',
  './ICONS/favicon-32.png',
  './ICONS/rmy-logo.png',
  './ICONS/rmy-logo-256.png',
  './css/app.bundle.css',
  './css/dark-mode.css',
  './js/210-ui-theme-toggle.js',
  './js/211-ui-dark-guard.js',
  './js/215-daily-closing-report.js',
  './js/216-nav-groups-collapse.js',
  './js/218-recipe-keyboard.js',
  './js/217-nav-closed-badges.js',
  './js/135-ready-delivery.js',
  './js/145-recipe-smart-entry.js',
  './js/146-payment-breakdown.js',
  './js/147-menu-admin-collapse.js',
  './js/148-cart-party-hide-pay.js',
  './js/196-party-sheet.js',
  './js/001-core-boot.js',
  './js/002-core-nav-helpers.js',
  './js/003-ui-nav-groups.js',
  './js/004-ui-command-palette.js',
  './js/005-core-role-tick.js',
  './js/calc-engine.js',
  './js/006-core-main-app.js',
  './js/006-core-main-app-2.js',
  './js/006-core-main-app-3.js',
  './js/006-core-main-app-4.js',
  './js/006-core-main-app-5.js',
  './js/006-core-main-app-6.js',
  './js/006-core-main-app-7.js',
  './js/007-ui-enhancements.js',
  './js/008-ui-smooth-nav.js',
  './js/009-cloud-live-presence.js',
  './js/010-menu-categories.js',
  './js/011-auth-login-errors.js',
  './js/012-sales-menu-cart-roles.js',
  './js/013-invoices-close-clean.js',
  './js/015-reports-excel-export.js',
  './js/016-cloud-multiuser-merge.js',
  './js/018-ui-home-layout.js',
  './js/019-ui-visibility-pause.js',
  './js/020-core-tour-cleanup.js',
  './js/022-ui-topbar.js',
  './js/023-admin-wipe-data.js',
  './js/024-ui-tap-guard.js',
  './js/025-ui-fullscreen.js',
  './js/026-inventory-links-prices.js',
  './js/027-core-ready-checks.js',
  './js/028-invoices-settings.js',
  './js/030-messages-core.js',
  './js/032-ui-app-nav-sync.js',
  './js/034-menu-v2.js',
  './js/035-ui-bottom-dock.js',
  './js/036-reports-bento-home.js',
  './js/037-ui-toast-queue.js',
  './js/039-auth-autologin-pin.js',
  './js/042-ui-bottom-sheets.js',
  './js/045-ui-hide-fab.js',
  './js/046-sales-lock.js',
  './js/047-customers-core.js',
  './js/048-reports-audit-filter.js',
  './js/049-ui-back-navigation.js',
  './js/050-sales-cart-drawer.js',
  './js/051-ui-header-scroll.js',
  './js/053-recipes-costing-auto.js',
  './js/054-parties-core.js',
  './js/055-parties-orders.js',
  './js/190-party-upcoming.js',
  './js/056-sales-invoices.js',
  './js/057-barista-drink-queue.js',
  './js/058-invoices-manual-close.js',
  './js/059-reports-analytics.js',
  './js/060-menu-qty.js',
  './js/061-ui-toast-v2.js',
  './js/062-ui-dock-v3.js',
  './js/063-barista-order-alerts.js',
  './js/064-invoices-open-badge.js',
  './js/065-cloud-save-timeout.js',
  './js/066-customers-phone-autofill.js',
  './js/068-ui-notification-sound.js',
  './js/092-brand-sounds.js',
  './js/069-ui-dock-home.js',
  './js/070-ui-nav-filter-by-role.js',
  './js/071-customers-blocked-sync.js',
  './js/072-core-pwa-register.js',
  './js/093-ui-remember-tab.js',
  './js/073-auth-view-only.js',
  './js/074-admin-maintenance.js',
  './js/075-admin-diagnostics.js',
  './js/076-reports-accountant.js',
  './js/078-admin-self-check.js',
  './js/079-ui-tools-group.js',
  './js/080-admin-only-tools.js',
  './js/081-ui-theme-label.js',
  './js/083-invoices-language.js',
  './js/085-ui-notifications-bell.js',
  './js/087-cloud-auto-restore.js',
  './js/088-invoices-settings-fold.js',
  './js/121-prep-live.js',
  './js/091-header-date-time.js',
  './js/126-responsive-tables.js',
  './js/197-party-dashboard.js',
  './js/198-auto-update.js',
  './js/199-offline-sales.js',
  './js/194-accounts-review.js',
  './js/220-pwa.js',
  './js/230-thermal-print.js',
  './js/240-order-sent-card.js',
  './js/241-update-notice.js',
  './js/242-party-balance-reminder.js',
  './ICONS/maskable-512.png',
  './ICONS/rmy-logo-256.png',
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
