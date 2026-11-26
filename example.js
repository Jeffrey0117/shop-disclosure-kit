// node example.js — 一份設定，印出退款政策、客服資訊、頁尾連結，並檢查一個缺東缺西的假網站。
const assert = require('node:assert');
const create = require('./index.js');

const shop = create({
  brand: '範例小站',
  contact: { email: 'support@example.test', phone: '02-1234-5678' },
  refund: { policy: 'none', sells: ['訂閱方案', 'AI 點數'], subscription: true, cancelAt: '會員中心' },
  updated: '2026-11-26',
});

console.log(shop.refundText());
console.log('\n--- 客服資訊 ---');
for (const item of shop.contactItems()) console.log(`${item.label}：${item.value}`);
console.log('\n--- 頁尾連結 ---');
console.log(shop.footerLinks().map((link) => `${link.label} → ${link.href}`).join('\n'));
console.log('\n--- 付款頁那句話 ---');
console.log(shop.checkoutNote().text);

// 一個只有表單、沒有寫出信箱、頁尾也沒有退款政策的網站：審核會退件的樣子。
const bad = shop.check({
  home: '<footer><a href="/contact">聯絡我們</a></footer>',
  contact: '<h1>聯絡我們</h1><form><input name="email"></form><!-- support@example.test -->',
  pricing: '<h1>方案</h1><button>訂閱</button>',
});
console.log('\n--- 缺什麼 ---');
for (const one of bad) console.log(`[${one.page}] ${one.problem} → ${one.fix}`);
assert.deepStrictEqual(bad.map((one) => one.id), ['home-refund-link', 'contact-email', 'contact-hours', 'contact-phone', 'pricing-refund-link']);

// 照 kit 產生的內容放上去之後：沒有缺的。
const footer = `<footer>${shop.footerLinks().map((link) => `<a href="${link.href}">${link.label}</a>`).join(' · ')}</footer>`;
const good = shop.check({
  home: footer,
  refund: `<h1>退款政策</h1>${shop.refundHtml()}${footer}`,
  contact: `<h1>聯絡我們</h1>${shop.contactHtml()}${footer}`,
  pricing: `<h1>方案</h1><p>${shop.checkoutNote().html}</p>`,
});
assert.deepStrictEqual(good, []);

// 線上的頁面：Cloudflare 把信箱打亂成 data-cfemail，原始碼裡看不到，但人看得到——檢查要認得。
const cloak = (email, key = 0x5a) => key.toString(16).padStart(2, '0') + [...email].map((char) => (char.charCodeAt(0) ^ key).toString(16).padStart(2, '0')).join('');
const cloaked = `<h1>聯絡我們</h1><p>客服信箱 <a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="${cloak('support@example.test')}">[email&#160;protected]</a></p><p>客服電話 02-1234-5678</p><p>服務時間 週一至週五</p>`;
assert.deepStrictEqual(shop.check({ contact: cloaked }), []);

// 政策是設定：幾天內可退、按比例退，句子跟著變；缺必要的設定會直接丟錯。
assert.ok(create({ brand: 'A', contact: { email: 'a@example.test' }, refund: { policy: 'days', days: 7, sells: ['課程'] } }).refundText().includes('付款後 7 天內'));
assert.throws(() => create({ brand: 'A', contact: { email: 'a@example.test' }, refund: { policy: 'days', sells: ['課程'] } }), /refund\.days/);
assert.throws(() => create({ brand: 'A', contact: {}, refund: { policy: 'none', sells: ['x'] } }), /contact\.email/);
console.log('\nok');
