/* 242-party-balance-reminder.js — تذكير الباقي على الحفلات قبل التسليم.
   بيجمع أوردرات كل حفلة (نفس طريقة تجميع السيرفر)، ولو فيه باقي لحفلة ميعادها النهارده أو بكرة،
   بيظهر كارت للكاشير أول ما يفتح التطبيق. مرة واحدة في اليوم لكل حفلة. */
(function (root) {
  'use strict';
  var KEY = 'pm_party_reminded';

  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function localDay(d) {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  // بيقبل YYYY-MM-DD (اللي بيجي من حقل التاريخ) أو DD-MM-YYYY
  function normDay(v) {
    var s = String(v || '').trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = s.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (m) return m[3] + '-' + m[2] + '-' + m[1];
    return '';
  }
  function dayDiff(a, b) {
    var da = new Date(a + 'T00:00:00'), db = new Date(b + 'T00:00:00');
    return Math.round((da - db) / 86400000);
  }

  // تجميع الأوردرات لحفلات: groupId لو موجود، وإلا العميل+التاريخ+الوقت+التليفون
  function groupsOf(orders) {
    var map = {};
    (Array.isArray(orders) ? orders : []).forEach(function (o) {
      if (!o || o.status === 'cancelled' || o.closedArchiveId) return;
      var gid = String(o.groupId || '');
      var key = gid ? 'g:' + gid
        : 'b:' + [o.customer || '', o.date || '', o.time || '', o.customerPhone || ''].join('|');
      var g = map[key] || (map[key] = { key: key, customer: '', phone: '', date: '', time: '', total: 0, paid: 0 });
      if (!g.customer && o.customer) g.customer = o.customer;
      if (!g.phone && o.customerPhone) g.phone = o.customerPhone;
      if (!g.date && o.date) g.date = normDay(o.date);
      if (!g.time && o.time) g.time = o.time;
      g.total += num(o.price) * num(o.qty);
      g.paid += num(o.paid);
    });
    return Object.keys(map).map(function (k) {
      var g = map[k];
      g.remaining = Math.round((g.total - g.paid) * 100) / 100;
      return g;
    });
  }

  // الحفلات اللي باقيها > 0 وميعادها النهارده أو بكرة
  function dueSoon(groups, today) {
    return groups.filter(function (g) {
      if (!(g.remaining > 0.005) || !g.date) return false;
      var d = dayDiff(g.date, today);
      return d === 0 || d === 1;
    }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
  }

  function alreadyToday(key, today, seen) { return seen[key] === today; }

  function card(items) {
    var ov = document.createElement('div');
    ov.className = 'pbr-ov';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    var rows = items.map(function (g) {
      return '<div class="pbr-row"><div class="pbr-name">' + esc(g.customer || 'عميل') +
        (g.phone ? ' · <span>' + esc(g.phone) + '</span>' : '') + '</div>' +
        '<div class="pbr-meta">التسليم: ' + esc(g.date) + (g.time ? ' ' + esc(g.time) : '') + '</div>' +
        '<div class="pbr-rem">الباقي: <b>' + esc(root.moneyFmt ? root.moneyFmt(g.remaining) : g.remaining) + ' ج.م</b></div></div>';
    }).join('');
    ov.innerHTML =
      '<div class="pbr-box"><span class="pbr-badge">تذكير حفلات</span>' +
      '<h3>فيه باقي لحفلات قريبة</h3>' + rows +
      '<div class="pbr-acts"><button type="button" class="pbr-go">فتح الحفلات</button>' +
      '<button type="button" class="pbr-ok">تمام</button></div></div>';
    if (!document.getElementById('pbrStyle')) {
      var st = document.createElement('style');
      st.id = 'pbrStyle';
      st.textContent =
        '.pbr-ov{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99992;display:flex;align-items:center;justify-content:center;padding:16px}' +
        '.pbr-box{background:#fff;color:#1B1B1B;border-radius:24px;padding:20px 18px;width:min(92vw,420px);max-height:82vh;overflow:auto;text-align:right;direction:rtl;box-shadow:0 12px 40px rgba(0,0,0,.25)}' +
        '.pbr-badge{display:inline-block;background:#FFF1D6;color:#8A5A00;border-radius:999px;padding:5px 14px;font-weight:800;font-size:13px}' +
        '.pbr-box h3{margin:10px 0 8px;font-size:19px;font-weight:900}' +
        '.pbr-row{border:1px solid rgba(0,0,0,.1);border-radius:14px;padding:10px 12px;margin-bottom:8px}' +
        '.pbr-name{font-weight:800;font-size:16px}.pbr-name span{font-weight:600;color:#555;font-size:14px}' +
        '.pbr-meta{color:#555;font-size:14px;margin-top:2px}.pbr-rem{font-size:16px;margin-top:4px;color:#B3261E}' +
        '.pbr-acts{display:flex;gap:8px;margin-top:12px}' +
        '.pbr-acts button{flex:1;min-height:48px;border-radius:14px;font:inherit;font-weight:800;font-size:16px;cursor:pointer;border:1px solid rgba(0,0,0,.15)}' +
        '.pbr-go{background:#0067B8;color:#fff;border-color:#0067B8!important}.pbr-ok{background:#fff;color:#1B1B1B}';
      document.head.appendChild(st);
    }
    function close() { ov.remove(); }
    ov.querySelector('.pbr-ok').addEventListener('click', close);
    ov.querySelector('.pbr-go').addEventListener('click', function () {
      close();
      if (typeof root.go === 'function') root.go('parties');
    });
    document.body.appendChild(ov);
    return ov;
  }

  function seenMap() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveSeen(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} }

  // بيعرض التذكير لو فيه حاجة مستحقة، ومش اتعرضت النهارده
  function checkAndShow(now) {
    var role = (typeof cloudActorRole !== 'undefined') ? cloudActorRole : undefined;
    if (role && role !== 'admin' && role !== 'sales') return 0;
    var today = localDay(now || new Date());
    var seen = seenMap();
    var st = (typeof state !== 'undefined') ? state : null;
    var due = dueSoon(groupsOf(st && st.partyOrders), today)
      .filter(function (g) { return !alreadyToday(g.key + '|' + g.date, today, seen); });
    if (!due.length) return 0;
    due.forEach(function (g) { seen[g.key + '|' + g.date] = today; });
    saveSeen(seen);
    card(due);
    return due.length;
  }

  root.pmPartyReminder = { groupsOf: groupsOf, dueSoon: dueSoon, check: checkAndShow, normDay: normDay };

  function appReady() { return root.document && root.document.body && !root.document.body.classList.contains('auth-required'); }
  function waitForApp() {
    var started = Date.now();
    var t = setInterval(function () {
      if (appReady()) { clearInterval(t); setTimeout(function () { checkAndShow(); }, 1200); }
      else if (Date.now() - started > 180000) clearInterval(t);
    }, 700);
  }
  if (root.document) {
    if (root.document.readyState !== 'loading') waitForApp();
    else root.document.addEventListener('DOMContentLoaded', waitForApp);
  }
})(typeof window !== 'undefined' ? window : globalThis);
