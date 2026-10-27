(function(){
  var body=document.body, timer=null, presenceCh=null, myKey=null, wasUnlocked=false;
  var header=document.querySelector('header');
  function isUnlocked(){return !body.classList.contains('auth-required')}

  /* ---- شريط الحالة ---- */
  var bar=document.createElement('div');
  bar.id='pmLiveBar'; bar.className='pm-live';
  bar.innerHTML='<div class="pm-live-chip pres" id="pmPresChip"><span class="pm-dot"></span><span id="pmPresText">الحسابات المتصلة: —</span></div>';
  var main=document.querySelector('main.wrap');
  /* ---- أيقونة المزامنة جنب زر القائمة ---- */
  var st=document.createElement('style');
  st.textContent='@keyframes pmSpin{to{transform:rotate(360deg)}}';
  document.head.appendChild(st);
  var syncIcon=document.createElement('button');
  syncIcon.type='button'; syncIcon.id='pmSyncIcon'; syncIcon.setAttribute('aria-label','حالة المزامنة'); syncIcon.title='حالة التحديث';
  syncIcon.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/></svg>';
  syncIcon.style.cssText='width:44px;height:44px;min-width:44px;border-radius:14px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:#7CFC9A;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;margin-inline-start:8px;flex:0 0 auto;padding:0;';
  var drawerBtn=document.getElementById('drawerBtn');
  document.body.appendChild(syncIcon);
  function placeSyncIcon(){
    if(!drawerBtn) return;
    var r=drawerBtn.getBoundingClientRect();
    if(!r.width) { syncIcon.style.display='none'; return; }
    var cs=getComputedStyle(drawerBtn);
    syncIcon.style.display='inline-flex';
    syncIcon.style.position='fixed';
    syncIcon.style.zIndex='1000';
    syncIcon.style.margin='0';
    syncIcon.style.top=r.top+'px';
    syncIcon.style.left=(r.right+10)+'px';
    syncIcon.style.width=r.width+'px';
    syncIcon.style.height=r.height+'px';
    syncIcon.style.borderRadius=cs.borderRadius;
  }
  placeSyncIcon();
  window.addEventListener('resize',placeSyncIcon);
  setInterval(placeSyncIcon,2000);
  syncIcon.addEventListener('click',function(){ alert(syncIcon.title); });
  if(main) main.insertBefore(bar,main.firstChild);

  function syncFromLocal(){
    var el=document.getElementById('localSaveStatus'); if(!el)return;
    var sp=el.querySelectorAll('span'); var msg=sp[1]?sp[1].textContent:'';
    var icon=document.getElementById('pmSyncIcon');
    if(icon){
      var err=el.classList.contains('err');
      var busy=!err && /جاري|حفظ|مزامن|تحميل/.test(msg);
      icon.title='حالة التحديث: '+msg;
      icon.style.color=err?'#ff6b6b':(busy?'#ffd166':'#7CFC9A');
      icon.style.animation=busy?'pmSpin 1s linear infinite':'none';
    }
  }
  var ls=document.getElementById('localSaveStatus');
  if(ls) new MutationObserver(syncFromLocal).observe(ls,{childList:true,subtree:true,characterData:true,attributes:true});
  syncFromLocal();

  /* ---- الحسابات المتصلة (Supabase Realtime Presence) ---- */
  function deviceLabel(){
    var u=navigator.userAgent||'';
    if(/iPhone|iPad|iPod/.test(u))return 'آيفون';
    if(/Android/.test(u))return 'أندرويد';
    if(/Windows/.test(u))return 'ويندوز';
    if(/Macintosh|Mac OS/.test(u))return 'ماك';
    return 'متصفح';
  }
  function roleLabel(r){return r==='admin'?'مدير':(r==='kitchen'?'المطبخ':(r==='barista'?'الباريستا':'موظف'))}
  function renderPresence(){
    var el=document.getElementById('pmPresText'); if(!el)return;
    if(!presenceCh){
      el.textContent='الحسابات المتصلة: '+(isUnlocked()&&typeof cloudClient!=='undefined'&&!cloudClient?'وضع محلي':'—');
      if(window.pmRenderPresList)window.pmRenderPresList([],null);
      return;
    }
    var st=presenceCh.presenceState(), list=[];
    Object.keys(st).forEach(function(k){ (st[k]||[]).forEach(function(m){ list.push({key:k,m:m}) }) });
    if(!list.length){ el.textContent='الحسابات المتصلة: لا أحد'; if(window.pmRenderPresList)window.pmRenderPresList([],myKey); return; }
    var parts=list.map(function(x){
      var me=(x.key===myKey)?' (أنت)':'';
      return (x.m.name||'—')+' · '+roleLabel(x.m.role)+' · '+(x.m.device||'')+me;
    });
    el.textContent='الحسابات المتصلة ('+list.length+')'; if(window.pmRenderPresList)window.pmRenderPresList(list,myKey);
  }
  function startPresence(){
    if(presenceCh)return;
    if(typeof cloudClient==='undefined'||!cloudClient){ renderPresence(); return; }
    myKey=(cloudActorName||'user')+'-'+Math.random().toString(36).slice(2,8);
    presenceCh=cloudClient.channel('pastrymy-presence',{config:{presence:{key:myKey}}});
    presenceCh.on('presence',{event:'sync'},renderPresence).subscribe(function(st){
      if(st==='SUBSCRIBED'){
        presenceCh.track({name:cloudActorName||'—',role:cloudActorRole||'',device:deviceLabel(),since:Date.now()});
      }else if(st==='CHANNEL_ERROR'||st==='TIMED_OUT'){
        var el=document.getElementById('pmPresText'); if(el)el.textContent='الحسابات المتصلة: غير متاح حالياً';
      }
    });
    renderPresence();
  }
  function stopPresence(){
    if(presenceCh&&cloudClient){ try{ cloudClient.removeChannel(presenceCh) }catch(e){} }
    presenceCh=null; renderPresence();
  }

  /* ---- تصغير الهيدر بعد 10 ثوانٍ من الدخول ---- */
  function onUnlocked(){
    clearTimeout(timer);
    body.classList.remove('hdr-mini');
    timer=setTimeout(function(){ body.classList.add('hdr-mini') },10000);
    startPresence();
  }
  function onLocked(){ clearTimeout(timer); body.classList.remove('hdr-mini'); stopPresence(); }
  new MutationObserver(function(){
    var u=isUnlocked();
    if(u&&!wasUnlocked)onUnlocked();
    if(!u&&wasUnlocked)onLocked();
    wasUnlocked=u;
  }).observe(body,{attributes:true,attributeFilter:['class']});
  if(header) header.addEventListener('click',function(){
    if(!isUnlocked())return;
    clearTimeout(timer);
    body.classList.toggle('hdr-mini');
  });
  wasUnlocked=isUnlocked();
  if(wasUnlocked)onUnlocked();
})();
