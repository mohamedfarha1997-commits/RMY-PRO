function renderStock(){let q=($('stockSearch').value||'').trim().toLowerCase();let arr=state.inventory.filter(x=>String(x.name||'').toLowerCase().includes(q));const kitchen=cloudActorRole==='kitchen';$('stockTable').innerHTML=arr.length?`<table><tr><th>الخامة</th><th>الوحدة</th><th>الرصيد</th><th>حالة المخزون</th>${kitchen?'':'<th>تعديل</th><th>حذف</th>'}</tr>${arr.map(x=>{const p=(state.prices||{})[x.name]||{},reorder=Number(p.reorder)||0,low=reorder>0&&norm(x.qty,x.unit)<=norm(reorder,x.unit);const status=Number(x.qty)<=0?'<span class="pill low">نفد</span>':low?'<span class="pill warn">إعادة طلب</span>':'<span class="pill">متوفر</span>';return `<tr class="${Number(x.qty)<=0?'pm-stock-empty':low?'pm-stock-low':''}"><td>${esc(x.name)}</td><td>${esc(x.unit)}</td><td>${nfmt(x.qty)}</td><td>${status}${reorder>0?`<div class="small">حد الطلب: ${nfmt(reorder)} ${esc(x.unit)}</div>`:''}</td>${kitchen?'':`<td><button class="secondary mini" onclick="adjustStock('${encodeURIComponent(x.name)}')">تعديل</button></td><td><button class="danger mini" onclick="deleteStock('${encodeURIComponent(x.name)}')">حذف</button></td>`}</tr>`}).join('')}</table>`:'<div class="empty">لا توجد نتائج.</div>';if(kitchen){const a=$('addStock');if(a)a.closest('.card').style.display='none';}}
window.deleteStock=encoded=>{const name=decodeURIComponent(encoded),x=state.inventory.find(y=>y.name===name);if(!x)return;const recipeUses=Object.entries(state.recipes||{}).filter(([rn,cs])=>(cs||[]).some(c=>c.name===name)).map(([rn])=>rn);const msg=`حذف شامل للخامة «${name}»؟\n\nسيتم حذفها من المخزون والأسعار وسجل الحركات والمشتريات والأرشيفات الشهرية، وإزالتها من الطلبات/القوائم النشطة المرتبطة بها إن وجدت.\n\nلن تُحذف من الوصفات (${recipeUses.length} وصفة تستخدمها)، لذلك قد تظهر ضمن مكونات الوصفات وتحتاج إلى خامة مخزون جديدة عند الرغبة في استخدامها.\n\nهذا الإجراء لا يمكن التراجع عنه إلا باستعادة نسخة احتياطية.`;if(!confirm(msg))return;const before=clone(state);try{state.inventory=(state.inventory||[]).filter(y=>y.name!==name);if(state.prices)delete state.prices[name];state.history=(state.history||[]).filter(y=>y.name!==name);state.purchasesLog=(state.purchasesLog||[]).filter(y=>y.name!==name);state.monthlyArchives=(state.monthlyArchives||[]).map(a=>({...a,inventory:(a.inventory||[]).filter(y=>y.name!==name),history:(a.history||[]).filter(y=>y.name!==name),purchasesLog:(a.purchasesLog||[]).filter(y=>y.name!==name)}));save();renderAll();if(typeof toast==='function')toast({k:'success',t:'حذف الخامة',x:`تم حذف «${name}» من المخزون والأسعار والحركات والمشتريات والأرشيفات. بقيت مكونات الوصفات كما طلبت.`});else alert(`تم حذف «${name}» من جميع الأقسام عدا الوصفات.`)}catch(e){state=before;renderAll();alert('تعذر إكمال الحذف؛ تمت استعادة البيانات السابقة. '+(e.message||''))}};
window.adjustStock=encoded=>{let name=decodeURIComponent(encoded),x=state.inventory.find(y=>y.name===name);if(!x)return;let v=prompt(`تعديل الرصيد الحالي لـ ${name} (${x.unit})`,String(x.qty));if(v===null)return;let q=Number(v);if(!Number.isFinite(q)||q<0){alert('أدخل رصيدًا صحيحًا لا يقل عن صفر.');return}let diff=q-x.qty;x.qty=q;if(diff!==0)state.history.unshift({date:formatDate(),name,add:diff>0?diff:0,deduct:diff<0?-diff:0,balance:q,unit:x.unit,note:'تعديل يدوي للرصيد'});save()};
function renderOrder(){
  /* مراحل التحضير: ثلاث مربعات تحت بعض، والصنف بيتنقل للمربع اللي تحته مع كل ضغطة */
  const STAGES=[['new','جديد','بدء التحضير'],['doing','جاري التحضير','جاهز'],['ready','جاهز للتسليم','تسليم']];
  const list=state.orders||[];
  const boxes=STAGES.map(([st,title,btn])=>{
    const rows=list.map((x,i)=>({x,i})).filter(({x})=>(x.status||'new')===st);
    const body=rows.length?rows.map(({x,i})=>`<div class="prep-card"><div class="prep-info"><b>${esc(x.name)}</b><span>${nfmt(x.qty)} وزنة</span></div><div class="prep-acts"><button class="primary mini" onclick="pmPrepNext(${i})">${btn}</button>${st==="doing"?"":`<button class="danger mini" onclick="removeOrder(${i})">حذف</button>`}</div></div>`).join(''):'<div class="empty">لا يوجد أصناف في هذه المرحلة</div>';
    return `<section class="prep-box prep-${st}"><div class="prep-head"><h3>${title}</h3><span class="prep-count">${rows.length}</span></div>${body}</section>`;
  }).join('');
  $('orderItems').innerHTML=`<div class="prep-board">${boxes}</div>`;
}


/* خصم الخامات لأوردر واحد لما يبدأ التحضير، وباقي الأوردرات بتفضل زي ما هي */
window.pmDeductOne=async function(i){
  const o=state.orders[i]; if(!o) return false;
  if(!cloudReady||!cloudActorName||!cloudActorPin){ alert('يلزم الاتصال بالسحابة قبل خصم الخامات.'); return false; }
  /* فحص النواقص لهذا الأوردر بس */
  const saved=state.orders; state.orders=[clone(o)];
  const need=calculate().map(x=>({name:x.name,unit:x.unit,need:x.qty,have:getStock(x.name,x.unit)})).filter(x=>x.need>x.have+1e-9);
  state.orders=saved;
  if(need.length){
    alert('المخزون لا يكفي لبدء «'+o.name+'». الخامات الناقصة:\n'+need.map(x=>'- '+x.name+': ناقص '+Number((x.need-x.have).toFixed(2))+' '+x.unit).join('\n'));
    const sp=document.getElementById('showPurchases'); if(sp) sp.click();
    return false;
  }
  const requestId=crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(16).slice(2);
  const {data,error}=await apiCall({action:'confirm_production',orders:[{name:o.name,qty:o.qty}],ready:{[o.name]:0},request_id:requestId,employee_name:cloudActorName,pin:cloudActorPin,expected_revision:cloudRevision});
  if(error){
    const msg=String(error.message||'');
    if(msg.includes('INSUFFICIENT_STOCK')) alert('المخزون على الخادم لا يكفي «'+o.name+'». حمّل آخر نسخة وراجع النواقص.');
    else if(msg.includes('REVISION_CONFLICT')||(error.context&&error.context.status===409)) alert('تغيّرت البيانات على جهاز آخر. حمّل آخر نسخة سحابية ثم أعد المحاولة.');
    else alert('لم يتم خصم الخامات. '+(msg||'تحقق من الاتصال ثم أعد المحاولة.'));
    return false;
  }
  /* نحمّل المخزون الجديد من الخادم، ونحافظ على الطلبات الموجودة عندنا */
  const {data:remote,error:loadError}=await apiCall({action:'get_state',employee_name:cloudActorName,pin:cloudActorPin});
  if(loadError||!remote?.state){ alert('تم خصم الخامات، لكن تعذر تحديث الشاشة. حمّل آخر نسخة سحابية.'); return true; }
  const keep=clone(state.orders||[]);
  cloudLoading=true;
  state=migrateStateUnits(remote.state);
  state.orders=keep;
  if(!Array.isArray(state.history))state.history=[];
  if(!Array.isArray(state.productionLog))state.productionLog=[];
  if(!state.prices)state.prices={};
  if(!state.recipeMeta)state.recipeMeta={};
  cloudRevision=Number(remote.revision||data?.revision||cloudRevision);
  cloudLastSavedHash=JSON.stringify(state);
  cloudLoading=false;
  return true;
};

window.pmFlushOrders=async function(){
  if(!cloudReady||!cloudActorName||!cloudActorPin) return;
  try{ await persistCloudSnapshot(clone(state)); }
  catch(e){ alert('الحالة اتغيرت على الجهاز بس ماتحفظتش في السحابة. استنى ثواني واضغط تحديث قبل ما تقفل التطبيق. ('+(e.message||'')+')'); }
};
window.pmPrepNext=function(i){
  const o=state.orders[i]; if(!o) return;
  const st=o.status||'new';
  if(st==='new'){
    if(window.__pmPrepBusy) return;
    window.__pmPrepBusy=true;
    Promise.resolve(window.pmDeductOne(i)).then(async function(ok){
      window.__pmPrepBusy=false;
      if(!ok) return;
      var __k=-1;
      for(var __j=0;__j<state.orders.length;__j++){ var __x=state.orders[__j]; if(__x&&__x.name===o.name&&Number(__x.qty)===Number(o.qty)&&(__x.status||'new')==='new'){ __k=__j; break; } }
      if(__k>=0) state.orders[__k].status='doing'; else state.orders.push({name:o.name,qty:o.qty,status:'doing'});
      save();
      await window.pmFlushOrders();
    }, function(e){ window.__pmPrepBusy=false; cloudLoading=false; alert('تعذر خصم الخامات: '+(e&&e.message||'')); });
    return;
  }
  if(st==='doing'){ o.status='ready'; save(); window.pmFlushOrders(); return; }
  /* تسليم: العدد اللي طلع بيتضاف للمنيو (readyStock) والصنف يتشال من الطلب */
  const map=(typeof window.__pmAskReady==='function')?window.__pmAskReady([o]):null;
  if(!map) return;
  const n=Number(map[o.name])||0;
  state.readyStock=state.readyStock||{};
  state.readyStock[o.name]=(Number(state.readyStock[o.name])||0)+n;
  state.orders.splice(i,1);
  $('orderResult').innerHTML='';
  if(!Array.isArray(state.productionPieces))state.productionPieces=[];
  if(n>0)state.productionPieces.push({id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(16).slice(2)),date:new Date().toISOString(),name:o.name,pieces:n,by:cloudActorName||''});
  if(n>0&&['kitchen','barista'].includes(cloudActorRole)){
    (async()=>{try{
      const rid=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2));
      const {data:rd,error:rErr}=await apiCall({action:'add_ready_pieces',name:o.name,pieces:n,request_id:rid,employee_name:cloudActorName,pin:cloudActorPin});
      if(rErr) throw rErr;
      if(rd&&rd.readyStock){state.readyStock=rd.readyStock;renderAll();}
    }catch(e){alert('تم التسليم محليًا لكن تعذر تسجيله على السحابة: '+(e.message||'تحقق من الاتصال'));}})();
  }
  save();
  /* القطع الجاهزة لازم تتسجل على السيرفر كفرق (مش قيمة كاملة) عشان المنيو يظهر عند الكل */
  /* readyStock بيتحفظ مع الحالة كاملة على السحابة (LIVE_SECTIONS)، فمفيش داعي لطلب منفصل add_ready_pieces
     اللي السيرفر مش بيدعمه (UNKNOWN_ACTION) */
  if(typeof window.__pmSendNotice==='function'){
    window.__pmSendNotice(['sales'],'تم تسليم '+o.name,o.name+' × '+n+' قطعة\nأضيفت للمنيو');
  }
};
window.removeOrder=i=>{state.orders.splice(i,1);$('orderResult').innerHTML='';save()};

function calculate(){let totals={};for(const it of state.orders){for(const c of (state.recipes[it.name]||[])){let u=unitBase(c.unit),key=c.name+'||'+u;if(!totals[key])totals[key]={name:c.name,unit:u,qty:0};totals[key].qty+=norm(c.qty,c.unit)*Number(it.qty)}}return Object.values(totals)}
function costOf(name,unit,qty){let p=state.prices[name];if(!p)return null;let requestedUnit=unitBase(unit);let __pu=unitBase(p.packUnit||unit);if(requestedUnit!==__pu){const __cv=window.RMYCalc?RMYCalc.bridgeBase(name,requestedUnit,qty,__pu):null;if(__cv===null)return null;qty=__cv}/* المتوسط المرجح (بيتحسب عند كل شراء) أولى من سعر آخر شراء */if(Number(p.avgUnitCost)>0)return qty*Number(p.avgUnitCost);if(!(Number(p.purchasePrice)>0&&Number(p.packSize)>0))return null;let pack=norm(p.packSize,p.packUnit||unit);if(!pack)return null;return qty*Number(p.purchasePrice)/pack}
function renderResult(){let t=calculate();if(!t.length){$('orderResult').innerHTML='<div class="empty">أضف صنفًا ثم اضغط حساب المكونات.</div>';return}let totalCost=0,unknown=0;let rows=t.map(x=>{let have=getStock(x.name,x.unit),short=Math.max(0,x.qty-have),cost=costOf(x.name,x.unit,x.qty),shown=formatAggregate(x.qty,x.unit);if(cost===null)unknown++;else totalCost+=cost;const scale=x.unit==='لتر'&&shown.unit!=='لتر'?factor(shown.unit):1;return {...x,have,short,cost,shown,shownHave:have/scale,shownShort:short/scale}});let shortages=rows.filter(x=>x.short>1e-9);$('orderResult').innerHTML=`<h3>إجمالي مكونات الطلب</h3>${shortages.length?`<div class="danger-note">يوجد عجز في ${shortages.length} خامة. لن يتم خصم الطلب حتى يتم توفيرها أو تعديل الكميات.</div>`:'<div class="notice-ok">المخزون الحالي يكفي الطلب حسب الأرصدة المسجلة.</div>'}<div class="tablewrap"><table><tr><th>الخامة</th><th>المطلوب</th><th>المتاح</th><th>العجز</th><th>الوحدة</th><th>تكلفة تقديرية</th></tr>${rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${nfmt(x.shown.qty)}</td><td>${nfmt(x.shownHave)}</td><td>${x.short>1e-9?`<span class="pill low">${nfmt(x.shownShort)}</span>`:'0'}</td><td>${esc(x.shown.unit)}</td><td>${x.cost===null?'غير محدد':moneyFmt(x.cost)+' ج.م'}</td></tr>`).join('')}</table></div><div class="stat" style="margin-top:10px"><b>${moneyFmt(totalCost)} ج.م</b><span>التكلفة التقديرية للخامات المسعّرة${unknown?` · ${unknown} مكون بلا سعر`:''}</span></div>`}
async function deductOrder(){const produced=clone(state.orders||[]).map(({status,...r})=>r);if(!produced.length){alert('أضف أصنافًا للطلب أولًا.');return}{const __short=calculate().map(x=>({name:x.name,unit:x.unit,need:x.qty,have:getStock(x.name,x.unit)})).filter(x=>x.need>x.have+1e-9);if(__short.length){alert('المخزون لا يكفي هذا الإنتاج. الخامات الناقصة:\n'+__short.map(x=>'- '+x.name+': ناقص '+Number((x.need-x.have).toFixed(2))+' '+x.unit).join('\n'));const sp=document.getElementById('showPurchases');if(sp)sp.click();return}}if(!cloudReady||!cloudActorName||!cloudActorPin){alert('يلزم الاتصال بالسحابة قبل تأكيد الإنتاج.');return}if(!window.__pmSkipConfirm){if(!confirm('تأكيد الإنتاج؟ سيعيد الخادم التحقق من الوصفات والمخزون ثم يخصم الخامات مرة واحدة فقط.'))return;window.__pmRetried=false}var __pmReadyIsRetry=!!window.__pmSkipConfirm;window.__pmSkipConfirm=false;/* الخصم بس من المخزون: مش بنسأل عن عدد القطع ولا بنزود المنيو هنا، التسليم هو اللي بيزود المنيو */var __pmReadyMap=__pmReadyIsRetry?window.__pmPendingReady:(function(){var z={};produced.forEach(function(o){if(o&&o.name)z[String(o.name)]=0});return z})();if(!__pmReadyMap)return;window.__pmPendingReady=__pmReadyMap;const beforeInventory=clone(state.inventory||[]),beforeHistory=clone(state.history||[]);const btn=$('deductOrder');if(btn)btn.disabled=true;try{const requestId=pendingProductionRequestId||(crypto.randomUUID?crypto.randomUUID():([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16)));pendingProductionRequestId=requestId;const {data,error}=await apiCall({action:'confirm_production',orders:produced,ready:__pmReadyMap,request_id:requestId,employee_name:cloudActorName,pin:cloudActorPin,expected_revision:cloudRevision});if(error){const msg=String(error.message||'');let body='';try{if(error.context&&typeof error.context.clone==='function'){const j=await error.context.clone().json();body=JSON.stringify(j||{})}}catch(_){}const all=msg+' '+body;if(all.includes('INSUFFICIENT_STOCK')){alert('المخزون لا يكفي هذا الإنتاج. هنعرض قائمة النواقص.');const sp=document.getElementById('showPurchases');if(sp)sp.click();return}if((error.context&&error.context.status===409)||all.includes('REVISION_CONFLICT')){if(!window.__pmRetried){window.__pmRetried=true;try{const {data:rr,error:re}=await apiCall({action:'get_state',employee_name:cloudActorName,pin:cloudActorPin});if(!re&&rr){cloudRevision=Number(rr.revision||0);window.__pmSkipConfirm=true;return deductOrder()}}catch(x){}}setCloudStatus('تغيّرت بيانات السحابة من جهاز آخر. حمّل آخر نسخة قبل إعادة تأكيد الإنتاج.',true);alert('تغيّرت البيانات على جهاز آخر. حمّل آخر نسخة سحابية ثم راجع الطلب.');return}if(msg.includes('INSUFFICIENT_STOCK')){alert('المخزون على الخادم لا يكفي الطلب. حمّل آخر نسخة وراجع العجز.');return}throw error}const {data:remote,error:loadError}=await apiCall({action:'get_state',employee_name:cloudActorName,pin:cloudActorPin});if(loadError)throw loadError;if(!remote?.state)throw new Error('لم يرجع الخادم الحالة بعد تأكيد الإنتاج.');cloudLoading=true;state=migrateStateUnits(remote.state);state.orders=[];if(!Array.isArray(state.history))state.history=[];if(!Array.isArray(state.productionLog))state.productionLog=[];if(!Array.isArray(state.monthlyArchives))state.monthlyArchives=[];if(!state.prices)state.prices={};if(!state.recipeMeta)state.recipeMeta={};cloudRevision=Number(remote.revision||data?.revision||cloudRevision);if(data&&data.readyWarning)alert('تم تأكيد الإنتاج، لكن تعذر تحديث عدد القطع الجاهزة. راجع المدير.');cloudLastSavedHash=JSON.stringify(state);pendingProductionRequestId='';cloudLoading=false;try{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(KEY+'_savedAt',String(Date.now()));const auditKey=KEY+'_auditDetails';let audit=[];try{audit=JSON.parse(localStorage.getItem(auditKey)||'[]');if(!Array.isArray(audit))audit=[]}catch(_){}const productSummary=produced.map(x=>String(x.name||'صنف غير معروف')+' (عدد الوزنات: '+nfmt(x.qty)+')').join('، ');audit.unshift({id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-production'),changed_at:new Date().toISOString(),actor_name:cloudActorName||'هذا الجهاز',action:'خصم مخزون بعد تأكيد الإنتاج',description:'تم تأكيد إنتاج '+productSummary+'، وخصم الخامات المطلوبة من أرصدة المخزون وتسجيل حركة الخصم.',revision:cloudRevision,source:'local',changed_sections:['inventory','history','productionLog'],changes:{inventory:{before:beforeInventory,after:clone(state.inventory||[])},history:{before:beforeHistory,after:clone(state.history||[])},production:{before:produced,after:[]}}});localStorage.setItem(auditKey,JSON.stringify(audit.slice(0,200)))}catch(e){}renderAll();if(cloudActorRole==='kitchen')applyRoleUI();$('orderResult').innerHTML='<div class="notice-ok">تم تأكيد الإنتاج وخصم الخامات من الخادم بنجاح.</div>';setCloudStatus(`تم تأكيد الإنتاج ومزامنته ✓ · الإصدار ${cloudRevision}`)}catch(e){cloudLoading=false;setCloudStatus('تعذر تأكيد الإنتاج على الخادم: '+(e.message||''),true);alert('لم يتم تأكيد الإنتاج. '+(e.message||'تحقق من الاتصال ثم راجع حالة المخزون قبل إعادة المحاولة.'))}finally{if(btn)btn.disabled=false}}
function recipeCost(name){
 const comps=state.recipes[name]||[];let total=0,unknown=[],details=[];
 for(const c of comps){if(!c.name||!(Number(c.qty)>0))continue;const base=unitBase(c.unit),qty=norm(c.qty,c.unit),cost=costOf(c.name,base,qty);if(cost===null){unknown.push(c.name);details.push({name:c.name,qty:c.qty,unit:c.unit,cost:null})}else{total+=cost;details.push({name:c.name,qty:c.qty,unit:c.unit,cost})}}
 const meta=(state.recipeMeta||{})[name]||{};const extra=Math.max(0,Number(meta.extraCost)||0),yieldQty=Math.max(.001,Number(meta.yieldQty)||1),wastePct=Math.min(95,Math.max(0,Number(meta.wastePct)||0)),margin=Math.min(95,Math.max(0,Number(meta.marginPct??30))),batchCost=total+extra,unitCost=window.RMYCalc?RMYCalc.grossUnitCost(batchCost,yieldQty,wastePct):batchCost/yieldQty,suggested=margin>=100?null:unitCost/(1-margin/100),actual=Number(meta.actualPrice)>0?Number(meta.actualPrice):null;
 const uniqueUnknown=[...new Set(unknown)];const complete=uniqueUnknown.length===0;return {name,details,total,extra,batchCost,yieldQty,wastePct,margin,unitCost:complete?unitCost:null,suggested:complete?suggested:null,actual,complete,unknown:uniqueUnknown};
}
function renderCosting(){
 if(!$('costRecipe'))return;const ns=names(),selected=$('costRecipe').value; $('costRecipe').innerHTML=opt(ns,ns.includes(selected)?selected:ns[0]||'');const name=$('costRecipe').value;const meta=(state.recipeMeta||{})[name]||{yieldQty:1,marginPct:30,extraCost:0,actualPrice:0};$('costYield').value=meta.yieldQty??1;$('costMargin').value=meta.marginPct??30;$('costExtra').value=meta.extraCost??0;$('costWaste').value=meta.wastePct??0;$('costActualPrice').value=meta.actualPrice||'';renderRecipeCostResult();renderAllRecipeCosts();
}
function readCostInputs(){return {yieldQty:Number($('costYield').value),marginPct:Number($('costMargin').value),extraCost:Number($('costExtra').value),actualPrice:Number($('costActualPrice').value)||0,wastePct:Number($('costWaste').value)||0}}
function saveCostSettings(){const name=$('costRecipe').value;if(!name)return;const m=readCostInputs();if(!Number.isFinite(m.yieldQty)||m.yieldQty<=0||!Number.isFinite(m.marginPct)||m.marginPct<0||m.marginPct>95||!Number.isFinite(m.extraCost)||m.extraCost<0||!Number.isFinite(m.actualPrice)||m.actualPrice<0||!Number.isFinite(m.wastePct)||m.wastePct<0||m.wastePct>=95){alert('راجع القيم: الناتج أكبر من صفر، والهامش بين 0 و95%، ونسبة الهالك بين 0 و95%، والتكاليف والأسعار لا تكون سالبة.');return}state.recipeMeta=state.recipeMeta||{};state.recipeMeta[name]=m;save();renderCosting();alert('تم حفظ إعدادات تكلفة الصنف.');}
function pmBakerList(r){var n=r.details.length,out=[];if(!window.RMYCalc)return out.concat(Array(n).fill(null));var flour=(r.details.find(function(c){return c.name&&String(c.name).indexOf('دقيق')!==-1})||{}).name;if(!flour)return Array(n).fill(null);var g=r.details.map(function(c){return {name:c.name,qty:RMYCalc.toGrams(c.qty,c.unit,c.name)}});var ok=g.filter(function(x){return x.qty!==null});var b=RMYCalc.bakerPercentages(ok,flour)||[];return g.map(function(x){if(x.qty===null)return null;var f=b.find(function(y){return y.name===x.name});return f?f.percent:null})}
function renderRecipeCostResult(){const name=$('costRecipe').value;if(!name){$('recipeCostResult').innerHTML='<div class="empty">لا توجد وصفات لحساب تكلفتها.</div>';return}const draft=readCostInputs();const saved=(state.recipeMeta||{})[name]||{};const m={...saved,...draft};state.recipeMeta=state.recipeMeta||{};const r=recipeCost(name);r.yieldQty=Number(m.yieldQty)>0?Number(m.yieldQty):1;r.margin=Math.min(95,Math.max(0,Number(m.marginPct)||0));r.extra=Math.max(0,Number(m.extraCost)||0);r.batchCost=r.total+r.extra;r.wastePct=Math.min(95,Math.max(0,Number(m.wastePct)||0));r.unitCost=r.unknown.length?null:(window.RMYCalc?RMYCalc.grossUnitCost(r.batchCost,r.yieldQty,r.wastePct):r.batchCost/r.yieldQty);r.suggested=r.unitCost===null?null:r.unitCost/(1-r.margin/100);r.actual=Number(m.actualPrice)>0?Number(m.actualPrice):null;const pct=r.actual&&r.actual>0&&r.unitCost!==null?((r.actual-r.unitCost)/r.actual*100):null;
 const __bk=pmBakerList(r);
 $('recipeCostResult').innerHTML=`<div class="metric-grid"><div class="metric"><b>${moneyFmt(r.total)} ج.م</b><span>تكلفة الخامات المسعّرة / وزنة</span></div><div class="metric"><b>${r.unknown.length?'غير مكتملة':moneyFmt(r.batchCost)+' ج.م'}</b><span>تكلفة الوزنة مع الإضافات</span></div><div class="metric"><b>${r.unitCost===null?'غير مكتملة':moneyFmt(r.unitCost)+' ج.م'}</b><span>تكلفة الوحدة الناتجة</span></div><div class="metric"><b>${r.suggested===null?'غير متاح':moneyFmt(r.suggested)+' ج.م'}</b><span>سعر البيع المقترح للوحدة</span></div></div>${r.unitCost!==null&&r.suggested!==null&&r.unitCost>0?`<div class="pro-note">الـ Markup المكافئ للسعر المقترح: ${nfmt(Math.round(((r.suggested-r.unitCost)/r.unitCost)*1000)/10)}% فوق التكلفة · الهامش على البيع: ${nfmt(Math.round(r.margin*10)/10)}% · الهالك المحسوب في الوزنة: ${nfmt(r.wastePct)}%</div>`:''}${r.unknown.length?`<div class="danger-note">لا يمكن اعتماد التكلفة النهائية بعد: أسعار هذه الخامات ناقصة أو وحداتها غير متوافقة: ${r.unknown.map(esc).join('، ')}. الإجمالي المعروض يشمل الخامات المسعّرة فقط.</div>`:'<div class="notice-ok">كل مكونات الوصفة لها سعر متوافق. راجع التكاليف الإضافية وعدد الوحدات الناتجة قبل اعتماد سعر البيع.</div>'}${r.actual!==null?`<div class="pro-note">السعر الفعلي: ${moneyFmt(r.actual)} ج.م · ${r.unitCost===null?'لا يمكن مقارنة الربح قبل استكمال أسعار الخامات.':`الفرق عن تكلفة الوحدة: ${moneyFmt(r.actual-r.unitCost)} ج.م · هامش تقريبي قبل المصروفات العامة: ${pct.toFixed(1)}%`}</div>`:''}<div class="tablewrap"><table><tr><th>المكوّن</th><th>الكمية</th><th>الوحدة</th><th>التكلفة</th><th>% من الدقيق</th></tr>${r.details.map((c,i)=>`<tr><td>${esc(c.name)}</td><td>${nfmt(c.qty)}</td><td>${esc(c.unit)}</td><td>${c.cost===null?'غير محددة':moneyFmt(c.cost)+' ج.م'}</td><td>${__bk[i]==null?'—':nfmt(__bk[i])+'%'}</td></tr>`).join('')}<tr><th colspan="4">تكاليف إضافية</th><th>${moneyFmt(r.extra)} ج.م</th></tr></table></div>`;
}
function renderAllRecipeCosts(){const rows=names().map(n=>recipeCost(n));$('allRecipeCosts').innerHTML=rows.length?`<table><tr><th>الصنف</th><th>تكلفة الوزنة</th><th>الناتج</th><th>تكلفة الوحدة</th><th>سعر مقترح</th><th>حالة التسعير</th></tr>${rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.unknown.length?'غير مكتملة':moneyFmt(r.batchCost)+' ج.م'}</td><td>${nfmt(r.yieldQty)}</td><td>${r.unitCost===null?'غير مكتملة':moneyFmt(r.unitCost)+' ج.م'}</td><td>${r.suggested===null?'غير متاح':moneyFmt(r.suggested)+' ج.م'}</td><td>${r.unknown.length?`<span class="pill warn">${r.unknown.length} خامة غير مسعرة</span>`:'<span class="pill">مكتمل</span>'}</td></tr>`).join('')}</table>`:'<div class="empty">لا توجد وصفات.</div>'}
function getPurchaseRows(){
 // النواقص نوعين:
 // (1) خامات مش مسجلة بالمخزون أو رصيدها صفر
 // (2) خامات مطلوبة لأوردرات التحضير الحالية (قسم التحضير) ورصيدها مش مكفي
 const inv=Array.isArray(state.inventory)?state.inventory:[];
 const rows=allIngredientNames().map(name=>{
   const entries=inv.filter(x=>x.name===name);
   const unit=(entries.find(x=>x.unit)||Object.values(state.recipes||{}).flat().find(c=>c.name===name)||{}).unit||'';
   const have=entries.reduce((sum,x)=>sum+Math.max(0,Number(x.qty)||0),0);
   return {name,have,unit,missingEntry:entries.length===0,prepNeed:0,prepShort:0,prepUnit:''};
 });
 const byName=new Map(rows.map(r=>[r.name,r]));
 (Array.isArray(state.orders)?calculate():[]).forEach(n=>{
   const row=byName.get(n.name); if(!row) return;
   const have=getStock(n.name,n.unit);
   const short=Math.max(0,n.qty-have);
   if(!(short>1e-9)) return;
   row.prepNeed=n.qty; row.prepShort=short; row.prepUnit=n.unit;
 });
 return rows.filter(x=>x.missingEntry||x.have<=1e-9||x.prepShort>1e-9).map(x=>{
   const status=x.missingEntry?'غير مضافة للمخزون':(x.have<=1e-9?'الرصيد صفر':'ناقص للتحضير');
   return {...x,status};
 });
}
function fmtPrep(q,u){ if(!(q>0)) return '—'; const f=formatAggregate(q,u); return nfmt(f.qty)+' '+f.unit; }
function renderPurchaseList(){
 if(!$('purchaseList'))return;
 const rows=getPurchaseRows();
 const prepCount=rows.filter(x=>x.prepShort>1e-9).length;
 const html=rows.length?`<div class="notice-warn">عدد النواقص: ${rows.length}${prepCount?` · منها ${prepCount} ناقصة لأوردرات التحضير الحالية`:''}.</div><div class="tablewrap"><table><tr><th>الخامة</th><th>الرصيد الحالي</th><th>المطلوب للتحضير</th><th>الناقص للتحضير</th><th>الوحدة</th><th>الحالة</th></tr>${rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.missingEntry?'—':nfmt(x.have)}</td><td>${x.prepShort>1e-9?fmtPrep(x.prepNeed,x.prepUnit):'—'}</td><td>${x.prepShort>1e-9?`<span class="pill low">${fmtPrep(x.prepShort,x.prepUnit)}</span>`:'—'}</td><td>${esc(x.unit||'—')}</td><td><span class="pill low">${esc(x.status)}</span></td></tr>`).join('')}</table></div>`:'<div class="notice-ok">مفيش نواقص: كل الخامات المطلوبة للتحضير متوفرة، وكل الخامات المعروفة ليها رصيد أكبر من صفر.</div>';
 $('purchaseList').innerHTML=html;
}
function exportCsv(filename,rows){const escCsv=v=>{const s=String(v??'');return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};const csv='\ufeff'+rows.map(r=>r.map(escCsv).join(',')).join('\r\n');download(filename,csv,'text/csv;charset=utf-8')}
function exportPurchaseCsv(){const rows=getPurchaseRows();exportCsv('RMY_Stock_Shortages.csv',[['الخامة','الرصيد الحالي','الوحدة','الحالة','المطلوب للتحضير','الناقص للتحضير','وحدة التحضير'],...rows.map(x=>[x.name,x.missingEntry?'غير مضافة للمخزون':x.have,x.unit,x.status,x.prepShort>1e-9?x.prepNeed:'',x.prepShort>1e-9?x.prepShort:'',x.prepUnit])])}
function exportCostCsv(){exportCsv('RMY_Recipe_Cost_Report.csv',[['الصنف','تكلفة الخامات للوزنة','التكاليف الإضافية','تكلفة الوزنة','الناتج','تكلفة الوحدة','الهامش المستهدف %','سعر البيع المقترح','خامات بلا سعر'],...names().map(n=>{const r=recipeCost(n);return [n,r.total,r.extra,r.batchCost,r.yieldQty,r.unitCost,r.margin,r.suggested,r.unknown.join('، ')]})])}
function calcSalePreview(){const name=$('saleProduct').value,qty=Number($('saleQty').value),price=Number($('salePrice').value);if(!name||!(qty>0)||!(price>=0)){ $('salePreview').textContent='اختر الصنف وأدخل الكمية والسعر لعرض تقدير الربح.';return}const c=recipeCost(name),revenue=qty*price,cost=qty*c.unitCost,profit=revenue-cost;$('salePreview').innerHTML=`الإيراد المتوقع: <b>${moneyFmt(revenue)} ج.م</b> · تكلفة الخامات التقديرية: <b>${moneyFmt(cost)} ج.م</b> · الفرق قبل المصروفات العامة: <b>${moneyFmt(profit)} ج.م</b>${c.unknown.length?`<div class="danger-note">تنبيه: التكلفة ناقصة لعدم تسعير ${c.unknown.map(esc).join('، ')}.</div>`:''}`}
function addSale(){const name=$('saleProduct').value,qty=Number($('saleQty').value),price=Number($('salePrice').value);if(!name||!Number.isFinite(qty)||qty<=0||!Number.isFinite(price)||price<0){alert('اختر صنفًا وأدخل كمية موجبة وسعر بيع صحيحًا.');return}if(cloudActorRole==='sales'){pmSalesRecord(name,qty,price);return}const c=recipeCost(name);state.salesLog=state.salesLog||[];state.salesLog.unshift({receiptNo:(window.pmIsDrinkName(name)?nextDrinkInvoiceNo():nextInvoiceNo()),group:(window.pmIsDrinkName(name)?'drink':'food'),receiptId:(window.crypto&&crypto.randomUUID?crypto.randomUUID():'m'+Date.now()+Math.random().toString(36).slice(2)),by:cloudActorName||'',at:new Date().toISOString(),date:formatDate(),name,qty,unitPrice:price,revenue:qty*price,unitCostAtSale:c.unitCost===null?null:c.unitCost,costAtSale:c.unitCost===null?null:qty*c.unitCost,unpricedComponents:c.unknown.length,note:$('saleNote').value.trim()});$('saleQty').value='1';$('salePrice').value='';$('saleNote').value='';save();renderSales();alert('تم حفظ عملية البيع. الربح المعروض تقديري وفق أسعار الخامات المسجلة وقت البيع.')}
function addExpense(){const category=$('expenseCategory').value,amount=Number($('expenseAmount').value),note=$('expenseNote').value.trim();if(!Number.isFinite(amount)||amount<=0){alert('أدخل قيمة مصروف أكبر من صفر.');return}state.expensesLog=state.expensesLog||[];state.expensesLog.unshift({date:formatDate(),category,amount,note});$('expenseAmount').value='';$('expenseNote').value='';save();renderSales();alert('تم تسجيل المصروف التشغيلي.')}
function renderSales(){if(!$('salesTable'))return;const sales=state.salesLog||[],expenses=state.expensesLog||[],__mm=monthMetrics({productionLog:state.productionLog||[],salesLog:pmRecostMissing(window.pmCleanSalesForClose?pmCleanSalesForClose(sales):sales),expensesLog:expenses,purchasesLog:state.purchasesLog||[],wasteLog:pmRecostWaste(state.wasteLog||[]),partyInvoices:(window.pmOpenPartyInvoices?window.pmOpenPartyInvoices():[]),history:state.history||[],totalSpent:(state.productionLog||[]).reduce((a,x)=>a+Number(x.totalCost||0),0)}),revenue=__mm.revenue,cost=__mm.salesCost,other=__mm.expenseTotal,profit=__mm.profit,purchases=__mm.purchaseTotal,unknown=(__mm.unknownSales||__mm.wasteUnpriced||__mm.partyUncosted)?1:0;$('financialSummary').innerHTML=`<div class="metric-grid"><div class="metric"><b>${moneyFmt(revenue)} ج.م</b><span>إجمالي المبيعات</span></div><div class="metric"><b>${moneyFmt(cost)} ج.م</b><span>تكلفة الخامات التقديرية</span></div><div class="metric"><b>${moneyFmt(other)} ج.م</b><span>المصروفات التشغيلية</span></div><div class="metric"><b>${moneyFmt(purchases)} ج.م</b><span>مشتريات الخامات (تدفق نقدي وليست مصروف ربح مباشر)</span></div><div class="metric"><b>${moneyFmt(profit)} ج.م</b><span>${__mm.netComplete?'صافي الربح بعد تكلفة المبيعات والحفلات والهالك والمصروفات':'صافي الربح (ناقص '+__mm.uncostedCount+' بند بلا تكلفة)'}</span></div></div>${unknown?`<div class="danger-note">توجد عمليات بيع بدون تكلفة كاملة (خامات غير مسعّرة أو فواتير حفلات بدون تكلفة)؛ صافي الربح غير مكتمل.</div>`:''}<p class="small">هذا ملخص السجلات الحالية فقط. لا يخصم البيع من مخزون الإنتاج تلقائيًا، لأن خصم الخامات يتم من خلال «حساب الطلب» عند تأكيد الإنتاج.</p>`;$('salesTable').innerHTML=sales.length?`<table><tr><th>التاريخ</th><th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإيراد</th><th>التكلفة المقدرة</th><th>الفرق</th><th>ملاحظة</th><th>حذف</th></tr>${sales.map((x,i)=>`<tr><td>${esc(x.date)}</td><td>${esc(x.name)}</td><td>${nfmt(x.qty)}</td><td>${moneyFmt(x.unitPrice)} ج.م</td><td>${moneyFmt(x.revenue)} ج.م</td><td>${Number(x.unpricedComponents||0)>0||x.costAtSale==null?'غير مكتملة':moneyFmt(x.costAtSale)+' ج.م'}</td><td>${Number(x.unpricedComponents||0)>0||x.costAtSale==null?'غير مكتمل':moneyFmt(Number(x.revenue||0)-Number(x.costAtSale||0))+' ج.م'}</td><td>${esc(x.note||'')}</td><td><button class="danger mini" onclick="deleteSale(${i})">حذف</button></td></tr>`).join('')}</table>`:'<div class="empty">لا توجد عمليات بيع مسجلة.</div>';if($('expensesTable'))$('expensesTable').innerHTML=expenses.length?`<table><tr><th>التاريخ</th><th>البند</th><th>القيمة</th><th>التفاصيل</th><th>حذف</th></tr>${expenses.map((x,i)=>`<tr><td>${esc(x.date)}</td><td>${esc(x.category)}</td><td>${moneyFmt(x.amount)} ج.م</td><td>${esc(x.note||'')}</td><td><button class="danger mini" onclick="deleteExpense(${i})">حذف</button></td></tr>`).join('')}</table>`:'<div class="empty">لا توجد مصروفات مسجلة.</div>';calcSalePreview()}
window.deleteSale=i=>{if(!confirm('حذف عملية البيع هذه؟'))return;state.salesLog.splice(i,1);save();renderSales()};window.deleteExpense=i=>{if(!confirm('حذف المصروف هذا؟'))return;state.expensesLog.splice(i,1);save();renderSales()};
