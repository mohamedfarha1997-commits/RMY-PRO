/* calc-engine.js — المحرك الحسابي لـ RMY PRO (دوال نقية بدون DOM).
   - كل المبالغ المالية تتحسب بالقروش (أعداد صحيحة) عشان نتجنب أخطاء الفاصلة العائمة.
   - محمّل قبل ملفات التطبيق، ومتاح كـ window.RMYCalc، وكمان module.exports للاختبارات.
*/
(function (root) {
  'use strict';

  var MAX_WASTE = 95;   // أقصى نسبة هالك/هامش مسموح بيها في التطبيق
  var MAX_MARGIN = 95;

  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  /* ---------- المال: قروش صحيحة ---------- */
  // Number((x*100).toFixed(6)) بتحمي من أخطاء زي 1.005*100 = 100.49999
  function toMinor(x) { return Math.round(Number((num(x) * 100).toFixed(6))); }
  function fromMinor(m) { return m / 100; }
  function roundMoney(x) { return fromMinor(toMinor(x)); }
  function sumMoney(list) {
    var t = 0;
    (list || []).forEach(function (v) { t += toMinor(v); });
    return fromMinor(t);
  }

  /* ---------- التكلفة والتسعير ---------- */

  // تكلفة الوحدة الفعلية بعد الهالك:
  // بنفترض إن جزء من الإنتاج بيتهدر، فالوحدة الصالحة = الناتج × (1 − الهالك%)
  function grossUnitCost(batchCost, yieldQty, wastePct) {
    var y = Math.max(0.001, num(yieldQty) || 1);
    var w = clamp(num(wastePct), 0, MAX_WASTE);
    return num(batchCost) / (y * (1 - w / 100));
  }

  // سعر البيع من الهامش (الهامش على سعر البيع) — الطريقة المحاسبية الشائعة
  function priceFromMargin(unitCost, marginPct) {
    var m = clamp(num(marginPct), 0, MAX_MARGIN);
    return num(unitCost) / (1 - m / 100);
  }

  // الهامش الفعلي على سعر البيع
  function marginFromPrice(price, unitCost) {
    if (!(num(price) > 0)) return null;
    return (num(price) - num(unitCost)) / num(price) * 100;
  }

  // نسبة الـ Markup (الزيادة فوق التكلفة) — بنعرضها جنب الهامش عشان الفرق يبقى واضح
  function markupFromPrice(price, unitCost) {
    if (!(num(unitCost) > 0)) return null;
    return (num(price) - num(unitCost)) / num(unitCost) * 100;
  }

  function priceFromMarkup(unitCost, markupPct) {
    return num(unitCost) * (1 + num(markupPct) / 100);
  }

  /* ---------- تحجيم الوصفات ---------- */

  // components: [{name, qty}] — بنضرب كل الكميات في معامل واحد
  function scaleComponents(components, factor) {
    var f = num(factor);
    return (components || []).map(function (c) {
      return Object.assign({}, c, { qty: num(c.qty) * f });
    });
  }

  // نسبة الخباز (Baker's %): كل مكوّن كنسبة من وزن الدقيق
  // components: [{name, qty}] بالجرام، flourName: اسم الدقيق
  function bakerPercentages(components, flourName) {
    var list = components || [];
    var base = 0;
    list.forEach(function (c) { if (c && c.name === flourName) base += num(c.qty); });
    if (!(base > 0)) return null;
    return list.map(function (c) {
      return { name: c.name, percent: Math.round(num(c.qty) / base * 1000) / 10 };
    });
  }

  /* ---------- المتوسط المرجح للتكلفة ---------- */
  // بدل ما نعتمد على آخر سعر شراء بس، بنحسب متوسط قيمة المخزون الحالي + الشراء الجديد
  function weightedAverageCost(oldQty, oldValue, addQty, addValue) {
    var q0 = num(oldQty), v0 = toMinor(oldValue);
    var q1 = num(addQty), v1 = toMinor(addValue);
    var newQty = q0 + q1;
    var newValueMinor = v0 + v1;
    return {
      qty: newQty,
      value: fromMinor(newValueMinor),
      avgUnitCost: newQty > 0 ? fromMinor(newValueMinor) / newQty : 0
    };
  }

  /* ---------- الربح والحركة النقدية للفترة ---------- */
  // كل الطرح بالقروش عشان ما يحصلش تراكم أخطاء
  function periodProfit(p) {
    p = p || {};
    var m = toMinor(p.revenue) - toMinor(p.salesCost) - toMinor(p.partyCost)
          - toMinor(p.wasteCost) - toMinor(sumExpenses(p.expenses));
    return fromMinor(m);
  }

  // expenses: array من الأرقام أو {amount}
  function sumExpenses(expenses) {
    return sumMoney((expenses || []).map(function (x) {
      return typeof x === 'object' && x !== null ? num(x.amount) : num(x);
    }));
  }

  /* ---------- تحويل الحجم إلى وزن (الكثافة) ---------- */
  // جرام لكل ملليلتر لكل خامة شائعة في المخبز. ممكن تتعدّل من برّه.
  var DENSITY_G_PER_ML = {
    'دقيق': 0.5,      // كوب دقيق ≈ 120 جم
    'سكر': 0.8333,    // كوب سكر ≈ 200 جم
    'زبد': 0.95,      // زبدة
    'زبدة': 0.95,
    'حليب': 1.03,
    'ماء': 1.0,
    'زيت': 0.91,
    'عسل': 1.42,
    'بيض': 1.03
  };
  // ملليلتر لكل وحدة حجم (نفس منطق UNIT_FACTORS بس بالمليلتر)
  var VOLUME_ML = {
    'لتر': 1000, 'ملليلتر': 1, 'كوب': 240, 'نصف كوب': 120, 'ربع كوب': 60,
    'ملعقة كبيرة': 15, 'ملعقة صغيرة': 5
  };

  function densityFor(ingredientName) {
    var n = String(ingredientName || '');
    var keys = Object.keys(DENSITY_G_PER_ML);
    for (var i = 0; i < keys.length; i++) {
      if (n.indexOf(keys[i]) !== -1) return DENSITY_G_PER_ML[keys[i]];
    }
    return null;
  }

  // يحوّل كمية حجم (لتر) لجرام أو العكس لخامة معينة. يرجع null لو الكثافة مش معروفة.
  // qty بالوحدة الأساسية للتطبيق: لتر أو جرام.
  function bridgeBase(ingredientName, fromBase, qty, toBase) {
    var d = densityFor(ingredientName);
    if (d === null) return null;
    if (fromBase === 'لتر' && toBase === 'جرام') return num(qty) * 1000 * d;
    if (fromBase === 'جرام' && toBase === 'لتر') return num(qty) / (1000 * d);
    return null;
  }

  // الكمية المحوّلة لجرام بالكامل من وحدة حجم أو وزن معيّنة (مفيد للعرض)
  function toGrams(qty, unit, ingredientName) {
    if (unit === 'جرام') return num(qty);
    if (unit === 'كيلو جرام' || unit === 'كيلو') return num(qty) * 1000;
    if (VOLUME_ML[unit] !== undefined) {
      var d = densityFor(ingredientName);
      return d === null ? null : num(qty) * VOLUME_ML[unit] * d;
    }
    return null;
  }

  var api = {
    toMinor: toMinor, fromMinor: fromMinor, roundMoney: roundMoney, sumMoney: sumMoney,
    grossUnitCost: grossUnitCost,
    priceFromMargin: priceFromMargin, marginFromPrice: marginFromPrice,
    markupFromPrice: markupFromPrice, priceFromMarkup: priceFromMarkup,
    scaleComponents: scaleComponents, bakerPercentages: bakerPercentages,
    weightedAverageCost: weightedAverageCost,
    periodProfit: periodProfit, sumExpenses: sumExpenses,
    densityFor: densityFor, bridgeBase: bridgeBase, toGrams: toGrams,
    DENSITY_G_PER_ML: DENSITY_G_PER_ML, VOLUME_ML: VOLUME_ML
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.RMYCalc = api;
})(typeof window !== 'undefined' ? window : globalThis);
