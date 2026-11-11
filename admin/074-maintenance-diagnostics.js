/* 074-maintenance-diagnostics.js — اتدمجت من: 074-admin-maintenance.js، 075-admin-diagnostics.js */
/* ---- 074-admin-maintenance.js ---- */
try{
(function(){
  if(window.__pmMaint) return; window.__pmMaint=true;
  var DEFAULT_MSG='البرنامج تحت التحديث، برجاء المحاولة بعد قليل.';
  var cur={on:false,message:'',at:null,until:null};
  var known=false;
  var srvState={ok:false,err:'لم يُقرأ بعد'};
  var ov=document.getElementById('pmMaint');
  var msgEl=document.getElementById('pmMaintMsg');
  var sinceEl=document.getElementById('pmMaintSince');
  var cntBox=document.getElementById('pmMaintCount');
  var sheet=null, msgIn=null, untilIn=null, sheetErr=null;
  var busy=false;
  function pad(n){ return (n<10?'0':'')+n; }
  function isAdminRole(){ return typeof cloudActorRole!=='undefined' && cloudActorRole==='admin'; }
  function signedIn(){ return !document.body.classList.contains('auth-required') && typeof cloudActorName!=='undefined' && !!cloudActorName; }
  function untilMs(){ if(!cur.until) return null; var t=Date.parse(cur.until); return isNaN(t)?null:t; }
  function timeTxt(ms){ return new Date(ms).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }
  function toLocalInput(ms){ var d=new Date(ms); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes()); }

  function ensureRow(){
    var box=document.getElementById('drawerTools');
    if(!box) return null;
    var row=document.getElementById('pmMaintRow');
    if(!row){
      row=document.createElement('div'); row.id='pmMaintRow'; row.className='pm-maint-row';
      row.innerHTML='<div class="pm-maint-txt"><b>وضع الصيانة</b><small id="pmMaintStatus"></small><small id="pmMaintNote" class="pm-maint-note"></small><small class="pm-maint-build">إصدار الواجهة: maint-6 · 2026-10-23</small><button type="button" id="pmMaintEdit">تعديل الرسالة والوقت</button></div>'+
        '<button type="button" id="pmMaintToolBtn" role="switch" aria-checked="false" aria-label="وضع الصيانة"></button>';
      box.insertBefore(row,box.firstChild);
      document.getElementById('pmMaintToolBtn').addEventListener('click',toggle);
      document.getElementById('pmMaintEdit').addEventListener('click',openSheet);
    }
    return row;
  }

  var OV_IDS={lbl:'pmMaintCountLabel',d:'pmC_d',h:'pmC_h',m:'pmC_m',s:'pmC_s',dw:'pmC_dw'};
  function renderCount(u,ids){
    var lbl=document.getElementById(ids.lbl);
    if(!lbl) return;
    var diff=u-Date.now();
    if(diff<=0){
      lbl.textContent='الوقت المحدد خلص، بنتأكد من انتهاء الصيانة…';
      ['d','h','m','s'].forEach(function(k){ document.getElementById(ids[k]).textContent='00'; });
      document.getElementById(ids.dw).hidden=true;
      return;
    }
    lbl.textContent='باقي على انتهاء الصيانة';
    var sec0=Math.floor(diff/1000), d=Math.floor(sec0/86400), h=Math.floor((sec0%86400)/3600), m=Math.floor((sec0%3600)/60), sec=sec0%60;
    document.getElementById(ids.dw).hidden=(d===0);
    document.getElementById(ids.d).textContent=pad(d);
    document.getElementById(ids.h).textContent=pad(h);
    document.getElementById(ids.m).textContent=pad(m);
    document.getElementById(ids.s).textContent=pad(sec);
  }
  // العد التنازلي: بيشتغل في صفحة الموظف
  function tick(){
    var u=untilMs();
    var overlayShown=ov.classList.contains('show');
    if(cntBox) cntBox.hidden=!(overlayShown && u!==null);
    if(overlayShown && u!==null) renderCount(u,OV_IDS);
  }
  function paint(){
    var show=!!cur.on && !isAdminRole() && signedIn();
    ov.classList.toggle('show',show);
    document.documentElement.classList.toggle('pm-maint-open',show);
    document.body.classList.toggle('pm-maint-open',show);
    msgEl.textContent=cur.message||DEFAULT_MSG;
    var u=untilMs(), now=Date.now();
    var since='';
    if(u!==null) since=(u>now?'المتوقع ينتهي الساعة ':'كان المفروض ينتهي الساعة ')+timeTxt(u);
    else if(cur.at){ var t=Date.parse(cur.at); if(!isNaN(t)) since='بدأت الساعة '+timeTxt(t); }
    sinceEl.textContent=since;
    tick();

    var row=ensureRow();
    if(!row) return;
    row.hidden=!isAdminRole();
    var sw=document.getElementById('pmMaintToolBtn');
    var st=document.getElementById('pmMaintStatus');
    if(!known){
      sw.setAttribute('data-state','unknown'); sw.setAttribute('aria-checked','false'); sw.disabled=true;
      st.innerHTML=(srvState.ok===false && srvState.err!=='لم يُقرأ بعد')
        ? '<span style="color:#B42318">⚠️ السيرفر ما قراش الحالة: '+esc(srvState.err)+'</span>'
        : 'جاري التحقق من الحالة…';
    } else {
      sw.removeAttribute('data-state'); sw.disabled=false;
      sw.setAttribute('aria-checked',cur.on?'true':'false');
      var extra='';
      if(cur.on){
        if(u===null) extra=' · مفيش وقت انتهاء محدد';
        else if(u>now) extra=' · هتنتهي الساعة '+timeTxt(u);
        else extra=' · الوقت المحدد خلص، اقفلها لو خلصت';
      }
      st.innerHTML=(cur.on
        ? '<span class="pm-maint-pill on">مفعّل</span>الموظفين شايفين صفحة التحديث'+extra
        : '<span class="pm-maint-pill off">متوقف</span>البرنامج مفتوح للجميع')
        + (srvState.ok ? '' : '<br><span style="color:#B42318">⚠️ السيرفر ما قراش الحالة: '+esc(srvState.err)+'</span>');
    }
  }

  function apply(m){
    known=true;
    cur={
      on:!!(m&&m.on),
      message:String((m&&m.message)||''),
      at:(m&&m.at)||null,
      until:(m&&m.until)||null
    };
    if(typeof state!=='undefined'&&state) state.maintenance=cur;
    paint();
  }

  function note(text,isErr){
    var n=document.getElementById('pmMaintNote'); if(!n) return;
    n.textContent=text||'';
    n.style.color=isErr?'var(--ui-err)':'var(--ui-ok)';
  }

  async function saveAndVerify(prev){
    busy=true; note('جاري الحفظ…');
    var ok=false, err='';
    try{ await persistCloudSnapshot(clone(state)); ok=true; }catch(e){ err=(e&&e.message)||String(e); }
    if(!ok){
      apply(prev); note('ما اتحفظش على السحابة: '+err,true); busy=false; return;
    }
    var rs=await readStatus();
    busy=false;
    if(rs.ok && (!!(rs.value&&rs.value.on)===cur.on)) note('تم الحفظ ✓ · السيرفر متأكد');
    else if(rs.ok) note('⚠️ السيرفر رجّع حالة مختلفة، حدّث الصفحة',true);
    else note('تم الحفظ، بس تعذر التحقق من السيرفر',true);
  }

  function toggle(){
    if(!isAdminRole()||!known||busy) return;
    var prev={on:cur.on,message:cur.message,at:cur.at,until:cur.until};
    var turnOn=!cur.on;
    var u=untilMs();
    // لما تتقفل نمسح وقت الانتهاء، ولما تتفتح نحتفظ بيه بس لو لسه في المستقبل
    var keepUntil=turnOn && u!==null && u>Date.now();
    apply({
      on:turnOn,
      message:cur.message||DEFAULT_MSG,
      at:turnOn?new Date().toISOString():null,
      until:keepUntil?cur.until:null
    });
    saveAndVerify(prev);
  }

  // ===== نافذة الإعدادات: نص الرسالة + وقت الانتهاء =====
  function buildSheet(){
    sheet=document.createElement('div');
    sheet.id='pmMSheet'; sheet.className='pm-msheet'; sheet.hidden=true;
    sheet.setAttribute('role','dialog'); sheet.setAttribute('aria-modal','true'); sheet.setAttribute('aria-labelledby','pmMSheetTitle');
    sheet.innerHTML=
      '<div class="pm-msheet-box">'+
        '<h3 id="pmMSheetTitle">إعدادات وضع الصيانة</h3>'+
        '<label for="pmMSheetMsg">نص الرسالة اللي هيظهر للموظفين</label>'+
        '<textarea id="pmMSheetMsg" maxlength="400"></textarea>'+
        '<label for="pmMSheetUntil">الصيانة هتنتهي إمتى؟</label>'+
        '<input type="datetime-local" lang="en-GB" dir="ltr" id="pmMSheetUntil">'+
        '<div class="pm-msheet-chips">'+
          '<button type="button" data-min="30">+30 دقيقة</button>'+
          '<button type="button" data-min="60">+ساعة</button>'+
          '<button type="button" data-min="120">+ساعتين</button>'+
          '<button type="button" data-min="360">+6 ساعات</button>'+
          '<button type="button" data-clear="1">بدون وقت</button>'+
        '</div>'+
        '<small id="pmMSheetErr" class="pm-maint-note" style="color:#B42318"></small>'+
        '<div class="pm-msheet-act">'+
          '<button type="button" id="pmMSheetCancel">إلغاء</button>'+
          '<button type="button" id="pmMSheetSave">حفظ</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(sheet);
    msgIn=document.getElementById('pmMSheetMsg');
    untilIn=document.getElementById('pmMSheetUntil');
    sheetErr=document.getElementById('pmMSheetErr');
    sheet.addEventListener('click',function(e){ if(e.target===sheet) closeSheet(); });
    document.getElementById('pmMSheetCancel').addEventListener('click',closeSheet);
    document.getElementById('pmMSheetSave').addEventListener('click',saveSheet);
    sheet.querySelectorAll('[data-min]').forEach(function(b){
      b.addEventListener('click',function(){
        untilIn.value=toLocalInput(Date.now()+Number(b.getAttribute('data-min'))*60000);
        sheetErr.textContent='';
      });
    });
    sheet.querySelector('[data-clear]').addEventListener('click',function(){ untilIn.value=''; sheetErr.textContent=''; });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape' && !sheet.hidden) closeSheet(); });
  }
  function openSheet(){
    if(!isAdminRole()||!known||busy) return;
    msgIn.value=cur.message||DEFAULT_MSG;
    var u=untilMs();
    untilIn.value=(u!==null)?toLocalInput(u):'';
    sheetErr.textContent='';
    sheet.hidden=false;
    msgIn.focus();
  }
  function closeSheet(){ sheet.hidden=true; }
  function saveSheet(){
    if(!isAdminRole()||!known||busy) return;
    var text=(msgIn.value||'').trim()||DEFAULT_MSG;
    var until=null;
    if(untilIn.value){
      var t=Date.parse(untilIn.value);
      if(isNaN(t)){ sheetErr.textContent='التاريخ والوقت مش مظبوطين'; return; }
      until=new Date(t).toISOString();
    }
    closeSheet();
    var prev={on:cur.on,message:cur.message,at:cur.at,until:cur.until};
    apply({on:cur.on,message:text,at:cur.at,until:until});
    saveAndVerify(prev);
  }
  // ===== نهاية نافذة الإعدادات =====

  async function readStatus(){
    var lastErr='';
    try{
      if(typeof cloudClient!=='undefined'&&cloudClient){
        var r=await cloudClient.rpc('pastrymy_maintenance_status');
        if(r&&!r.error){ srvState={ok:true,err:''}; return {ok:true,value:r.data||{on:false}}; }
        lastErr=(r&&r.error&&(r.error.message||r.error.code))||'خطأ غير معروف';
      } else lastErr='لا يوجد اتصال بالسحابة';
    }catch(e){ lastErr=(e&&e.message)||String(e); }
    srvState={ok:false,err:lastErr||'الخادم ما رجّعش حقل الصيانة'};
    try{
      if(typeof cloudReady!=='undefined'&&cloudReady&&signedIn()&&cloudActorPin){
        var g=await Promise.race([apiCall({action:'get_state',employee_name:cloudActorName,pin:cloudActorPin}),new Promise(function(res){setTimeout(function(){res(null)},4000)})]);
        if(g&&!g.error&&g.data&&g.data.state&&('maintenance' in g.data.state)){ srvState={ok:true,err:''}; return {ok:true,value:g.data.state.maintenance}; }
      }
    }catch(e){}
    srvState={ok:false,err:lastErr||'الخادم ما رجّعش حقل الصيانة'};
    return {ok:false};
  }
  async function poll(){
    var st=await readStatus();
    if(st.ok) apply(st.value); else paint();
  }

  document.getElementById('pmMaintOut').addEventListener('click',function(){
    if(typeof signOutCloud==='function') signOutCloud();
  });
  var dbtn=document.getElementById('drawerBtn');
  if(dbtn) dbtn.addEventListener('click',paint);

  // حماية: أي حفظ للسحابة لازم يحمل حالة الصيانة الحالية (بما فيها وقت الانتهاء)
  (function(){
    pmApiUse('maintenance-state',function(origApi){ return async function(body){
      try{
        if(body&&body.action==='save_state'&&body.state&&typeof body.state==='object'){
          if(!known){ await poll(); }
          if(known){
            var m=cur.on?{on:true,message:cur.message,at:cur.at,until:cur.until}:{on:false};
            body=Object.assign({},body,{state:Object.assign({},body.state,{maintenance:m})});
          }
        }
      }catch(e){}
      return origApi.call(this,body);
    }; });
  })();

  buildSheet();
  window.pmMaintApply=apply;
  window.pmMaintPoll=poll;
  paint();
  setTimeout(poll,1500);
  setInterval(poll,15000);
  setInterval(tick,1000);
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) poll(); });
  setInterval(paint,2000);
})();
}catch(e){console.error('[PastryMY] 074-admin-maintenance.js failed',e)}
/* ---- 075-admin-diagnostics.js ---- */
try{
(function(){
  if(window.__pmDiag) return; window.__pmDiag=true;
  var LOG_KEY='pm_diag_log';
  var QUIET=['get_state','verify_employee'];        // طلبات روتينية: مش بنعرضها ولا نسجلها
  var lastModalAt=0, lastMsg='';

  // يحوّل اسم الموديل لشكل مفهوم (SM-S911B ← Samsung SM-S911B)
  function prettyModel(m){
    m=String(m||'').trim();
    if(!m||m==='K') return '';
    if(/^SM-/i.test(m)) return 'Samsung '+m;
    return m;
  }
  // يطلع اسم الموديل من الـ User-Agent (أندرويد بيبعته غالبًا)
  function uaModel(){
    var ua=navigator.userAgent||'';
    var m=ua.match(/Android[^;]*;\s*([^;)]+?)\s*(?:Build\/|\))/);
    if(m) return prettyModel(m[1]);
    if(/iPhone/.test(ua)) return 'iPhone';
    if(/iPad/.test(ua)) return 'iPad';
    if(/Windows/.test(ua)) return 'كمبيوتر Windows';
    if(/Macintosh/.test(ua)) return 'Mac';
    return '';
  }
  // أندرويد الحديث بيخفي الموديل من الـ UA، فبنجيبه من userAgentData ونحفظه
  function cacheModel(){
    try{
      if(navigator.userAgentData && navigator.userAgentData.getHighEntropyValues){
        navigator.userAgentData.getHighEntropyValues(['model']).then(function(v){
          var pm=prettyModel(v&&v.model);
          if(pm) localStorage.setItem('pm_device_model',pm);
        }).catch(function(){});
      }
    }catch(e){}
  }
  function deviceName(){
    try{
      var custom=localStorage.getItem('pm_device_name');
      if(custom) return custom;
      var id=localStorage.getItem('pm_device_id');
      if(!id){ id=Math.random().toString(36).slice(2,6).toUpperCase(); localStorage.setItem('pm_device_id',id); }
      var model=localStorage.getItem('pm_device_model')||uaModel()||'جهاز';
      return model+' · '+id;
    }catch(e){ return 'جهاز غير معروف'; }
  }
  function platformName(){
    var ua=navigator.userAgent||'';
    return /Android/i.test(ua)?'Android':/iPhone|iPad/i.test(ua)?'iOS':/Windows/i.test(ua)?'Windows':/Mac/i.test(ua)?'Mac':'متصفح';
  }
  function activeTab(){
    var t=document.querySelector('.tabs .tab.active');
    var p=document.querySelector('.panel.active');
    return ((t&&t.textContent)||'').trim()+(p?' ['+p.id+']':'');
  }
  function who(){
    var role=(typeof cloudActorRole!=='undefined'&&cloudActorRole)||'—';
    var name=(typeof cloudActorName!=='undefined'&&cloudActorName)||'غير مسجل';
    return name+' ('+role+')';
  }
  function opContext(body){
    body=body||{};
    var c={};
    if(body.action) c['العملية']=body.action+(body.party_action?' / '+body.party_action:'')+(body.drink_action?' / '+body.drink_action:'');
    if(body.receipt_id) c['معرف الفاتورة']=body.receipt_id;
    if(body.order_id) c['معرف الأوردر']=body.order_id;
    if(Array.isArray(body.cart)) c['عدد أصناف السلة']=body.cart.length;
    if(body.expected_revision!=null) c['الإصدار المتوقع']=body.expected_revision;
    return c;
  }
  function errorText(err){
    if(!err) return '';
    return String(err.message||err.code||err.error||err);
  }
  function fullReport(entry){
    var lines=[
      'الوقت: '+entry.time,
      'الجهاز: '+entry.device+' · '+entry.platform,
      'المستخدم: '+entry.who,
      'التبويب: '+entry.tab,
      'الإصدار السحابي المحلي: '+entry.localRevision
    ];
    Object.keys(entry.op||{}).forEach(function(k){ lines.push(k+': '+entry.op[k]); });
    if(entry.status) lines.push('كود الاستجابة: '+entry.status);
    lines.push('الرسالة: '+entry.message);
    return lines.join('\n');
  }
  function save(entry){
    try{
      var list=JSON.parse(localStorage.getItem(LOG_KEY)||'[]');
      if(!Array.isArray(list)) list=[];
      list.unshift(entry);
      localStorage.setItem(LOG_KEY,JSON.stringify(list.slice(0,100)));
    }catch(e){}
  }
  function copyText(text,btn){
    var done=function(){ if(btn){ btn.textContent='تم النسخ ✓'; } };
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(done,function(){ fallbackCopy(text); done(); }); return; }
    }catch(e){}
    fallbackCopy(text); done();
  }
  function fallbackCopy(text){
    var ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta);
    ta.select(); try{ document.execCommand('copy'); }catch(e){} ta.remove();
  }
  var SEEN_KEY='pm_diag_seen';
  
  
  // رسالة عربية بسيطة للموظف؛ التفاصيل التقنية بتفضل تحت
  function friendlyMsg(raw){
    var m=String(raw||'');
    if(/Failed to (send|fetch)|NetworkError|Load failed|network/i.test(m)) return 'المزامنة مع السحابة وقفت. اتأكد إن الإنترنت شغال وجرّب تاني.';
    if(/timeout|timed out|aborted/i.test(m)) return 'الاتصال بطيء ومش بيرد. جرّب تاني بعد شوية.';
    if(/JWT|401|403|expired|unauthori[sz]ed|permission/i.test(m)) return 'انتهت صلاحية الدخول أو مفيش صلاحية. سجّل خروج وادخل تاني.';
    if(/429|rate limit|too many/i.test(m)) return 'في طلبات كتير في وقت قصير. استنى دقيقة وجرّب تاني.';
    if(/\b5\d\d\b|server|internal/i.test(m)) return 'السيرفر مش متاح حالياً. جرّب تاني بعد شوية.';
    return 'حصلت مشكلة غير متوقعة. انسخ التفاصيل وابعتها للمدير.';
  }
  function retrySync(){
    var b=document.getElementById('pmSyncIcon');
    if(b){ b.click(); return true; }
    return false;
  }
  function showModal(entry){
    if(navigator.onLine===false) return;               // أوفلاين: بنسجل بس
    var key=String(entry.message||'').slice(0,160);
    var old=document.getElementById('pmDiagOv');
    if(old) old.remove();                              // كل خطأ بيفتح نافذة جديدة، من غير منع للتكرار
    lastModalAt=Date.now(); lastMsg=entry.message;

    var text=fullReport(entry);
    var ov=document.createElement('div'); ov.id='pmDiagOv'; ov.dataset.key=key;
    ov.innerHTML='<div class="pdg-box" role="alertdialog" aria-modal="true" aria-labelledby="pmDiagTitle">'+
      '<h3 id="pmDiagTitle">حصلت مشكلة</h3>'+
      '<p class="pdg-msg"></p>'+
      '<p class="pdg-dev">الجهاز: <b id="pmDiagName"></b></p>'+
      '<p class="pdg-cnt" id="pmDiagCnt" hidden></p>'+
      '<div class="pdg-acts">'+
        '<button type="button" id="pmDiagRetry" class="pdg-retry">إعادة المحاولة</button>'+
        '<button type="button" id="pmDiagWa" class="pdg-wa">ارسال للدعم الفني</button>'+
        '<button type="button" id="pmDiagCopy" class="pdg-copy">نسخ التفاصيل</button>'+
        '<button type="button" id="pmDiagRename" class="pdg-ren">تسمية الجهاز</button>'+
        '<button type="button" id="pmDiagClose" class="pdg-close">إغلاق</button>'+
      '</div>'+
      '<details class="pdg-det"><summary>عرض التفاصيل التقنية</summary>'+
        '<textarea readonly id="pmDiagText" dir="auto"></textarea>'+
      '</details>'+
    '</div>';
    document.body.appendChild(ov);
    ov.querySelector('.pdg-msg').textContent=friendlyMsg(entry.message);
    ov.querySelector('#pmDiagCnt').hidden=true;
    ov.querySelector('#pmDiagText').value=text;
    ov.querySelector('#pmDiagName').textContent=entry.device;

    function close(){
      document.removeEventListener('keydown',onKey);
      ov.remove();
    }
    function onKey(e){ if(e.key==='Escape') close(); }
    document.addEventListener('keydown',onKey);
    ov.addEventListener('click',function(e){ if(e.target===ov) close(); });   // الضغط على الخلفية يقفل

    ov.querySelector('#pmDiagClose').addEventListener('click',close);
    ov.querySelector('#pmDiagRetry').addEventListener('click',function(){
      close();
      retrySync();
    });
    ov.querySelector('#pmDiagWa').addEventListener('click',function(){
      var msg=ov.querySelector('#pmDiagText').value;
      window.open('https://wa.me/201508999341?text='+encodeURIComponent(msg),'_blank');
    });
    ov.querySelector('#pmDiagCopy').addEventListener('click',function(e){
      var btn=e.currentTarget, orig=btn.textContent;
      copyText(ov.querySelector('#pmDiagText').value,btn);
      setTimeout(function(){ btn.textContent=orig; },2000);
    });
    ov.querySelector('#pmDiagRename').addEventListener('click',function(){
      var n=prompt('اكتب اسم الجهاز (مثلاً: الكاشير، المطبخ، اللابتوب):', entry.device);
      if(n===null) return;
      n=String(n).trim().slice(0,40);
      if(!n) return;
      try{ localStorage.setItem('pm_device_name',n); }catch(e){}
      entry.device=n;
      ov.querySelector('#pmDiagName').textContent=n;
      ov.querySelector('#pmDiagText').value=fullReport(entry);
    });
  }

  function report(op,err,status,extra){
    var message=errorText(err)||'خطأ غير معروف';
    var entry={
      time:new Date().toLocaleString('ar-EG'),
      device:deviceName(), platform:platformName(),
      who:who(), tab:activeTab(),
      localRevision:(typeof cloudRevision!=='undefined'?cloudRevision:'—'),
      op:op||{}, status:status||'', message:message
    };
    if(extra) Object.keys(extra).forEach(function(k){ entry.op[k]=extra[k]; });
    try{
      entry.op['أصناف المنيو على الجهاز']=(typeof state!=='undefined'&&state&&Array.isArray(state.menu))?state.menu.length:'—';
      var q=JSON.parse(localStorage.getItem(KEY+'_pendingCloudSnapshot')||'null');
      if(q&&q.state) entry.op['أصناف المنيو في قائمة المزامنة المعلقة']=Array.isArray(q.state.menu)?q.state.menu.length:'—';
      var rec=localStorage.getItem('pm_last_recover');
      if(rec) entry.op['آخر استعادة من السحابة']=rec;
    }catch(e){}
    save(entry);
    showModal(entry);
  }

  cacheModel();
  // لما السيرفر يمنع الحفظ لأن المنيو هيبقى فاضي: الجهاز بيحمل نسخة قديمة/فاضية،
  // فبنرجّع النسخة اللي على السيرفر ونحفظ نسخة من المحلي قبل ما نستبدلها
  var lastRecover=0;
  function recoverFromCloud(){
    var now=Date.now();
    if(now-lastRecover<30000) return;
    lastRecover=now;
    try{ localStorage.setItem('pm_last_local_before_recover',JSON.stringify(state)); }catch(e){}
    orig({action:'get_state',employee_name:cloudActorName,pin:cloudActorPin}).then(function(got){
      var d=got&&got.data;
      if((got&&got.error)||!d||!d.state) return;
      cloudLoading=true;
      try{ clearTimeout(cloudSaveTimer); }catch(e){}
      try{ clearTimeout(queuedSyncTimer); }catch(e){}
      try{ localStorage.removeItem(KEY+'_pendingCloudSnapshot'); }catch(e){}
      state=migrateStateUnits(d.state);
      try{ localStorage.setItem('pm_last_recover',new Date().toLocaleString('ar-EG')+' · منيو='+(Array.isArray(state.menu)?state.menu.length:0)); }catch(e){}
      cloudRevision=Number(d.revision||cloudRevision);
      cloudLastSavedHash=JSON.stringify(state);
      try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(e){}
      cloudLoading=false;
      if(typeof renderAll==='function') renderAll();
      alert('المنيو اتحدّث من السحابة. جرّب التعديل تاني.');
    }).catch(function(){ cloudLoading=false; });
  }

  // كل استدعاء للسيرفر: لو رجع خطأ نسجل تفاصيل السياق (من غير الـ PIN)
  pmApiUse('diagnostics',function(orig){
    return function(body){
      var action=body&&body.action;
      var op=opContext(body);
      var quiet=QUIET.indexOf(action)>=0;
      var p;
      try{ p=orig.apply(this,arguments); }
      catch(e){ if(!quiet) report(op,e); throw e; }
      return Promise.resolve(p).then(function(r){
        if(!quiet && r && r.error){
          var st=r.error.context&&r.error.context.status;
          var permDenied=(action==='save_state' && st===403 && typeof cloudActorRole!=='undefined' && cloudActorRole!=='admin');
          /* رفض متوقع من قواعد العمل (مش عطل): مشروبات لسه معلّقة */
          if(action==='close_invoice' && /DRINKS_PENDING|قبل تحضير المشروبات/.test(errorText(r.error))) permDenied=true;
          if(!permDenied) report(op,r.error,st);
          if(action==='save_state' && /المنيو هيبقى فاضي/.test(errorText(r.error))) recoverFromCloud();
        }
        return r;
      },function(e){
        if(!quiet) report(op,e);
        throw e;
      });
    };
  });

  // أخطاء JavaScript غير متوقعة: بنعرف في أي تبويب حصلت
  window.addEventListener('error',function(ev){
    var m=(ev&&ev.message)||'';
    if(/ResizeObserver/.test(m)) return;
    report({'الملف':(ev&&ev.filename||'').split('/').pop()+':'+(ev&&ev.lineno||'')},{message:m});
  });
  window.addEventListener('unhandledrejection',function(ev){
    var r=ev&&ev.reason;
    report({},{message:errorText(r)||'خطأ غير معالج'});
  });

})();
}catch(e){console.error('[PastryMY] 075-admin-diagnostics.js failed',e)}
