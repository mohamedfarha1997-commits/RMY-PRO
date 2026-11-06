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
      group.querySelectorAll(':scope > .nav-items > .tab').forEach(function(tab){
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
