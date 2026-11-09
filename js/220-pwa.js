/* 220-pwa.js — تجربة التطبيق المثبّت (PWA):
   - زرار "تثبيت التطبيق" على أندرويد (beforeinstallprompt)، وتعليمات للآيفون (مشاركة ← إضافة للشاشة الرئيسية).
   - طلب تخزين دائم: المتصفح ما يمسحش البيانات المحلية (أوفلاين) لما المساحة تقل.
   - اختصارات الشاشة الرئيسية: ?open=sales يفتح تبويب معيّن بعد الدخول.
   الزرار بيتقفل 14 يوم لو المستخدم قال "لاحقًا". */
(function () {
  'use strict';
  if (window.__pmPwa) return;
  window.__pmPwa = true;

  var DISMISS_KEY = 'pm_install_dismissed_at';
  var DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
  var deferred = null;
  var bar = null;

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }
  function dismissedRecently() {
    try {
      var t = Number(localStorage.getItem(DISMISS_KEY) || 0);
      return !!t && (Date.now() - t) < DISMISS_MS;
    } catch (e) { return false; }
  }
  function remember() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
  }
  function hide() {
    if (bar) { bar.remove(); bar = null; }
  }
  function show(text, buttons) {
    hide();
    bar = document.createElement('div');
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'تثبيت التطبيق');
    bar.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);left:10px;right:10px;z-index:99998;' +
      'background:#fff;color:#1B1B1B;border:1px solid rgba(0,0,0,.12);border-radius:16px;padding:12px 14px;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.18);font:600 14px/1.5 system-ui,Tahoma,sans-serif;direction:rtl;display:flex;gap:10px;align-items:center;flex-wrap:wrap';
    var msg = document.createElement('div');
    msg.style.cssText = 'flex:1 1 200px;min-width:0';
    msg.textContent = text;
    bar.appendChild(msg);
    buttons.forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = b.label;
      btn.style.cssText = 'min-height:40px;padding:0 14px;border-radius:12px;font:inherit;font-weight:800;cursor:pointer;border:1px solid ' +
        (b.primary ? '#293394' : 'rgba(0,0,0,.2)') + ';background:' + (b.primary ? '#293394' : '#fff') + ';color:' + (b.primary ? '#fff' : '#1B1B1B');
      btn.addEventListener('click', b.onClick);
      bar.appendChild(btn);
    });
    document.body.appendChild(bar);
  }

  function offerAndroid() {
    show('ثبّت RMY PRO على شاشة الموبايل عشان تفتحه زي أي تطبيق، حتى من غير نت.', [
      { label: 'تثبيت', primary: true, onClick: function () {
          var p = deferred; deferred = null; hide();
          if (!p) return;
          p.prompt();
          p.userChoice.then(function (c) { if (c && c.outcome !== 'accepted') remember(); }).catch(function () {});
        } },
      { label: 'لاحقًا', onClick: function () { remember(); hide(); } }
    ]);
  }

  function offerIOS() {
    show('على الآيفون: اضغط زر المشاركة ⬆︎ ثم اختار «إضافة إلى الشاشة الرئيسية».', [
      { label: 'تمام', primary: true, onClick: function () { remember(); hide(); } }
    ]);
  }

  function maybeOffer() {
    if (isStandalone() || dismissedRecently()) return;
    if (deferred) offerAndroid();
    else if (isIOS()) offerIOS();
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    // نستنى لحد ما الدخول يخلص عشان الزرار ما يغطيش شاشة الدخول
    waitForApp(maybeOffer);
  });
  window.addEventListener('appinstalled', function () { deferred = null; remember(); hide(); });

  // بعد ما التطبيق يفتح (مش على شاشة الدخول)
  function appReady() {
    return document.body && !document.body.classList.contains('auth-required');
  }
  function waitForApp(cb, timeoutMs) {
    var started = Date.now();
    var t = setInterval(function () {
      if (appReady()) { clearInterval(t); cb(); }
      else if (Date.now() - started > (timeoutMs || 120000)) clearInterval(t);
    }, 700);
  }

  window.addEventListener('load', function () {
    if (isIOS() && !isStandalone()) waitForApp(maybeOffer);
  });

  // طلب تخزين دائم
  try {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(function () {});
    }
  } catch (e) {}

  // اختصارات الشاشة الرئيسية: index.html?open=sales
  (function openFromShortcut() {
    var p = new URLSearchParams(location.search).get('open');
    if (!p || !/^[A-Za-z]+$/.test(p)) return;
    waitForApp(function () {
      try { if (typeof window.go === 'function') window.go(p); } catch (e) {}
    }, 180000);
  })();
})();
