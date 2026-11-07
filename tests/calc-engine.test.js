'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/calc-engine.js');

test('المال بالقروش: مفيش أخطاء فاصلة عائمة', () => {
  assert.equal(E.sumMoney([0.1, 0.2]), 0.3);          // 0.1+0.2 = 0.30000000000000004 في JS
  assert.equal(E.roundMoney(1.005), 1.01);
  assert.equal(E.toMinor(19.99), 1999);
});

test('الهالك يرفع تكلفة الوحدة الصالحة', () => {
  // دفعة تكلفتها 100 وناتجها 20 قطعة، هالك 10% ← الصالح 18 قطعة
  assert.equal(Number(E.grossUnitCost(100, 20, 10).toFixed(4)), Number((100 / 18).toFixed(4)));
  assert.equal(E.grossUnitCost(100, 20, 0), 5);
  assert.equal(Math.round(E.grossUnitCost(100, 20, 10) * 1e6) / 1e6, Math.round(100 / 18 * 1e6) / 1e6);
  assert.equal(Math.round(E.grossUnitCost(100, 20, 999) * 1e6) / 1e6, 100); // محدود بـ 95%
});

test('سعر البيع من الهامش، والـ Markup المكافئ', () => {
  const price = E.priceFromMargin(70, 30);              // هامش 30% على السعر
  assert.equal(Math.round(price * 100) / 100, 100);
  assert.equal(Math.round(E.marginFromPrice(100, 70)), 30);
  assert.equal(Math.round(E.markupFromPrice(100, 70) * 100) / 100, 42.86);
  assert.equal(E.priceFromMarkup(70, 42.86) > 99.9, true);
});

test('نسبة الخباز: كل مكون كنسبة من الدقيق', () => {
  const res = E.bakerPercentages([
    { name: 'دقيق', qty: 500 }, { name: 'ماء', qty: 325 }, { name: 'ملح', qty: 10 }
  ], 'دقيق');
  assert.equal(res.find(x => x.name === 'ماء').percent, 65);
  assert.equal(res.find(x => x.name === 'ملح').percent, 2);
  assert.equal(E.bakerPercentages([{ name: 'سكر', qty: 50 }], 'دقيق'), null);
});

test('تحجيم الوصفة بمعامل واحد', () => {
  const s = E.scaleComponents([{ name: 'دقيق', qty: 500 }], 1.5);
  assert.equal(s[0].qty, 750);
});

test('المتوسط المرجح للتكلفة', () => {
  // مخزون 10 كيلو قيمته 500، واشتريت 10 كيلو بـ 700 ← المتوسط 60
  const r = E.weightedAverageCost(10, 500, 10, 700);
  assert.equal(r.qty, 20);
  assert.equal(r.avgUnitCost, 60);
  assert.equal(E.weightedAverageCost(0, 0, 0, 0).avgUnitCost, 0);
});

test('الربح بيطرح المصروفات', () => {
  assert.equal(E.periodProfit({ revenue: 100, salesCost: 20, expenses: [{ amount: 10 }] }), 70);
  assert.equal(E.periodProfit({ revenue: 100, salesCost: 20, wasteCost: 5 }), 75);
  assert.equal(E.sumExpenses([{ amount: 0.1 }, { amount: 0.2 }]), 0.3);
});

test('الكثافة: تحويل كوب دقيق لجرام وبالعكس', () => {
  assert.equal(E.densityFor('دقيق فاخر'), 0.5);
  assert.equal(E.bridgeBase('دقيق', 'لتر', 0.24, 'جرام'), 120); // كوب دقيق = 120 جم
  assert.equal(E.bridgeBase('دقيق', 'جرام', 120, 'لتر'), 0.24);
  assert.equal(E.bridgeBase('شيء غير معروف', 'لتر', 1, 'جرام'), null);
  assert.equal(Math.round(E.toGrams(1, 'كوب', 'سكر')), 200);
});
