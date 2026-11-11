/* 091-header-sounds-tables.js — اتدمجت من: 091-header-date-time.js، 092-brand-sounds.js، 126-responsive-tables.js */
/* ---- 091-header-date-time.js ---- */
try{
(function(){
  'use strict';
  function updateHeaderDateTime(){
    var dateEl=document.getElementById('headerDate');
    var timeEl=document.getElementById('headerTime');
    if(!dateEl||!timeEl)return;
    var now=new Date();
    dateEl.textContent=new Intl.DateTimeFormat('ar-EG-u-nu-latn',{year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
    timeEl.textContent=new Intl.DateTimeFormat('ar-EG-u-nu-latn',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(now);
    updateHero(dateEl.textContent,timeEl.textContent);
  }
  /* بانر الترحيب في الشاشة الرئيسية: ترحيب باسم المستخدم + التاريخ والوقت */
  function userName(){
    try{ return (typeof cloudActorName!=='undefined'&&cloudActorName)?String(cloudActorName):''; }catch(e){ return ''; }
  }
  function ensureHero(){
    var h=document.getElementById('rmyHero'); if(h) return h;
    var nav=document.getElementById('appNav'); if(!nav||!nav.parentNode) return null;
    h=document.createElement('section'); h.id='rmyHero'; h.className='rmy-hero'; h.setAttribute('aria-label','ترحيب');
    h.innerHTML='<div><div class="rh-greet"></div></div>'+
      '<div class="rh-clock"><div class="rh-d"></div><div class="rh-t"></div></div>';
    nav.parentNode.insertBefore(h,nav);
    return h;
  }
  function updateHero(d,t){
    var h=ensureHero(); if(!h) return;
    var n=userName();
    h.querySelector('.rh-greet').textContent='أهلاً بيك'+(n?' '+n:'');
    var clean=function(x){return String(x).replace(/[\u200E\u200F\u061C\u202A-\u202E]/g,'')};
    h.querySelector('.rh-d').textContent=clean(d);
    h.querySelector('.rh-t').textContent=clean(t);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updateHeaderDateTime);else updateHeaderDateTime();
  window.setInterval(updateHeaderDateTime,1000);
})();
}catch(e){console.error('[PastryMY] 091-header-date-time.js failed',e)}
/* ---- 092-brand-sounds.js ---- */
try{
/* دمج تلقائي لملفات من نفس الميزة (بنفس الترتيب، والملفات اللي بينها ما بتشاركش عناصر أو حالة). كل جزء معزول بـ try/catch. */
/* ---- 092-brand-sounds.js ---- */
try{
/* أصوات الماركة: كل وظيفة في التطبيق ليها صوتها الخاص.
   بيتحمّل آخر حاجة في الصفحة، وبيلف الدوال الموجودة (toast / apiCall / confirm / pmChime / __pmBellAdd) من غير ما يغيّر منطقها. */
(function(){
  if(window.__pmBrandSounds) return; window.__pmBrandSounds=true;

  /* ---------- محرك الصوت ---------- */
  var ctx=null, lastAt=0, MIN_GAP=700;
  function getCtx(){
    try{
      if(!ctx){
        var C=window.AudioContext||window.webkitAudioContext; if(!C) return null;
        ctx=new C();
      }
      if(ctx.state==='suspended') ctx.resume();
      return ctx;
    }catch(e){ return null; }
  }
  ['pointerdown','touchstart','keydown'].forEach(function(ev){
    document.addEventListener(ev,function(){ getCtx(); },{passive:true,capture:true});
  });

  function bell(c,f,s,v,dur,partials){
    partials=partials||[[1,1],[2.76,0.25],[5.4,0.08]];
    partials.forEach(function(p){
      var o=c.createOscillator(), g=c.createGain();
      o.type='sine'; o.frequency.value=f*p[0];
      g.gain.setValueAtTime(0.0001,s);
      g.gain.exponentialRampToValueAtTime(v*p[1],s+0.005);
      g.gain.exponentialRampToValueAtTime(0.0001,s+dur/(1+p[0]*0.15));
      o.connect(g); g.connect(c.destination);
      o.start(s); o.stop(s+dur+0.05);
    });
  }
  function click(c,s,v,freq){
    var len=0.04, buf=c.createBuffer(1,c.sampleRate*len,c.sampleRate), d=buf.getChannelData(0);
    for(var i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);
    var src=c.createBufferSource(), bp=c.createBiquadFilter(), g=c.createGain();
    bp.type='bandpass'; bp.frequency.value=freq||2400; bp.Q.value=1.2;
    g.gain.value=v;
    src.buffer=buf; src.connect(bp); bp.connect(g); g.connect(c.destination);
    src.start(s);
  }
  function tone(c,f,s,v,dur,type){
    var o=c.createOscillator(), g=c.createGain();
    o.type=type||'triangle'; o.frequency.value=f;
    g.gain.setValueAtTime(0.0001,s);
    g.gain.exponentialRampToValueAtTime(v,s+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,s+dur);
    o.connect(g); g.connect(c.destination);
    o.start(s); o.stop(s+dur+0.05);
  }

  /* الأصوات الثمانية */
  var SOUNDS={
    brand:function(c,t){ bell(c,659,t,.3,.5); bell(c,784,t+.14,.28,.5); bell(c,988,t+.28,.3,.9); },
    cashier:function(c,t){ click(c,t,.3,3000); bell(c,1318,t+.02,.35,1.1); },
    barista:function(c,t){ bell(c,1046,t,.35,.6); bell(c,1046,t+.32,.35,.6); },
    order:function(c,t){ bell(c,784,t,.32,.45); bell(c,988,t+.22,.32,.45); bell(c,1175,t+.44,.34,.7); },
    saved:function(c,t){ tone(c,880,t,.18,.15,'sine'); tone(c,1318,t+.09,.16,.3,'sine'); },
    error:function(c,t){ tone(c,392,t,.3,.22,'triangle'); tone(c,294,t+.2,.3,.4,'triangle'); },
    del:function(c,t){ click(c,t,.4,1800); click(c,t+.05,.15,1200); },
    message:function(c,t){ tone(c,1568,t,.22,.12,'sine'); tone(c,1976,t+.1,.2,.25,'sine'); }
  };

  /* يمنع تداخل صوتين في نفس اللحظة (مثلاً الكاشير والنجاح مع بعض): أول صوت بيكسب */
  function play(name){
    var n=Date.now(); if(n-lastAt<MIN_GAP) return;
    var c=getCtx(); if(!c||!SOUNDS[name]) return;
    lastAt=n;
    try{ SOUNDS[name](c,c.currentTime+0.03); }catch(e){}
  }
  window.pmSound={ play:play, names:Object.keys(SOUNDS) };

  /* ---------- جينغل الماركة: مرة واحدة في كل جلسة، أول لمسة ---------- */
  try{
    if(!sessionStorage.getItem('pmBrandJingle')){
      var jingle=function(){
        if(sessionStorage.getItem('pmBrandJingle')) return;
        sessionStorage.setItem('pmBrandJingle','1');
        lastAt=0; play('brand');
        document.removeEventListener('pointerdown',jingle,true);
      };
      document.addEventListener('pointerdown',jingle,{capture:true,passive:true});
    }
  }catch(e){}

  /* ---------- الطلب الجديد للباريستا/المطبخ: بدل جرس الـ pmChime القديم ---------- */
  window.pmChime=function(){ play('order'); };

  /* ---------- رسالة واردة / إشعار جديد في الجرس ---------- */
  var prevBellAdd=window.__pmBellAdd;
  window.__pmBellAdd=function(){
    play('message');
    if(typeof prevBellAdd==='function') return prevBellAdd.apply(this,arguments);
  };

  /* ---------- التوست: نجاح / خطأ / تراجع ---------- */
  var prevToast=window.toast;
  window.toast=function(o){
    try{
      var k=(o&&typeof o==='object')?o.k:arguments[1];
      if(k==='success'||k==='ok') play('saved');
      else if(k==='error') play('error');
      else if(k==='undo') play('del');
    }catch(e){}
    return prevToast.apply(this,arguments);
  };

  /* ---------- الحذف: نقرة بعد تأكيد الحذف ---------- */
  var prevConfirm=window.confirm;
  window.confirm=function(msg){
    var r=prevConfirm.apply(this,arguments);
    try{ if(r && /حذف|امسح|مسح/.test(String(msg||''))) play('del'); }catch(e){}
    return r;
  };

  /* ---------- العمليات: بيع، تجهيز مشروبات/أوردرات، حفظ ---------- */
  pmApiUse('sounds',function(prevApi){
    return function(body){
      var p=prevApi.apply(this,arguments);
      try{
        var a=body&&body.action;
        Promise.resolve(p).then(function(r){
          if(!r||r.error) return;
          if(a==='checkout_cart') play('cashier');
          else if(a==='drink_order_action'&&body.drink_action==='prepare') play('barista');
          else if(a==='confirm_production') play('barista');
          else if(a==='party_order_action'&&body.party_action==='produce') play('barista');
        },function(){});
      }catch(e){}
      return p;
    };
  });
})();
}catch(e){console.error('[PastryMY] 092-brand-sounds.js failed',e)}
/* ---- 131-loud-alerts.js ---- */
try{
/* تكبير صوت التنبيهات: كل أصوات التطبيق (الجرس والتنبيه وصوت الكاشير والباريستا) بتمر على مرحلة تكبير
   وحد أقصى (limiter) عشان تبقى عالية وواضحة من غير ما تتشوّه. بتتطبق على كل الأصوات من غير ما نغيّر ملفات الأصوات. */
(function(){
  if(window.__pmLoudAlerts) return; window.__pmLoudAlerts=true;
  var Orig=window.AudioContext||window.webkitAudioContext;
  if(!Orig) return;
  var BOOST=2.6;           // تكبير الصوت (حوالي +8 ديسيبل)

  var Loud=function(){
    var c=new Orig();
    var master=c.createGain(); master.gain.value=BOOST;
    var limit=c.createDynamicsCompressor();
    limit.threshold.value=-3; limit.knee.value=0; limit.ratio.value=20;
    limit.attack.value=0.001; limit.release.value=0.08;
    master.connect(limit); limit.connect(c.destination);
    Object.defineProperty(c,'__pmMaster',{value:master});
    return c;
  };
  Loud.prototype=Orig.prototype;
  window.AudioContext=Loud;
  if(window.webkitAudioContext) window.webkitAudioContext=Loud;

  // أي node بيتوصّل بـ destination يتحوّل للمرحلة المكبّرة
  var proto=AudioNode.prototype, origConnect=proto.connect;
  proto.connect=function(dest){
    var args=Array.prototype.slice.call(arguments);
    try{
      var m=this.context && this.context.__pmMaster;
      if(m && dest===this.context.destination){ args[0]=m; }
    }catch(e){}
    return origConnect.apply(this,args);
  };
})();
}catch(e){console.error('[PastryMY] 131-loud-alerts.js failed',e)}
}catch(e){console.error('[PastryMY] 092-brand-sounds.js failed',e)}
/* ---- 126-responsive-tables.js ---- */
try{
/* يلف أي جدول مش متلفوف في حاوية بسكرول أفقي، عشان الجداول اللي بتتولد بالـJS تفضل مرتبة على الموبايل */
(function(){
  function wrapTables(root){
    (root||document).querySelectorAll('table').forEach(function(t){
      if(t.closest('.tablewrap,.tbl-wrap')) return;
      var w=document.createElement('div');
      w.className='tablewrap';
      t.parentNode.insertBefore(w,t);
      w.appendChild(t);
    });
  }
  wrapTables(document);
  var pending=null;
  new MutationObserver(function(){
    clearTimeout(pending);
    pending=setTimeout(function(){ wrapTables(document); },150);
  }).observe(document.body,{childList:true,subtree:true});
})();
}catch(e){console.error('[PastryMY] 126-responsive-tables.js failed',e)}
