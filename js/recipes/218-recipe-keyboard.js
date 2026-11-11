/* ---- 218-recipe-keyboard.js ----
   كيبورد سريع لإدخال الوصفات (تبويب الوصفات):
   - Ctrl+N (أو Alt+N) = صنف/وصفة جديدة. بيفتح خانة اسم الصنف، Enter بيأكد الاسم، وبعدها المؤشر ينزل على أول مكوّن.
   - اسم المكوّن  ──Enter──►  الكمية  ──Enter──►  الوحدة (الوزن)  ──Enter──►  اسم مكوّن جديد (سطر جديد تلقائي)
   - اسم الصنف ──Enter──► أول مكوّن.
   - Ctrl+Enter = حفظ الوصفة.
   - لو قايمة اقتراحات الخامات مفتوحة، أول Enter بيختار الاقتراح (زي ما كان)، والتاني بينقل للكمية. */
(function(){
  'use strict';
  if(window.__pmRecipeKb) return; window.__pmRecipeKb=true;

  function $(id){ return document.getElementById(id); }
  function inRecipes(){ var p=$('recipes'); return !!(p && p.classList.contains('active')); }
  function editor(){ return $('recipeEditor'); }

  function focusSel(el){ if(!el) return; try{ el.focus(); if(el.select) el.select(); }catch(e){} }

  function firstName(){ var ed=editor(); return ed && ed.querySelector('.comp-row .cname'); }

  function newRecipe(){
    var btn=$('newRecipe');
    if(!btn || btn.offsetParent===null) return;
    var before=($('editProduct')||{}).value;
    btn.click();                       /* prompt اسم الصنف: Enter = تأكيد */
    var after=($('editProduct')||{}).value;
    if(after && after!==before) setTimeout(function(){
      var rn=$('recipeName'), n=firstName();
      focusSel(n || rn);
    },60);
  }

  function nextRow(row){
    var stage=(row.querySelector('.cstage')||{}).value||'prep';
    var nx=row.nextElementSibling;
    if(nx && nx.classList.contains('comp-row')){ focusSel(nx.querySelector('.cname')); return; }
    if(typeof window.pmAddRow==='function'){ window.pmAddRow(stage); }   /* بيضيف سطر ويركّز على اسمه */
    else { var r=row.parentElement.lastElementChild; focusSel(r && r.querySelector('.cname')); }
  }

  document.addEventListener('keydown',function(e){
    if(!inRecipes()) return;

    /* صنف جديد */
    if((e.ctrlKey||e.metaKey||e.altKey) && !e.shiftKey && (e.code==='KeyN'||e.key==='n'||e.key==='N')){
      e.preventDefault(); e.stopPropagation(); newRecipe(); return;
    }

    var t=e.target;
    if(!t || !t.closest || !t.closest('#recipeEditor')) return;

    /* حفظ */
    if(e.key==='Enter' && (e.ctrlKey||e.metaKey)){
      e.preventDefault(); var s=$('saveRecipe'); if(s) s.click(); return;
    }

    if(e.key!=='Enter' || e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

    if(t.id==='recipeName'){
      e.preventDefault();
      var f=firstName(); if(!f && typeof window.pmAddRow==='function'){ window.pmAddRow('prep'); return; }
      focusSel(f); return;
    }

    var row=t.closest('.comp-row'); if(!row) return;
    if(t.classList.contains('cname')){ e.preventDefault(); focusSel(row.querySelector('.cqty')); }
    else if(t.classList.contains('cqty')){ e.preventDefault(); focusSel(row.querySelector('.cunit')); }
    else if(t.classList.contains('cunit')){ e.preventDefault(); nextRow(row); }
  });
})();
