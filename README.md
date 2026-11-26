# shop-disclosure-kit

金流審核要看的揭露內容：**客服聯絡資訊**、**退款政策**。一份設定產生頁面區塊與頁尾連結，並檢查網站有沒有漏。零依賴。

申請金流商店時，審核的人會打開網站找兩樣東西：出事了找誰、錢付了能不能退。找不到就退件
（「網站上無客服聯絡資訊」「請於網站揭露退款政策等資訊」）。每個要收錢的站都會被要一次，所以放在這裡。

## 用法

```js
const shop = require('shop-disclosure-kit')({
  brand: 'Pipee',
  contact: { email: 'support@example.com', phone: '02-1234-5678' },
  refund: { policy: 'none', sells: ['訂閱方案', 'AI 點數'], subscription: true, cancelAt: '會員中心' },
  updated: '2026-11-26',
});

shop.refundHtml();         // 退款政策頁的內文（<section> 一串，沒有樣式）
shop.refundText();         // 同樣內容的純文字
shop.contactHtml();        // 客服資訊（<dl>）
shop.footer({ logo: '/logo.png' }); // { html, css }：一整塊頁尾（名字、信箱、電話、地址；政策連結；版權）
shop.footerLinks();        // [{ label: '退款政策', href: '/refund' }, …]
shop.checkoutNote();       // { text, html }：方案頁、付款頁的一句話
shop.check({ home, refund, contact, pricing, checkout }); // 給幾頁的 HTML，回傳缺什麼
```

| 設定 | 說明 |
|---|---|
| `brand` | 網站或服務的名字 |
| `contact.email` | 必填。客服信箱 |
| `contact.hours` | 服務時間。沒寫用「週一至週五 10:00–18:00（國定假日除外），一個工作天內回覆」 |
| `contact.phone`、`contact.line`、`contact.address` | 有就顯示（電話和地址會出現在頁尾） |
| `refund.policy` | `none` 不退、只能取消續訂／`days` 幾天內全額退（配 `refund.days`）／`prorata` 依剩餘天數退 |
| `refund.sells` | 必填。賣的是什麼，會寫進政策 |
| `refund.subscription` | 有定期扣款就設 `true`，會多一節「取消續訂」 |
| `refund.cancelAt` | 在哪裡取消（預設「會員中心」） |
| `refund.exceptions` | 不退款時仍會退的情況（預設：重複扣款、系統錯誤沒開通） |
| `refund.processDays` | 退款多久入帳（預設「7 到 14 個工作天」） |
| `paths` | 各頁網址，預設 `/refund`、`/contact`、`/terms`、`/privacy` |
| `updated` | 政策最後更新日期 |

## 檢查線上的網站

```bash
npx github:Jeffrey0117/shop-disclosure-kit check disclosure.json https://example.com
```

設定檔是上面那份（JSON），可以多一個 `"pages": { "pricing": "/pricing", "checkout": "/checkout" }`。
只讀不改；有缺就以結束碼 1 離開。它檢查的是「人看得到的字」和連結：註解和 script 裡的不算。

```bash
node example.js   # 看產生的內容，和一個會被退件的假網站被抓出哪些問題
```

怎麼擺、文案怎麼寫、踩過的坑：見 [SKILL.md](./SKILL.md)。
