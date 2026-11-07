/* 240-order-sent-card.js — كارت "تم إرسال الطلب للشيف" اللي بيظهر بعد كل طلب من السلة.
   بيبين الحالة (جاري التنفيذ / تم) والعميل والتسليم، وزرار إغلاق. */
(function (root) {
  'use strict';
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // info: {status:'running'|'done', title, lines:[string], actionLabel}
  root.pmOrderSentCard = function (info) {
    info = info || {};
    var status = info.status === 'done' ? 'done' : 'running';
    var badge = status === 'done' ? 'تم التنفيذ' : 'جارٍ التنفيذ';
    var title = info.title || (status === 'done' ? 'تم التنفيذ' : 'جارٍ التنفيذ');
    var lines = (info.lines || []).map(function (l) { return '<div class="osc-line">' + esc(l) + '</div>'; }).join('');
    var ov = document.createElement('div');
    ov.className = 'osc-ov';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.innerHTML =
      '<div class="osc-box">' +
        '<div class="osc-icon"><svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true">' +
          '<path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#0067B8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<span class="osc-badge">' + badge + '</span>' +
        '<h3>' + esc(title) + '</h3>' +
        lines +
        '<button type="button" class="osc-close">' + esc(info.actionLabel || 'إغلاق') + '</button>' +
      '</div>';
    var style = document.getElementById('oscStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'oscStyle';
      style.textContent =
        '.osc-ov{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99990;display:flex;align-items:center;justify-content:center;padding:16px}' +
        '.osc-box{background:#fff;color:#1B1B1B;border-radius:28px;padding:22px 18px;width:min(92vw,420px);text-align:center;direction:rtl;box-shadow:0 12px 40px rgba(0,0,0,.25)}' +
        '.osc-icon{width:116px;height:116px;margin:0 auto 14px;border-radius:28px;background:#DCEBF8;border:2px solid #BFE5CF;display:flex;align-items:center;justify-content:center}' +
        '.osc-badge{display:inline-block;background:#DCEBF8;color:#0067B8;border-radius:999px;padding:6px 16px;font-weight:800;font-size:14px}' +
        '.osc-box h3{margin:12px 0 8px;font-size:22px;font-weight:900}' +
        '.osc-line{font-size:16px;font-weight:700;line-height:1.7}' +
        '.osc-close{margin-top:16px;width:100%;min-height:52px;border:0;border-radius:18px;background:#DCEBF8;color:#1B1B1B;font:inherit;font-size:18px;font-weight:800;cursor:pointer}';
      document.head.appendChild(style);
    }
    function close() { ov.remove(); }
    ov.querySelector('.osc-close').addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.body.appendChild(ov);
    return ov;
  };
})(typeof window !== 'undefined' ? window : globalThis);
