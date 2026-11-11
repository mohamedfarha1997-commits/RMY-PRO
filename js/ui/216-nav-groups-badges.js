/* 216-nav-groups-badges.js — اتدمجت من: 216-nav-groups-collapse.js، 217-nav-closed-badges.js */
/* ---- 216-nav-groups-collapse.js ---- */
try{
/* ---- 216-nav-groups-collapse.js ----
   كل مجموعة في القايمة (التشغيل، المبيعات، المطبخ...) بقت ورقة بتتفتح وتتقفل بالضغط على عنوانها.
   - العدد اللي جنب العنوان = عدد الأزرار الظاهرة للمستخدم في المجموعة (بيتحسب حسب الصلاحية).
   - حالة كل مجموعة (مفتوحة/مقفولة) بتتحفظ على الجهاز بعنوان المجموعة، فمتتغيرش لما تفتح التطبيق تاني.
   - مش بيغيّر أي زرار أو تبويب: بس بيخبي قايمة الأزرار جوه المجموعة.
   - الحالة الافتراضية: كل المجموعات مفتوحة زي ما كانت. */
(function(){
  'use strict';
  try {
    var KEY = 'pm_nav_groups_closed';
    var closed = null;

    function load(){
      if (closed) return closed;
      try { closed = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { closed = {}; }
      if (!closed || typeof closed !== 'object') closed = {};
      return closed;
    }
    function save(){
      try { localStorage.setItem(KEY, JSON.stringify(closed || {})); } catch (e) {}
    }
    function titleOf(group){
      var t = group.querySelector(':scope > .nav-title');
      return t ? (t.textContent || '').replace(/\s+/g, ' ').trim() : '';
    }
    function nav(){ return document.getElementById('appNav') || document.querySelector('nav.tabs'); }

    function injectCss(){
      if (document.getElementById('pmNavGroupsCss')) return;
      var st = document.createElement('style');
      st.id = 'pmNavGroupsCss';
      st.textContent =
        'html body nav.tabs .nav-group > .nav-title[data-pm-collapsible]{cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}' +
        'html body nav.tabs .nav-group > .nav-title[data-pm-collapsible]::after{content:attr(data-count) " \\25BE";margin-inline-start:auto;font-size:12px;font-weight:700;color:#5b6b7d;white-space:nowrap}' +
        'html body nav.tabs .nav-group.pm-grp-closed > .nav-title[data-pm-collapsible]::after{content:attr(data-count) " \\25B8"}' +
        'html body nav.tabs .nav-group.pm-grp-closed > .nav-items{display:none!important}' +
        'html body nav.tabs .nav-sub{grid-column:1/-1!important;margin-top:4px}' +
        'html body nav.tabs .nav-sub-title{font-size:13px;font-weight:800;color:#5b6b7d;margin:6px 2px 8px;display:flex;align-items:center;gap:6px}' +
        'html body nav.tabs .nav-sub-title::before{content:"";width:3px;height:13px;border-radius:3px;background:#293394}' +
        'html body nav.tabs .nav-sub-items{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}' +
        'html[data-theme="dark"] body nav.tabs .nav-sub-title{color:#D6D6D6}';
      document.head.appendChild(st);
    }

    function visibleCount(group){
      var n = 0;
      group.querySelectorAll(':scope > .nav-items .tab').forEach(function(b){
        if (!b.classList.contains('pm-tab-off') && getComputedStyle(b).display !== 'none') n++;
      });
      return n;
    }

    function setClosed(group, isClosed){
      group.classList.toggle('pm-grp-closed', !!isClosed);
      var t = titleOf(group);
      var s = load();
      if (isClosed) s[t] = true; else delete s[t];
      save();
      var title = group.querySelector(':scope > .nav-title');
      if (title) title.setAttribute('aria-expanded', isClosed ? 'false' : 'true');
    }

    function wire(group){
      var title = group.querySelector(':scope > .nav-title');
      if (!title || title.getAttribute('data-pm-collapsible')) return;
      title.setAttribute('data-pm-collapsible', '1');
      title.setAttribute('role', 'button');
      title.setAttribute('tabindex', '0');
      title.addEventListener('click', function(){
        setClosed(group, !group.classList.contains('pm-grp-closed'));
        refreshCounts();
      });
      title.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); title.click(); }
      });
      var s = load();
      setClosed(group, !!s[titleOf(group)]);
    }

    function refreshCounts(){
      var n = nav(); if (!n) return;
      n.querySelectorAll(':scope .nav-group, .nav-group').forEach(function(g){
        if (g.style.display === 'none') return;
        var t = g.querySelector(':scope > .nav-title');
        if (!t) return;
        var c = visibleCount(g);
        t.setAttribute('data-count', c + (c === 1 ? ' زرار' : ' أزرار'));
      });
    }

    function run(){
      var n = nav(); if (!n) return false;
      injectCss();
      n.querySelectorAll('.nav-group').forEach(wire);
      refreshCounts();
      return true;
    }

    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      if (run() && tries > 3) { clearInterval(timer); }
      if (tries > 80) clearInterval(timer);
    }, 500);
    // العدد بيتحدّث لو الصلاحية أو الأزرار اتغيروا
    setInterval(function(){ try { refreshCounts(); } catch (e) {} }, 900);

    window.pmNavGroups = { refresh: refreshCounts, state: function(){ return load(); } };
  } catch (e) {
    console.error('[PastryMY] 216-nav-groups-collapse.js failed', e);
  }
})();
}catch(e){console.error('[PastryMY] 216-nav-groups-collapse.js failed',e)}
/* ---- 217-nav-closed-badges.js ---- */
try{
/* ---- 217-nav-closed-badges.js ----
   لما مجموعة في القايمة تكون مقفولة، عدد الطلبات اللي جواها بيظهر كعلامة حمرا على عنوان المجموعة.
   - تبويب أوردرات الحفلات: عدد الأوردرات "بانتظار التجهيز".
   - تبويب جاهز للتسليم: عدد الأوردرات "جاهزة" ولسه متسلمتش.
   - تبويب حسب الطلب (باريستا) وتبويب الفواتير المفتوحة: عدادهم الموجود بيتجمع كمان.
   العداد على التبويب نفسه بيظهر لما المجموعة تكون مفتوحة. */
(function(){
  'use strict';
  if (window.__pmNavClosedBadges) return; window.__pmNavClosedBadges = true;

  var BADGE_CSS = 'display:none;align-items:center;justify-content:center;margin-inline-start:6px;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:#D92D20;color:#FFFFFF;font-size:11px;font-weight:700;box-sizing:border-box';

  function injectCss(){
    if (document.getElementById('pmNavClosedBadgesCss')) return;
    var st = document.createElement('style');
    st.id = 'pmNavClosedBadgesCss';
    st.textContent =
      'html body nav.tabs .nav-group .pm-grp-badge{display:none;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 7px;border-radius:11px;background:#D92D20;color:#FFFFFF;font-size:12px;font-weight:800;box-sizing:border-box;margin-inline-start:6px}' +
      'html body nav.tabs .nav-group.pm-grp-closed .pm-grp-badge.on{display:inline-flex}';
    document.head.appendChild(st);
  }

  function arr(x){ return Array.isArray(x) ? x : []; }
  function liveParty(o){
    if (!o || o.status === 'cancelled') return false;
    try { if (window.pmIsPartyOrderClosed && window.pmIsPartyOrderClosed(o)) return false; } catch (e) {}
    return true;
  }

  /* عدد كل تبويب: يرجّع null لو التبويب ده مش بيتعد */
  function countFor(tab){
    var key = tab.getAttribute('data-tab') || '';
    var st = (typeof state !== 'undefined' && state) ? state : {};
    if (key === 'parties')       return arr(st.partyOrders).filter(function(o){ return liveParty(o) && o.status === 'pending'; }).length;
    if (key === 'readyDelivery') return arr(st.partyOrders).filter(function(o){ return liveParty(o) && o.status === 'ready'; }).length;
    if (key === 'drinkQueue')    return arr(st.drinkOrders).filter(function(o){ return o && String(o.status || 'pending') === 'pending'; }).length;
    if (key === 'openInvoices')  return Number(window.pmOpenCount || 0);
    return null;
  }

  function ensureTabBadge(tab){
    var b = tab.querySelector('.pm-nc-badge');
    if (!b) {
      b = document.createElement('span');
      b.className = 'pm-nc-badge';
      b.style.cssText = BADGE_CSS;
      tab.appendChild(b);
    }
    return b;
  }

  function roleVisible(tab){
    return !tab.classList.contains('pm-tab-off') && tab.style.display !== 'none';
  }

  function paint(){
    var nav = document.getElementById('appNav') || document.querySelector('nav.tabs');
    if (!nav) return;
    injectCss();
    var ready = (typeof cloudReady !== 'undefined') && !!cloudReady;

    nav.querySelectorAll('.nav-group').forEach(function(group){
      var total = 0;
      group.querySelectorAll(':scope > .nav-items .tab').forEach(function(tab){
        var n = 0;
        var c = (ready && roleVisible(tab)) ? countFor(tab) : 0;
        if (c != null) {
          // تبويبات "حسب الطلب" و"الفواتير المفتوحة" ليها بادج خاص بيها (063/064) بيظهر لدور معين؛ لو مش ظاهر نعرض بتاعنا
          var own = tab.querySelector('.pm-dq-badge,.pm-open-badge');
          if (own && own.style.display !== 'none') {
            n = parseInt(own.textContent, 10) || c;
          } else {
            n = c || 0;
            var b = ensureTabBadge(tab);
            b.textContent = n > 99 ? '99+' : String(n);
            b.style.display = n ? 'inline-flex' : 'none';
          }
        }
        total += n;
      });

      var title = group.querySelector(':scope > .nav-title');
      if (!title) return;
      var gb = title.querySelector('.pm-grp-badge');
      if (!gb) {
        gb = document.createElement('span');
        gb.className = 'pm-grp-badge';
        title.appendChild(gb);
      }
      gb.textContent = total > 99 ? '99+' : String(total);
      gb.classList.toggle('on', total > 0);
    });
  }

  setInterval(function(){ try { paint(); } catch (e) {} }, 1000);
  setTimeout(function(){ try { paint(); } catch (e) {} }, 1500);
})();
}catch(e){console.error('[PastryMY] 217-nav-closed-badges.js failed',e)}
