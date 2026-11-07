/* 241-update-notice.js — إشعار "تم تحديث التطبيق" بعد كل نسخة جديدة.
   أول ما المستخدم يفتح التطبيق بعد التحديث، بيظهر رقم النسخة الجديدة وملاحظات التحديث.
   بيتسجّل على الجهاز إن الإشعار اتشاف، ومابيتكررش. */
(function (root) {
  'use strict';
  var SEEN_PREFIX = 'pm_seen_version:';   // مفتاح لكل حساب موظف (مش لكل جهاز)
  var HISTORY_KEY = 'pm_update_history';
  var info = root.RMY_APP_INFO || {};

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch (e) { return fallback; }
  }
  function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  function appReady() {
    return document.body && !document.body.classList.contains('auth-required');
  }
  // اسم الموظف اللي داخل دلوقتي (الإشعار بيتسجل لكل حساب)
  function accountName() {
    try { return (typeof cloudActorName !== 'undefined' && cloudActorName) ? String(cloudActorName).trim() : ''; } catch (e) { return ''; }
  }

  function showCard(version, changes, updated) {
    var ov = document.createElement('div');
    ov.className = 'upn-ov';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    var items = (changes || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');
    ov.innerHTML =
      '<div class="upn-box">' +
        '<span class="upn-badge">نسخة جديدة</span>' +
        '<h3>تم تحديث التطبيق إلى ' + esc(version) + '</h3>' +
        (updated ? '<div class="upn-date">' + esc(updated) + '</div>' : '') +
        (items ? '<ul class="upn-list">' + items + '</ul>' : '<p class="upn-none">تحسينات عامة وإصلاحات.</p>') +
        '<button type="button" class="upn-close">تمام</button>' +
      '</div>';
    if (!document.getElementById('upnStyle')) {
      var st = document.createElement('style');
      st.id = 'upnStyle';
      st.textContent =
        '.upn-ov{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99991;display:flex;align-items:center;justify-content:center;padding:16px}' +
        '.upn-box{background:#fff;color:#1B1B1B;border-radius:24px;padding:20px 18px;width:min(92vw,420px);max-height:82vh;overflow:auto;text-align:right;direction:rtl;box-shadow:0 12px 40px rgba(0,0,0,.25)}' +
        '.upn-badge{display:inline-block;background:#DCEBF8;color:#0067B8;border-radius:999px;padding:5px 14px;font-weight:800;font-size:13px}' +
        '.upn-box h3{margin:10px 0 4px;font-size:20px;font-weight:900}' +
        '.upn-date{color:#666;font-size:13px;margin-bottom:8px}' +
        '.upn-list{margin:10px 0 0;padding-right:18px;line-height:1.8;font-size:15px}' +
        '.upn-list li{margin-bottom:6px}' +
        '.upn-none{font-size:15px}' +
        '.upn-close{margin-top:14px;width:100%;min-height:50px;border:0;border-radius:16px;background:#0067B8;color:#fff;font:inherit;font-size:17px;font-weight:800;cursor:pointer}';
      document.head.appendChild(st);
    }
    function close() { ov.remove(); }
    ov.querySelector('.upn-close').addEventListener('click', close);
    document.body.appendChild(ov);
    return ov;
  }

  // يسجّل النسخة في السجل (عشان نقدر نعرض التاريخ بعدين) وبيرجع true لو فيه إشعار جديد
  // بيعرض آخر تحديث مرة واحدة لكل حساب، حتى لو الحساب ده أول دخول على الجهاز
  function checkAndNotify() {
    var current = info.version;
    var who = accountName();
    if (!current || !who || !appReady()) return false;
    var key = SEEN_PREFIX + who;
    var seen = null;
    try { seen = localStorage.getItem(key); } catch (e) {}
    if (seen === current) return false;
    try { localStorage.setItem(key, current); } catch (e) {}
    showCard(current, info.changes || [], info.updatedLabel || '');
    return true;
  }

  // بنفضل نراقب طول ما التطبيق مفتوح: كل حساب بيدخل يتفحص لوحده
  function waitForApp() {
    setInterval(checkAndNotify, 2000);
  }

  root.pmUpdateNotice = { check: checkAndNotify, history: function () { return read(HISTORY_KEY, []); } };
  if (root.document && root.document.readyState !== 'loading') waitForApp();
  else if (root.document) root.document.addEventListener('DOMContentLoaded', waitForApp);


})(typeof window !== 'undefined' ? window : globalThis);
