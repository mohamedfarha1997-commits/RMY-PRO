/* 230-thermal-print.js — طباعة الإيصالات مباشرة على طابعة الحرارية (58/80 mm) عبر Bluetooth.
   - من غير ما تفتح صفحة الطباعة.
   - النص العربي بيتعمل صورة (raster) الأول، عشان أغلب الطابعات الرخيصة ما بتفهمش العربي.
   - محتاج Chrome على أندرويد أو ديسكتوب (Web Bluetooth). الآيفون (Safari) مش بيدعمه، وبيرجع لطباعة الصفحة العادية.
   - الدوال اللي تحت (التخطيط والترميز والإرسال) متفصلة عشان تتختبر بدون متصفح. */
(function (root) {
  'use strict';

  var PRINTER_SERVICES = [
    '000018f0-0000-1000-8000-00805f9b34fb',   // Standard printer service
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',   // ISSC / Microchip (شائعة في الطابعات الصينية)
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    '0000ff00-0000-1000-8000-00805f9b34fb'
  ];
  var CHUNK = 100;          // بايت لكل كتابة (الطابعات الرخيصة بتتعب من الكتل الكبيرة)
  var CHUNK_DELAY_MS = 20;

  var PAY_LABELS = { cash: 'كاش', visa: 'فيزا', instapay: 'إنستاباي' };

  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function money(v) {
    return num(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ج.م';
  }

  /* ---------- 1) التخطيط: الإيصال كسطور (بيتحسب بدون canvas) ---------- */
  // rc: {id,no,receiptNo,date,by,lines:[{name,qty,unitPrice,revenue}],total,tax:{rate,amount},paymentMethod,note}
  // tpl: {shopName,address,phone,taxCard,footer}
  function layoutReceipt(rc, tpl) {
    rc = rc || {}; tpl = tpl || {};
    var out = [];
    var sep = { t: '-'.repeat(32), align: 'center', size: 1 };
    if (tpl.shopName) out.push({ t: String(tpl.shopName), align: 'center', bold: true, size: 2 });
    if (tpl.address) out.push({ t: String(tpl.address), align: 'center', size: 1 });
    if (tpl.phone) out.push({ t: 'تليفون: ' + tpl.phone, align: 'center', size: 1 });
    if (tpl.taxCard) out.push({ t: 'بطاقة ضريبية: ' + tpl.taxCard, align: 'center', size: 1 });
    out.push(sep);

    var no = rc.no != null ? rc.no : (rc.receiptNo != null ? rc.receiptNo : (rc.id ? String(rc.id).slice(-6) : ''));
    out.push({ row: true, right: 'فاتورة رقم', left: String(no) });
    if (rc.date) out.push({ row: true, right: 'التاريخ', left: String(rc.date) });
    if (rc.by) out.push({ row: true, right: 'البائع', left: String(rc.by) });
    out.push(sep);

    out.push({ row: true, right: 'الصنف', left: 'الإجمالي', bold: true });
    var subtotal = 0;
    (rc.lines || []).forEach(function (l) {
      var rev = l.revenue != null ? num(l.revenue) : num(l.qty) * num(l.unitPrice);
      subtotal += rev;
      out.push({ row: true, right: String(l.name) + ' × ' + num(l.qty), left: money(rev) });
    });
    out.push(sep);

    // الإجمالي زي ما بيظهر في الفاتورة في التطبيق (rc.total). الضريبة بتتعرض "منها" مش بتتضاف.
    var total = rc.total != null ? num(rc.total) : subtotal;
    out.push({ row: true, right: 'الإجمالي', left: money(total), bold: true, size: 2 });
    if (rc.tax && num(rc.tax.amount) > 0) {
      out.push({ row: true, right: 'منها ضريبة ' + num(rc.tax.rate) + '%', left: money(rc.tax.amount) });
    }
    if (rc.paymentMethod) {
      out.push({ row: true, right: 'طريقة الدفع', left: PAY_LABELS[rc.paymentMethod] || String(rc.paymentMethod) });
    }
    if (rc.note) out.push({ t: 'ملاحظة: ' + rc.note, align: 'right', size: 1 });
    out.push(sep);
    out.push({ t: tpl.footer || 'شكراً لزيارتكم', align: 'center', size: 1 });
    return out;
  }

  /* ---------- 2) الصورة: من البكسلات لبايتات ESC/POS (بيتختبر بدون canvas) ---------- */
  // rgba: Uint8ClampedArray (RGBA) بعرض w وارتفاع h. w لازم يكون مضاعف 8.
  // كل بت = نقطة سودا (1 = طباعة)
  function packRaster(rgba, w, h) {
    if (w % 8 !== 0) throw new Error('RASTER_WIDTH_MUST_BE_MULTIPLE_OF_8');
    var rowBytes = w / 8;
    var out = new Uint8Array(rowBytes * h);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        var lum = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
        if (lum < 140) out[y * rowBytes + (x >> 3)] |= (0x80 >> (x & 7));
      }
    }
    return out;
  }

  // GS v 0 m xL xH yL yH data — أمر الطباعة للصورة
  function rasterCommand(packed, w, h) {
    var rowBytes = w / 8;
    var head = [0x1D, 0x76, 0x30, 0x00, rowBytes & 0xFF, (rowBytes >> 8) & 0xFF, h & 0xFF, (h >> 8) & 0xFF];
    var out = new Uint8Array(head.length + packed.length);
    out.set(head, 0);
    out.set(packed, head.length);
    return out;
  }

  // الوظيفة الكاملة: تهيئة + صورة + مسافة + قطع
  function escposJob(packed, w, h) {
    var init = [0x1B, 0x40];                 // ESC @
    var feed = [0x1B, 0x64, 0x03];           // ESC d 3 (مسافة قبل القطع)
    var cut = [0x1D, 0x56, 0x42, 0x03];      // GS V B 3 (قطع جزئي)
    var img = rasterCommand(packed, w, h);
    var parts = [new Uint8Array(init), img, new Uint8Array(feed), new Uint8Array(cut)];
    var total = parts.reduce(function (s, p) { return s + p.length; }, 0);
    var out = new Uint8Array(total), off = 0;
    parts.forEach(function (p) { out.set(p, off); off += p.length; });
    return out;
  }

  /* ---------- 3) رسم السطور على canvas (في المتصفح بس) ---------- */
  function renderLines(lines, widthDots, makeCanvas) {
    var pad = 8;
    var base = 22, big = 30;
    var fontFor = function (l) {
      var px = l.size === 2 ? big : base;
      return (l.bold ? 'bold ' : '') + px + 'px Tahoma, Arial, sans-serif';
    };
    var heightOf = function (l) { return (l.size === 2 ? big : base) + 12; };
    var H = lines.reduce(function (s, l) { return s + heightOf(l); }, 0) + 10;
    var canvas = makeCanvas(widthDots, H);
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, widthDots, H);
    ctx.fillStyle = '#000';
    ctx.direction = 'rtl';
    ctx.textBaseline = 'middle';
    var y = 5;
    lines.forEach(function (l) {
      var hgt = heightOf(l), cy = y + hgt / 2;
      ctx.font = fontFor(l);
      if (l.row) {
        ctx.textAlign = 'right'; ctx.fillText(fit(ctx, l.right, widthDots * 0.6), widthDots - pad, cy);
        ctx.textAlign = 'left';  ctx.fillText(fit(ctx, l.left, widthDots * 0.4), pad, cy);
      } else {
        ctx.textAlign = l.align === 'center' ? 'center' : (l.align === 'right' ? 'right' : 'left');
        var x = l.align === 'center' ? widthDots / 2 : (l.align === 'right' ? widthDots - pad : pad);
        ctx.fillText(fit(ctx, l.t, widthDots - pad * 2), x, cy);
      }
      y += hgt;
    });
    return { canvas: canvas, width: widthDots, height: H };
  }

  // يقص النص لو أطول من المساحة (بدون ما يكسر الرسم)
  function fit(ctx, text, maxW) {
    text = String(text == null ? '' : text);
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1);
    return text + '…';
  }

  function bitmapFromLines(lines, widthDots, makeCanvas) {
    var r = renderLines(lines, widthDots, makeCanvas);
    var ctx = r.canvas.getContext('2d');
    var img = ctx.getImageData(0, 0, r.width, r.height);
    var packed = packRaster(img.data, r.width, r.height);
    return escposJob(packed, r.width, r.height);
  }

  /* ---------- 4) النقل: Bluetooth (بيتحقن عشان الاختبار) ---------- */
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function createPrinter(bluetooth) {
    var device = null, characteristic = null;

    async function pair() {
      if (!bluetooth) throw new Error('BLUETOOTH_UNSUPPORTED');
      device = await bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: PRINTER_SERVICES });
      if (device && device.addEventListener) {
        device.addEventListener('gattserverdisconnected', function () { characteristic = null; });
      }
      return device;
    }

    async function ensureCharacteristic() {
      if (!device) throw new Error('PRINTER_NOT_PAIRED');
      if (characteristic && device.gatt.connected) return characteristic;
      var server = await device.gatt.connect();
      var services = await server.getPrimaryServices();
      for (var s = 0; s < services.length; s++) {
        var chars = await services[s].getCharacteristics();
        for (var c = 0; c < chars.length; c++) {
          var p = chars[c].properties || {};
          if (p.writeWithoutResponse || p.write) { characteristic = chars[c]; return characteristic; }
        }
      }
      throw new Error('NO_WRITABLE_CHARACTERISTIC');
    }

    async function send(bytes) {
      var c = await ensureCharacteristic();
      var useNoResp = !!(c.properties && c.properties.writeWithoutResponse);
      for (var i = 0; i < bytes.length; i += CHUNK) {
        var part = bytes.slice(i, i + CHUNK);
        if (useNoResp) await c.writeValueWithoutResponse(part);
        else await c.writeValue(part);
        await sleep(CHUNK_DELAY_MS);
      }
    }

    return {
      pair: pair,
      send: send,
      isPaired: function () { return !!device; },
      isConnected: function () { return !!(device && device.gatt && device.gatt.connected); },
      _device: function () { return device; }
    };
  }

  /* ---------- 5) الواجهة: طباعة إيصال + إعدادات ---------- */
  var SUPPORTED = typeof navigator !== 'undefined' && !!navigator.bluetooth;
  var printer = SUPPORTED ? createPrinter(navigator.bluetooth) : null;
  var WIDTH_KEY = 'pmThermalWidth', AUTO_KEY = 'pmThermalAuto';

  function widthDots() {
    try { return Number(localStorage.getItem(WIDTH_KEY)) === 576 ? 576 : 384; } catch (e) { return 384; }
  }
  function autoOn() {
    try { return localStorage.getItem(AUTO_KEY) === '1'; } catch (e) { return false; }
  }
  function makeCanvas(w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }
  function templateOf() {
    var st = (root.state || {});
    return Object.assign({ shopName: 'PastryMY', address: '', phone: '', taxCard: '', footer: 'شكراً لزيارتكم' }, st.invoiceTemplate || {});
  }

  // يطبع إيصال. لو مفيش طابعة مقرونة، بيرجع ok:false عشان الكود ينزل لطباعة الصفحة العادية.
  async function printReceipt(rc, opts) {
    opts = opts || {};
    if (!printer) return { ok: false, reason: 'unsupported' };
    if (!printer.isPaired()) {
      if (!opts.allowPairing) return { ok: false, reason: 'not-paired' };
      await printer.pair();
    }
    var w = widthDots();
    var lines = layoutReceipt(rc, templateOf());
    var bytes = bitmapFromLines(lines, w, makeCanvas);
    await printer.send(bytes);
    return { ok: true };
  }
  root.pmThermal = {
    layoutReceipt: layoutReceipt,
    packRaster: packRaster,
    rasterCommand: rasterCommand,
    escposJob: escposJob,
    createPrinter: createPrinter,
    print: printReceipt,
    supported: SUPPORTED,
    setWidth: function (w) { try { localStorage.setItem(WIDTH_KEY, String(w === 576 ? 576 : 384)); } catch (e) {} },
    setAuto: function (on) { try { localStorage.setItem(AUTO_KEY, on ? '1' : '0'); } catch (e) {} }
  };

  // زرار في نافذة الفاتورة: طباعة مباشرة + تذكير لو الطابعة مش مقرونة
  root.pmThermalButton = function (overlay, rc) {
    var acts = overlay.querySelector('.pmv-acts');
    if (!acts || !SUPPORTED) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pmv-close';
    btn.textContent = '🖨️ طباعة على الطابعة';
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      try {
        var r = await printReceipt(rc, { allowPairing: true });
        if (r.ok) { btn.textContent = '✔ اتطبعت'; setTimeout(function () { btn.textContent = '🖨️ طباعة على الطابعة'; }, 1500); }
      } catch (e) {
        if (root.alert) root.alert('تعذر الطباعة على الطابعة: ' + (e && e.message ? e.message : e) + '. هيتفتح شاشة الطباعة العادية.');
        if (root.pmPrintHTML) { var html = document.getElementById('pmInvPrint'); if (html) root.pmPrintHTML(html.innerHTML); }
      } finally { btn.disabled = false; }
    });
    var auto = document.createElement('button');
    auto.type = 'button';
    auto.className = 'pmv-close';
    var paintAuto = function () { auto.textContent = autoOn() ? 'طباعة تلقائية: شغّالة' : 'طباعة تلقائية: قافلة'; };
    paintAuto();
    auto.addEventListener('click', function () { root.pmThermal.setAuto(!autoOn()); paintAuto(); });
    acts.insertBefore(auto, acts.firstChild);
    acts.insertBefore(btn, acts.firstChild);
  };

  // بعد كل بيع لو الطباعة التلقائية مفعّلة والطابعة مقرونة
  root.pmThermalAuto = function (rc) {
    if (!printer || !autoOn() || !printer.isConnected()) return;
    printReceipt(rc, { allowPairing: false }).catch(function () {});
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      layoutReceipt: layoutReceipt, packRaster: packRaster, rasterCommand: rasterCommand,
      escposJob: escposJob, createPrinter: createPrinter, bitmapFromLines: bitmapFromLines
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
