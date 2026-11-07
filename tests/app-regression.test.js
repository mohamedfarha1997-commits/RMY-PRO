'use strict';
// اختبارات انحدار للكود الحقيقي في التطبيق: بنستخرج الدوال من الملفات ونشغّلها.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS = path.join(__dirname, '..', 'js');
const read = f => fs.readFileSync(path.join(JS, f), 'utf8');

// يستخرج تعريف function NAME(...){...} بمطابقة الأقواس
function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('missing ' + name);
  let i = src.indexOf('{', start), depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  return src.slice(start, i + 1);
}
function extractConst(src, name) {
  const start = src.indexOf('const ' + name + '=');
  const end = src.indexOf('};', start);
  return src.slice(start, end + 2);
}

const main2 = read('006-core-main-app-2.js');
const main4 = read('006-core-main-app-4.js');
const main1 = read('006-core-main-app.js');

const code = [
  extractConst(main1, 'UNIT_FACTORS'),
  extractFn(main1, 'unitBase'), extractFn(main1, 'factor'),
  extractFn(main1, 'norm'), extractFn(main1, 'compatible'),
  extractFn(main2, 'costOf'),
  extractFn(main4, 'pmInventoryValue'),
  extractFn(main4, 'monthMetrics')
].join('\n');

// costOf فيها سطر بيستخدم window.RMYCalc: بنحط المحرك في السياق
function makeCtx(state) {
  const ctx = { state, console, window: {} };
  ctx.window.RMYCalc = require('../js/calc-engine.js');
  ctx.RMYCalc = ctx.window.RMYCalc;
  vm.createContext(ctx);
  vm.runInContext(code.replace(/\bwindow\.RMYCalc\b/g, 'window.RMYCalc'), ctx);
  return ctx;
}

test('المصروفات بتدخل في الربح (كانت بتتجاهل قبل كده)', () => {
  const ctx = makeCtx({});
  const m = ctx.monthMetrics({
    salesLog: [{ name: 'كيك', qty: 2, unitPrice: 50, revenue: 100, costAtSale: 20 }],
    expensesLog: [{ amount: 10, category: 'كهربا' }],
    purchasesLog: [], productionLog: [], history: [], wasteLog: [], partyInvoices: [], inventory: []
  });
  assert.equal(m.expenseTotal, 10);
  assert.equal(m.profit, 70);
});

test('المصروفات بتدخل في صافي الحركة النقدية', () => {
  const ctx = makeCtx({});
  const m = ctx.monthMetrics({
    salesLog: [{ name: 'كيك', qty: 1, unitPrice: 90, revenue: 90, costAtSale: 45 }],
    expensesLog: [{ amount: 20 }],
    purchasesLog: [{ totalCost: 30 }], productionLog: [], history: [], wasteLog: [], partyInvoices: [], inventory: []
  });
  assert.equal(m.cashNet, 90 - 20 - 30);
});

test('تحويل الكوب لجرام لخامة بسعر كيلو (الدقيق)', () => {
  const state = { prices: { 'دقيق': { purchasePrice: 50, packSize: 1, packUnit: 'كيلو جرام' } } };
  const ctx = makeCtx(state);
  // كوب دقيق = 120 جم، والكيلو بـ 50 ← 6 جنيه
  const cost = ctx.costOf('دقيق', 'لتر', 0.24);
  assert.equal(Math.round(cost * 100) / 100, 6);
});

test('الوحدة اللي مفيش لها تحويل لسه بترجع null (مش بتخمّن)', () => {
  const state = { prices: { 'ملح': { purchasePrice: 10, packSize: 1, packUnit: 'كيلو جرام' } } };
  const ctx = makeCtx(state);
  assert.equal(ctx.costOf('ملح', 'لتر', 0.24), null);
});

test('الوصفة: الهالك بيرفع تكلفة الوحدة الصالحة', () => {
  const state = {
    prices: { 'دقيق': { purchasePrice: 50, packSize: 1, packUnit: 'كيلو جرام' } },
    recipes: { 'خبز': [{ name: 'دقيق', qty: 1, unit: 'كيلو جرام' }] },
    recipeMeta: { 'خبز': { yieldQty: 10, marginPct: 30, extraCost: 0, wastePct: 10 } }
  };
  const ctx = makeCtx(state);
  ctx.recipeCost = null;
  vm.runInContext(extractFn(main2, 'recipeCost'), ctx);
  const r = ctx.recipeCost('خبز');
  // تكلفة الدفعة 50، الناتج 10، هالك 10% ← الوحدة 50/9
  assert.equal(Math.round(r.unitCost * 1000) / 1000, Math.round(50 / 9 * 1000) / 1000);
});
