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
        'html body nav.tabs{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;align-items:stretch}' +
        'html body nav.tabs > .nav-group{min-width:0;margin:0!important}' +
        'html body nav.tabs > .nav-group > .nav-items{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px}' +
        'html body nav.tabs > .nav-group > .nav-title{font-size:14px}' +
        'html body nav.tabs .nav-group{display:flex!important;flex-direction:column!important;height:100%}' +
        'html body nav.tabs .nav-group > .nav-items{flex:1;align-content:start}' +
        'html body nav.tabs .nav-group .nav-items .tab{min-height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:11px;line-height:1.25;padding:6px 4px;text-align:center}' +
        'html body nav.tabs .nav-group .nav-items .tab > *{max-width:100%}' +
        'html body nav.tabs .nav-sub{grid-column:1/-1!important;margin-top:4px}' +
        'html body nav.tabs .nav-sub-title{font-size:13px;font-weight:800;color:#5b6b7d;margin:6px 2px 8px;display:flex;align-items:center;gap:6px}' +
        'html body nav.tabs .nav-sub-title::before{content:"";width:3px;height:13px;border-radius:3px;background:#0067B8}' +
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

    // الشبكة بتتطبق على العنصر الأب لكل المجموعات مباشرة (inline)، فمش بتعتمد على شكل الـ HTML
    function layoutGrid(){
      var n = nav(); if (!n) return;
      var parents = [];
      n.querySelectorAll('.nav-group').forEach(function(g){
        var p = g.parentElement;
        if (p && parents.indexOf(p) < 0) parents.push(p);
        g.style.setProperty('min-width', '0', 'important');
        g.style.setProperty('margin', '0', 'important');
        var items = g.querySelector(':scope > .nav-items');
        if (items) {
          items.style.setProperty('display', 'grid', 'important');
          items.style.setProperty('grid-template-columns', 'repeat(2,minmax(0,1fr))', 'important');
          items.style.setProperty('gap', '10px', 'important');
        }
      });
      parents.forEach(function(p){
        p.style.setProperty('display', 'grid', 'important');
        p.style.setProperty('grid-template-columns', 'repeat(2,minmax(0,1fr))', 'important');
        p.style.setProperty('gap', '10px', 'important');
        p.style.setProperty('align-items', 'stretch', 'important');
      });
    }

    function run(){
      var n = nav(); if (!n) return false;
      injectCss();
      n.querySelectorAll('.nav-group').forEach(wire);
      refreshCounts();
      layoutGrid();
      return true;
    }

    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      if (run() && tries > 3) { clearInterval(timer); }
      if (tries > 80) clearInterval(timer);
    }, 500);
    // العدد بيتحدّث لو الصلاحية أو الأزرار اتغيروا
    setInterval(function(){ try { refreshCounts(); layoutGrid(); } catch (e) {} }, 900);

    window.pmNavGroups = { refresh: refreshCounts, state: function(){ return load(); } };
  } catch (e) {
    console.error('[PastryMY] 216-nav-groups-collapse.js failed', e);
  }
})();
