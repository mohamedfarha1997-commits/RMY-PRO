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
