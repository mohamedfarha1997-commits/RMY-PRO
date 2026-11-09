function exportSalesCsv(){exportCsv('RMY_Sales.csv',[['رقم الفاتورة','البائع','التاريخ','الصنف','الكمية','سعر الوحدة','الإيراد','تكلفة الخامات التقديرية','ملاحظة'],...(state.salesLog||[]).map(x=>[x.receiptNo??'',x.by||'',x.date,x.name,x.qty,x.unitPrice,x.revenue,x.costAtSale,x.note||''])])}
function fr_esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fr_parseDay(v){
  v=String(v||'').trim();
  if(!v) return '';
  var only=v.match(/^(\d{1,2})$/);
  if(only){
    var dd=parseInt(only[1],10);
    if(dd<1||dd>31) return null;
    var now=new Date();
    var mm=now.getMonth()+1;
    return now.getFullYear()+'-'+(mm<10?'0':'')+mm+'-'+(dd<10?'0':'')+dd;
  }
  var m=v.match(/^(\d{1,2})[\/\-.](\d{1,2})$/);
  if(m){
    var d=parseInt(m[1],10), mo=parseInt(m[2],10);
    if(d<1||d>31||mo<1||mo>12) return null;
    var y=new Date().getFullYear();
    return y+'-'+(mo<10?'0':'')+mo+'-'+(d<10?'0':'')+d;
  }
  if(/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return null;
}
function fr_money(v){return (Number(v)||0).toLocaleString('ar-EG',{maximumFractionDigits:0})+' ج.م';}
function fr_pct(a,b){return b?((a/b)*100).toFixed(1).replace(/\.0$/,'')+'%':'—';}
function fr_cssText(){
  return '#pmFinOverlay{position:fixed;inset:0;z-index:10050;display:none;align-items:flex-start;justify-content:center;background:rgba(41,51,148,.55);overflow:auto;padding:18px 12px;direction:rtl}'+
   '.pmfr{width:100%;max-width:820px;background:#fff;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;font-family:inherit;color:#1B1B1B}'+
   '.pmfr-head{background:linear-gradient(135deg,#293394,#E3E6F6);color:#FFFFFF;padding:20px 22px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px}'+
   '.pmfr-head h1{margin:0;font-size:22px;font-weight:800}.pmfr-head p{margin:6px 0 0;font-size:13px;opacity:.9}'+
   '.pmfr-x{background:rgba(255,255,255,.18);border:0;color:#1B1B1B;width:36px;height:36px;border-radius:10px;font-size:20px;cursor:pointer;flex:0 0 auto}'+
   '.pmfr-body{padding:18px 20px 24px}'+
   '.pmfr h2{font-size:16px;margin:22px 0 10px;color:#1B1B1B;border-inline-start:4px solid #D6D6D6;padding-inline-start:10px}'+
   '.pmfr-kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}'+
   '.pmfr-kpi{background:#FFFFFF;border:1px solid rgba(0,0,0,.14);border-radius:14px;padding:12px}'+
   '.pmfr-kpi small{display:block;font-size:12px;color:#1B1B1B}.pmfr-kpi b{display:block;font-size:19px;margin-top:4px;direction:ltr;text-align:right}'+
   '.pmfr-kpi.good b{color:#16794B}.pmfr-kpi.bad b{color:#B42318}'+
   '.pmfr table{width:100%;border-collapse:collapse;font-size:14px}'+
   '.pmfr th,.pmfr td{padding:9px 8px;border-bottom:1px solid rgba(0,0,0,.14);text-align:start;vertical-align:top}'+
   '.pmfr th{background:#FFFFFF;font-size:13px;color:#1B1B1B}'+
   '.pmfr td.num{text-align:end;white-space:nowrap;font-weight:700;direction:ltr}'+
   '.pmfr tr.sub td{background:#FFFFFF;font-weight:800}'+
   '.pmfr tr.total td{background:#F2F2F2;font-weight:900;border-top:2px solid #D6D6D6}'+
   '.pmfr .how{font-size:12.5px;color:#1B1B1B;line-height:1.7}'+
   '.pmfr .bar{height:8px;background:rgba(41,51,148,.25);border-radius:6px;overflow:hidden;margin-top:6px}'+
   '.pmfr .bar i{display:block;height:100%;background:linear-gradient(90deg,#E3E6F6,#293394)}'+
   '.pmfr .note{background:rgba(41,51,148,.12);border:1px solid #D6D6D6;border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.7;margin-top:8px}'+
   '.pmfr .steps{counter-reset:st;list-style:none;padding:0;margin:0}'+
   '.pmfr .steps li{counter-increment:st;position:relative;padding:10px 12px 10px 46px;border:1px solid rgba(0,0,0,.14);border-radius:12px;margin-bottom:8px;font-size:13.5px;line-height:1.8}'+
   '.pmfr .steps li::before{content:counter(st);position:absolute;inset-inline-start:12px;top:10px;width:24px;height:24px;border-radius:50%;background:rgba(41,51,148,.12);color:#1B1B1B;display:grid;place-items:center;font-size:12px;font-weight:800}'+
   '.pmfr .empty{color:#1B1B1B;font-size:13px;padding:8px 0}'+
   '@media(max-width:520px){.pmfr-kpis{grid-template-columns:1fr}.pmfr th,.pmfr td{padding:7px 5px;font-size:12.5px}}';
}
function openFinReport(){
  var sel=document.getElementById('anPeriod');
  var key=sel?sel.value:'cur';
  var label=(sel&&sel.selectedOptions&&sel.selectedOptions[0])?sel.selectedOptions[0].textContent:'الفترة الحالية';
  var fromEl=document.getElementById('finFrom'), toEl=document.getElementById('finTo');
  var fromV=fromEl?fromEl.value:'', toV=toEl?toEl.value:'';
  if((fromV&&!toV)||(!fromV&&toV)){ alert('اختار تاريخ البداية والنهاية معاً.'); return; }
  fromV=fr_parseDay(fromV); toV=fr_parseDay(toV);
  if(fromV===null||toV===null){ alert('اكتب اليوم بس مثل: 25'); return; }
  if(fromV&&toV&&fromV>toV){ var t=fromV; fromV=toV; toV=t; }
  var r=null;
  if(fromV&&toV){
    r=window.__anComputeRange?window.__anComputeRange(fromV,toV):null;
    label='من '+fromV+' إلى '+toV;
  } else {
    r=window.__anCompute?window.__anCompute(key):null;
  }
  if(!r){alert('تعذر تجهيز التقرير المالي. حدّث لوحة التحليلات ثم أعد المحاولة.');return;}

  // ---- الأرقام الأساسية (نفس منطق لوحة التحليلات) ----
  var revMenu=Number(r.rev||0), revParty=Number(r.partyRev||0), rev=revMenu+revParty;
  var cogs=Number(r.cost||0)+Number(r.partyCost||0);
  var gross=rev-cogs;
  var waste=Number(r.wasteCost||0), pur=Number(r.pur||0);
  var net=gross-waste;
  var cash=rev-pur;
  var unpricedSales=Number(r.costUnknown||0)+Number(r.partyUncosted||0);
  var unpricedWaste=Number(r.wasteUnpriced||0);
  var openLines=Number(r.openLines||0);
  var parties=r.parties||{};
  var partyRemaining=Number(parties.remaining||0);
  var lowCount=(r.low||[]).length;
  var allProds=(r.products||[]).map(function(p){ return {name:p.name,rev:Number(p.rev||0),cost:Number(p.cost||0),profit:Number(p.rev||0)-Number(p.cost||0)}; });
  var losers=allProds.filter(function(p){return p.profit<0;}).sort(function(a,b){return a.profit-b.profit;});
  var cause;
  if(gross<0) cause='السبب الأساسي: تكلفة الخامات أكبر من سعر البيع، فالربح الإجمالي نفسه سالب ('+fr_money(gross)+').';
  else if(net<0) cause='الربح الإجمالي موجب ('+fr_money(gross)+') لكن الهالك أكبر منه، فالصافي بيطلع سالب.';
  else cause='الربح الإجمالي بيغطي الهالك، والباقي هو الربح الصافي.';
  if(net<0 && waste>0) cause+=' وكمان الهالك زوّد الخسارة بمقدار '+fr_money(waste)+'.';
  var now=new Date().toLocaleString('ar-EG',{timeZone:'Africa/Cairo',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});

  var h='';
  h+='<div class="pmfr"><div class="pmfr-head"><div><h1>التقرير المالي</h1>'+
     '<p>الفترة: '+fr_esc(label)+' &nbsp;•&nbsp; تاريخ الإعداد: '+fr_esc(now)+'</p></div>'+
     '<button type="button" class="pmfr-x" data-fr-close aria-label="إغلاق">×</button></div>'+
     '<div class="pmfr-body">';

  h+='<div style="background:#FFFFFF;border:1px solid rgba(0,0,0,.14);border-radius:14px;padding:14px 16px;margin-bottom:6px;line-height:1.9;font-size:14.5px">'+
     '<b style="font-size:16px">الإجابة المختصرة:</b><br>'+
     'الربح الصافي في الفترة دي <b>'+(net<0?'خسارة':'ربح')+' قدرها '+fr_money(Math.abs(net))+'</b>'+
     (net<0?' (يعني الشغل خسران).':' (يعني الشغل مكسب).')+'<br>'+fr_esc(cause)+'</div>';
  // 1) الملخص
  h+='<h2>1. الملخص</h2><div class="pmfr-kpis">'+
     '<div class="pmfr-kpi"><small>إجمالي الإيرادات</small><b>'+fr_money(rev)+'</b></div>'+
     '<div class="pmfr-kpi '+(gross>=0?'good':'bad')+'"><small>الربح الإجمالي</small><b>'+fr_money(gross)+'</b></div>'+
     '<div class="pmfr-kpi '+(net>=0?'good':'bad')+'"><small>صافي الربح بعد الهالك</small><b>'+fr_money(net)+'</b></div>'+
     '</div>'+
     '<p class="how" style="margin-top:8px">هامش صافي الربح: <b>'+fr_pct(net,rev)+'</b> من إجمالي الإيرادات.</p>';

  // 2) قائمة الدخل
  h+='<h2>2. قائمة الدخل (الربح والخسارة)</h2><p class="how" style="font-size:13.5px">الحساب: '+fr_money(rev)+' − '+fr_money(cogs)+' − '+fr_money(waste)+' = <b>'+fr_money(net)+'</b></p><table><thead><tr><th>البند</th><th class="num">القيمة</th><th>طريقة الحساب</th></tr></thead><tbody>'+
     '<tr><td>مبيعات المنيو</td><td class="num">'+fr_money(revMenu)+'</td><td class="how">مجموع المبيعات المسجلة من الفواتير (الكمية × سعر البيع، أو الإيراد المسجل).</td></tr>'+
     '<tr><td>مبيعات الحفلات</td><td class="num">'+fr_money(revParty)+'</td><td class="how">إجمالي فواتير الحفلات المسجلة.</td></tr>'+
     '<tr class="sub"><td>إجمالي الإيرادات</td><td class="num">'+fr_money(rev)+'</td><td class="how">مبيعات المنيو + مبيعات الحفلات.</td></tr>'+
     '<tr><td>تكلفة البضاعة المباعة</td><td class="num">− '+fr_money(cogs)+'</td><td class="how">تكلفة الخامات وقت البيع، محسوبة لكل صنف مباع.</td></tr>'+
     '<tr class="sub"><td>الربح الإجمالي</td><td class="num">'+fr_money(gross)+'</td><td class="how">إجمالي الإيرادات − تكلفة البضاعة المباعة.</td></tr>'+
     '<tr><td>تكلفة الهالك</td><td class="num">− '+fr_money(waste)+'</td><td class="how">قيمة الخامات التالفة أو المهدرة وقت تسجيل الهالك.</td></tr>'+
     '<tr class="total"><td>صافي الربح</td><td class="num">'+fr_money(net)+'</td><td class="how">الربح الإجمالي − تكلفة الهالك.</td></tr>'+
     '</tbody></table>';

  // 3) التدفق النقدي
  h+='<h2>3. التدفق النقدي التقديري</h2><p class="how" style="font-size:13.5px">الحساب: '+fr_money(rev)+' − '+fr_money(pur)+' = <b>'+fr_money(cash)+'</b>'+(cash>=0?'، يعني الفلوس الداخلة من المبيعات أكبر من اللي خرجت.':'، يعني الفلوس الخارجة أكبر من الداخلة.')+'</p><table><tbody>'+
     '<tr><td>المبيعات المحصلة (منيو + حفلات)</td><td class="num">'+fr_money(rev)+'</td><td class="how">إجمالي ما تم بيعه في الفترة.</td></tr>'+
     '<tr><td>المشتريات</td><td class="num">− '+fr_money(pur)+'</td><td class="how">خامات تم شراؤها في الفترة (تُخرج نقدًا حتى لو لم تُستهلك بعد).</td></tr>'+
     '<tr class="total"><td>صافي الحركة النقدية التقديرية</td><td class="num">'+fr_money(cash)+'</td><td class="how">ليس رصيد البنك أو الصندوق، بل مؤشر لحركة النقد خلال الفترة.</td></tr>'+
     '</tbody></table>';

  // 4) تفصيل المصروفات
  h+='<h2>4. أعلى 5 منتجات ربحية</h2>';
  var prods=(r.products||[]).map(function(p){ return {name:p.name,qty:Number(p.qty||0),rev:Number(p.rev||0),cost:Number(p.cost||0),profit:Number(p.rev||0)-Number(p.cost||0)}; })
    .sort(function(a,b){return b.profit-a.profit;}).slice(0,5);
  if(losers.length){ h+='<p class="note" style="background:#FFEEEC;border-color:#F4C2BC">المنتجات اللي بتخسر في الفترة دي: '+losers.map(function(p){return fr_esc(p.name)+' (خسارة '+fr_money(Math.abs(p.profit))+')';}).join('، ')+'. سعر بيعها أقل من تكلفة خاماتها، وده يحتاج مراجعة للتسعير أو الوصفة.</p>'; }
  if(!prods.length){ h+='<p class="empty">لا توجد مبيعات مسجلة في هذه الفترة.</p>'; }
  else {
    h+='<table><thead><tr><th>المنتج</th><th class="num">الكمية</th><th class="num">الإيراد</th><th class="num">الربح</th></tr></thead><tbody>';
    prods.forEach(function(p){
      h+='<tr><td>'+fr_esc(p.name)+'</td><td class="num">'+fr_esc(String(Math.round(p.qty*100)/100))+'</td><td class="num">'+fr_money(p.rev)+'</td><td class="num">'+fr_money(p.profit)+'</td></tr>';
    });
    h+='</tbody></table><p class="how">الربح = الإيراد − تكلفة الخامات وقت البيع.</p>';
  }

  // 6) أعلى العملاء
  var fr_t=function(head,rows){ return '<table><thead><tr>'+head.map(function(x){return '<th>'+x+'</th>';}).join('')+'</tr></thead><tbody>'+(rows.length?rows.map(function(c){return '<tr>'+c.map(function(v){return '<td>'+v+'</td>';}).join('')+'</tr>';}).join(''):'<tr><td colspan="'+head.length+'">لا يوجد</td></tr>')+'</tbody></table>'; };
  h+='<h2>5. الإنتاج والهالك</h2>';
  h+=fr_t(['الصنف','القطع المنتجة'], (r.prodList||[]).map(function(x){return [fr_esc(x.label), fr_esc(String(x.value))];}));
  h+=fr_t(['الهالك','الكمية','التكلفة'], (r.wasteList||[]).map(function(x){return [fr_esc(x.name), fr_esc(String(x.qty)), fr_money(x.cost)];}));
  h+='<h2>6. المخزون والمشتريات</h2>';
  h+=fr_t(['الخامة','الرصيد','حد الطلب'], (r.low||[]).map(function(x){return [fr_esc(x.name), fr_esc(String(x.qty)+' '+(x.unit||'')), fr_esc(String(x.reorder))];}));
  h+=fr_t(['الخامة','قيمة المشتريات'], (r.purList||[]).map(function(x){return [fr_esc(x.label), fr_money(x.value)];}));
  h+='<h2>7. الحفلات</h2>';
  var pr=r.parties||{n:0,total:0,paid:0,remaining:0};
  h+='<p class="how">عدد الحفلات: <b>'+fr_esc(String(pr.n))+'</b> · الإجمالي: <b>'+fr_money(pr.total)+'</b> · المدفوع: <b>'+fr_money(pr.paid)+'</b> · المتبقي: <b>'+fr_money(pr.remaining)+'</b></p>';
  h+='<h2>8. أعلى العملاء في الفترة</h2>';
  var cs=(r.customers||[]).slice(0,5);
  if(cs.length){ h+='<p class="how" style="font-size:13.5px">أعلى عميل هو <b>'+fr_esc(cs[0].name||'—')+'</b> بإجمالي مشتريات '+fr_money(cs[0].total)+' في '+fr_esc(cs[0].invoices)+' فاتورة.</p>'; }
  if(!cs.length){ h+='<p class="empty">لا توجد بيانات عملاء مرتبطة بالفواتير في هذه الفترة.</p>'; }
  else {
    h+='<table><thead><tr><th>العميل</th><th class="num">عدد الفواتير</th><th class="num">إجمالي المشتريات</th></tr></thead><tbody>';
    cs.forEach(function(c){
      h+='<tr><td>'+fr_esc(c.name||'—')+(c.phone?'<div class="how">'+fr_esc(c.phone)+'</div>':'')+'</td><td class="num">'+fr_esc(c.invoices)+'</td><td class="num">'+fr_money(c.total)+'</td></tr>';
    });
    h+='</tbody></table>';
  }

  // 7) نقاط المراجعة
  h+='<h2>9. نقاط تحتاج مراجعة قبل اعتماد الأرقام</h2>';
  var notes=[];
  if(net<0) notes.push('الصافي سالب في الفترة دي بمقدار <b>'+fr_money(Math.abs(net))+'</b>، ومراجعة التسعير والهالك أولوية.');
  if(gross<0) notes.push('الربح الإجمالي سالب: سعر البيع لا يغطي تكلفة الخامات في بعض الأصناف أو في المجمل.');
  if(losers.length) notes.push('عدد <b>'+losers.length+'</b> منتج بيخسر في البيع، وأهمهم '+fr_esc(losers[0].name)+'.');
  if(unpricedSales>0) notes.push('يوجد <b>'+unpricedSales+'</b> بند بيع بدون تكلفة مسجلة، فالربح الإجمالي قد يكون أعلى من الحقيقي.');
  if(unpricedWaste>0) notes.push('يوجد <b>'+unpricedWaste+'</b> بند هالك بدون تسعير، فتكلفة الهالك قد تكون أقل من الحقيقي.');
  if(openLines>0) notes.push('يوجد <b>'+openLines+'</b> بند في فواتير لسه مفتوحة ولم تُغلق بعد.');
  if(partyRemaining>0) notes.push('المتبقي على حفلات لم تُدفع بالكامل: <b>'+fr_money(partyRemaining)+'</b>، وهذا مبيعات لم تُحصّل نقدًا بعد.');
  if(lowCount>0) notes.push('عدد <b>'+lowCount+'</b> خامة وصلت لحد إعادة الطلب، وينبغي تدبير شرائها.');
  if(!notes.length) h+='<p class="empty">لا توجد ملاحظات مراجعة في هذه الفترة.</p>';
  else h+=notes.map(function(n){return '<div class="note">'+n+'</div>';}).join('');

  // 8) شرح العملية المالية
  h+='<h2>10. شرح العملية المالية</h2><ol class="steps">'+
     '<li><b>تسجيل المبيعات:</b> كل بيع يُسجل بسعره وكميته، ومعه تكلفة الخامات وقت البيع، فيتحدد هامش كل صنف.</li>'+
     '<li><b>الربح الإجمالي:</b> إجمالي الإيرادات ناقص تكلفة البضاعة المباعة. ده بيوضح هل التسعير يغطي الخامات ولا لأ.</li>'+
     '<li><b>الهالك:</b> الخامات التالفة تُحسب تكلفتها كخسارة منفصلة عشان تفضل ظاهرة ومتتخفاش داخل التكلفة.</li>'+
     '<li><b>صافي الربح:</b> الربح الإجمالي − الهالك. ده الرقم اللي بيقولك الشغل بيكسب فعلًا ولا لأ.</li>'+
     '<li><b>الفرق بين الربح والنقد:</b> الربح محاسبي، والنقد حركة فعلية. المشتريات بتخرج نقد فورًا لكنها بتتحول لتكلفة وقت الاستهلاك، لذلك قد يختلف صافي الحركة النقدية عن صافي الربح.</li>'+
     '</ol>';

  h+='<p class="how" style="margin-top:14px">هذا التقرير محسوب من البيانات المسجلة في التطبيق فقط، ودقته تعتمد على اكتمال التسجيل.</p>';
  h+='</div></div>';

  // ---- طباعة مباشرة ----
  var doc='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>التقرير المالي - '+fr_esc(label)+'</title><style>'+
    fr_cssText()+
    '@page{size:A4;margin:12mm}'+
    'body{margin:0;background:#fff;font-family:inherit}'+
    '.pmfr{box-shadow:none;max-width:none;border-radius:0}'+
    '.pmfr-x{display:none!important}'+
    '.pmfr h2,.pmfr tr,.pmfr .note,.pmfr-kpi,.pmfr .steps li{break-inside:avoid}'+
    'thead{display:table-header-group}'+
    '.pmfr-head{-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
    '.pmfr-head{background:#293394!important;color:#fff!important;border-radius:14px;padding:16px}'+
    '.pmfr-head h1{color:#fff!important}'+
    '.pmfr h2{color:#293394!important;border-bottom:2px solid #E3E6F6!important}'+
    '.pmfr-kpi{border-radius:14px!important;border:1px solid #D6D6D6!important;background:#fff!important}'+
    '.pmfr .bar i{background:#293394!important}'+
    '</style></head><body>'+h+'</body></html>';

  var w=null;
  try{ w=window.open('','_blank'); }catch(e){ w=null; }
  if(w && w.document){
    w.document.open(); w.document.write(doc); w.document.close();
    var fired=false;
    var go=function(){ if(fired) return; fired=true; try{ w.focus(); w.print(); }catch(e){} };
    w.onload=go;
    setTimeout(go,400);
    return;
  }
  // احتياطي: لو المتصفح منع النافذة الجديدة، نطبع من iframe مخفي
  var old=document.getElementById('pmFinPrintFrame'); if(old) old.remove();
  var fr=document.createElement('iframe');
  fr.id='pmFinPrintFrame';
  fr.setAttribute('aria-hidden','true');
  fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(fr);
  var d=fr.contentWindow.document; d.open(); d.write(doc); d.close();
  setTimeout(function(){ try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(e){ alert('تعذر فتح الطباعة من هذا المتصفح.'); } },400);
}

const RECIPE_STAGES=[['prep','مرحلة التحضير',''],['oven','مرحلة الفرن',''],['stove','مرحلة التسوية على النار',''],['fin','مرحلة الفنش','بعد التبريد']];
const RECIPE_STAGE_COLORS={prep:'#E8F5E9',oven:'#FFF3E0',stove:'#FDECEA',fin:'#F3E5F5'};
const RECIPE_STAGE_TEXT={prep:'#1B5E20',oven:'#E65100',stove:'#B71C1C',fin:'#4A148C'};
const RECIPE_STAGE_SHORT={prep:'التحضير',oven:'الفرن',stove:'النار',fin:'الفنش'};
/* ترتيب المراحل لكل وصفة: بيتخزن في state.recipeStages[name].order. أي مرحلة ناقصة بترجع لآخر القايمة. */
function normStageOrder(o){const keys=RECIPE_STAGES.map(s=>s[0]);const seen=[];(Array.isArray(o)?o:[]).forEach(k=>{if(keys.includes(k)&&!seen.includes(k))seen.push(k)});keys.forEach(k=>{if(!seen.includes(k))seen.push(k)});return seen}
function getStageOrder(name){return normStageOrder(((state.recipeStages||{})[name]||{}).order)}
function stageOrderFromDom(){const el=document.getElementById('stageOrder');return normStageOrder(el?String(el.value).split(','):[])}
function pmStageOrderUI(order,activeKey){
  order=normStageOrder(order);
  const tabs=document.querySelector('#recipeEditor .stage-tabs');
  if(tabs) order.forEach(k=>{const b=tabs.querySelector('[data-stage="'+k+'"]');if(b){tabs.appendChild(b);if(activeKey)b.classList.toggle('active',k===activeKey)}});
  if(activeKey) document.querySelectorAll('#recipeEditor .stage-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===activeKey));
  const hid=document.getElementById('stageOrder'); if(hid) hid.value=order.join(',');
  const list=document.getElementById('stageOrderList');
  if(list) list.innerHTML=order.map((k,i)=>`<div class="so-row"><span class="so-name">${i+1}. ${RECIPE_STAGE_SHORT[k]}</span><span class="so-btns"><button type="button" onclick="pmMoveStage('${k}',-1)"${i===0?' disabled':''}>▲</button><button type="button" onclick="pmMoveStage('${k}',1)"${i===order.length-1?' disabled':''}>▼</button></span></div>`).join('');
}
window.pmMoveStage=function(k,d){const hid=document.getElementById('stageOrder');const order=normStageOrder(hid?String(hid.value).split(','):[]);const i=order.indexOf(k),j=i+d;if(i<0||j<0||j>=order.length)return;[order[i],order[j]]=[order[j],order[i]];pmStageOrderUI(order);};
window.pmToggleStage=function(tr){const hide=!tr.classList.contains('collapsed');tr.classList.toggle('collapsed',hide);tr.querySelector('.pm-arrow')&&(tr.querySelector('.pm-arrow').textContent=hide?'◀':'▼');let n=tr.nextElementSibling;while(n&&!n.classList.contains('stage-head')){n.style.display=hide?'none':'';n=n.nextElementSibling}};
function stageTagText(temp,time){const h=v=>v!==null&&v!==undefined&&v!=='';return [h(temp)?esc(temp)+'° ':'',h(time)?'لمدة '+esc(time)+' دقيقة':''].join('').trim()}
function stageRowsHtml(rec,opts){opts=opts||{};const sOf=c=>RECIPE_STAGES.some(s=>s[0]===c.stage)?c.stage:'prep';const chip=txt=>`<span style="display:inline-block;margin-inline-start:8px;font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;background:#fff;border:1px solid rgba(0,0,0,.14)">${txt}</span>`;const sv=opts.stove||{};const info={oven:{tag:stageTagText(opts.temp,opts.time),note:opts.note||''},stove:{tag:stageTagText(sv.temp,sv.time),note:sv.note||''}};return normStageOrder(opts.order).map(k=>RECIPE_STAGES.find(s=>s[0]===k)).map(([key,label,fixedTag])=>{const items=rec.filter(c=>sOf(c)===key);const inf=info[key];const showInfo=inf&&(inf.tag||inf.note);if(!items.length&&!showInfo)return '';const tag=inf?(inf.tag?chip(inf.tag):''):(fixedTag?chip(fixedTag):'');const head=`<tr class="stage-head" onclick="pmToggleStage(this)" style="cursor:pointer"><td colspan="3" style="font-weight:800;background:${RECIPE_STAGE_COLORS[key]};color:${RECIPE_STAGE_TEXT[key]||'#1B1B1B'}"><span class="pm-arrow" style="display:inline-block;margin-inline-end:6px">▼</span>${label}${tag}</td></tr>`;const noteRow=(inf&&inf.note)?`<tr><td colspan="3" style="background:rgba(41,51,148,.12);color:#1B1B1B;font-size:13px">ملحوظة: ${esc(inf.note)}</td></tr>`:'';return head+noteRow+items.map(c=>`<tr><td>${esc(c.name)}</td><td>${nfmt(c.qty)}</td><td>${esc(c.unit)}</td></tr>`).join('')}).join('')}
function hasVal2(v){return v!==null&&v!==undefined&&v!==''}
function pmRowHtml(c,stage){return `<div class="lineitem comp-row"><input class="cname" placeholder="اسم المكون" value="${esc(c.name||'')}"><input class="cqty" type="number" min="0" step="any" placeholder="الكمية" value="${esc(c.qty||'')}"><select class="cunit">${opt(UNITS,c.unit||'جرام')}</select><input type="hidden" class="cstage" value="${stage}"><button type="button" class="comp-del" title="حذف المكون" onclick="this.parentElement.remove()">×</button></div>`}
window.pmAddRow=function(stage,name){const box=document.querySelector('[data-rows="'+stage+'"]');if(!box)return;box.insertAdjacentHTML('beforeend',pmRowHtml({name:name||'',qty:'',unit:'جرام'},stage));const r=box.lastElementChild;if(r&&!name){const i=r.querySelector('.cname');i&&i.focus()}};
window.pmStageTab=function(btn,s){document.querySelectorAll('#recipeEditor .stage-tabs .stage-btn').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('#recipeEditor .stage-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===s))};
window.pmSetVal=function(id,v){const el=document.getElementById(id);if(el)el.value=v};
window.pmStep=function(id,d){const el=document.getElementById(id);if(el)el.value=Math.max(0,(+el.value||0)+d)};
window.pmCopyFrom=function(src){const rec=(state.recipes||{})[src]||[];['prep','oven','stove','fin'].forEach(s=>{const b=document.querySelector('[data-rows="'+s+'"]');if(b)b.innerHTML=''});rec.forEach(c=>{const s=RECIPE_STAGES.some(x=>x[0]===c.stage)?c.stage:'prep';const b=document.querySelector('[data-rows="'+s+'"]');if(b)b.insertAdjacentHTML('beforeend',pmRowHtml(c,s))});const tv=rec.find(c=>c.temp!==null&&c.temp!==undefined&&c.temp!=='');const tm=rec.find(c=>c.time!==null&&c.time!==undefined&&c.time!=='');pmSetVal('recipeTemp',tv?tv.temp:'');pmSetVal('recipeTime',tm?tm.time:'');const sv=((state.recipeStages||{})[src]||{}).stove||{};pmSetVal('stoveTemp',sv.temp??'');pmSetVal('stoveTime',sv.time??'');pmSetVal('stoveNote',sv.note??'');pmSetVal('recipeNote',(state.recipeNotes||{})[src]||'');pmStageOrderUI(getStageOrder(src));};
function renderRecipeEditor(){if(cloudActorRole==='barista'){const h=document.querySelector('#recipes h2');if(h)h.textContent='وصفات المشروبات';}let name=$('editProduct').value;if(!name){$('recipeEditor').innerHTML='<div class="empty">لا توجد وصفات.</div>';return}let rec=state.recipes[name]||[];const stOrder=getStageOrder(name);const stvEd=((state.recipeStages||{})[name]||{}).stove||{};const recNote=(state.recipeNotes||{})[name]||'';const isDrink=window.pmIsDrinkName(name);const timeLabel=isDrink?'وقت التحضير للمشروب بالدقائق':'وقت التسوية بالدقائق';let temp=rec.find(c=>c.temp!==null&&c.temp!==undefined&&c.temp!=='')?.temp??'';let time=rec.find(c=>c.time!==null&&c.time!==undefined&&c.time!=='')?.time??'';if(cloudActorRole==='kitchen'||cloudActorRole==='barista'){const recNote=(state.recipeNotes||{})[name]||'';const hasOven=rec.some(c=>(c.stage||'prep')==='oven');const stv=((state.recipeStages||{})[name]||{}).stove||{};const hasOvenInfo=hasVal2(temp)||hasVal2(time)||!!recNote||hasVal2(stv.temp)||hasVal2(stv.time)||!!stv.note;$('recipeEditor').innerHTML=`<details open class="recipe-sheet"><summary>${esc(name)}</summary>${(!hasOven&&!hasOvenInfo&&recNote)?`<div class="notice-ok"><b>ملاحظة الوصفة:</b> ${esc(recNote)}</div>`:''}<div class="tablewrap"><table><tr><th>المكون</th><th>الكمية</th><th>الوحدة</th></tr>${stageRowsHtml(rec,{temp,time,note:recNote,stove:((state.recipeStages||{})[name]||{}).stove||{},order:getStageOrder(name)})}</table></div></details>`;return}const stageOfRow=c=>RECIPE_STAGES.some(x=>x[0]===c.stage)?c.stage:'prep';const rowsOf=s=>rec.filter(c=>stageOfRow(c)===s).map(c=>pmRowHtml(c,s)).join('');const copyOpts=names().filter(n=>n!==name).map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');const addBtn=s=>`<button type="button" class="add-row" onclick="pmAddRow('${s}')">+ إضافة مكون</button>`;const tempChips=[160,170,180,200].map(v=>`<button type="button" class="sg-chip" onclick="pmSetVal('recipeTemp',${v})">${v}°</button>`).join('');$('recipeEditor').innerHTML=`<label>اسم الصنف</label><input id="recipeName" value="${esc(name)}"><label>انسخ من وصفة موجودة (اختياري)</label><select id="copyFrom" onchange="if(this.value)pmCopyFrom(this.value)"><option value="">— ابدأ من الصفر —</option>${copyOpts}</select><details class="stage-order-box"><summary>ترتيب المراحل</summary><div><div id="stageOrderList"></div><input type="hidden" id="stageOrder" value="${stOrder.join(',')}"></div></details><div class="stage-tabs"><button type="button" class="stage-btn s-prep active" data-stage="prep" onclick="pmStageTab(this,'prep')">التحضير</button><button type="button" class="stage-btn s-oven" data-stage="oven" onclick="pmStageTab(this,'oven')">الفرن</button><button type="button" class="stage-btn s-stove" data-stage="stove" onclick="pmStageTab(this,'stove')">النار</button><button type="button" class="stage-btn s-fin" data-stage="fin" onclick="pmStageTab(this,'fin')">الفنش</button></div><div class="stage-panel active" data-panel="prep"><div class="ph ph-prep" style="background:#E8F5E9">مرحلة التحضير</div><div data-rows="prep">${rowsOf('prep')}</div>${addBtn('prep')}</div><div class="stage-panel" data-panel="oven"><div class="ph ph-oven" style="background:#FFF3E0">مرحلة الفرن</div><label>درجة الحرارة</label><div class="sg-chips">${tempChips}</div><div class="grid2"><div><label>درجة الحرارة (°)</label><input id="recipeTemp" type="number" value="${esc(temp)}" placeholder="180"></div><div><label>${timeLabel}</label><div class="stepper"><button type="button" onclick="pmStep('recipeTime',-5)">−5</button><input id="recipeTime" type="number" min="0" value="${esc(time)}" placeholder="الوقت بالدقائق"><button type="button" onclick="pmStep('recipeTime',5)">+5</button></div></div></div><div data-rows="oven">${rowsOf('oven')}</div>${addBtn('oven')}<label for="recipeNote">ملاحظة الفرن (اختياري)</label><textarea id="recipeNote" rows="3" placeholder="مثال: تُدهن الصينية وتُبطّن بورق الزبدة">${esc(recNote)}</textarea></div><div class="stage-panel" data-panel="stove"><div class="ph ph-stove" style="background:#FDECEA">مرحلة التسوية على النار</div><div class="grid2"><div><label>درجة حرارة النار (اختياري)</label><input id="stoveTemp" type="number" value="${esc(stvEd.temp??'')}"></div><div><label>وقت التسوية بالدقائق</label><div class="stepper"><button type="button" onclick="pmStep('stoveTime',-5)">−5</button><input id="stoveTime" type="number" min="0" value="${esc(stvEd.time??'')}"><button type="button" onclick="pmStep('stoveTime',5)">+5</button></div></div></div><div data-rows="stove">${rowsOf('stove')}</div>${addBtn('stove')}<label for="stoveNote">ملاحظة النار (اختياري)</label><textarea id="stoveNote" rows="2" placeholder="مثال: حرّك باستمرار حتى يتكاثف">${esc(stvEd.note??'')}</textarea></div><div class="stage-panel" data-panel="fin"><div class="ph ph-fin" style="background:#F3E5F5">مرحلة الفنش <span style="font-weight:400;font-size:12px">بعد التبريد</span></div><div data-rows="fin">${rowsOf('fin')}</div>${addBtn('fin')}</div>`;pmStageOrderUI(stOrder,stOrder[0]);}
function saveRecipe(){let old=$('editProduct').value,newName=$('recipeName')?.value.trim();if(!newName){alert('اكتب اسم الصنف.');return}let comps=[...document.querySelectorAll('#recipeEditor .comp-row')].map(el=>({name:el.querySelector('.cname').value.trim(),qty:Number(el.querySelector('.cqty').value),unit:el.querySelector('.cunit').value,stage:el.querySelector('.cstage')?.value||'prep',temp:$('recipeTemp').value===''?null:Number($('recipeTemp').value),time:$('recipeTime').value===''?null:Number($('recipeTime').value)})).filter(c=>c.name&&c.qty>0);if(!comps.length){alert('أضف مكونًا واحدًا على الأقل بكمية أكبر من صفر.');return}if(old!==newName&&state.recipes[newName]&&!confirm('الصنف موجود بالفعل. هل تريد استبدال وصفته؟'))return;if(old!==newName){delete state.recipes[old];if(state.recipeMeta&&state.recipeMeta[old]){state.recipeMeta[newName]=state.recipeMeta[old];delete state.recipeMeta[old]}(state.orders||[]).forEach(order=>{if(order.name===old)order.name=newName})}state.recipes[newName]=comps;if(!state.recipeMeta)state.recipeMeta={};if(!state.recipeMeta[newName]||!state.recipeMeta[newName].category){state.recipeMeta[newName]=Object.assign({yieldQty:1,marginPct:30,extraCost:0,actualPrice:0},state.recipeMeta[newName]||{},{category:window.pmAutoCategory(newName)})};state.recipeNotes=state.recipeNotes||{};state.recipeNotes[newName]=String($('recipeNote')?.value||'').trim();const numOf=id=>{const el=$(id);return !el||el.value===''?null:Number(el.value)};state.recipeStages=state.recipeStages||{};state.recipeStages[newName]={stove:{temp:numOf('stoveTemp'),time:numOf('stoveTime'),note:String($('stoveNote')?.value||'').trim()},order:stageOrderFromDom()};if(old!==newName)delete state.recipeStages[old];if(old!==newName)delete state.recipeNotes[old];for(const c of comps){if(!state.prices[c.name])state.prices[c.name]={purchasePrice:0,packSize:0,packUnit:c.unit,reorder:0}}save();$('editProduct').value=newName;renderRecipeEditor();alert('تم حفظ الوصفة على هذا الجهاز.');}
function createRecipe(){let n=prompt('اكتب اسم الصنف الجديد:');if(!n)return;n=n.trim();if(!n)return;if(state.recipes[n]){alert('الصنف موجود بالفعل.');$('editProduct').value=n;renderRecipeEditor();return}state.recipes[n]=[{name:'',qty:0,unit:'جرام',temp:null,time:null}];setDrinkName(n,window.pmRecipeGroup==='drink');renderSelectors();$('editProduct').value=n;renderRecipeEditor()}
function deleteRecipe(){let n=$('editProduct').value;if(!n)return;const pending=(state.orders||[]).filter(x=>x.name===n).length;const msg=pending?`حذف وصفة «${n}»؟ يوجد ${pending} إدخالًا لها في الطلب الحالي، وسيتم حذف هذه الإدخالات أيضًا حتى لا يبقى طلب بلا وصفة. لا يمكن التراجع دون نسخة احتياطية.`:`حذف وصفة «${n}»؟ لا يمكن التراجع دون نسخة احتياطية.`;if(!confirm(msg))return;delete state.recipes[n];setDrinkName(n,false);if(state.recipeMeta)delete state.recipeMeta[n];state.orders=(state.orders||[]).filter(x=>x.name!==n);$('orderResult').innerHTML='';save();$('recipeEditor').innerHTML='';}
