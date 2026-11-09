/* 198-auto-update.js — تحديث التطبيق بدون ما المستخدم يستنى.
 * - بيفحص وجود نسخة جديدة كل دقيقتين، ولما التبويب يرجع يبقى ظاهر، ولما النت يرجع، وبعد الدخول.
 * - لما النسخة الجديدة تتنزل: لو مفيش حقل مفتوح ولا نافذة، بيحفظ التعديلات المعلّقة على السيرفر
 *   وبعدين بيحدّث لوحده. لو الحفظ فشل، ما بيحدّثش ويعيد المحاولة.
 * - زرار "حدّث الآن" في الشريط عشان المستخدم يطبّق التحديث بنفسه.
 * - حالة التحديث بتظهر في "معلومات النسخة" عشان الأدمن يعرف السبب لو اتأخر.
 * ملحوظة: كل نشر جديد لازم يتغيّر فيه sw.js (رقم CACHE). */
(function () {
  'use strict';
  if (window.__pmAutoUpdateLoaded) return;
  window.__pmAutoUpdateLoaded = true;
  if (!('serviceWorker' in navigator)) { window.pmUpdateStatus = function () { return { state: 'unsupported' }; }; return; }

  var CHECK_MS = 2 * 60 * 1000;
  var hadController = !!navigator.serviceWorker.controller;
  var pending = false;
  var reloading = false;
  var waitTimer = null;
  var bar = null;
  var status = { state: 'up-to-date', reason: '', lastCheck: 0, pendingSince: 0 };

  function setStatus(state, reason) {
    status.state = state; status.reason = reason || '';
  }
  window.pmUpdateStatus = function () {
    return { state: status.state, reason: status.reason, lastCheck: status.lastCheck, pendingSince: status.pendingSince };
  };
  window.pmUpdateStatusLabel = function () {
    var s = window.pmUpdateStatus();
    if (s.state === 'pending') return 'في تحديث جاهز — ' + (s.reason || 'مستنيين الوقت المناسب');
    if (s.state === 'applying') return 'جاري تطبيق التحديث…';
    if (s.state === 'blocked') return 'التحديث متأجل: ' + (s.reason || 'في حاجة لسه مش محفوظة');
    return 'محدّث' + (s.lastCheck ? ' · آخر فحص ' + new Date(s.lastCheck).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '');
  };

  // ممكن نطبّق التحديث دلوقتي؟ لو لا، بنرجّع السبب
  function blockReason() {
    var a = document.activeElement;
    if (a && a.matches && a.matches('input,textarea,select,[contenteditable="true"]')) return 'المستخدم بيكتب في حقل';
    if (document.querySelector('dialog[open], .pm-qp-ov')) return 'نافذة مفتوحة';
    return '';
  }
  function hasUnsaved() {
    try {
      return !!(navigator.onLine && typeof cloudReady !== 'undefined' && cloudReady &&
        typeof state !== 'undefined' && typeof cloudLastSavedHash !== 'undefined' &&
        JSON.stringify(state) !== cloudLastSavedHash);
    } catch (e) { return false; }
  }

  // بيحفظ التعديلات المعلّقة على السيرفر قبل ما يحدّث. بيرجّع true لو الحفظ تم (أو مفيش حاجة تتحفظ)
  async function flush() {
    if (!hasUnsaved()) return true;
    try {
      if (typeof persistCloudSnapshot !== 'function') return false;
      await persistCloudSnapshot(clone(state));
      return !hasUnsaved();
    } catch (e) { return false; }
  }

  function showBar(text, withButton) {
    if (!bar) {
      bar = document.createElement('div');
      bar.setAttribute('role', 'status');
      bar.style.cssText =
        'position:fixed;inset-inline:0;bottom:calc(env(safe-area-inset-bottom,0px) + 84px);' +
        'z-index:9999;margin:0 auto;width:max-content;max-width:92%;background:#293394;color:#fff;' +
        'padding:8px 14px;border-radius:12px;font-size:14px;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,.2);' +
        'display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;direction:rtl';
      document.body.appendChild(bar);
    }
    bar.innerHTML = '';
    var span = document.createElement('span'); span.textContent = text; bar.appendChild(span);
    if (withButton) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = 'حدّث الآن';
      b.style.cssText = 'min-height:36px;padding:0 12px;border-radius:10px;border:0;background:#fff;color:#293394;font:inherit;font-weight:800;cursor:pointer';
      b.addEventListener('click', function () { applyNow(true); });
      bar.appendChild(b);
    }
  }
  function hideBar() { if (bar) { bar.remove(); bar = null; } }

  function reloadNow() {
    reloading = true;
    setStatus('applying', '');
    hideBar();
    location.reload();
  }

  // الزرار: بيحفظ الأول، ولو الحفظ فشل ما بيحدّثش عشان ما نفقدش تعديلات
  async function applyNow(byUser) {
    if (reloading) return;
    var blocked = blockReason();
    if (blocked && !byUser) return showWait(blocked);
    setStatus('applying', '');
    var ok = await flush();
    if (!ok) {
      setStatus('blocked', 'مش قادرين نحفظ التعديلات دلوقتي');
      showBar('التعديلات لسه مش محفوظة على السيرفر، هنعيد المحاولة.', true);
      return;
    }
    reloadNow();
  }

  function showWait(reason) {
    setStatus('blocked', reason);
    showBar('في تحديث جديد للتطبيق، هيتطبق لوحده أول ما تخلص. (' + reason + ')', true);
    if (!waitTimer) {
      waitTimer = setInterval(function () {
        if (!pending || reloading) { clearInterval(waitTimer); waitTimer = null; return; }
        tryApply();
      }, 15000);
    }
  }

  function tryApply() {
    if (reloading || !pending) return;
    var blocked = blockReason();
    if (blocked) return showWait(blocked);
    applyNow(false);
  }

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!hadController) { hadController = true; return; } // أول تثبيت، مش محتاج تحديث
    pending = true; status.pendingSince = Date.now();
    setStatus('pending', 'مستنيين الوقت المناسب');
    tryApply();
  });

  function checkUpdate() {
    status.lastCheck = Date.now();
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) return;
      if (reg.waiting) { pending = true; status.pendingSince = status.pendingSince || Date.now(); tryApply(); }
      return reg.update();
    }).catch(function () { /* مفيش نت؛ هنجرب تاني */ });
  }

  if (document.readyState === 'complete') checkUpdate();
  else window.addEventListener('load', checkUpdate);
  setInterval(checkUpdate, CHECK_MS);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { checkUpdate(); if (pending) tryApply(); }
  });
  window.addEventListener('online', function () { setTimeout(checkUpdate, 1500); });
})();
