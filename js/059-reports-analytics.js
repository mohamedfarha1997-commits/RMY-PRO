(function(){
  'use strict';
  window.__goPost=window.__goPost||[];
  var sel='cur';

  function S(){ return (typeof state!=='undefined'&&state)?state:(window.state||{}); }
  function arr(v){ return Array.isArray(v)?v:[]; }
  function obj(v){ return (v&&typeof v==='object')?v:{}; }
  function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function num(v){ var n=Number(v); return isFinite(n)?n:0; }
  function fmt(v,d){ return (Math.round(num(v)*100)/100).toLocaleString('en-US',{maximumFractionDigits:(d==null?2:d)}); }
  function money(v){ return fmt(v,0)+' ج.م'; }
  function qtyOf(v,u){ return fmt(v)+(u?' '+u:' قطعة'); }
  function isDrink(x){ return !!x && (x.group==='drink' || (typeof window.pmIsDrinkLine==='function' && window.pmIsDrinkLine(x))); }
  function dayOf(x){ return String((x&&(x.date||x.at))||'').slice(0,10)||'—'; }
  function normKey(n){ return String(n||'').trim().replace(/\s+/g,' ').toLowerCase(); }
  function digitsOf(p){ return String(p||'').replace(/\D/g,''); }

  // ===== الفترات: الشهر الحالي + كل شهر في الأرشيف =====
  var LISTS=['salesLog','expensesLog','purchasesLog','wasteLog','productionLog','history','partyOrders','drinkOrders','partyInvoices'];
  function periods(){
    var s=S(), out=[], archives=arr(s.monthlyArchives);
    out.push({key:'cur',label:'الشهر الحالي',live:true,src:{
      salesLog:pmRecostMissing(arr(s.salesLog)), expensesLog:arr(s.expensesLog), purchasesLog:arr(s.purchasesLog),
      wasteLog:pmRecostWaste(arr(s.wasteLog)), productionLog:arr(s.productionPieces), history:arr(s.history),
      partyOrders:arr(s.partyOrders).filter(function(o){return !(o&&o.closedArchiveId)}), drinkOrders:arr(s.drinkOrders), inventory:arr(s.inventory), partyInvoices:(window.pmOpenPartyInvoices?window.pmOpenPartyInvoices():[])}});
    archives.forEach(function(a,i){
      out.push({key:'arc:'+i, label:'أرشيف: '+(a.label||('#'+(i+1))), live:false, src:{
        salesLog:arr(a.salesLog), expensesLog:arr(a.expensesLog), purchasesLog:arr(a.purchasesLog),
        wasteLog:arr(a.wasteLog), productionLog:arr(a.productionPieces), history:arr(a.history),
        partyOrders:[], drinkOrders:[], inventory:arr(a.inventory), partyInvoices:arr(a.partyInvoices)}});
    });
    return out;
  }
  function collect(key){
    var P=periods(), pick=(key==='all')?P:P.filter(function(p){return p.key===key;});
    if(!pick.length) pick=[P[0]];
    var m={isAll:key==='all', live:false, inventory:[]};
    LISTS.forEach(function(k){ m[k]=[]; });
    pick.forEach(function(p){ LISTS.forEach(function(k){ m[k]=m[k].concat(p.src[k]); }); });
    if(pick.length===1){ m.inventory=pick[0].src.inventory; m.live=pick[0].live; }
    else { m.inventory=arr(S().inventory); m.live=true; }
    m.prices=obj(S().prices); m.menu=arr(S().menu); m.recipes=obj(S().recipes);
    return m;
  }

  // ===== الحسابات =====
  function compute(m){
    var R={rev:0,cost:0,costUnknown:0,qty:0,openLines:0,foodRev:0,drinkRev:0,foodQty:0,drinkQty:0};
    var inv={}, days={}, byProd={};
    arr(m.salesLog).forEach(function(x){
      if(!x||typeof x!=='object') return;
      var r=(x.revenue!=null)?num(x.revenue):num(x.qty)*num(x.unitPrice), q=num(x.qty);
      R.rev+=r; R.qty+=q;
      if(x.costAtSale==null) R.costUnknown++; else R.cost+=num(x.costAtSale);
      if(x.invoiceStatus==='open') R.openLines++;
      var rid=String(x.receiptId||x.receiptNo||'');
      if(rid){
        var v=inv[rid]||(inv[rid]={rev:0,name:'',phone:''});
        v.rev+=r;
        if(!v.name && x.note) v.name=String(x.note).trim();
        if(!v.phone && x.customerPhone) v.phone=String(x.customerPhone).trim();
      }
      var d=dayOf(x); days[d]=(days[d]||0)+r;
      var n=String(x.name||'').trim()||'—';
      var p=byProd[n]||(byProd[n]={name:n,qty:0,rev:0,cost:0,unknown:0});
      p.qty+=q; p.rev+=r;
      if(x.costAtSale==null) p.unknown++; else p.cost+=num(x.costAtSale);
      if(isDrink(x)){ R.drinkRev+=r; R.drinkQty+=q; } else { R.foodRev+=r; R.foodQty+=q; }
    });
    R.invoices=Object.keys(inv).length;
    R.avgInvoice=R.invoices?R.rev/R.invoices:0;
    var pinv=arr(m.partyInvoices);
    R.partyRev=0; R.partyCost=0; R.partyUncosted=0;
    pinv.forEach(function(p){ if(!p||typeof p!=='object') return; R.partyRev+=num(p.total); R.partyCost+=num(p.cost); R.partyUncosted+=(p.uncostedLines!=null?num(p.uncostedLines):((p.lines&&p.lines.length)||(num(p.total)>0?1:0))); });
    R.partyCollected=0; arr(m.partyOrders).forEach(function(o){ if(o && o.status!=='cancelled' && !(window.pmIsPartyOrderClosed && window.pmIsPartyOrderClosed(o))) R.partyCollected+=num(o.paid); });
    R.gross=(R.rev+R.partyRev)-(R.cost+R.partyCost);

    // العملاء: من الفواتير اللي فيها اسم أو تليفون
    var custs={};
    Object.keys(inv).forEach(function(rid){
      var v=inv[rid]; if(!v.name && !v.phone) return;
      var key=digitsOf(v.phone)?'p:'+digitsOf(v.phone):'n:'+normKey(v.name);
      var c=custs[key]||(custs[key]={name:v.name,phone:v.phone,invoices:0,total:0});
      if(!c.name && v.name) c.name=v.name;
      if(!c.phone && v.phone) c.phone=v.phone;
      c.invoices++; c.total+=v.rev;
    });

    var exp=0, expCat={};
    arr(m.expensesLog).forEach(function(x){
      var a=num(x.amount); exp+=a;
      var c=String(x.category||'غير مصنف'); expCat[c]=(expCat[c]||0)+a;
    });

    var pur=0, purBy={}, purCount=0, purMax={v:0,name:''};
    arr(m.purchasesLog).forEach(function(x){
      var a=num(x.totalCost!=null?x.totalCost:x.total); pur+=a; purCount++; if(a>purMax.v){ purMax={v:a,name:String(x.name||'—')}; }
      var n=String(x.name||'—'); purBy[n]=(purBy[n]||0)+a;
    });

    var wasteCost=0, wasteQty=0, wasteBy={}, wasteUnpriced=0;
    arr(m.wasteLog).forEach(function(x){
      var q=num(x.qty), c=num(x.costAtWaste); if(x.costAtWaste==null) wasteUnpriced++;
      wasteQty+=q; wasteCost+=c;
      var n=String(x.name||'—'); var w=wasteBy[n]||(wasteBy[n]={name:n,qty:0,cost:0});
      w.qty+=q; w.cost+=c;
    });

    var prodBy={}, prodTotal=0;
    arr(m.productionLog).forEach(function(x){
      var n=String(x.name||x.product||'—'); var q=num(x.pieces!=null?x.pieces:x.qty);
      prodTotal+=q; prodBy[n]=(prodBy[n]||0)+q;
    });

    // استهلاك الخامات الفعلي من حركة المخزون (الخصومات)
    var useBy={};
    var invNames={}; arr(m.inventory).forEach(function(s){ if(s&&s.name) invNames[String(s.name)]=true; });
    var hasInv=Object.keys(invNames).length>0;
    arr(m.history).forEach(function(x){
      var d=num(x.deduct); if(d<=0) return;
      var n=String(x.name||'—'), u=String(x.unit||'');
      /* خامات اتحذفت أو مش موجودة بالمخزون دلوقتي مش بتظهر في الاستهلاك */
      if(hasInv && !invNames[n]) return;
      var k=n+'||'+u; var r=useBy[k]||(useBy[k]={name:n,unit:u,qty:0});
      r.qty+=d;
    });

    var low=[];
    arr(m.inventory).forEach(function(s){
      var pr=obj(m.prices)[s.name]||{}; var ro=num(pr.reorder);
      if(ro>0 && num(s.qty)<=ro) low.push({name:s.name,qty:num(s.qty),unit:s.unit||'',reorder:ro});
    });

    var parties={n:0,total:0,paid:0,remaining:0};
    arr(m.partyInvoices).forEach(function(p){
      if(!p) return;
      var t=num(p.total), pd=p.paid==null?0:num(p.paid);
      parties.n++; parties.total+=t; parties.paid+=pd; parties.remaining+=Math.max(0,t-pd);
    });

    var drinksPendingBy={}, drinksPendingN=0;
    arr(m.drinkOrders).forEach(function(o){
      if(!o || String(o.status||'pending')!=='pending') return;
      drinksPendingN++;
      var n=String(o.name||'—'); drinksPendingBy[n]=(drinksPendingBy[n]||0)+num(o.qty||1);
    });

    // المنيو وتغطية المبيعات
    var menu=arr(m.menu), menuStats={total:menu.length,active:0,soldOut:0,piece:0,party:0,drink:0}, soldNames={};
    Object.keys(byProd).forEach(function(n){ soldNames[normKey(n)]=true; });
    var noSales=[];
    menu.forEach(function(x){
      if(!x) return;
      if(x.active!==false) menuStats.active++;
      if(x.soldOut) menuStats.soldOut++;
      var k=(x.kind==='party')?'party':(x.kind==='drink'?'drink':'piece'); menuStats[k]++;
      if(x.active!==false && !soldNames[normKey(x.name)]) noSales.push(String(x.name||''));
    });

    function desc(list,f){ return list.sort(function(a,b){return f(b)-f(a);}); }
    var listOf=function(o,lf){ return Object.keys(o).map(function(k){return lf(k,o[k]);}); };

    R.customers=desc(listOf(custs,function(k,c){return c;}),function(x){return x.total;}).slice(0,10);
    R.customerCount=Object.keys(custs).length;
    R.exp=exp; R.expList=desc(listOf(expCat,function(k,v){return {label:k,value:v};}),function(x){return x.value;});
    R.pur=pur; R.purCount=purCount; R.purMax=purMax; R.purList=desc(listOf(purBy,function(k,v){return {label:k,value:v};}),function(x){return x.value;});
    R.wasteCost=wasteCost; R.wasteQty=wasteQty; R.wasteUnpriced=wasteUnpriced;
    R.wasteList=desc(listOf(wasteBy,function(k,v){return v;}),function(x){return x.qty;});
    R.prodTotal=prodTotal; R.prodList=desc(listOf(prodBy,function(k,v){return {label:k,value:v};}),function(x){return x.value;});
    R.useList=desc(listOf(useBy,function(k,v){return v;}),function(x){return x.qty;});
    R.low=low;
    R.products=desc(listOf(byProd,function(k,v){return v;}),function(x){return x.rev;});
    R.days=Object.keys(days).sort().map(function(k){return {label:k,value:days[k]};}).slice(-31);
    R.parties=parties;
    R.drinksPendingN=drinksPendingN;
    R.drinksPending=desc(listOf(drinksPendingBy,function(k,v){return {label:k,value:v};}),function(x){return x.value;});
    R.menu=menuStats; R.noSales=noSales;
    return R;
  }

  // ===== تكلفة الوصفات والهامش (من الوصفات الحالية والمنيو الحالي) =====
  function costingRows(){
    var rec=obj(S().recipes), menuPrice={};
    arr(S().menu).forEach(function(x){ if(x&&x.name) menuPrice[normKey(x.name)]=num(x.price); });
    var rows=[];
    Object.keys(rec).forEach(function(n){
      var r=null;
      try{ if(typeof recipeCost==='function') r=recipeCost(n); }catch(e){ r=null; }
      if(!r) return;
      var unit=(r.unitCost==null)?null:num(r.unitCost);
      var sug=(r.suggested==null)?null:num(r.suggested);
      var price=menuPrice[normKey(n)]||0;
      var margin=(price>0 && unit!=null)?(price-unit)/price*100:null;
      rows.push({name:n, unit:unit, suggested:sug, price:price, margin:margin});
    });
    return rows;
  }

  // ===== العرض الجديد =====
  function toneOf(v){ return v>=0?'pos':'neg'; }
  function pctTxt(v){ return v==null?'—':fmt(v,0)+'%'; }
  function empty(t){ return '<div class="an-empty">'+esc(t)+'</div>'; }
  function table(head,rows){
    if(!rows.length) return empty('لا توجد بيانات');
    return '<div class="an-tablewrap"><table><tr>'+head.map(function(h){return '<th>'+esc(h)+'</th>';}).join('')+'</tr>'+
      rows.map(function(r){return '<tr>'+r.map(function(c){return '<td>'+c+'</td>';}).join('')+'</tr>';}).join('')+'</table></div>';
  }

  var anTab='over', anPer=1, anType='all', anQ='';
  var TABS=[['over','نظرة عامة'],['fin','المالية'],['prod','الإنتاج'],['stock','المخزون'],['party','الحفلات'],['ledger','كل الحركات']];
  var PERS=[[1,'اليوم'],[7,'7 أيام'],[30,'الشهر']];
  var TYPES=[['all','الكل'],['sale','مبيعات'],['purchase','مشتريات'],['waste','هالك'],['production','إنتاج'],['party','حفلات']];
  var TYPE_NAME={sale:'مبيعات',purchase:'مشتريات',waste:'هالك',production:'إنتاج',party:'حفلات'};
  function dkey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function sliceM(m,days){
    if(days>=30) return m;
    var cut=dkey(new Date(Date.now()-(days-1)*864e5)), o=Object.assign({},m);
    ['salesLog','wasteLog','purchasesLog','productionLog','drinkOrders','history'].forEach(function(k){
      if(Array.isArray(m[k])) o[k]=m[k].filter(function(x){ return dayOf(x)>=cut; });
    });
    if(Array.isArray(m.partyInvoices)) o.partyInvoices=m.partyInvoices.filter(function(x){ return partyDay(x)>=cut; });
    return o;
  }
  function partyDay(x){ return String((x&&x.deliveredAt)||'').slice(0,10)||'—'; }
  function pctOf(a,b){ return b>0?Math.round(a/b*100):0; }
  function kc(label,val,tone,sub){ return '<div class="an-k"><small>'+esc(label)+'</small><b class="'+(tone||'')+'">'+esc(val)+'</b>'+(sub?'<span>'+esc(sub)+'</span>':'')+'</div>'; }
  function rowH(label,val,tone){ return '<div class="an-row"><span>'+esc(label)+'</span><b class="'+(tone||'')+'">'+esc(money(val))+'</b></div>'; }
  function miniBars(items,f){
    var mx=Math.max.apply(null,items.map(function(i){return num(i.value);}).concat([1]));
    return items.length? items.map(function(x){ return '<div class="an-row an-block"><div class="an-rs"><span>'+esc(x.label)+'</span><b>'+esc(f(x.value))+'</b></div><div class="an-bar"><i style="width:'+pctOf(num(x.value),mx)+'%"></i></div></div>'; }).join('') : '<div class="an-empty">لا توجد بيانات في الفترة</div>';
  }
  function colBars(items){
    var mx=Math.max.apply(null,items.map(function(i){return num(i.value);}).concat([1]));
    return items.map(function(x,i){ return '<div class="'+(i===items.length-1?'today':'')+'" style="height:'+Math.max(3,num(x.value)/mx*100)+'%" title="'+esc(money(x.value))+'"></div>'; }).join('');
  }
  function donutG(parts){
    var t=parts.reduce(function(s,p){return s+Math.max(0,p[1]);},0)||1, acc=0, st=[];
    parts.forEach(function(p){ var v=Math.max(0,p[1]), a=acc, b=acc+v/t*100; st.push(p[2]+' '+a+'% '+b+'%'); acc=b; });
    return '<div class="an-donut"><div class="an-ring" style="background:conic-gradient('+st.join(',')+')"><span><b>'+esc(money(t))+'</b>إجمالي</span></div><div class="an-leg">'+parts.map(function(p){ return '<div><span><i style="background:'+p[2]+'"></i>'+esc(p[0])+'</span><b>'+esc(money(p[1]))+'</b></div>'; }).join('')+'</div></div>';
  }

  // ===== التحضير: الشيف والباريستا بنفس المرحلتين: تحضير / جاهز للتسليم =====
  function prepData(){
    var by={}, order=[];
    function add(name,qty,isReady,src){
      var k=String(name||'—');
      if(!by[k]){ by[k]={name:k,pending:0,ready:0}; order.push(k); }
      if(isReady) by[k].ready+=qty; else by[k].pending+=qty;
    }
    arr(S().orders).forEach(function(o){
      if(!o||o.status==='cancelled') return;
      add(o.name, Math.max(1,num(o.qty)), o.status==='ready'||o.status==='delivered', 'chef');
    });
    arr(S().drinkOrders).forEach(function(o){
      if(!o||o.status==='cancelled') return;
      add(o.name, Math.max(1,num(o.qty)), o.status==='prepared'||o.status==='delivered', 'barista');
    });
    return order.map(function(k){
      var x=by[k], total=x.pending+x.ready;
      x.total=total; x.percent=total?Math.round(x.ready/total*100):0;
      return x;
    }).filter(function(x){ return x.total>0; });
  }
  function stageProgress(name){
    var order=(typeof getStageOrder==='function')?getStageOrder(name):['prep','oven','stove','fin'];
    var L=(typeof RECIPE_STAGES!=='undefined')?RECIPE_STAGES:[];
    var pend=arr(S().drinkOrders).filter(function(o){return o&&o.status==='pending'&&o.name===name;});
    return order.map(function(k){
      var f=L.filter(function(x){return x[0]===k;})[0];
      var n=pend.filter(function(o){return (Array.isArray(o.stagesDone)?o.stagesDone:[]).indexOf(k)>-1;}).length;
      return {k:k,label:f?f[1]:k,done:n,total:pend.length};
    });
  }
  function prepHtml(){
    var list=prepData();
    var cur=list.filter(function(x){return x.pending>0;})[0];
    var stagesHtml = cur ? '<div class="an-stages">'+stageProgress(cur.name).map(function(p){
        return '<div class="an-st"><div class="an-rs"><span>'+esc(p.label)+'</span><b>'+p.done+' / '+p.total+'</b></div><div class="an-bar"><i style="width:'+(p.total?Math.round(p.done/p.total*100):0)+'%"></i></div></div>';
      }).join('')+'</div>' : '';
    var head = cur
      ? '<div class="an-card an-cur"><div class="an-cur-top"><span class="an-pill">قيد التحضير الآن</span><small>'+fmt(cur.total)+' قطعة</small></div>'+
        '<h3 class="an-cur-name">'+esc(cur.name)+'</h3>'+
        '<div class="an-rs"><span>تحضير: <b>'+fmt(cur.pending)+'</b> · جاهز للتسليم: <b>'+fmt(cur.ready)+'</b></span><b>'+cur.percent+'%</b></div>'+
        '<div class="an-bar an-bar-lg"><i style="width:'+cur.percent+'%"></i></div>'+stagesHtml+'</div>'
      : '<div class="an-card"><div class="an-empty">لا يوجد تحضير جاري الآن</div></div>';
    var rows = list.length ? list.map(function(x){
        return '<div class="an-row an-block"><div class="an-rs"><span>'+esc(x.name)+' <small>'+fmt(x.total)+' قطعة</small></span><span class="an-pill '+(x.percent===100?'g':'')+'">'+x.percent+'%</span></div><div class="an-bar"><i style="width:'+x.percent+'%;'+(x.percent===100?'background:#107C10':'')+'"></i></div></div>';
      }).join('') : '<div class="an-empty">لا توجد طلبات تحضير</div>';
    return head+'<div class="an-card"><h3>كل التحضيرات</h3>'+rows+'</div>';
  }
  function pillFor(q,min){ return q<=0?'<span class="an-pill r">نافد</span>':q<=min?'<span class="an-pill a">تحت الحد</span>':'<span class="an-pill g">متوفر</span>'; }

  function ledgerRows(m){
    var out=[];
    arr(m.salesLog).forEach(function(x){ if(!x||typeof x!=='object') return; out.push({t:'sale',d:dayOf(x),n:x.name||x.item||x.product||'—',v:(x.revenue!=null)?num(x.revenue):num(x.qty)*num(x.unitPrice),q:num(x.qty)}); });
    arr(m.purchasesLog).forEach(function(x){ if(!x||typeof x!=='object') return; out.push({t:'purchase',d:dayOf(x),n:String(x.name||'—'),v:num(x.totalCost!=null?x.totalCost:x.total),q:num(x.qty)}); });
    arr(m.wasteLog).forEach(function(x){ if(!x||typeof x!=='object') return; out.push({t:'waste',d:dayOf(x),n:String(x.name||'—'),v:num(x.costAtWaste),q:num(x.qty)}); });
    arr(m.productionLog).forEach(function(x){ if(!x||typeof x!=='object') return; out.push({t:'production',d:dayOf(x),n:String(x.name||'—'),v:0,q:num(x.pieces!=null?x.pieces:x.qty)}); });
    arr(m.partyInvoices).forEach(function(x){ if(!x||typeof x!=='object') return; out.push({t:'party',d:partyDay(x),n:String(x.customer||'—'),v:num(x.total),q:0}); });
    out.sort(function(a,b){ return a.d<b.d?1:a.d>b.d?-1:0; });
    return out;
  }

  function injectStyle(){
    if(document.getElementById('anStyle')) return;
    var st=document.createElement('style'); st.id='anStyle';
    st.textContent=
      '.an-root{direction:rtl;color:#1B1B1B}'+
      '.an-top{background:#0067B8;color:#fff;padding:16px;border-radius:0 0 18px 18px;margin:-4px -4px 0}'+
      '.an-top h1{font-size:18px;margin:0}.an-top p{font-size:12px;opacity:.85;margin:2px 0 0}'+
      '.an-per{display:flex;gap:6px;margin-top:12px}'+
      '.an-per button,.an-tabs button,.an-chips button{border:1px solid #D6D6D6;background:#fff;color:#5E5E5E;border-radius:999px;padding:7px 12px;font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}'+
      '.an-per button{background:transparent;color:#fff;border-color:rgba(255,255,255,.4)}'+
      '.an-per .on{background:#fff;color:#0067B8;border-color:#fff;font-weight:700}'+
      '.an-tabs{display:flex;gap:6px;overflow-x:auto;padding:12px 4px 4px;scrollbar-width:none}'+
      '.an-tabs .on,.an-chips .on{background:#0067B8;color:#fff;border-color:#0067B8;font-weight:700}'+
      '.an-main{padding:10px 2px}'+
      '.an-hero{background:#0067B8;color:#fff;border-radius:16px;padding:18px;margin-bottom:10px}.an-hero small{opacity:.85;font-size:12px}.an-hero b{display:block;font-size:30px;margin:4px 0}'+
      '.an-kp{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}'+
      '.an-k{background:#fff;border:1px solid #D6D6D6;border-radius:14px;padding:12px;box-shadow:0 1px 2px rgba(0,0,0,.05);display:flex;flex-direction:column;gap:3px;min-width:0}'+
      '.an-k small{color:#5E5E5E;font-size:12px}.an-k b{font-size:17px}.an-k span{color:#5E5E5E;font-size:11px}'+
      '.an-card{background:#fff;border:1px solid #D6D6D6;border-radius:16px;padding:14px;margin-bottom:10px;overflow:auto}'+
      '.an-card h3{font-size:14px;margin:0 0 10px}'+
      '.an-bars{display:flex;align-items:flex-end;gap:4px;height:100px}.an-bars div{flex:1;background:#0067B8;border-radius:4px 4px 0 0;min-height:3px;opacity:.85}.an-bars .today{background:#107C10}'+
      '.an-lbl{display:flex;justify-content:space-between;font-size:10px;color:#5E5E5E;margin-top:4px}'+
      '.an-donut{display:flex;gap:14px;align-items:center}'+
      '.an-ring{width:110px;height:110px;border-radius:50%;flex-shrink:0;display:grid;place-items:center}'+
      '.an-ring span{width:74px;height:74px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;color:#5E5E5E}.an-ring b{font-size:13px;color:#1B1B1B}'+
      '.an-leg{flex:1;font-size:13px}.an-leg div{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.an-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-left:6px}'+
      '.an-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #EEE;font-size:13px;gap:8px}'+
      '.an-row:last-child{border:0}.an-row small{display:block;color:#5E5E5E;font-size:11px}'+
      '.an-block{display:block}.an-rs{display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-bottom:5px;gap:6px}'+
      '.an-tot{font-size:15px;border-top:2px solid #1B1B1B;border-bottom:0;margin-top:4px}'+
      '.an-bar{height:7px;background:#E5E5E5;border-radius:6px;overflow:hidden}.an-bar i{display:block;height:100%;background:#0067B8}'+
      '.an-pill{font-size:11px;padding:3px 8px;border-radius:8px;background:#DCEBF8;color:#0067B8;white-space:nowrap}.an-pill.r{background:#FDE7E9;color:#C50F1F}.an-pill.g{background:#DFF6DD;color:#107C10}.an-pill.a{background:#FFF4CE;color:#9D5D00}'+
      '.an-root .pos{color:#107C10}.an-root .neg{color:#C50F1F}'+
      '.an-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.an-chips button{padding:6px 10px}'+
      '.an-search{width:100%;border:1px solid #D6D6D6;border-radius:12px;padding:10px 12px;font:inherit;margin-bottom:10px;background:#fff}'+
      '.an-empty{color:#5E5E5E;font-size:13px;padding:8px 0}'+
      '.an-tablewrap{overflow:auto;width:100%}.an-tablewrap table{width:100%;border-collapse:collapse;font-size:12px}.an-tablewrap th,.an-tablewrap td{padding:7px 6px;border-bottom:1px solid #EEE;text-align:right}.an-tablewrap th{color:#5E5E5E;font-weight:700}'+
      '.an-tools{background:#fff;border:1px solid #D6D6D6;border-radius:16px;padding:12px 14px;margin-bottom:10px}.an-tools summary{cursor:pointer;font-weight:700;color:#0067B8}'+
      '.an-tools-in{display:flex;flex-direction:column;gap:8px;margin-top:10px}'+
      '.an-range{display:flex;gap:8px}.an-range input{flex:1;border:1px solid #D6D6D6;border-radius:10px;padding:9px;font:inherit;min-width:0}'+
      '.an-sel{border:1px solid #D6D6D6;border-radius:10px;padding:9px;font:inherit;background:#fff}'+
      '.an-btn{border:0;background:#0067B8;color:#fff;border-radius:12px;padding:10px 14px;font:inherit;font-weight:700;cursor:pointer}'+
      'html[data-theme="dark"] .an-root{color:#D6D6D6}html[data-theme="dark"] .an-k,html[data-theme="dark"] .an-card,html[data-theme="dark"] .an-tools{background:#303030;border-color:#434343;color:#D6D6D6}'+
      'html[data-theme="dark"] .an-ring span{background:#303030;color:#9E9E9E}html[data-theme="dark"] .an-ring b{color:#D6D6D6}html[data-theme="dark"] .an-search,html[data-theme="dark"] .an-range input,html[data-theme="dark"] .an-sel{background:#303030;color:#D6D6D6;border-color:#434343}'+
      'html[data-theme="dark"] .an-tabs button,html[data-theme="dark"] .an-chips button{background:#303030;color:#9E9E9E;border-color:#434343}'+
      '.an-stages{display:grid;gap:10px;margin-top:12px}.an-st .an-rs{margin-bottom:4px}'+
      '.an-cur{border:2px solid #0067B8}.an-cur-top{display:flex;justify-content:space-between;align-items:center}.an-cur-name{font-size:19px;margin:12px 0 10px}.an-bar-lg{height:10px;margin-top:10px}'+
      '.an-party-slot .pmd-wrap{margin:0}.an-party-slot .pmd-card{background:#fff;border:1px solid #D6D6D6;border-radius:16px;padding:14px;margin-bottom:10px}.an-party-slot .pmd-title{font-size:14px;color:#1B1B1B;margin:0 0 10px}.an-party-slot .pmd-kpi{background:#F2F2F2;border-radius:14px}.an-party-slot .pmd-kpi b{color:#0067B8}'+
      'html[data-theme="dark"] .an-party-slot .pmd-card{background:#303030;border-color:#434343;color:#D6D6D6}';
    document.head.appendChild(st);
  }

  function build(){
    injectStyle();
    var root=document.getElementById('anRoot'); if(!root) return;
    var P=periods();
    if(sel!=='all' && !P.some(function(p){return p.key===sel;})) sel='cur';
    var mFull=collect(sel), m=sliceM(mFull,anPer);
    var R=compute(m), RF=(anPer===30)?R:compute(mFull);
    var rev=R.rev+R.partyRev, net=R.gross-R.wasteCost-R.exp;
    var pName=PERS.filter(function(p){return p[0]===anPer;})[0][1];
    var ready=0; var rs=obj(S().readyStock); Object.keys(rs).forEach(function(n){ ready+=Math.max(0,num(rs[n])); });
    var inv=arr(mFull.inventory);
    var liveNote=mFull.live?'':'بيانات الأرشيف: الطلبات الحالية والمنيو والحفلات غير مخزنة فيه، وتظهر للشهر الحالي فقط.';
    var opts='<option value="cur"'+(sel==='cur'?' selected':'')+'>الشهر الحالي</option><option value="all"'+(sel==='all'?' selected':'')+'>كل الفترات (الحالي + الأرشيف)</option>';
    P.slice(1).forEach(function(p){ opts+='<option value="'+esc(p.key)+'"'+(sel===p.key?' selected':'')+'>'+esc(p.label)+'</option>'; });
    var cmpRows=P.map(function(p){ var r=compute(collect(p.key)), n=r.gross-r.wasteCost-r.exp; return [esc(p.label),esc(money(r.rev)),esc(money(r.pur)),esc(money(r.wasteCost)),'<span class="'+toneOf(n)+'">'+esc(money(n))+'</span>']; });
    var costRows=costingRows().map(function(c){ var mg=c.margin; var badge=mg==null?'—':'<span class="'+(mg>=50?'pos':'neg')+'">'+esc(pctTxt(mg))+'</span>'; return [esc(c.name),esc(c.unit==null?'ناقص سعر خامة':money(c.unit)),esc(c.suggested==null?'—':money(c.suggested)),esc(c.price?money(c.price):'غير في المنيو'),badge]; });

    var body='';
    if(anTab==='over'){
      var days=arr(RF.days);
      body='<div class="an-hero"><small>صافي الربح · '+esc(pName)+'</small><b>'+esc(money(net))+'</b><small>هامش '+pctOf(net,rev)+'%</small></div>'+
        '<div class="an-kp">'+
          kc('إجمالي الإيرادات',money(rev),'',fmt(R.invoices)+' فاتورة')+
          kc('إجمالي التكاليف',money(R.pur+R.wasteCost),'neg')+
          kc('المشتريات',money(R.pur))+
          kc('الهالك',money(R.wasteCost))+
          kc('الحفلات',money(R.partyRev))+
          kc('تنبيهات المخزون',R.low.length+' صنف',R.low.length?'neg':'pos')+
        '</div>'+
        '<div class="an-card"><h3>المبيعات اليومية (7 أيام)</h3><div class="an-bars">'+colBars(days)+'</div>'+
          '<div class="an-lbl"><span>'+esc(days.length?days[0].label:'')+'</span><span>اليوم</span></div></div>'+
        '<div class="an-card"><h3>توزيع الحركات المالية</h3>'+donutG([['الإيرادات',rev,'#0067B8'],['المشتريات',R.pur,'#9D5D00'],['الهالك',R.wasteCost,'#C50F1F']])+'</div>';
    } else if(anTab==='fin'){
      body='<div class="an-card"><h3>قائمة الدخل</h3>'+rowH('إيراد المبيعات',R.rev)+rowH('إيراد الحفلات',R.partyRev)+rowH('المشتريات',-R.pur,'neg')+rowH('الهالك',-R.wasteCost,'neg')+
          '<div class="an-row an-tot"><span><b>صافي الربح</b></span><b class="'+(net>=0?'pos':'neg')+'">'+esc(money(net))+'</b></div></div>'+
        '<div class="an-card"><h3>المبيعات حسب الصنف</h3>'+miniBars(R.products.slice(0,6).map(function(p){return {label:p.name,value:p.rev};}),money)+'</div>'+
        '<div class="an-card"><h3>مقارنة الفترات</h3>'+table(['الفترة','المبيعات','المشتريات','الهالك','الصافي'],cmpRows)+'</div>'+
        '<details class="an-tools"><summary>تقرير مالي مفصّل للطباعة</summary><div class="an-tools-in">'+
          '<select id="anPeriod" class="an-sel">'+opts+'</select>'+
          '<div class="an-range"><input id="finFrom" inputmode="numeric" placeholder="من يوم"><input id="finTo" inputmode="numeric" placeholder="إلى يوم"></div>'+
          '<button type="button" class="an-btn" id="anExportFinance">طباعة التقرير</button>'+
          '<button type="button" class="an-btn" id="anRefresh">تحديث</button>'+
        '</div></details>';
    } else if(anTab==='prod'){
      var made=R.prodList.reduce(function(s,x){return s+num(x.value);},0);
      body='<div class="an-kp">'+kc('قطع منتجة',fmt(made))+kc('حالات هالك',fmt(R.wasteList.length),R.wasteList.length?'neg':'')+kc('قيمة الهالك',money(R.wasteCost))+kc('جاهز للتسليم',fmt(ready)+' قطعة')+'</div>'+
        prepHtml()+
        '<div class="an-card"><h3>الإنتاج حسب الصنف</h3>'+miniBars(R.prodList,function(v){return fmt(v)+' قطعة';})+'</div>'+
        '<div class="an-card"><h3>الهالك (بالكمية)</h3>'+miniBars(R.wasteList.map(function(x){return {label:x.name,value:x.qty};}),function(v){return fmt(v)+' قطعة';})+'</div>';
    } else if(anTab==='stock'){
      body='<div class="an-card"><h3>المخزون والخامات</h3>'+(inv.length?inv.map(function(x){
          var q=num(x.qty), mn=num((obj(mFull.prices)[x.name]||{}).reorder), p=mn>0?Math.min(100,q/(mn*2)*100):(q>0?100:0);
          return '<div class="an-row an-block"><div class="an-rs"><span>'+esc(x.name)+' <small>'+esc(qtyOf(q,x.unit))+'</small></span>'+pillFor(q,mn)+'</div><div class="an-bar"><i style="width:'+p+'%;background:'+(q<=mn?'#C50F1F':'#0067B8')+'"></i></div></div>';
        }).join(''):'<div class="an-empty">لا توجد خامات</div>')+'</div>'+
        '<div class="an-card"><h3>المشتريات حسب الخامة</h3>'+miniBars(R.purList,money)+'</div>'+
        '<div class="an-card"><h3>تكلفة الوصفات والهامش</h3>'+table(['الوصفة','تكلفة الوحدة','السعر المقترح','سعر البيع','الهامش'],costRows)+'</div>';
    } else if(anTab==='party'){
      var pr=R.parties;
      body='<div class="an-party-slot"></div>'+
        '<div class="an-kp">'+kc('عدد الحفلات',fmt(pr.n))+kc('إجمالي الحفلات',money(pr.total))+kc('المدفوع',money(pr.paid))+kc('المتبقي',money(pr.remaining),'neg')+'</div>'+
        '<div class="an-card"><h3>المشروبات المنتظرة</h3>'+miniBars(R.drinksPending,function(v){return fmt(v)+' قطعة';})+'</div>';
    } else {
      var rows=ledgerRows(m).filter(function(x){ return (anType==='all'||x.t===anType) && (!anQ||String(x.n).indexOf(anQ)>-1); }).slice(0,60);
      body='<input id="anQ" class="an-search" placeholder="بحث باسم الصنف أو الحركة" value="'+esc(anQ)+'">'+
        '<div class="an-chips">'+TYPES.map(function(t){return '<button type="button" data-t="'+t[0]+'" class="'+(anType===t[0]?'on':'')+'">'+t[1]+'</button>';}).join('')+'</div>'+
        '<div class="an-card">'+(rows.length?rows.map(function(x){ var neg=(x.t==='purchase'||x.t==='waste'); return '<div class="an-row"><span>'+esc(x.n)+'<small>'+esc(x.d)+' · '+esc(TYPE_NAME[x.t])+'</small></span><b class="'+(neg?'neg':'pos')+'">'+(x.v?esc(money(x.v)):esc(fmt(x.q)+' قطعة'))+'</b></div>';}).join(''):'<div class="an-empty">لا توجد حركات مطابقة</div>')+'</div>';
    }

    root.innerHTML='<div class="an-root">'+
      '<div class="an-top"><h1>التحليلات والتشغيل</h1><p>كل الحركات المالية والإنتاجية في شاشة واحدة</p>'+(liveNote?'<p>'+esc(liveNote)+'</p>':'')+
        '<div class="an-per">'+PERS.map(function(p){return '<button type="button" data-per="'+p[0]+'" class="'+(anPer===p[0]?'on':'')+'">'+p[1]+'</button>';}).join('')+'</div></div>'+
      '<div class="an-tabs">'+TABS.map(function(t){return '<button type="button" data-tab="'+t[0]+'" class="'+(anTab===t[0]?'on':'')+'">'+t[1]+'</button>';}).join('')+'</div>'+
      '<main class="an-main">'+body+'</main></div>';

    root.querySelectorAll('[data-tab]').forEach(function(b){ b.onclick=function(){ anTab=b.getAttribute('data-tab'); build(); }; });
    root.querySelectorAll('[data-per]').forEach(function(b){ b.onclick=function(){ anPer=Number(b.getAttribute('data-per')); build(); }; });
    root.querySelectorAll('[data-t]').forEach(function(b){ b.onclick=function(){ anType=b.getAttribute('data-t'); build(); }; });
    var q=root.querySelector('#anQ');
    if(q) q.oninput=function(){ anQ=this.value; build(); var n=document.getElementById('anQ'); if(n){ n.focus(); n.setSelectionRange(anQ.length,anQ.length); } };
    var ps=root.querySelector('#anPeriod'); if(ps) ps.onchange=function(){ sel=this.value; build(); };
    var rf=root.querySelector('#anRefresh'); if(rf) rf.onclick=function(){ build(); };
    var ex=root.querySelector('#anExportFinance');
    if(ex) ex.onclick=function(){ try{ openFinReport(); }catch(e){ alert('تعذر عرض التقرير: '+(e.message||'خطأ غير معروف')); } };
  }

  window.__goPost.push(function(id){ var p=document.getElementById('analytics'); if(p&&p.classList.contains('active')){ try{ build(); }catch(e){ console.error('analytics',e); } } });
  window.pmRenderAnalytics=build;
  window.__anCompute=function(key){ return compute(collect(key)); };
  function recDay(x){
    if(!x||typeof x!=='object') return null;
    if(x.date){ var d0=String(x.date).slice(0,10); if(/^\d{4}-\d{2}-\d{2}$/.test(d0)) return d0; }
    if(x.at){ var d=new Date(x.at); if(!isNaN(d)) return dayOf(d); }
    return null;
  }
  window.__anComputeRange=function(from,to){
    var P=periods(), src={};
    LISTS.forEach(function(k){
      src[k]=[];
      P.forEach(function(p){
        arr(p.src[k]).forEach(function(x){
          var d=recDay(x); if(d && d>=from && d<=to) src[k].push(x);
        });
      });
    });
    var m={isAll:false, live:false, inventory:arr(S().inventory)};
    LISTS.forEach(function(k){ m[k]=src[k]; });
    m.prices=obj(S().prices); m.menu=arr(S().menu); m.recipes=obj(S().recipes);
    return compute(m);
  };
  window.__anCosting=costingRows;
  function sig(){
    var s=S(), parts=[];
    ['salesLog','expensesLog','purchasesLog','wasteLog','productionPieces','history','partyOrders','drinkOrders','orders','inventory','monthlyArchives','menu'].forEach(function(k){
      var a=Array.isArray(s[k])?s[k]:[]; parts.push(a.length); if(a.length){ try{ parts.push(JSON.stringify(a[a.length-1]).length); }catch(e){} }
    });
    parts.push(Object.keys(obj(s.recipes)).length, Object.keys(obj(s.prices)).length, sel);
    return parts.join('|');
  }
  var lastSig=null;
  setInterval(function(){
    var p=document.getElementById('analytics');
    if(!p||!p.classList.contains('active')){ lastSig=null; return; }
    var g=sig();
    if(g!==lastSig){ lastSig=g; try{ build(); }catch(e){ console.error('analytics',e); } }
  },1500);
})();
