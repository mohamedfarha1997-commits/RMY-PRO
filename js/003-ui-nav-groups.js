(function(){
  function fixGroups(){
    document.querySelectorAll('#appNav .nav-group').forEach(function(g){
      var any=[].some.call(g.querySelectorAll('.tab'),function(b){return getComputedStyle(b).display!=='none'});
      g.style.display=any?'':'none';
    });
  }
  function fixSubs(){
    document.querySelectorAll('#appNav .nav-sub').forEach(function(g){
      var any=[].some.call(g.querySelectorAll('.tab'),function(b){return !b.classList.contains('pm-tab-off')&&getComputedStyle(b).display!=='none'});
      g.style.display=any?'':'none';
    });
  }
  function fixAll(){ fixSubs(); fixGroups(); }
  fixAll(); setInterval(fixAll,800);
})();
