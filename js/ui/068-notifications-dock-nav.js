/* 068-notifications-dock-nav.js — اتدمجت من: 068-ui-notification-sound.js، 219-notif-permission-banner.js، 069-ui-dock-home.js، 070-ui-nav-filter-by-role.js */
/* ---- 068-ui-notification-sound.js ---- */
try{
/* صوت إشعار عالي + اهتزاز قوي. الصوت بيتفعّل أول ما تلمس الشاشة مرة (المتصفح بيمنع الصوت قبل كده) */
(function(){
  if(window.__pmChime) return; window.__pmChime=true;
  var ctx=null, comp=null;
  function getCtx(){
    try{
      if(!ctx){
        var C=window.AudioContext||window.webkitAudioContext; if(!C) return null;
        ctx=new C();
        comp=ctx.createDynamicsCompressor();
        comp.threshold.value=-18; comp.knee.value=6; comp.ratio.value=8;
        comp.attack.value=0.003; comp.release.value=0.15;
        comp.connect(ctx.destination);
      }
      if(ctx.state==='suspended') ctx.resume();
      return ctx;
    }catch(e){ return null; }
  }
  ['pointerdown','touchstart','keydown'].forEach(function(ev){
    document.addEventListener(ev,function(){ getCtx(); },{passive:true,capture:true});
  });
  /* نغمة واحدة بثلاث طبقات (أساسي + أوكتاف + خامس) عشان تبقى أعلى وأوضح */
  function note(c,freq,start,dur){
    [[1,1],[2,0.5],[1.5,0.35]].forEach(function(l){
      var o=c.createOscillator(), g=c.createGain();
      o.type='square'; o.frequency.value=freq*l[0];
      g.gain.setValueAtTime(0.0001,start);
      g.gain.exponentialRampToValueAtTime(l[1],start+0.015);
      g.gain.exponentialRampToValueAtTime(0.0001,start+dur);
      o.connect(g); g.connect(comp);
      o.start(start); o.stop(start+dur+0.05);
    });
  }
  var playing=false, CHIME_SEC=5;
  window.pmChime=function(){
    if(playing) return;
    var c=getCtx(); if(!c) return;
    playing=true;
    var play=function(){
      var t0=c.currentTime, cycle=1.04, notes=[[988,0.22],[1319,0.22],[1760,0.38]];
      for(var k=0; k*cycle<CHIME_SEC; k++){
        notes.forEach(function(n,j){
          var start=t0+k*cycle+j*0.22;
          if(start-t0<CHIME_SEC) note(c,n[0],start,n[1]);
        });
      }
    };
    var ready=(c.state==='suspended')?c.resume():Promise.resolve();
    Promise.resolve(ready).then(play,function(){});
    try{
      var vib=[]; for(var v=0; v<8; v++){ vib.push(400,200); }
      if(navigator.vibrate) navigator.vibrate(vib);
    }catch(e){}
    setTimeout(function(){ playing=false; }, CHIME_SEC*1000);
  };
})();

/* إشعار النظام: الإشعار بيظهر في الجهاز نفسه (شريط إشعارات أندرويد / مركز إشعارات الويندوز والماك) ومعاه صوت الإشعارات بتاع الجهاز،
   سواء التطبيق مفتوح قدامك أو في الخلفية. لو الإذن مش متاح، pmNotify بترجّع false والتطبيق يعرض التنبيه جواه زي الأول. */
(function(){
  if(window.__pmNotifyInit) return; window.__pmNotifyInit=true;
  /* ملاحظة: طلب إذن الإشعارات بيتعمل بس من زرار «سماح» في البانر (219-notif-permission-banner.js).
     مفيش طلب تلقائي عند أي لمسة، عشان نافذة المتصفح متظهرش غير لما المستخدم يوافق. */
  /* لو الإذن اتحجب قبل كده نفهّم المستخدم يفعّله من إعدادات الجهاز (مرة واحدة) */
  setTimeout(function(){
    try{
      if(!('Notification' in window)||Notification.permission!=='denied') return;
      if(localStorage.getItem('pm_notif_denied_hint')) return;
      localStorage.setItem('pm_notif_denied_hint','1');
      if(window.toast) window.toast({k:'warn',t:'إشعارات الجهاز مقفولة',x:'عشان الإشعارات تظهر على الجهاز: افتح إعدادات الموقع أو التطبيق وفعّل «الإشعارات»، وبعدها أعد فتح التطبيق.',d:12000});
    }catch(e){}
  },4000);
  window.pmCanSystemNotify=function(){ return ('Notification' in window)&&Notification.permission==='granted'; };
  /* onFail (اختياري): بيتنفّذ لو الإشعار اتقبل (رجّع true) بس الجهاز فشل يعرضه بعد كده
     (زي أندرويد لما new Notification بترمي خطأ). الكود اللي بينادي بيستخدمها عشان يعرض التنبيه جوه التطبيق كبديل. */
  window.pmNotify=function(title,body,tag,onFail){
    var failedLater=false;
    var fail=function(){ if(failedLater) return; failedLater=true; if(typeof onFail==='function'){ try{ onFail(); }catch(e){} } };
    try{
      if(!window.pmCanSystemNotify()) return false;
      var opts={body:body||'',badge:'icons/badge-96.png',tag:tag||'rmy',renotify:true,vibrate:[300,120,300,120,300],data:{url:location.href}};
      var direct=function(){ try{ new Notification(title,opts); }catch(e){ fail(); } };
      if(navigator.serviceWorker&&navigator.serviceWorker.ready){
        /* لو الـ service worker مش جاهز في ثانيتين نستخدم الإشعار المباشر */
        var done=false;
        var t=setTimeout(function(){ if(!done){ done=true; direct(); } },2000);
        navigator.serviceWorker.ready.then(function(reg){
          if(done) return; done=true; clearTimeout(t);
          return reg.showNotification(title,opts).catch(fail);
        }).catch(function(){ if(!done){ done=true; clearTimeout(t); } direct(); });
      } else { direct(); }
      return true;
    }catch(e){ return false; }
  };
})();
}catch(e){console.error('[PastryMY] 068-ui-notification-sound.js failed',e)}
/* ---- 219-notif-permission-banner.js ---- */
try{
/* 219-notif-permission-banner.js
   بانر واضح بيطلب إذن الإشعارات بلمسة زرار "سماح"، عشان المتصفح/الهاتف يعرض نافذة الإذن.
   البانر بيفضل ظاهر لحد ما الإذن يتوافق عليه. زرار "لاحقاً" بيأجّله 5 دقايق بس، ويرجع تاني
   في كل مرة يفتح فيها التطبيق. لو الإذن اتقفل من الإعدادات بنوضح له يفتحه. */
(function(){
  if(window.__pmPermBanner) return; window.__pmPermBanner=true;
  if(!('Notification' in window)) return;
  var SNOOZE_MS=5*60*1000;
  var snoozeUntil=0;

  function hideBanner(){ var b=document.getElementById('pmNotifBanner'); if(b) b.remove(); }
  function loginVisible(){
    var ls=document.getElementById('loginScreen');
    if(!ls) return false;
    var cs=getComputedStyle(ls);
    return cs.display!=='none' && cs.visibility!=='hidden' && ls.getBoundingClientRect().height>0;
  }

  function showBanner(){
    if(document.getElementById('pmNotifBanner')) return;
    var b=document.createElement('div');
    b.id='pmNotifBanner';
    b.setAttribute('dir','rtl');
    b.setAttribute('role','dialog');
    b.style.cssText='position:fixed;left:12px;right:12px;top:calc(12px + env(safe-area-inset-top,0px));z-index:100000;background:#fff;color:#1B1B1B;border:1px solid #D6D6D6;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:14px;font-family:inherit;font-size:14px;line-height:1.6;display:flex;flex-direction:column;gap:10px';
    b.innerHTML=
      '<div style="font-weight:700;color:#293394">فعّل إشعارات RMY PRO</div>'+
      '<div>عشان تيجي التنبيهات والطلبات على الجهاز حتى والتطبيق مش مفتوح.</div>'+
      '<div style="display:flex;gap:8px;justify-content:flex-end">'+
        '<button id="pmNotifLater" type="button" style="border:0;background:#F2F2F2;color:#1B1B1B;border-radius:10px;padding:9px 14px;font:inherit;cursor:pointer">لاحقاً</button>'+
        '<button id="pmNotifAllow" type="button" style="border:0;background:#293394;color:#fff;border-radius:10px;padding:9px 14px;font:inherit;font-weight:700;cursor:pointer">سماح</button>'+
      '</div>';
    document.body.appendChild(b);

    document.getElementById('pmNotifLater').onclick=function(){
      snoozeUntil=Date.now()+SNOOZE_MS; hideBanner();
    };
    document.getElementById('pmNotifAllow').onclick=function(){
      var req;
      try{ req=Notification.requestPermission(); }catch(e){ req=null; }
      if(!req){ return; }
      Promise.resolve(req).then(function(p){
        if(p==='granted'){
          hideBanner();
          if(window.pmNotify) window.pmNotify('RMY PRO','تم تفعيل الإشعارات على الجهاز');
        } else if(p==='denied'){
          hideBanner();
          if(window.toast) window.toast({k:'warn',t:'الإشعارات مقفولة',x:'فعّلها من إعدادات الموقع في المتصفح، وبعدين أعد فتح التطبيق.',d:9000});
        }
        /* لو المستخدم قفل نافذة الإذن من غير اختيار (default): البانر يفضل ظاهر */
      }).catch(function(){});
    };
  }

  function check(){
    if(!('Notification' in window)) return;
    if(Notification.permission!=='default'){ hideBanner(); return; }
    if(Date.now()<snoozeUntil) return;
    if(loginVisible()) return;
    showBanner();
  }

  setTimeout(check, 2500);
  setInterval(check, 3000);
})();
}catch(e){console.error('[PastryMY] 219-notif-permission-banner.js failed',e)}
/* ---- 069-ui-dock-home.js ---- */
try{
/* زر الرئيسية في الشريط السفلي: فوق = يفتح الرئيسية، ولما تنزل تحت يتحول لسهم للأعلى ويطلّعك لفوق */
(function(){
  if(window.__pmDockHome) return; window.__pmDockHome=true;

  var HOME_HTML=((window.__PMUI__||{}).ICONS||{}).home+'الرئيسية';
  var UP_HTML=((window.__PMUI__||{}).ICONS||{}).arrowUp+'للأعلى';

  var mode='home';
  var TOP_AT=300, HOME_AT=120;

  function btn(){ return document.querySelector('#pmDock button[data-act="home"]'); }
  function scrollY(){ return window.scrollY||document.documentElement.scrollTop||0; }

  function render(b){
    var want=mode==='up'?UP_HTML:HOME_HTML;
    if(b.getAttribute('data-pm-mode')!==mode || b.innerHTML!==want){
      b.innerHTML=want;
      b.setAttribute('data-pm-mode',mode);
    }
  }

  /* الضغط على الزرار بيتحدد بمكان اللمس نفسه (مش بالعنصر اللي تحته)، عشان أي زرار تاني متداخل معاه ما ياخدش الضغطة.
     الأحداث كلها بتتوقف هنا وإحنا بنتصرف في الـ click. */
  function pointOf(e){
    var t=(e.changedTouches&&e.changedTouches[0])||(e.touches&&e.touches[0])||e;
    return (t&&typeof t.clientX==='number')?{x:t.clientX,y:t.clientY}:null;
  }
  function homeAt(e){
    var b=btn(); if(!b) return null;
    var p=pointOf(e); if(!p) return null;
    var r=b.getBoundingClientRect();
    return (p.x>=r.left && p.x<=r.right && p.y>=r.top && p.y<=r.bottom) ? b : null;
  }
  function showHomePanel(){
    var home=document.getElementById('home');
    if(!home){ if(typeof window.go==='function') window.go('analytics'); return; }
    document.querySelectorAll('.panel').forEach(function(p){ p.classList.toggle('active', p===home); });
    document.querySelectorAll('.tab.active').forEach(function(t){ t.classList.remove('active'); });
  }
  var EVENTS=['pointerdown','pointerup','mousedown','mouseup','touchstart','touchend','click'];
  EVENTS.forEach(function(ev){
    document.addEventListener(ev,function(e){
      var b=homeAt(e) || (e.target&&e.target.closest?e.target.closest('#pmDock button[data-act="home"]'):null);
      if(!b) return;
      e.stopImmediatePropagation();
      if(ev!=='click') return;
      if(mode==='up'){
        window.scrollTo({top:0,behavior:'smooth'});
      } else {
        /* الرئيسية = شاشة القايمة الرئيسية (قسم #home) مش التحليلات */
        var back=document.getElementById('pmBack');
        if(document.body.classList.contains('pm-view') && back){ back.click(); }
        else { showHomePanel(); }
        window.scrollTo({top:0,behavior:'smooth'});
      }
    },{capture:true,passive:true});
  });

  function tick(){
    var b=btn(); if(!b) return;
    var y=scrollY();
    if(mode==='home' && y>TOP_AT) mode='up';
    else if(mode==='up' && y<HOME_AT) mode='home';
    render(b);
  }
  setInterval(tick,150);
  setTimeout(tick,1200);
})();
}catch(e){console.error('[PastryMY] 069-ui-dock-home.js failed',e)}
/* ---- 070-ui-nav-filter-by-role.js ---- */
try{
/* فلترة تبويبات القائمة حسب الصلاحية + إخفاء الأقسام الفاضية.
   الفلترة بتتعمل بالـ data-tab (مش بترتيب الأقسام)، عشان أي تغيير في الترتيب ما يبوظش الصلاحيات. */
(function(){
  if(window.__pmNavFilter) return; window.__pmNavFilter=true;

  var ALL=['analytics','customers','menu','cartpage','salesInvoices','order','recipes:food','recipes:drink','stock','history','purchases','costing','monthly','accountant','dailyClosing','audit','backup','parties','readyDelivery','partyInvoices','partyTemplate','drinkQueue','drinkProduce'];


  /* admin / employee: قائمة منع (deny) عشان أي تبويب ما نعرفوش يفضل ظاهر للمدير.
     sales / kitchen / barista: قائمة سماح (allow) زي ما كانت الصلاحيات الأصلية. */
  var RULES={
    admin:    {deny:['salesInvoices']},
    employee: {deny:['analytics','cartpage','drinkQueue','drinkProduce','recipes:drink','accountant','dailyClosing']},
    sales:    {allow:['customers','menu','cartpage','parties','readyDelivery','partyInvoices','openInvoices']},
    kitchen:  {allow:['order','recipes:food','stock','parties']},
    barista:  {allow:['drinkProduce','drinkQueue','recipes:drink','parties']}
  };

  function tabKey(b){
    var t=b.getAttribute('data-tab')||'';
    var g=b.getAttribute('data-rgroup');
    return g ? t+':'+g : t;
  }

  /* يرجّع الصلاحية الحالية، أو null لو مفيش صلاحية لسه (قبل تسجيل الدخول) → ما نفلترش حاجة */
  function currentRole(){
    var r=document.body.getAttribute('data-role')||'';
    if(!r){
      var m=(document.body.className||'').match(/role-(\w+)/);
      r=m?m[1]:'';
    }
    if(!r) return null;
    return RULES[r] ? r : 'employee';
  }

  function isHidden(rule,key){
    if(rule.allow) return rule.allow.indexOf(key)<0;
    if(rule.deny)  return rule.deny.indexOf(key)>=0;
    return false;
  }

  function apply(){
    var nav=document.getElementById('appNav');
    if(!nav) return;
    var role=currentRole();
    var rule=role?RULES[role]:null;
    nav.querySelectorAll('.tab').forEach(function(b){
      b.classList.toggle('pm-tab-off', !!rule && isHidden(rule,tabKey(b)));
    });
    nav.querySelectorAll('.nav-group').forEach(function(g){
      var visible=g.querySelectorAll('.tab:not(.pm-tab-off)').length;
      g.classList.toggle('pm-grp-off', rule!==null && visible===0);
    });
  }

  var t=null;
  function schedule(){ clearTimeout(t); t=setTimeout(apply,30); }

  var nav=document.getElementById('appNav');
  if(nav) new MutationObserver(schedule).observe(nav,{childList:true,subtree:true});
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['data-role','class']});

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule);
  schedule();
  setTimeout(apply,1200);
  setTimeout(apply,3000);
})();
}catch(e){console.error('[PastryMY] 070-ui-nav-filter-by-role.js failed',e)}
