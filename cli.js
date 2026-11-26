#!/usr/bin/env node
// shop-disclosure-kit check <設定檔.json> <網站網址>
// 打開線上網站的首頁、退款政策、聯絡頁、方案頁（有的話），看審核要找的東西在不在。
// 設定檔就是 create() 的參數（JSON），另外可以加 "pages": { "pricing": "/pricing", "checkout": "/checkout" }。
// 只讀，不改任何東西。有缺就以結束碼 1 離開（可以放進 CI 或排程）。
const fs = require('node:fs');
const create = require('./index.js');

async function main() {
  const [command, configFile, site] = process.argv.slice(2);
  if (command !== 'check' || !configFile || !site) {
    console.error('用法：shop-disclosure-kit check <設定檔.json> <網站網址>');
    process.exit(2);
  }
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8').replace(/^﻿/, ''));
  const shop = create(config);
  const base = site.replace(/\/+$/, '');
  const wanted = { home: '/', refund: shop.config.paths.refund, contact: shop.config.paths.contact, ...(config.pages || {}) };
  const pages = {};
  for (const [name, path] of Object.entries(wanted)) {
    try {
      const res = await fetch(base + path, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
      pages[name] = res.ok ? await res.text() : '';
      if (!res.ok) console.log(`[${name}] ${base + path} 回 ${res.status}`);
    } catch (err) {
      pages[name] = '';
      console.log(`[${name}] ${base + path} 打不開（${err.message}）`);
    }
  }
  const missing = shop.check(pages);
  for (const one of missing) console.log(`[${one.page}] ${one.problem}\n      → ${one.fix}`);
  console.log(missing.length === 0 ? `都有了：${Object.keys(wanted).join('、')}` : `缺 ${missing.length} 項`);
  process.exit(missing.length === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err.message); process.exit(2); });
