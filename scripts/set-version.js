#!/usr/bin/env node
/* بيحدّث رقم النسخة في كل الأماكن مرة واحدة:
   - js/000-app-info.js (المصدر، وبيظهر في "معلومات النسخة")
   - index.html (العنوان + meta application-version / application-updated)
   - sw.js (اسم الكاش، عشان المتصفح يعرف إن فيه نسخة جديدة)
   الاستخدام: node scripts/set-version.js 3.10.0 */
'use strict';
const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version || '')) {
  console.error('الاستخدام: node scripts/set-version.js 3.10.0');
  process.exit(1);
}
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(root, f), s, 'utf8');
const replaceOnce = (s, re, to, label) => {
  if (!re.test(s)) throw new Error('مش لاقي: ' + label);
  return s.replace(re, to);
};

const now = new Date();
const iso = now.toISOString().slice(0, 10);
const arMonths = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const label = now.getDate() + ' ' + arMonths[now.getMonth()] + ' ' + now.getFullYear();

// 0) ملاحظات الإصدار من CHANGELOG.md (لازم تكون موجودة قبل النشر)
function changesFor(v) {
  const lines = read('CHANGELOG.md').split(/\r?\n/);
  const start = lines.findIndex(l => new RegExp('^#\\s+RMY PRO ' + v.replace(/\./g, '\\.') + '(\\s|$)').test(l));
  if (start < 0) throw new Error('مفيش قسم للإصدار ' + v + ' في CHANGELOG.md. اكتب ملاحظات التحديث الأول.');
  const items = [];
  for (let i = start + 1; i < lines.length && !/^#\s/.test(lines[i]); i++) {
    const m = lines[i].match(/^\s*[-*]\s+(.*\S)\s*$/);
    if (m) items.push(m[1].replace(/\*\*/g, '').replace(/`/g, ''));
  }
  if (!items.length) throw new Error('قسم الإصدار ' + v + ' فاضي. اكتب على الأقل بند واحد.');
  return items.slice(0, 12);
}
const changes = changesFor(version);

// 1) المصدر
let info = read('js/000-app-info.js');
info = replaceOnce(info, /version: '[^']*'/, "version: '" + version + "'", 'version في app-info');
info = replaceOnce(info, /updated: '[^']*'/, "updated: '" + iso + "'", 'updated في app-info');
info = replaceOnce(info, /updatedLabel: '[^']*'/, "updatedLabel: '" + label + "'", 'updatedLabel في app-info');
info = replaceOnce(info, /  changes: \[[\s\S]*?\]\n/, '  changes: ' + JSON.stringify(changes, null, 2).replace(/\n/g, '\n  ') + '\n', 'changes في app-info');
write('js/000-app-info.js', info);

// 2) index.html
let html = read('index.html');
html = replaceOnce(html, /<title>RMY PRO [0-9.]+ \|/, '<title>RMY PRO ' + version + ' |', 'title');
html = replaceOnce(html, /<meta name="application-version" content="[^"]*">/, '<meta name="application-version" content="' + version + '">', 'application-version');
html = replaceOnce(html, /<meta name="application-updated" content="[^"]*">/, '<meta name="application-updated" content="' + iso + '">', 'application-updated');
write('index.html', html);

// 3) sw.js: اسم الكاش بيزيد رقمه مع كل نسخة
let sw = read('sw.js');
const m = sw.match(/const CACHE = 'rmy-shell-v(\d+)';/);
if (!m) throw new Error('مش لاقي CACHE في sw.js');
sw = sw.replace(m[0], "const CACHE = 'rmy-shell-v" + (Number(m[1]) + 1) + "';");
write('sw.js', sw);

console.log('ملاحظات الإصدار: ' + changes.length + ' بند'); console.log('تم تحديث النسخة إلى ' + version + ' (' + label + '). الكاش: rmy-shell-v' + (Number(m[1]) + 1));
