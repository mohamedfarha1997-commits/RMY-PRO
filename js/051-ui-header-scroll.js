(function(){
  var b=document.body;
  function upd(){
    var y=window.scrollY||document.documentElement.scrollTop||0;
    if(!b.classList.contains('hdr-scrolled')&&y>40) b.classList.add('hdr-scrolled');
    else if(b.classList.contains('hdr-scrolled')&&y<12) b.classList.remove('hdr-scrolled');
  }
  /* الهيدر ثابت وبنفس الحجم مع الحركة: مفيش تصغير عند التمرير */
  b.classList.remove('hdr-scrolled');
})();
