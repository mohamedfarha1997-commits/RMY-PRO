/* 042-sheets-fab.js — اتدمجت من: 042-ui-bottom-sheets.js، 045-ui-hide-fab.js */
/* ---- 042-ui-bottom-sheets.js ---- */
try{
(function(){
  var TITLES={pmMsgWrap:'الرسايل'};
  var bg=null;
  function ensureBg(){
    if(bg) return bg;
    bg=document.getElementById('pmSheetBg');
    if(!bg){ bg=document.createElement('div'); bg.id='pmSheetBg'; document.body.appendChild(bg); }
    bg.addEventListener('click',function(){
      document.querySelectorAll('.pm-sheet-s').forEach(function(p){ p.style.display='none' });
    });
    return bg;
  }
  // ينقل اللوحات من داخل الشريط (اللي فيه transform وبيكسر الـ fixed) لآخر الصفحة
  function adopt(){
    Object.keys(TITLES).forEach(function(id){
      var w=document.getElementById(id); if(!w) return;
      Array.prototype.forEach.call(w.children,function(ch){
        if(ch.tagName!=='DIV' || ch.id==='pmBellPanel' || ch.classList.contains('pm-sheet-s')) return;
        ch.classList.add('pm-sheet-s');
        document.body.appendChild(ch);
        var st=ch.style;
        st.setProperty('position','fixed','important');
        st.setProperty('left','0','important');
        st.setProperty('right','0','important');
        st.setProperty('top','auto','important');
        st.setProperty('bottom','0','important');
        st.setProperty('width','100%','important');
        st.setProperty('max-width','520px','important');
        st.setProperty('margin','0 auto','important');
        st.setProperty('z-index','11260','important');
        if(!ch.querySelector('.pm-grab-s')){
          var g=document.createElement('div'); g.className='pm-grab-s';
          var h=document.createElement('h3'); h.className='pm-h-s'; h.textContent=TITLES[id]; h.style.flex='1'; h.style.margin='0';
          var head=document.createElement('div'); head.style.cssText='display:flex;align-items:center;gap:8px;margin:0 0 12px';
          head.appendChild(h);
          var bx=document.createElement('button'); bx.type='button'; bx.className='pm-close-s'; bx.textContent='إغلاق';
          bx.style.cssText='display:block;width:100%;margin:16px 0 4px;padding:12px;border-radius:14px;border:1px solid rgba(0,0,0,.14);background:#FFFFFF;color:#1B1B1B;font:inherit;font-weight:800;font-size:15px;cursor:pointer';
          bx.addEventListener('click',function(){ ch.style.display='none' });
          ch.appendChild(bx);
          ch.insertBefore(head,ch.firstChild); ch.insertBefore(g,ch.firstChild);
        }
      });
    });
  }
  function sync(){
    // زر الإغلاق لازم يفضل آخر عنصر في الورقة (تحت)، حتى لو اتضاف محتوى جديد بعده
    document.querySelectorAll('.pm-sheet-s').forEach(function(p){
      var bx=p.querySelector('.pm-close-s');
      if(bx && p.lastElementChild!==bx) p.appendChild(bx);
    });
    var open=Array.prototype.some.call(document.querySelectorAll('.pm-sheet-s'),function(p){
      return p.style.display && p.style.display!=='none';
    });
    ensureBg().classList.toggle('show',open);
  }
  ensureBg();
  setInterval(function(){ adopt(); sync(); },250);
})();
}catch(e){console.error('[PastryMY] 042-ui-bottom-sheets.js failed',e)}
/* ---- 045-ui-hide-fab.js ---- */
try{
(function(){
  var SEL='#pmSheetBg.show,.pm-sheet.show,.pm-pal.show,#pmDevSheet:not([hidden]),#messageDialog.show,.pm-sheet-s';
  function isOpen(){
    var els=document.querySelectorAll(SEL);
    for(var i=0;i<els.length;i++){
      if(getComputedStyle(els[i]).display!=='none') return true;
    }
    return false;
  }
  setInterval(function(){ document.body.classList.toggle('pm-overlay-open', isOpen()); },200);
})();
}catch(e){console.error('[PastryMY] 045-ui-hide-fab.js failed',e)}
