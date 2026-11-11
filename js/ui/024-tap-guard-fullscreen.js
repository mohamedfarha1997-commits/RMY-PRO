/* 024-tap-guard-fullscreen.js — اتدمجت من: 024-ui-tap-guard.js، 025-ui-fullscreen.js */
/* ---- 024-ui-tap-guard.js ---- */
try{
(function(){
  /* طبقة حماية: أي عنصر ثابت (fixed) مخفي أو خارج الشاشة مابيكونش ماسك اللمس، وده بيرجع يشتغل أول ما يظهر */
  if(window.__pmTapGuard)return; window.__pmTapGuard=true;
  function sweep(){
    var all=document.body.querySelectorAll('*');
    for(var i=0;i<all.length;i++){
      var el=all[i];
      var cs=getComputedStyle(el);
      if(cs.position!=='fixed')continue;
      var r=el.getBoundingClientRect();
      var hidden = cs.display==='none' || cs.visibility==='hidden' || parseFloat(cs.opacity)===0 ||
                   r.width===0 || r.height===0 || r.bottom<=0 || r.top>=innerHeight || r.right<=0 || r.left>=innerWidth;
      if(hidden){
        if(el.dataset.pmPe===undefined){ el.dataset.pmPe=el.style.pointerEvents||'__'; el.style.pointerEvents='none'; }
      }else if(el.dataset.pmPe!==undefined){
        el.style.pointerEvents=el.dataset.pmPe==='__'?'':el.dataset.pmPe;
        delete el.dataset.pmPe;
      }
    }
  }
  var t=null;
  function later(){ clearTimeout(t); t=setTimeout(sweep,120) }
  new MutationObserver(later).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  window.addEventListener('resize',later);
  window.addEventListener('scroll',later,{passive:true});
  setInterval(sweep,2000);
  sweep();
})();
}catch(e){console.error('[PastryMY] 024-ui-tap-guard.js failed',e)}
/* ---- 025-ui-fullscreen.js ---- */
try{
(function(){
  if(window.__pmFs)return; window.__pmFs=true;
  var ICON=(window.__PMUI__&&window.__PMUI__.iconHTML)?window.__PMUI__.iconHTML('expand'):'';
  function fsEl(){ return document.fullscreenElement||document.webkitFullscreenElement||null }
  function isFs(){ return !!fsEl() }
  function enter(){
    var el=document.documentElement;
    var req=el.requestFullscreen||el.webkitRequestFullscreen;
    if(!req){ alert('ملء الشاشة مش مدعوم على المتصفح ده. على الآيفون: من زرار المشاركة في Safari اختار "إضافة إلى الشاشة الرئيسية" وافتح البرنامج منها.'); return }
    try{
      var p=req.call(el,{navigationUI:'hide'});
      if(p&&p.catch) p.catch(function(){ alert('المتصفح رفض ملء الشاشة. جرّب تاني بعد ما تضغط على الشاشة.') });
    }catch(e){ alert('تعذر ملء الشاشة على الجهاز ده.') }
  }
  function exit(){
    var ex=document.exitFullscreen||document.webkitExitFullscreen;
    if(ex) try{ ex.call(document) }catch(e){}
  }
  function toggle(){ isFs()?exit():enter() }
  function label(){
    var b=document.getElementById('pmFsBtn'); if(!b)return;
    b.querySelector('span:last-child').textContent=isFs()?'إنهاء ملء الشاشة':'ملء الشاشة';
  }
  function addButton(){
    var menu=document.querySelector('.pm-menu'); if(!menu||document.getElementById('pmFsBtn'))return;
    var b=document.createElement('button');
    b.id='pmFsBtn'; b.type='button'; b.className='pm-mi';
    b.innerHTML=ICON+'<span>ملء الشاشة</span>';
    b.addEventListener('click',function(e){
      e.stopPropagation();
      var fab=document.querySelector('.pm-fabs'); if(fab)fab.classList.remove('open');
      toggle();
    });
    menu.appendChild(b);
    label();
  }
  document.addEventListener('fullscreenchange',label);
  document.addEventListener('webkitfullscreenchange',label);
  addButton();
  setTimeout(addButton,800);
})();
}catch(e){console.error('[PastryMY] 025-ui-fullscreen.js failed',e)}
