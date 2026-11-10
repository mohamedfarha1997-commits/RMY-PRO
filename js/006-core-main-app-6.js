function applyRoleUI(){const kitchen=cloudActorRole==='kitchen';document.querySelectorAll('.tabs .tab').forEach(b=>{b.style.display=(!kitchen||['order','recipes','stock','parties'].includes(b.dataset.tab))?'':'none'});document.querySelectorAll('main .panel').forEach(p=>{p.style.display=(!kitchen||['order','recipes','stock','parties'].includes(p.id))?'':'none'});['newRecipe','saveRecipe','deleteRecipe','addStock'].forEach(id=>{const el=$(id);if(el){if(['addStock'].includes(id)){const card=el.closest('.card');if(card)card.style.display=kitchen?'none':''}else el.style.display=kitchen?'none':''}});go('home')}
async function unlockApp(){if(cloudReady&&!document.body.classList.contains('auth-required'))return;const name=$('employeeName').value,pin=$('employeePin').value;if(!name||!pin){setLoginMessage('اختر اسم الموظف وأدخل PIN الشخصي.','error');return}const isTok=pin.startsWith('tok_');if(!isTok&&!/^\d{4,5}$/.test(pin)){setLoginMessage('PIN الشخصي لازم يكون 4 أو 5 أرقام.','error');return}const btn=$('unlockButton');btn.disabled=true;btn.textContent='التحقق من الخادم…';try{const {data:verified,error:verifyError}=await apiCall({action:'verify_employee',employee_name:name,pin});if(isTok&&(String(verifyError?.message||verifyError||'').includes('INVALID_SESSION')||verified?.error==='INVALID_SESSION')){try{localStorage.removeItem('pm_sess')}catch(e){}$('employeePin').value='';throw new Error('انتهت جلسة الموظف، أدخل PIN مرة أخرى.')}if(verifyError)throw verifyError;if(!verified?.ok)throw new Error('فشل التحقق من PIN الموظف.');let actorPin=pin;if(!isTok){try{const {data:sess,error:sessErr}=await apiCall({action:'issue_session',employee_name:name,pin});if(!sessErr&&sess?.token){actorPin=sess.token;try{localStorage.setItem('pm_sess',JSON.stringify({n:name,t:sess.token}))}catch(e){}}}catch(e){}}cloudActorName=name;cloudActorPin=actorPin;try{localStorage.removeItem('pm_emp')}catch(e){}const {data,error}=await apiCall({action:'get_state',employee_name:cloudActorName,pin:cloudActorPin});if(error)throw error;if(!data.state&&verified.role!=='admin')throw new Error('يجب أن يفتح المدير البرنامج أولًا لتهيئة البيانات السحابية.');cloudActorRole=verified.role;cloudRevision=Number(data.revision||0);cloudLoading=true;if(data.state){state=migrateStateUnits(data.state);if(!Array.isArray(state.productionLog))state.productionLog=[];if(!Array.isArray(state.salesLog))state.salesLog=[];if(!Array.isArray(state.expensesLog))state.expensesLog=[];if(!Array.isArray(state.purchasesLog))state.purchasesLog=[];if(!Array.isArray(state.monthlyArchives))state.monthlyArchives=[];state.recipeMeta=state.recipeMeta&&typeof state.recipeMeta==='object'?state.recipeMeta:{};for(const n of Object.keys(state.recipes||{}))if(!state.recipeMeta[n])state.recipeMeta[n]={yieldQty:1,marginPct:30,extraCost:0,actualPrice:0};}else{
// ترحيل آمن: عند خلو السحابة، لا نتجاهل بيانات الجهاز القديمة ولا نرفع البيانات الافتراضية فوقها بصمت.
let localRaw=null, localCandidate=null;
try{
 localRaw=localStorage.getItem(KEY);
 if(localRaw){
  localCandidate=JSON.parse(localRaw);
  if(!localCandidate||typeof localCandidate!=='object'||Array.isArray(localCandidate)||!localCandidate.recipes||typeof localCandidate.recipes!=='object'||Array.isArray(localCandidate.recipes)||!Array.isArray(localCandidate.inventory)){
   throw new Error('شكل بيانات الجهاز غير مكتمل أو غير صالح.');
  }
 }
}catch(localReadError){
 // أي خطأ أثناء قراءة/تحليل التخزين المحلي يمنع التهيئة الافتراضية، حتى لا نخاطر بتجاوز بيانات موجودة.
 throw new Error('تعذّر قراءة بيانات الجهاز أو التحقق من سلامتها؛ أوقفنا تهيئة السحابة لحماية البيانات. لا تُرفع بيانات افتراضية في هذه الحالة. نزّل نسخة احتياطية أو أصلح البيانات ثم أعد المحاولة.');
}
if(localCandidate){
 const recipeCount=Object.keys(localCandidate.recipes||{}).length;
 const stockCount=(localCandidate.inventory||[]).length;
 const salesCount=(localCandidate.salesLog||[]).length;
 const shouldMigrate=window.confirm('قاعدة البيانات السحابية فارغة، لكن وُجدت بيانات محفوظة على هذا الجهاز.\n\nالوصفات: '+recipeCount+'\nأصناف المخزون: '+stockCount+'\nسجلات المبيعات: '+salesCount+'\n\nهل تريد نقل بيانات هذا الجهاز إلى السحابة؟ سيتم حفظ نسخة أمان محلية أولًا. اختر «إلغاء» لإيقاف التهيئة دون رفع بيانات افتراضية.');
 if(!shouldMigrate)throw new Error('تم إيقاف تهيئة السحابة بناءً على اختيارك؛ لم يتم رفع بيانات افتراضية ولم تُحذف البيانات المحلية.');
 try{
  localStorage.setItem(KEY+'_preCloudMigrationBackup',JSON.stringify({savedAt:new Date().toISOString(),reason:'نسخة أمان قبل ترحيل أول اتصال سحابي',state:localCandidate}));
  const backupCheck=JSON.parse(localStorage.getItem(KEY+'_preCloudMigrationBackup')||'null');
  if(!backupCheck||!backupCheck.state||JSON.stringify(backupCheck.state)!==JSON.stringify(localCandidate))throw new Error('فشل التحقق من نسخة الأمان.');
 }catch(backupError){throw new Error('لم نتمكن من حفظ نسخة أمان محلية؛ أوقفنا الترحيل لحماية بياناتك. تأكد من مساحة المتصفح ثم أعد المحاولة.');}
 // نضيف مفاتيح المستوى الأعلى الجديدة فقط، مع إبقاء القيم والسجلات القديمة كما هي.
 state=migrateStateUnits(Object.assign(clone(ORIGINAL),localCandidate));
}else{
 state=migrateStateUnits(clone(ORIGINAL));
 state.productionLog=[];state.salesLog=[];state.expensesLog=[];state.purchasesLog=[];state.monthlyArchives=[];
}
state.recipeMeta=state.recipeMeta&&typeof state.recipeMeta==='object'&&!Array.isArray(state.recipeMeta)?state.recipeMeta:{};
for(const n of Object.keys(state.recipes||{}))if(!state.recipeMeta[n])state.recipeMeta[n]={yieldQty:1,marginPct:30,extraCost:0,actualPrice:0};
}cloudLoading=false;try{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(KEY+'_savedAt',String(Date.now()))}catch(e){}var __pmTabBefore=null;cloudReady=true;document.body.classList.remove('auth-required');$('loginScreen').classList.add('hide');renderAll();setTimeout(function(){try{var __lt=__pmTabBefore;var __b=__lt&&document.querySelector('.tab[data-tab="'+__lt+'"]');if(__b&&__b.style.display!=='none')go(__lt)}catch(e){}setTimeout(function(){if(window.__pmHideSplash)window.__pmHideSplash()},150)},0);applyRoleUI();startCloudPolling();if(navigator.onLine)scheduleQueuedSync(900);if(!data.state){setCloudStatus('جارٍ حفظ البيانات الأصلية في Supabase لأول مرة…');scheduleCloudSave(clone(state),true)}else{setCloudStatus(`متصل بالسحابة ✓ · الموظف: ${name} (${({admin:'مدير',sales:'مبيعات',kitchen:'مطبخ',barista:'بارستا'}[cloudActorRole]||cloudActorRole)}) · الإصدار ${cloudRevision}`);cloudLastSavedHash=JSON.stringify(state)} }catch(e){cloudLoading=false;cloudActorName='';cloudActorPin='';cloudActorRole='';pendingProductionRequestId='';setLoginMessage('تعذر فتح التطبيق: '+(e.message||'تحقق من الاتصال والسياسات.'),'error')}finally{btn.disabled=false;btn.textContent='التحقق وفتح التطبيق'}}
const PENDING_SYNC_KEY=KEY+'_pendingCloudSnapshot';
function queueCloudSnapshot(snapshot,reason='بانتظار عودة الإنترنت'){
 try{
  const record={state:clone(snapshot),queuedAt:Date.now(),actor:cloudActorName||'',revision:Number(cloudRevision||0),reason};
  localStorage.setItem(PENDING_SYNC_KEY,JSON.stringify(record));
  setCloudStatus('تم حفظ التعديل على هذا الجهاز ✓ · في انتظار الإنترنت لمزامنته تلقائيًا');
  return true;
 }catch(e){setCloudStatus('تعذر حفظ قائمة المزامنة المحلية. نزّل نسخة JSON احتياطية فورًا.',true);return false}
}
function clearQueuedSnapshotIfMatches(hash){
 try{const raw=localStorage.getItem(PENDING_SYNC_KEY);if(!raw)return;const q=JSON.parse(raw);if(q&&q.state&&JSON.stringify(q.state)===hash)localStorage.removeItem(PENDING_SYNC_KEY)}catch(_){}
}
async function _syncQueuedSnapshotInner(){
 if(!navigator.onLine||!cloudReady||!cloudActorName||!cloudActorPin||['kitchen','barista'].includes(cloudActorRole))return;
 let q;try{q=JSON.parse(localStorage.getItem(PENDING_SYNC_KEY)||'null')}catch(_){q=null}
 if(!q||!q.state)return;
 if(q.actor&&q.actor!==cloudActorName){setCloudStatus('توجد تعديلات محلية معلقة لحساب آخر. سجّل الدخول بالحساب نفسه لمزامنتها.',true);return}
 if(JSON.stringify(q.state)!==JSON.stringify(state)){
  // The latest local state supersedes an older queued snapshot; never upload a stale queued copy.
  queueCloudSnapshot(state,'تحديث محلي أحدث');q={state:clone(state),revision:cloudRevision,actor:cloudActorName};
 }
 setCloudStatus('عاد الإنترنت؛ جارٍ رفع التعديلات المحفوظة محليًا…');
 try{await persistCloudSnapshot(q.state);clearQueuedSnapshotIfMatches(JSON.stringify(q.state));setCloudStatus('تم رفع التعديلات المعلقة وتأكيدها من الخادم ✓')}
 catch(e){
  if(cloudActorRole!=='admin' && /للمدير فقط|403/.test(String((e&&e.message)||''))){
   /* الحسابات غير المدير ما تقدرش تحفظ الحالة الكاملة: التعديلات بتفضل محفوظة على الجهاز للمراجعة */
   setCloudStatus('تعديلات الجهاز دي (زي المنيو) مش متسجلة على السحابة لأن الحساب ده مش مسموح له يحفظ المنيو. التعديلات محفوظة على الجهاز بس.',true);
   return;
  }
  setCloudStatus('التعديلات محفوظة على الجهاز ولم يؤكد الخادم رفعها. ستتم إعادة المحاولة تلقائيًا. '+(e.message||''),true)
 }
}
async function syncQueuedSnapshot(){ if(window.__pmSyncBusy)return; window.__pmSyncBusy=true; try{ await _syncQueuedSnapshotInner() }finally{ window.__pmSyncBusy=false } }
let queuedSyncTimer=null;
function scheduleQueuedSync(delay=1200){clearTimeout(queuedSyncTimer);queuedSyncTimer=setTimeout(()=>syncQueuedSnapshot(),delay)}
window.addEventListener('online',()=>scheduleQueuedSync(500));
window.addEventListener('focus',()=>{if(navigator.onLine)scheduleQueuedSync(700)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&navigator.onLine)scheduleQueuedSync(700)});
async function persistCloudSnapshot(snapshot){
 if(!cloudReady||!cloudActorName||!cloudActorPin)throw new Error('لا يوجد اتصال مصادق عليه بالسحابة.');
 const payload=clone(snapshot),hash=JSON.stringify(payload);clearTimeout(cloudSaveTimer);
 const task=cloudSaveChain.catch(()=>{}).then(async()=>{
  if(hash===cloudLastSavedHash)return {ok:true,skipped:true,revision:cloudRevision};
  let expected=cloudRevision, body=payload;
  queueCloudSnapshot(payload,'حفظ تلقائي قبل الإرسال');
  if(!navigator.onLine)throw new Error('الإنترنت غير متاح؛ تم الاحتفاظ بالتعديلات للمزامنة لاحقًا.');
  if(['kitchen','barista'].includes(cloudActorRole)){
    /* حساب المطبخ/البار: action مخصص للأوردرات بس، ما يلمسش المخزون والأسعار والوصفات */
    const {data:od,error:oe}=await apiCall({action:'save_orders',orders:payload.orders||[],employee_name:cloudActorName,pin:cloudActorPin});
    if(oe)throw oe;
    if(od&&od.revision!=null)cloudRevision=Number(od.revision);
    cloudLastSavedHash=hash;
    setCloudStatus('تم حفظ الأوردرات على السحابة ✓ · الإصدار '+cloudRevision);
    return {ok:true,revision:cloudRevision,ordersOnly:true};
  }
  const {data,error}=await apiCall({action:'save_state',state:body,employee_name:cloudActorName,pin:cloudActorPin,expected_revision:expected});
  if(error){const msg=String(error.message||'');if((error.context&&error.context.status===409)||msg.includes('REVISION_CONFLICT')){setCloudStatus('تعارض إصدار: لم نكتب فوق بيانات جهاز آخر. احتفظ بالنسخة المحلية ثم حمّل آخر نسخة سحابية للمراجعة.',true);throw new Error('تعارض مع تعديل سحابي أحدث؛ لم يتم تأكيد الحفظ.')}if(error.context&&error.context.status===401){cloudReady=false;setCloudStatus('رفض الخادم التحقق من الموظف. أعد تسجيل الدخول قبل أي تعديل آخر.',true);document.body.classList.add('auth-required');$('loginScreen').classList.remove('hide');throw new Error('رفض الخادم التحقق من الموظف.')}if(error.context&&error.context.status===403){setCloudStatus('الحساب ده مش مسموح له يحفظ الحالة الكاملة (زي المنيو والإعدادات). الجلسة مفتوحة، والتعديل محفوظ على الجهاز.',true);throw new Error('حفظ الحالة الكاملة متاح للمدير فقط.')}throw new Error(msg||'تعذر حفظ البيانات على الخادم.');}
  if(!data||data.ok===false)throw new Error('لم يرجع الخادم تأكيدًا واضحًا للحفظ.');
  if(data.revision!==undefined&&Number.isFinite(Number(data.revision)))cloudRevision=Number(data.revision);
  cloudLastSavedHash=hash;
  clearQueuedSnapshotIfMatches(hash);pmSyncFails=0;
  setCloudStatus(`تم تأكيد المزامنة من الخادم ✓ · ${cloudActorName} · الإصدار ${cloudRevision}`);
  return {ok:true,revision:cloudRevision};
 });
 cloudSaveChain=task;return task;
}
var pmSyncFails=0;
function pmBackoff(){pmSyncFails=Math.min(pmSyncFails+1,6);return Math.min(60000,8000*Math.pow(2,pmSyncFails-1))}
function scheduleCloudSave(snapshot,immediate=false){
 if(!cloudReady||!cloudActorName||!cloudActorPin)return;
  const payload=clone(snapshot);clearTimeout(cloudSaveTimer);
 setCloudStatus('تم الحفظ محليًا؛ جارٍ انتظار تأكيد الخادم…');
 const run=()=>persistCloudSnapshot(payload).catch(e=>{if(cloudActorRole!=='admin'&&/للمدير فقط/.test(String((e&&e.message)||''))){setCloudStatus('التعديل محفوظ على الجهاز. الحساب ده مش مسموح له يرفع المنيو للسحابة، والمدير هيراجعه.',true);return;}queueCloudSnapshot(payload,'تعذر الرفع');setCloudStatus('التعديل محفوظ محليًا؛ لم يؤكد الخادم الرفع. سيُعاد تلقائيًا عند عودة الاتصال. '+(e.message||''),true);if(navigator.onLine)scheduleQueuedSync(pmBackoff())});
 if(immediate)run();else cloudSaveTimer=setTimeout(run,1500);
}
async function retryCloudSync(){if(!cloudReady){alert('سجّل الدخول للسحابة أولًا.');return}const b=$('retryCloudButton');if(b){b.disabled=true;b.textContent='جارٍ التحقق…'}try{await persistCloudSnapshot(clone(state));try{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(KEY+'_savedAt',String(Date.now()))}catch(e){}alert('أكد الخادم حفظ الحالة الحالية.');}catch(e){alert('لم يتم تأكيد الحفظ: '+(e.message||'خطأ غير معروف')+' إذا ظهر تعارض إصدار، لا تكرر المحاولة؛ نزّل نسخة JSON ثم راجع آخر نسخة سحابية.')}finally{if(b){b.disabled=false;b.textContent='إعادة محاولة المزامنة'}}}
async function reloadCloudState(){if(!cloudReady)return;if(JSON.stringify(state)!==cloudLastSavedHash&&!confirm('لديك تغييرات محلية قد لا تكون وصلت إلى الخادم. تحميل النسخة السحابية سيستبدل الحالة الحالية. هل راجعت النسخة المحلية وتريد المتابعة؟'))return;try{const {data,error}=await apiCall({action:'get_state',employee_name:cloudActorName,pin:cloudActorPin});if(error)throw error;if(!data.state){alert('لا توجد نسخة سحابية بعد.');return}cloudLoading=true;state=migrateStateUnits(data.state);cloudRevision=Number(data.revision||0);cloudLastSavedHash=JSON.stringify(state);cloudLoading=false;renderAll();setCloudStatus(`تم تحميل النسخة السحابية ✓ · الإصدار ${cloudRevision}`)}catch(e){cloudLoading=false;setCloudStatus('تعذر تحميل بيانات السحابة: '+(e.message||''),true)}}
async function loadAuditLog(){
 const box=$('auditTable');let localRows=[];try{localRows=JSON.parse(localStorage.getItem(KEY+'_auditDetails')||'[]');if(!Array.isArray(localRows))localRows=[]}catch(_){}
 let serverRows=[],serverError='';
 if(cloudReady){box.innerHTML='<div class="empty">جارٍ تحميل سجل التعديلات…</div>';try{const {data,error}=await apiCall({action:'get_audit',employee_name:cloudActorName,pin:cloudActorPin});if(error)throw error;serverRows=data.entries||[]}catch(e){serverError=e.message||'خطأ غير معروف'}}
 const rows=[...localRows,...serverRows.map(x=>({...x,source:'server'}))].sort((a,b)=>new Date(b.changed_at||0)-new Date(a.changed_at||0));
 const friendly={recipes:'الوصفات ومكوناتها',recipeNotes:'ملاحظات الوصفات',inventory:'أرصدة المخزون',prices:'أسعار الخامات',history:'سجل حركات المخزون',purchasesLog:'سجل المشتريات',orders:'طلبات التحضير',production:'الإنتاج وخصم الخامات',productionLog:'سجل الإنتاج',monthlyArchives:'أرشيف إقفالات الشهور',recipeMeta:'إعدادات تكلفة الأصناف',sales:'سجل المبيعات',settings:'إعدادات التطبيق',client_note:'ملاحظة العملية',request_id:'رقم مرجعي للعملية',action:'نوع العملية',revision:'رقم إصدار البيانات'};
 const prettyDate=v=>{try{return v?new Date(v).toLocaleString('ar-EG'):'غير متاح'}catch(e){return 'غير متاح'}};
 const parseNote=v=>{if(typeof v!=='string')return v;try{return JSON.parse(v)}catch(e){return v}};
 const summarize=(key,v)=>{
   if(v===undefined||v===null)return 'لا توجد بيانات';
   if(typeof v==='string')return v;
   if(Array.isArray(v))return 'عدد العناصر: '+v.length;
   if(typeof v!=='object')return String(v);
   if(key==='inventory')return 'عدد الخامات: '+Object.keys(v).length;
   if(key==='recipes'){const names=Object.keys(v);return 'عدد الأصناف: '+names.length+(names.length?' — '+names.slice(0,8).join('، ')+(names.length>8?'…':''):'')}
   if(key==='prices')return 'عدد الخامات المسعّرة: '+Object.keys(v).length;
   if(['history','purchasesLog','orders','sales','monthlyArchives'].includes(key))return 'عدد السجلات: '+(Array.isArray(v)?v.length:Object.keys(v).length);
   const ks=Object.keys(v);return 'عدد البنود: '+ks.length+(ks.length?' — '+ks.slice(0,6).map(k=>friendly[k]||k).join('، ')+(ks.length>6?'…':''):'');
 };
 const noteSummary=x=>{
   let note=parseNote(x.client_note??x.note??x.message??x.description);
   let out=[];
   const rawText=typeof note==='string'?note:(note&&typeof note==='object'?String(note.client_note||note.message||note.description||''):'');
   const embeddedId=rawText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
   if(note&&typeof note==='object'&&!Array.isArray(note)){
     const id=note.request_id||note.requestId||x.request_id||x.id||(embeddedId&&embeddedId[0]);
     const action=note.action||note.event||note.type||x.action;
     const raw=note.client_note||note.message||note.description;
     if(raw&&typeof raw==='string'&&raw!==note.client_note)out.push(raw);
     if(/production|produce|confirm|validated/i.test(String(action||'')+' '+String(raw||''))||/إنتاج|تأكيد/i.test(String(action||'')+' '+String(raw||'')))out.push('تأكيد طلب إنتاج معتمد من الخادم');
     else if(action)out.push('العملية: '+String(action).replace(/[_-]+/g,' '));
     if(id)out.push('الرقم المرجعي: '+id);
     Object.keys(note).forEach(k=>{if(['request_id','requestId','action','event','type','client_note','message','description'].includes(k))return;const label=friendly[k]||({'employee_name':'اسم الموظف','employee':'الموظف','created_at':'وقت التسجيل','status':'حالة العملية'}[k]||null);if(label&&note[k]!==undefined)out.push(label+': '+String(note[k]));});
   } else if(typeof note==='string'&&note.trim())out.push(note.trim());
   const id=x.request_id||x.requestId||(embeddedId&&embeddedId[0]);
   if(id&&!out.some(t=>t.includes(String(id))))out.push('الرقم المرجعي: '+id);
   if(!out.length){if(x.source==='server')out.push('سجّل الخادم العملية، لكنه لم يرسل وصفًا تفصيليًا للتغيير.');else out.push('لا يوجد وصف إضافي للعملية.')}
   return out;
 };
 const compareSummary=(key,a,b)=>{
   if(key==='inventory'&&Array.isArray(a)&&Array.isArray(b)){
     const am={},bm={};a.forEach(v=>{if(v&&v.name)am[String(v.name)]=v});b.forEach(v=>{if(v&&v.name)bm[String(v.name)]=v});
     const added=Object.keys(bm).filter(k=>!am[k]),removed=Object.keys(am).filter(k=>!bm[k]),updated=Object.keys(am).filter(k=>bm[k]&&JSON.stringify(am[k])!==JSON.stringify(bm[k]));
     const out=[];if(added.length)out.push('أُضيفت خامات: '+added.slice(0,8).join('، '));if(removed.length)out.push('حُذفت خامات: '+removed.slice(0,8).join('، '));if(updated.length)out.push('تغيّرت بيانات: '+updated.slice(0,8).join('، '));return out.join(' | ')||('عدد الخامات قبل وبعد: '+a.length+' ← '+b.length);
   }
   if(key==='recipes'&&a&&b&&typeof a==='object'&&typeof b==='object'){
     const ak=Object.keys(a),bk=Object.keys(b),added=bk.filter(k=>!Object.prototype.hasOwnProperty.call(a,k)),removed=ak.filter(k=>!Object.prototype.hasOwnProperty.call(b,k)),updated=ak.filter(k=>Object.prototype.hasOwnProperty.call(b,k)&&JSON.stringify(a[k])!==JSON.stringify(b[k]));
     const out=[];if(added.length)out.push('أُضيفت أصناف: '+added.slice(0,8).join('، '));if(removed.length)out.push('حُذفت أصناف: '+removed.slice(0,8).join('، '));if(updated.length)out.push('تعدّلت وصفات: '+updated.slice(0,8).join('، '));return out.join(' | ')||('عدد الأصناف: '+ak.length+' ← '+bk.length);
   }
   if(['history','purchasesLog','orders','sales','monthlyArchives'].includes(key)&&Array.isArray(a)&&Array.isArray(b))return 'عدد السجلات قبل وبعد: '+a.length+' ← '+b.length+(b.length>a.length?' (أُضيفت '+(b.length-a.length)+' سجلات)':b.length<a.length?' (نقص '+(a.length-b.length)+' سجلات)':'');
   if(key==='prices'&&a&&b&&typeof a==='object'&&typeof b==='object'){
     const ak=Object.keys(a),bk=Object.keys(b),added=bk.filter(k=>!Object.prototype.hasOwnProperty.call(a,k)),removed=ak.filter(k=>!Object.prototype.hasOwnProperty.call(b,k)),updated=ak.filter(k=>Object.prototype.hasOwnProperty.call(b,k)&&JSON.stringify(a[k])!==JSON.stringify(b[k]));const out=[];if(added.length)out.push('أُضيفت أسعار: '+added.slice(0,8).join('، '));if(removed.length)out.push('حُذفت أسعار: '+removed.slice(0,8).join('، '));if(updated.length)out.push('تعدّلت أسعار: '+updated.slice(0,8).join('، '));return out.join(' | ')||('عدد الأسعار: '+ak.length+' ← '+bk.length);
   }
   return summarize(key,a)+' ← '+summarize(key,b);
 };
 const details=x=>{
   const changes=x.changes??x.details??x.payload??x.metadata??x.diff;
   const before=x.before_state??x.old_state??x.before??x.old_data??x.previous_data;
   const after=x.after_state??x.new_state??x.after??x.new_data??x.current_data;
   let html='';
   if(x.description)html+='<div class="audit-detail"><b>ما الذي تم؟</b><div>'+esc(x.description)+'</div></div>';
   if(x.source==='server'){
     noteSummary(x).forEach(t=>html+='<div class="audit-detail"><b>ملخص العملية</b><div>'+esc(t)+'</div></div>');
     if(changes!==undefined&&changes&&typeof changes==='object'&&!Array.isArray(changes)){
       Object.entries(changes).forEach(([key,v])=>{const label=friendly[key]||key;if(v&&typeof v==='object'&&('before'in v||'after'in v)){html+='<div class="audit-detail"><b>'+esc(label)+'</b><div>'+esc(compareSummary(key,v.before,v.after))+'</div></div>'}else html+='<div class="audit-detail"><b>'+esc(label)+'</b><div>'+esc(summarize(key,v))+'</div></div>'})
     } else if(before===undefined&&after===undefined)html+='<div class="small">تنبيه: سجل الخادم المتاح لا يحتوي على قيم قبل التعديل وبعده، لذلك لن نعرض بيانات تقنية خام على أنها تفاصيل التعديل.</div>';
   } else if(changes&&typeof changes==='object'&&!Array.isArray(changes)){
     Object.entries(changes).forEach(([key,v])=>{const label=friendly[key]||key;if(v&&typeof v==='object'&&('before'in v||'after'in v)){html+='<div class="audit-detail"><b>'+esc(label)+'</b><div>'+esc(compareSummary(key,v.before,v.after))+'</div></div>'}else html+='<div class="audit-detail"><b>'+esc(label)+'</b><div>'+esc(summarize(key,v))+'</div></div>'});
   } else if(changes!==undefined)html+='<div class="audit-detail"><b>تفاصيل العملية</b><div>'+esc(typeof changes==='string'?changes:'تم تسجيل بيانات العملية، لكن تفاصيلها غير متاحة بصيغة قابلة للشرح.')+'</div></div>';
   if(before!==undefined)html+='<div class="audit-detail"><b>قبل التعديل</b><div>'+esc(summarize('state',before))+'</div></div>';
   if(after!==undefined)html+='<div class="audit-detail"><b>بعد التعديل</b><div>'+esc(summarize('state',after))+'</div></div>';
   if(!html)html='<div class="audit-detail">لا توجد تفاصيل إضافية محفوظة لهذه العملية.</div>';
   return '<details class="audit-row-details"><summary>عرض ملخص التعديل</summary>'+html+'</details>';
 };
 if(!rows.length){box.innerHTML='<div class="empty">لا توجد تعديلات مسجلة حتى الآن. سيعرض التطبيق التغييرات الجديدة بلغة واضحة كلما تم حفظها.</div>';return}
 box.innerHTML=(function(){
  const dayName=(d)=>d.toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const hm=(d)=>d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
  const PAL=['#1B1B1B','#16794B','#1B1B1B','#293394','#B42318','#1B1B1B','#C50F1F','#4D7C0F'];
  const colorOf=(n)=>{let h=0;for(const ch of String(n||'?'))h=(h*31+ch.charCodeAt(0))>>>0;return PAL[h%PAL.length]};
  const people=new Set(), days=[], byDay={};
  rows.forEach(x=>{
    const d=new Date(x.changed_at||x.created_at||0);
    const valid=!isNaN(d);
    const key=valid?dayName(d):'بدون تاريخ';
    if(!byDay[key]){byDay[key]=[];days.push(key)}
    byDay[key].push({x,d:valid?d:null});
    const who=x.actor_name||x.employee_name||'';
    if(who)people.add(who);
  });
  const last=rows[0];
  const stats='<div class="al-stats">'+
    '<div class="al-stat"><b>'+rows.length+'</b><span>عملية مسجلة</span></div>'+
    '<div class="al-stat"><b>'+people.size+'</b><span>مستخدم نشط</span></div>'+
    '<div class="al-stat"><b>'+esc(prettyDate(last.changed_at||last.created_at))+'</b><span>آخر تعديل</span></div>'+
    '</div>';
  const bar='<div class="al-bar"><input type="search" class="al-search" placeholder="ابحث باسم الموظف أو نوع العملية" oninput="window.auditFilter(this.value)"></div>';
  const list=days.map(key=>{
    const items=byDay[key].map(({x,d})=>{
      const who=x.actor_name||x.employee_name||(x.source==='local'?'هذا الجهاز':'الخادم');
      const title=x.action||((x.source==='server')?'عملية مسجلة على الخادم':'تعديل بيانات');
      const sections=(x.changed_sections||[]).map(k=>friendly[k]||k);
      const src=x.source==='local'?'سجل الجهاز':'سجل الخادم';
      const q=(title+' '+who+' '+sections.join(' ')).toLowerCase();
      return '<li class="al-item" data-q="'+esc(q)+'">'+
        '<span class="al-av" style="background:'+colorOf(who)+'">'+esc(String(who).trim().charAt(0)||'?')+'</span>'+
        '<div class="al-body">'+
          '<div class="al-head"><span class="al-title">'+esc(title)+'</span>'+
          (x.revision!=null?'<span class="al-rev">مراجعة '+esc(String(x.revision))+'</span>':'')+'</div>'+
          '<div class="al-meta"><span>'+esc(who)+'</span><span>'+(d?hm(d):'—')+'</span><span class="al-src">'+src+'</span></div>'+
          (sections.length?'<div class="al-chips">'+sections.map(s=>'<span class="al-chip">'+esc(s)+'</span>').join('')+'</div>':'')+
          details(x)+
        '</div></li>';
    }).join('');
    return '<section class="al-day"><h3 class="al-daylabel">'+esc(key)+'</h3><ul class="al-list">'+items+'</ul></section>';
  }).join('');
  return '<div class="al-wrap">'+stats+bar+'<div class="al-empty hide" id="alEmpty">لا توجد نتائج مطابقة للبحث</div>'+list+'</div>';
})();
}
$('refreshAudit').addEventListener('click',loadAuditLog);
/* أقسام التشغيل اللي بتتغير من أجهزة تانية (المطبخ/البار/المبيعات). بنحدّثها تلقائيًا حتى لو عند الجهاز تعديلات محلية، طول ما الجهاز ما عدّلش القسم ده بنفسه. */
var LIVE_SECTIONS=['readyStock','orders','inventory','history','productionLog','productionPieces','readyRequests','salesLog','drinkOrders','partyOrders','partyStock','drinkNames','menu','partyMenu'];
function mergeLiveSections(remoteState,remoteRevision){
  try{
    var base=JSON.parse(cloudLastSavedHash||'{}')||{};
    var remote=remoteState&&typeof remoteState==='object'?remoteState:{};
    var changed=false;
    cloudLoading=true;
    LIVE_SECTIONS.forEach(function(k){
      if(remote[k]===undefined) return;
      if(JSON.stringify(state[k])===JSON.stringify(base[k])){
        state[k]=JSON.parse(JSON.stringify(remote[k]));
        base[k]=JSON.parse(JSON.stringify(remote[k]));
        changed=true;
      }
    });
    cloudRevision=remoteRevision;
    cloudLastSavedHash=JSON.stringify(base);
    cloudLoading=false;
    if(changed){ renderAll(); if(typeof window.renderMenu==='function')window.renderMenu(); setCloudStatus('تم تحديث الأوردرات والمخزون والمنيو من السحابة ✓ · الإصدار '+cloudRevision); }
    else setCloudStatus('يوجد تعديلات محلية غير محفوظة على هذا الجهاز · الإصدار السحابي '+cloudRevision,true);
  }catch(e){ cloudLoading=false; }
}
async function pollCloudState(){if(!cloudReady||!cloudActorPin||cloudPollBusy||window.__pmPrepBusy)return;cloudPollBusy=true;try{const {data,error}=await apiCall({action:'get_state',employee_name:cloudActorName,pin:cloudActorPin,known_revision:cloudRevision});if(error)throw error;const remoteRevision=Number(data.revision||0);if(!data.state||remoteRevision<=cloudRevision)return;const localHash=JSON.stringify(state);if(localHash!==cloudLastSavedHash){if(document.activeElement&&document.activeElement.matches&&document.activeElement.matches('input,textarea,select'))return;mergeLiveSections(data.state,remoteRevision);return}const active=document.activeElement;if(active&&active.matches&&active.matches('input,textarea,select'))return;cloudLoading=true;state=migrateStateUnits(data.state);cloudRevision=remoteRevision;cloudLastSavedHash=JSON.stringify(state);cloudLoading=false;renderAll();if(typeof window.renderMenu==='function')window.renderMenu();setCloudStatus(`تمت المزامنة من جهاز آخر ✓ · الإصدار ${cloudRevision}`)}catch(e){setCloudStatus('تعذر فحص التحديثات السحابية: '+(e.message||''),true)}finally{cloudPollBusy=false}}
var __pmLastPoll=0;
function startCloudPolling(){if(cloudPollTimer)clearInterval(cloudPollTimer);if(typeof window.pmStartRealtime==='function')window.pmStartRealtime();cloudPollTimer=setInterval(function(){ if(document.visibilityState!=='visible')return; var gap=window.__pmRealtimeOk?60000:8000; if(Date.now()-__pmLastPoll<gap)return; __pmLastPoll=Date.now(); pollCloudState(); },5000)}
async function signOutCloud(){if(!confirm('تسجيل خروج المستخدم الحالي؟ الحساب المشترك هيفضل مفتوح. تأكد إن آخر تعديل اتزامن قبل الخروج.'))return;try{if(cloudActorPin&&cloudActorPin.startsWith('tok_'))apiCall({action:'revoke_session',token:cloudActorPin}).catch(function(){})}catch(e){}try{localStorage.removeItem('pm_sess')}catch(e){}try{ if(cloudReady&&cloudActorName&&cloudActorPin&&cloudActorRole==='admin'){ clearTimeout(cloudSaveTimer); if(JSON.stringify(state)!==cloudLastSavedHash) await persistCloudSnapshot(clone(state)); } }catch(e){}cloudReady=false;if(cloudPollTimer)clearInterval(cloudPollTimer);clearTimeout(cloudSaveTimer);cloudActorName='';cloudActorPin='';cloudActorRole='';pendingProductionRequestId='';cloudRevision=0;cloudLastSavedHash='';try{localStorage.removeItem('pm_emp')}catch(e){}document.body.classList.add('auth-required');$('loginScreen').classList.remove('hide');$('sharedLoginPane').classList.add('hide');$('employeePane').classList.remove('hide');$('employeePin').value='';try{await refreshEmployeeList()}catch(e){}setLoginMessage('تم تسجيل خروج الموظف. اختر اسمك وأدخل PIN للدخول.');setCloudStatus('تم تسجيل خروج المستخدم الحالي. الحساب المشترك لسه مفتوح.',true)}
async function initCloudAuth(){if(!isConfigured()){setLoginMessage('لم يتم إعداد Supabase بعد. افتح supabase-config.js وضع Project URL و anon/public key، ثم أكمل خطوات README_AR.md. لا توجد مزامنة فعالة الآن.','error');$('signInButton').disabled=true;return}cloudClient=window.supabase.createClient(PASTRY_CONFIG.url,PASTRY_CONFIG.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const {data:{session}}=await cloudClient.auth.getSession();if(!(session&&localStorage.getItem('pm_sess'))&&window.__pmHideSplash)window.__pmHideSplash();if(session){$('sharedLoginPane').classList.add('hide');$('employeePane').classList.remove('hide');setLoginMessage('الجلسة المشتركة موجودة. تحقق من اسم الموظف وPIN لفتح التطبيق.');try{await refreshEmployeeList()}catch(e){setLoginMessage('تعذر تحميل أسماء الموظفين: '+(e.message||''),'error')}try{try{localStorage.removeItem('pm_emp')}catch(e){}let saved=null;try{saved=JSON.parse(localStorage.getItem('pm_sess')||'null')}catch(e){saved=null}if(saved&&saved.n&&saved.t){$('employeeName').value=saved.n;$('employeePin').value=saved.t;$('loginScreen').classList.add('hide');for(var _t=0;_t<3&&!cloudReady;_t++){if(_t>0)await new Promise(function(r){setTimeout(r,1500*_t)});await unlockApp();}if(!cloudReady){$('loginScreen').classList.remove('hide');setLoginMessage('تعذر استعادة الجلسة، أدخل PIN.','error');if(window.__pmHideSplash)window.__pmHideSplash();}}}catch(e){}}}
