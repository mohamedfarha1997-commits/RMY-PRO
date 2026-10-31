/* إدخال الوصفة الأذكى:
   1) الوحدة تتملى تلقائياً من الخامة (المخزون ← أسعار الخامات ← آخر وصفة استخدمتها)
      لو الشيف ما اختارش وحدة بنفسه.
   2) حفظ تلقائي للمسودة في الجهاز، ولو اتقفل التطبيق أو الموبايل الوصفة بترجع. */
(function(){
  if(window.__pmRecipeSmart) return; window.__pmRecipeSmart=true;

  var DKEY='pm_recipe_draft_v1';
  var MAX_AGE=7*24*60*60*1000;
  var dirty=false, lastSnap='';

  function ed(){ return document.getElementById('recipeEditor'); }
  function isRecipeEditorReady(){ return !!(ed() && document.getElementById('recipeName')); }
  function editKey(){ var e=document.getElementById('editProduct'); return (e&&e.value)||'__new__'; }
  function unitsList(){ return (typeof UNITS!=='undefined' && Array.isArray(UNITS)) ? UNITS : []; }
  function validUnit(u){ return !!u && unitsList().indexOf(u)>=0; }

  /* ---------- 1) الوحدة التلقائية ---------- */
  function unitFor(name){
    var n=String(name||'').trim();
    if(!n || typeof state==='undefined' || !state) return null;
    var inv=(state.inventory||[]).find(function(x){ return x && x.name===n && validUnit(x.unit); });
    if(inv) return inv.unit;
    var p=(state.prices||{})[n];
    if(p && validUnit(p.packUnit)) return p.packUnit;
    var last=null;
    Object.keys(state.recipes||{}).forEach(function(k){
      (state.recipes[k]||[]).forEach(function(c){ if(c && c.name===n && validUnit(c.unit)) last=c.unit; });
    });
    return last;
  }
  function applyUnit(row){
    if(!row || row.dataset.unitTouched==='1') return;
    var nameEl=row.querySelector('.cname'), unitEl=row.querySelector('.cunit');
    if(!nameEl || !unitEl) return;
    var u=unitFor(nameEl.value);
    if(u) unitEl.value=u;
  }

  // الشيف غيّر الوحدة بنفسه → ما نغيّرهاش تاني
  document.addEventListener('change', function(e){
    var t=e.target;
    if(!t || !t.closest || !t.closest('#recipeEditor')) return;
    if(t.matches('.cunit')){ var r=t.closest('.comp-row'); if(r) r.dataset.unitTouched='1'; }
    else if(t.matches('.cname')){ applyUnit(t.closest('.comp-row')); }
  }, true);

  // اختيار خامة من الاقتراحات (الأزرار) بيضيف صف فيه الاسم، فنملّي الوحدة فوراً
  var oAdd=window.pmAddRow;
  if(typeof oAdd==='function'){
    window.pmAddRow=function(stage,name){
      oAdd.apply(this,arguments);
      if(name){
        var box=document.querySelector('[data-rows="'+stage+'"]');
        var r=box && box.lastElementChild;
        if(r) applyUnit(r);
      }
    };
  }

  /* ---------- 2) المسودة ---------- */
  function mark(e){
    var t=e.target;
    if(t && t.closest && t.closest('#recipeEditor')) dirty=true;
  }
  document.addEventListener('input', mark, true);
  document.addEventListener('click', mark, true);
  document.addEventListener('change', mark, true);

  function snapshot(){
    if(!isRecipeEditorReady()) return null;
    var v=function(id){ var el=document.getElementById(id); return el?el.value:''; };
    var rows=[].slice.call(ed().querySelectorAll('.comp-row')).map(function(r){
      var st=r.querySelector('.cstage');
      return {
        name:(r.querySelector('.cname')||{}).value||'',
        qty:(r.querySelector('.cqty')||{}).value||'',
        unit:(r.querySelector('.cunit')||{}).value||'',
        stage:(st&&st.value)||'prep'
      };
    });
    return {
      key:editKey(),
      name:v('recipeName'), temp:v('recipeTemp'), time:v('recipeTime'), note:v('recipeNote'),
      stoveTemp:v('stoveTemp'), stoveTime:v('stoveTime'), stoveNote:v('stoveNote'),
      rows:rows
    };
  }

  function isEmpty(s){
    return !s.name.trim() && !s.note.trim() && !s.temp && !s.time && !s.stoveTemp && !s.stoveTime && !s.stoveNote &&
      !s.rows.some(function(r){ return r.name.trim() || r.qty; });
  }

  function saveDraft(){
    var s=snapshot(); if(!s) return;
    var j=JSON.stringify(s);
    if(j===lastSnap) return;
    lastSnap=j;
    try{
      if(isEmpty(s)) localStorage.removeItem(DKEY);
      else localStorage.setItem(DKEY, JSON.stringify(Object.assign({savedAt:Date.now()}, s)));
    }catch(e){}
  }

  function readDraft(){
    try{ return JSON.parse(localStorage.getItem(DKEY)||'null'); }catch(e){ return null; }
  }

  function clearDraft(){
    try{ localStorage.removeItem(DKEY); }catch(e){}
    lastSnap='';
  }

  function restoreDraft(){
    if(!isRecipeEditorReady()) return;
    var d=readDraft();
    if(!d || d.key!==editKey()) return;
    if(!d.savedAt || Date.now()-d.savedAt>MAX_AGE){ clearDraft(); return; }

    var set=function(id,val){ var el=document.getElementById(id); if(el && val!=null) el.value=val; };
    set('recipeName', d.name); set('recipeTemp', d.temp); set('recipeTime', d.time); set('recipeNote', d.note);
    set('stoveTemp', d.stoveTemp); set('stoveTime', d.stoveTime); set('stoveNote', d.stoveNote);

    [].slice.call(ed().querySelectorAll('.comp-row')).forEach(function(r){ r.remove(); });
    (d.rows||[]).forEach(function(r){
      var stage=['prep','oven','stove','fin'].indexOf(r.stage)>=0 ? r.stage : 'prep';
      var box=ed().querySelector('[data-rows="'+stage+'"]');
      if(box && typeof pmRowHtml==='function'){
        box.insertAdjacentHTML('beforeend', pmRowHtml({name:r.name, qty:r.qty, unit:r.unit||'جرام'}, stage));
        var row=box.lastElementChild;
        if(row) row.dataset.unitTouched='1';   // اللي اتحفظ هو اختيار الشيف، ما نغيّروش
      }
    });

    var note=document.createElement('div');
    note.className='notice-ok pm-draft-note';
    note.style.margin='8px 0';
    note.innerHTML='تم استرجاع مسودة محفوظة. ';
    var btn=document.createElement('button');
    btn.type='button'; btn.className='secondary mini';
    btn.textContent='تجاهل المسودة';
    btn.onclick=function(){
      clearDraft(); dirty=false;
      if(typeof window.renderRecipeEditor==='function') window.renderRecipeEditor();
    };
    note.appendChild(btn);
    ed().insertBefore(note, ed().firstChild);

    lastSnap=JSON.stringify(snapshot());
    dirty=false;
  }

  // بعد كل إعادة رسم للمحرر: نبدأ نظيف ونرجّع المسودة لو تخص نفس الوصفة
  var oRender=window.renderRecipeEditor;
  if(typeof oRender==='function'){
    window.renderRecipeEditor=function(){
      dirty=false; lastSnap='';
      var r=oRender.apply(this,arguments);
      restoreDraft();
      return r;
    };
  }

  // بعد الحفظ الناجح: المسودة تتمسح
  var oSave=window.saveRecipe;
  if(typeof oSave==='function'){
    window.saveRecipe=function(){
      var r=oSave.apply(this,arguments);
      var nm=((document.getElementById('recipeName')||{}).value||'').trim();
      if(nm && typeof state!=='undefined' && state && state.recipes && state.recipes[nm]){
        clearDraft(); dirty=false;
      }
      return r;
    };
  }

  setInterval(function(){ if(dirty) saveDraft(); }, 1200);
  document.addEventListener('visibilitychange', function(){ if(document.hidden && dirty) saveDraft(); });
  window.addEventListener('pagehide', function(){ if(dirty) saveDraft(); });

  // للاختبار فقط
  window.__pmDraft={snapshot:snapshot, saveDraft:saveDraft, restoreDraft:restoreDraft, unitFor:unitFor};
})();
