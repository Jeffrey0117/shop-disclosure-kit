---
name: shop-disclosure-kit
description: 網站要接金流、申請金流商店（藍新／PayUni／綠界）、被退件說「無客服聯絡資訊」「請揭露退款政策」，或要做退款政策頁、聯絡頁的客服資訊、頁尾的政策連結時用。一份設定產生內容並檢查網站有沒有漏。
---

# shop-disclosure-kit — 打法

**金流審核要看的揭露內容：客服聯絡資訊、退款政策。一份設定產生頁面區塊與頁尾連結，並檢查網站有沒有漏。**

## 何時觸發

- 任何要收錢的站，上線收款或送金流審核**之前**。
- 被金流退件，理由是「網站上無客服聯絡資訊」「請於網站揭露退款政策等資訊」（2026-11-26 Pipee 的新藍新商店就是這樣被退）。
- 要改退款政策：改設定，不要去改頁面上的字。

## 接線（照抄能跑）

1. `npm i github:Jeffrey0117/shop-disclosure-kit`（或內嵌 copy `index.js`）
2. 一個站一份設定檔，放在 repo 裡（例：`disclosure.json`）：

```json
{
  "brand": "Pipee",
  "contact": { "email": "support@example.com", "phone": "", "hours": "" },
  "refund": { "policy": "none", "sells": ["訂閱方案", "AI 點數"], "subscription": true, "cancelAt": "會員中心" },
  "paths": { "refund": "/refund", "contact": "/contact", "terms": "/terms", "privacy": "/privacy" },
  "pages": { "pricing": "/pricing", "checkout": "/checkout" },
  "updated": "2026-11-26"
}
```

3. 產生內容放進頁面：

```js
const shop = require('shop-disclosure-kit')(require('./disclosure.json'));
shop.refundHtml();        // 退款政策頁的內文
shop.contactHtml();       // 聯絡頁的客服資訊（<dl>）
shop.footerLinks();       // 頁尾連結 [{ label, href }]
shop.checkoutNote().html; // 方案頁、付款頁的一句話
```

   靜態站：寫一支 `scripts/build-disclosure.js` 把這些片段寫進 HTML（片段前後放記號註解，重跑只換記號中間）。

4. 上線後檢查線上真的看得到：

```bash
npx github:Jeffrey0117/shop-disclosure-kit check disclosure.json https://你的網站
```

## 模式與文案

- **審核的人怎麼看**：打開首頁，往下滑到頁尾找「退款」和「聯絡」。找不到就退件，不會去翻服務條款第七條。所以：
  1. 首頁頁尾要有「退款政策」「聯絡客服」兩個連結。
  2. 退款政策是**自己一頁**，不是埋在服務條款裡。
  3. 聯絡頁要**寫出**信箱和服務時間。只有表單不算：表單送去哪、多久回，審核的人看不到。
  4. 方案頁、付款頁在價格附近放一句話連到退款政策。
- **政策要寫的五件事**：退不退（規則）、訂閱怎麼取消、例外（不退的話一定要寫，至少重複扣款和系統錯誤）、怎麼申請、多久入帳。
- **不退款也可以過審**，但要講清楚是數位服務、開通後不退，並給取消續訂的方法和例外。光寫「恕不退款」會被要求補說明。
- 服務時間沒寫就用預設：「週一至週五 10:00–18:00（國定假日除外），一個工作天內回覆」。
- 政策是對客人的承諾：**退不退、幾天，一定要問站的主人**，不要自己選一個填。

## 地雷

- **Cloudflare 會把原始碼裡的信箱打亂**（`data-cfemail`，瀏覽器用 JS 還原）。人和審核的人都看得到，但 `curl` 下來的原始碼裡沒有信箱。`check` 會照它的方式還原，所以對線上網站跑不會誤報（2026-11-26 pipee.tw 第一次跑就中）。
- 寫在 HTML 註解或 `<script>` 裡的信箱不算，檢查會當作沒有（審核的人也看不到）。
- 多語站：靠 JS 換字（`data-i18n`）的頁尾，連結的 `href` 要直接寫在 HTML 裡，檢查和審核看的都是原始 HTML。
- 改了政策要改設定檔的 `updated`，頁面上會顯示最後更新日期。
- 這個 kit 不產生服務條款和隱私權政策，只連過去。
- `kit-checks.json` 沒有放：稽核是逐行比對「寫錯的程式」，而這裡要抓的是「該有的沒有」，要用上面的 `check`。
