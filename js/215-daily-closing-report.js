/* ---- 215-daily-closing-report.js ----
   تقرير تقفيل اليوم: بيجمع حركة يوم واحد (افتراضيًا النهارده بتوقيت القاهرة)
   من البيانات الموجودة أصلاً: سطور المبيعات (salesLog)، المصروفات (expensesLog)،
   المشتريات (purchasesLog). مش بيعدّل أي بيانات، ومش بيدخل حسابات الحفلات.
   التقرير بيتعرض بنفس طريقة تقرير الشهر (pmShowDoc) وبيتطبع من هناك.
   افتراضات واضحة في التقرير نفسه:
   - المصروفات والمشتريات معندهاش وسيلة دفع، فصافي النقدية تقريبي (كاش المبيعات - المصروفات - المشتريات).
   - سطر المبيعات بياخد وسيلة الدفع من paymentMethod، ولو مش موجودة بيتحسب "غير محدد". */
(function(){
  'use strict';
  try {
    var METHOD_NAMES = { cash: 'كاش', instapay: 'انستا باي', visa: 'فيزا', unknown: 'غير محدد' };
    var METHOD_ORDER = ['cash', 'instapay', 'visa', 'unknown'];

    function S(){ return (typeof state !== 'undefined' && state) ? state : (window.state || {}); }
    function arr(v){ return Array.isArray(v) ? v : []; }
    function num(v){ var n = Number(v); return isFinite(n) ? n : 0; }
    function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
    function fmt(v){ return (Math.round(num(v) * 100) / 100).toLocaleString('ar-EG', { maximumFractionDigits: 2 }); }
    function money(v){ return fmt(v) + ' ج.م'; }

    /* يوم القاهرة بصيغة YYYY-MM-DD */
    function cairoDay(d){
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    }
    function todayKey(){ return cairoDay(new Date()); }

    /* مفتاح اليوم من أي قيمة تاريخ في السجل:
       - "YYYY-MM-DD..." بدون منطقة زمنية: بياخد أول 10 حروف (توقيت الجهاز المحلي)
       - لو فيها منطقة زمنية (Z أو +02:00...): بيتحول لتوقيت القاهرة
       - غير كده: '' (السطر بيتجاهل) */
    function dayKeyOf(v){
      var s = String(v == null ? '' : v).trim();
      if (!s) return '';
      var hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(s) && /T/.test(s);
      if (!hasZone && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      var d = new Date(s);
      if (isNaN(d.getTime())) return '';
      return cairoDay(d);
    }

    function lineRevenue(x){ return (x.revenue != null) ? num(x.revenue) : num(x.qty) * num(x.unitPrice); }

    function build(dayKey){
      var s = S();
      var sales = arr(s.salesLog).filter(function(x){ return x && typeof x === 'object' && dayKeyOf(x.date) === dayKey; });
      var expenses = [];
      var purchases = arr(s.purchasesLog).filter(function(x){ return x && dayKeyOf(x.date) === dayKey; });

      var revenue = 0, cost = 0, costUnknown = 0, openLines = 0, qty = 0;
      var receipts = {};
      var byMethod = {}; METHOD_ORDER.forEach(function(k){ byMethod[k] = { rev: 0, count: 0 }; });
      var items = {};

      sales.forEach(function(x){
        var r = lineRevenue(x), q = num(x.qty);
        revenue += r; qty += q;
        if (x.costAtSale == null) costUnknown++; else cost += num(x.costAtSale);
        if (x.invoiceStatus === 'open') openLines++;
        var rid = String(x.receiptId || x.receiptNo || '');
        if (rid) receipts[rid] = true;
        var m = METHOD_NAMES[x.paymentMethod] ? x.paymentMethod : 'unknown';
        byMethod[m].rev += r;
        var nm = String(x.name || '—');
        if (!items[nm]) items[nm] = { qty: 0, rev: 0 };
        items[nm].qty += q; items[nm].rev += r;
      });
      // عدد الفواتير لكل وسيلة دفع (فاتورة واحدة = وسيلة واحدة)
      var seenReceipt = {};
      sales.forEach(function(x){
        var rid = String(x.receiptId || x.receiptNo || '');
        var key = rid || ('line:' + Math.random());
        if (seenReceipt[key]) return;
        seenReceipt[key] = true;
        var m = METHOD_NAMES[x.paymentMethod] ? x.paymentMethod : 'unknown';
        byMethod[m].count++;
      });

      var expTotal = 0; expenses.forEach(function(x){ expTotal += num(x.amount); });
      var purTotal = 0; purchases.forEach(function(x){ purTotal += num(x.totalCost); });
      var cashSales = byMethod.cash.rev;
      var netCash = cashSales - expTotal - purTotal;

      var topItems = Object.keys(items).map(function(k){ return { name: k, qty: items[k].qty, rev: items[k].rev }; })
        .sort(function(a, b){ return b.rev - a.rev; }).slice(0, 10);

      return {
        dayKey: dayKey, salesCount: sales.length, receiptCount: Object.keys(receipts).length,
        revenue: revenue, qty: qty, cost: cost, costUnknown: costUnknown, grossProfit: revenue - cost,
        openLines: openLines, byMethod: byMethod,
        expenses: expenses.length, expTotal: expTotal,
        purchases: purchases.length, purTotal: purTotal,
        cashSales: cashSales, netCash: netCash, topItems: topItems
      };
    }

    function row(label, value, cls){
      return '<tr><td>' + esc(label) + '</td><td class="' + (cls || '') + '"><b>' + esc(value) + '</b></td></tr>';
    }

    function html(R){
      var methodRows = METHOD_ORDER.filter(function(k){ return R.byMethod[k].count > 0 || R.byMethod[k].rev !== 0; })
        .map(function(k){ return '<tr><td>' + esc(METHOD_NAMES[k]) + '</td><td>' + R.byMethod[k].count + '</td><td>' + esc(money(R.byMethod[k].rev)) + '</td></tr>'; }).join('')
        || '<tr><td colspan="3">لا توجد مبيعات في هذا اليوم.</td></tr>';
      var itemRows = R.topItems.map(function(it){
        return '<tr><td>' + esc(it.name) + '</td><td>' + esc(fmt(it.qty)) + '</td><td>' + esc(money(it.rev)) + '</td></tr>';
      }).join('') || '<tr><td colspan="3">لا توجد أصناف.</td></tr>';
      var notes = [];
      if (R.costUnknown) notes.push('فيه ' + R.costUnknown + ' سطر مبيعات من غير تكلفة مسجلة، فمجمل الربح ممكن يكون أعلى من الحقيقي.');
      if (R.openLines) notes.push('فيه ' + R.openLines + ' سطر فاتورة لسه مفتوحة ومتحسبة في الإيراد.');
      notes.push('مدفوعات الحفلات مش داخلة في التقرير ده.');
      notes.push('صافي النقدية تقريبي: بيفترض إن المصروفات والمشتريات اتدفعت من الكاش.');
      return '<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير تقفيل اليوم</title>' +
        '<style>body{font-family:Tahoma,Arial,sans-serif;color:#1B1B1B;padding:18px;max-width:720px;margin:auto}' +
        'h1{font-size:20px;margin:0 0 6px}h2{font-size:15px;margin:18px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px}' +
        'table{width:100%;border-collapse:collapse;font-size:13px}td,th{border:1px solid #ddd;padding:6px 8px;text-align:right}' +
        'th{background:#f3f6fa}.pos{color:#107C10}.neg{color:#D92D20}.muted{color:#666;font-size:12px}' +
        '@media print{body{padding:0}}</style></head><body>' +
        '<h1>تقرير تقفيل اليوم</h1><p class="muted">اليوم: ' + esc(R.dayKey) + ' · عدد الفواتير: ' + R.receiptCount + ' · عدد سطور المبيعات: ' + R.salesCount + '</p>' +
        '<h2>الملخص</h2><table>' +
        row('إجمالي المبيعات', money(R.revenue)) +
        row('الكمية المباعة', fmt(R.qty)) +
        row('تكلفة الخامات', money(R.cost)) +
        row('مجمل الربح', money(R.grossProfit), R.grossProfit >= 0 ? 'pos' : 'neg') +
        row('المصروفات', money(R.expTotal) + ' (' + R.expenses + ' بند)') +
        row('المشتريات', money(R.purTotal) + ' (' + R.purchases + ' بند)') +
        row('صافي النقدية التقريبي', money(R.netCash), R.netCash >= 0 ? 'pos' : 'neg') +
        '</table>' +
        '<h2>المبيعات حسب وسيلة الدفع</h2><table><tr><th>الوسيلة</th><th>عدد الفواتير</th><th>الإجمالي</th></tr>' + methodRows + '</table>' +
        '<h2>أعلى الأصناف (10)</h2><table><tr><th>الصنف</th><th>الكمية</th><th>الإيراد</th></tr>' + itemRows + '</table>' +
        '<h2>ملاحظات</h2><ul class="muted">' + notes.map(function(n){ return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' +
        '</body></html>';
    }

    function show(dayKey){
      var key = dayKey || todayKey();
      var R = build(key);
      if (typeof window.pmShowDoc === 'function') window.pmShowDoc(html(R), 'تقفيل ' + key);
      return R;
    }

    /* زرار في تبويب الشهر/التقفيل، فوق تقرير الشهر */
    function mount(){
      if (document.getElementById('pmDailyClosingCard')) return true;
      var host = document.getElementById('dailyClosing');
      if (!host) return false;
      var card = document.createElement('div');
      card.id = 'pmDailyClosingCard';
      card.className = 'card';
      card.innerHTML = '<h2>تقرير تقفيل اليوم</h2>' +
        '<p class="small">تقرير حركة يوم واحد: المبيعات حسب وسيلة الدفع، والمشتريات، وأعلى الأصناف.</p>' +
        '<label>اليوم</label><input id="pmDailyClosingDay" type="date" value="' + todayKey() + '">' +
        '<button id="pmDailyClosingBtn" class="primary" type="button" style="width:100%;margin-top:10px">عرض وطباعة تقرير اليوم</button>';
      host.insertBefore(card, host.firstChild);
      document.getElementById('pmDailyClosingBtn').addEventListener('click', function(){
        var v = document.getElementById('pmDailyClosingDay').value || todayKey();
        show(v);
      });
      return true;
    }
    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      if (mount() || tries > 60) clearInterval(timer);
    }, 500);

    window.pmDailyClosing = { build: build, html: html, show: show, dayKeyOf: dayKeyOf };
  } catch (e) {
    console.error('[PastryMY] 215-daily-closing-report.js failed', e);
  }
})();
