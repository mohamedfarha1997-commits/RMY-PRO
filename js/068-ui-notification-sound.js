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
      var opts={body:body||'',badge:'ICONS/badge-96.png',tag:tag||'rmy',renotify:true,vibrate:[300,120,300,120,300],data:{url:location.href}};
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
