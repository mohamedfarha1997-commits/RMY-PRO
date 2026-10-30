/* شاشة "جاهز للتسليم": بتعرض الحجوزات اللي كل أصنافها جاهزة ولسه متسلّمتش.
   التحصيل والتسليم بيتم من نفس نافذة الحفلات الموجودة (آمنة وبتتأكد من الـ PIN على السيرفر)،
   فالزرار بيفتح تبويب الحفلات ويضغط زرار التحصيل للحجز ده. */
(function(){
  if(window.__pmReadyDelivery) return; window.__pmReadyDelivery=true;

  function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}); }
  function fmt(n){ return Math.round(Number(n)||0).toLocaleString('en-US'); }
  function role(){ return (typeof cloudActorRole!=='undefined' && cloudActorRole) || ''; }
  function canSee(){ return role()==='admin' || role()==='sales'; }

  function readyBookings(){
    var list=(Array.isArray(state.partyOrders)?state.partyOrders:[]).filter(function(o){
      return o && o.name && !(window.pmIsPartyOrderClosed && window.pmIsPartyOrderClosed(o));
    });
    if(!window.pmPartyBookings) return [];
    return window.pmPartyBookings(list).filter(function(b){
      if(b.complete || b.cancelled) return false;
      var live=b.orders.filter(function(o){ return o.status!=='cancelled' && o.status!=='delivered'; });
      return live.length>0 && live.every(function(o){ return o.status==='ready'; });
    });
  }

  function menuPrice(name){
    var m=(state.menu||[]).find(function(x){return x&&x.name===name}); return Number(m&&m.price)||0;
  }

  function render(){
    var box=document.getElementById('readyDeliveryBody'); if(!box) return;
    var tab=document.querySelector('nav.tabs .tab[data-tab="readyDelivery"]');
    if(tab) tab.style.display=canSee()?'':'none';
    var books=readyBookings();
    if(!books.length){
      box.innerHTML='<div class="pm-po-empty">مفيش أوردرات جاهزة للتسليم دلوقتي.</div>';
      return;
    }
    box.innerHTML='<div class="pm-po-toolbar"><span class="pm-po-meta">عدد الحجوزات الجاهزة: '+books.length+'</span></div>'+
      books.map(function(b,bi){
        var live=b.orders.filter(function(o){return o.status!=='cancelled'});
        var o0=live[0]||b.first;
        var total=live.reduce(function(s,o){return s+(Number(o.price)||menuPrice(o.name))*(Number(o.qty)||0)},0);
        var items=live.map(function(o){
          return '<div class="pm-po-item"><div class="pm-po-itemhead"><b>'+esc(o.name)+' × '+fmt(o.qty)+'</b><span class="pill">جاهز</span></div></div>';
        }).join('');
        return '<article class="pm-po-card" data-rd-idx="'+bi+'">'+
          '<div class="pm-po-head"><b>'+esc(o0.customer||'بدون اسم')+'</b><span class="pill">جاهز للتسليم</span></div>'+
          '<div class="pm-po-meta">التليفون: '+esc(o0.customerPhone||'—')+' · الموعد: '+esc(o0.date||'')+' '+esc(o0.time||'')+'</div>'+
          (o0.note?'<div class="pm-po-meta">ملاحظات: '+esc(o0.note)+'</div>':'')+
          items+
          '<div class="pm-po-meta"><b>الإجمالي: '+fmt(total)+' ج.م</b></div>'+
          '<div class="pm-po-actions"><button type="button" class="primary" data-rd-deliver="'+bi+'">فتح التحصيل والتسليم</button></div>'+
          '</article>';
      }).join('');

    box.querySelectorAll('[data-rd-deliver]').forEach(function(btn){
      btn.onclick=function(){ openCollect(books[Number(btn.getAttribute('data-rd-deliver'))]); };
    });
  }

  // يفتح تبويب الحفلات ويضغط زرار التحصيل الخاص بالحجز ده
  function openCollect(book){
    var firstId=book.orders[0] && book.orders[0].id;
    if(typeof window.pmGo==='function') window.pmGo('parties');
    var tries=0;
    var timer=setInterval(function(){
      tries++;
      var info=(window.__pmBkInfo||[]);
      var idx=-1;
      for(var i=0;i<info.length;i++){ if(info[i] && info[i].ids && info[i].ids.indexOf(firstId)>=0){ idx=i; break; } }
      var btn=idx>=0 ? document.querySelector('#partiesBody [data-po-collect="'+idx+'"]') : null;
      if(btn && !btn.disabled){ clearInterval(timer); btn.click(); }
      else if(tries>40){ clearInterval(timer); alert('تعذر فتح الحجز. حدّث الصفحة وحاول تاني.'); }
    },100);
  }

  // تحديث الشاشة لما بيانات الحفلات تتغير
  function wrap(name){
    var orig=window[name];
    if(typeof orig!=='function' || orig.__rdWrapped) return;
    var w=function(){ var r=orig.apply(this,arguments); if(r && r.then) return r.then(function(v){ render(); return v; }); render(); return r; };
    w.__rdWrapped=true; window[name]=w;
  }

  function init(){
    wrap('pmPartyWorkflowRefresh');
    wrap('pmPartyWorkflowRender');
    window.__goPost=window.__goPost||[];
    window.__goPost.push(function(id){
      if(id==='readyDelivery'){
        render();
        if(typeof window.pmPartyWorkflowRefresh==='function') window.pmPartyWorkflowRefresh().catch(function(){});
      }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else setTimeout(init,0);
})();
