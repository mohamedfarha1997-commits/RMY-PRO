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
