/* 016-multiuser-realtime.js — اتدمجت من: 016-cloud-multiuser-merge.js، 250-cloud-realtime.js */
/* ---- 016-cloud-multiuser-merge.js ---- */
try{
(function(){
  /* تعدد المستخدمين: كل جهاز بيحفظ تغييراته بس، والسيرفر بيدمج، ومفيش جهاز يمسح تعديلات جهاز تاني */
  var origPersist=window.persistCloudSnapshot;
  var pmBase=null;        // آخر نسخة سحابية الجهاز اشتغل عليها (الأساس للدمج)
  var pmAdopted=false;    // الحفظ اتم والجهاز اتبنى على النسخة المدمجة
  var pmResave=false;     // في تعديلات جديدة اتعملت أثناء الحفظ، لازم تتحفظ بعده

  function copy(o){ return JSON.parse(JSON.stringify(o)); }
  function isFocusedField(){ var a=document.activeElement; return !!(a&&a.matches&&a.matches('input,textarea,select')); }

  pmApiUse('multi-device-merge',function(origApi){ return function(body){
    if(!body||typeof origApi!=='function') return origApi.apply(this,arguments);

    if(body.action==='get_state'){
      var clean=(JSON.stringify(state)===cloudLastSavedHash);
      var firstLoad=!cloudReady;
      return Promise.resolve(origApi.apply(this,arguments)).then(function(res){
        if(res&&res.data&&res.data.state&&(firstLoad||clean||!pmBase)) pmBase=copy(res.data.state);
        return res;
      });
    }

    if(body.action==='save_state'){
      var sent=body.state;
      var sentStr=JSON.stringify(sent);
      var withBase=Object.assign({},body,{base_state: pmBase||null, accept_delta: true});
      return Promise.resolve(origApi.call(this,withBase)).then(function(res){
        if(!res||res.error||!res.data) return res;
        var merged=res.data.state;
        if(!merged){
          // السيرفر رجّع الفرق بس: بنركّب النسخة المدمجة من اللي اتبعت + الفرق
          if(!res.data.stateDelta) return res;
          merged=Object.assign({},sent,res.data.stateDelta);
          (res.data.stateRemoved||[]).forEach(function(k){ delete merged[k]; });
        }
        if(JSON.stringify(state)===sentStr){
          // ما اتعملش تعديل أثناء الحفظ: بناخد النسخة المدمجة (فيها تعديلات الأجهزة التانية)
          state=migrateStateUnits(copy(merged));
          pmBase=copy(merged);
          pmAdopted=true;
          pmResave=false;
          if(!isFocusedField()) renderAll();
        }else{
          // اتعملت تعديلات أثناء الحفظ: الأساس هو اللي اتبعت، والتعديلات الجديدة بتتحفظ بعده
          pmBase=copy(sent);
          pmAdopted=false;
          pmResave=true;
        }
        return res;
      });
    }

    return origApi.apply(this,arguments);
  }; });

  window.persistCloudSnapshot=function(snapshot){
    return origPersist.apply(this,arguments).then(function(r){
      if(pmAdopted){
        cloudLastSavedHash=JSON.stringify(state);
        pmAdopted=false;
        setCloudStatus('تمت المزامنة مع الأجهزة الأخرى ✓ · الإصدار '+cloudRevision);
      }
      if(pmResave){
        pmResave=false;
        scheduleCloudSave(copy(state),false);
      }
      return r;
    });
  };
})();
}catch(e){console.error('[PastryMY] 016-cloud-multiuser-merge.js failed',e)}
/* ---- 250-cloud-realtime.js ---- */
try{
/* مزامنة لحظية: السيرفر بيبعت إشارة (broadcast) بعد كل حفظ، والجهاز يطلب الحالة بس لو فيه إصدار أحدث.
   الـ polling بقى احتياطي (كل دقيقة)، ولو الـ Realtime وقع بيرجع للفحص كل 8 ثواني. */
(function(){
  var sub = null, subClient = null, kickTimer = null;
  window.__pmRealtimeOk = false;

  function kick(){
    clearTimeout(kickTimer);
    kickTimer = setTimeout(function(){
      if (typeof pollCloudState === 'function') pollCloudState();
    }, 200);
  }
  window.pmKick = kick;

  function onState(msg){
    var r = Number(msg && msg.payload && msg.payload.revision);
    if (!r || r > Number(typeof cloudRevision !== 'undefined' ? cloudRevision : 0)) kick();
  }

  window.pmStartRealtime = function(){
    if (typeof cloudClient === 'undefined' || !cloudClient || typeof cloudClient.channel !== 'function') return;
    if (sub && subClient === cloudClient) return;
    if (sub) { try { subClient.removeChannel(sub); } catch (e) {} }
    subClient = cloudClient;
    sub = cloudClient.channel('pastry-sync')
      .on('broadcast', { event: 'state' }, onState)
      .on('broadcast', { event: 'message' }, function(){
        window.dispatchEvent(new Event('pm:messages-changed'));
      })
      .subscribe(function(status){
        window.__pmRealtimeOk = (status === 'SUBSCRIBED');
        if (window.__pmRealtimeOk) kick();
      });
  };

  // أول ما الصفحة ترجع تبان، نفحص التحديثات فورًا
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible') kick();
  });
})();
}catch(e){console.error('[PastryMY] 250-cloud-realtime.js failed',e)}
