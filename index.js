// ============================================================================
// shop-disclosure-kit — 金流審核要看的揭露內容：客服聯絡資訊、退款政策。
// 一份設定產生頁面區塊與頁尾連結，並檢查網站有沒有漏。
// ----------------------------------------------------------------------------
// 零依賴（node 內建）。factory pattern。
//
// 為什麼有這個 kit：申請金流（藍新、PayUni、綠界…）時，審核的人會打開網站找兩樣東西——
// 「出事了找誰」（客服聯絡資訊）和「錢付了能不能退」（退款政策）。找不到就退件。
// 每個要收錢的站都會被要一次，所以內容和檢查放在這裡，改一次全部的站跟著對。
//
// 這裡不替你決定政策：退不退、幾天、例外是什麼，都是設定。kit 只負責把你定的事
// 寫成審核的人和客人都看得懂的句子，放到該出現的地方，並檢查網站上真的看得到。
// ============================================================================

const POLICIES = ['none', 'days', 'prorata'];

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const need = (value, name) => {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`shop-disclosure-kit: ${name} is required`);
  return value.trim();
};
const optional = (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);

/**
 * @param {object} opts
 * @param {string} opts.brand                    網站或服務的名字（「Pipee」）
 * @param {object} opts.contact                  客服聯絡資訊：至少要有 email
 * @param {string} opts.contact.email
 * @param {string} [opts.contact.hours]          服務時間（「週一至週五 10:00–18:00，一個工作天內回覆」）
 * @param {string} [opts.contact.phone]
 * @param {string} [opts.contact.line]           LINE 帳號或連結
 * @param {string} [opts.contact.formUrl]        聯絡表單的網址（有的話）
 * @param {object} opts.refund                   退款政策
 * @param {'none'|'days'|'prorata'} opts.refund.policy   none：不退，只能取消續訂；days：幾天內可全額退；prorata：依剩餘天數退
 * @param {number} [opts.refund.days]            policy 是 days 時必填
 * @param {string[]} opts.refund.sells           賣的是什麼（「訂閱方案」「AI 點數」），會寫進政策
 * @param {boolean} [opts.refund.subscription]   有沒有定期扣款（有的話會寫怎麼取消）
 * @param {string} [opts.refund.cancelAt]        在哪裡取消續訂（「會員中心」、或一個網址）
 * @param {string[]} [opts.refund.exceptions]    不退款時仍然會退的情況；預設是重複扣款和系統錯誤
 * @param {string} [opts.refund.processDays]     退款多久入帳（「7 到 14 個工作天」）
 * @param {object} [opts.paths]                  各頁的網址：{ refund, contact, terms, privacy }
 * @param {string} [opts.updated]                政策最後更新的日期（「2026-11-26」）
 */
module.exports = function create(opts = {}) {
  const brand = need(opts.brand, 'brand');
  const contact = {
    email: need(opts.contact && opts.contact.email, 'contact.email'),
    hours: optional(opts.contact.hours) || '週一至週五 10:00–18:00（國定假日除外），一個工作天內回覆',
    phone: optional(opts.contact.phone),
    line: optional(opts.contact.line),
    formUrl: optional(opts.contact.formUrl),
  };
  const given = opts.refund || {};
  if (!POLICIES.includes(given.policy)) throw new Error(`shop-disclosure-kit: refund.policy must be one of ${POLICIES.join(', ')}`);
  if (given.policy === 'days' && !(Number.isInteger(given.days) && given.days > 0)) throw new Error('shop-disclosure-kit: refund.days is required when refund.policy is "days"');
  if (!Array.isArray(given.sells) || given.sells.length === 0) throw new Error('shop-disclosure-kit: refund.sells is required (what is sold)');
  const refund = {
    policy: given.policy,
    days: given.days || null,
    sells: given.sells.map(String),
    subscription: given.subscription === true,
    cancelAt: optional(given.cancelAt) || '會員中心',
    exceptions: Array.isArray(given.exceptions) && given.exceptions.length > 0 ? given.exceptions.map(String) : ['同一筆訂單被重複扣款', '因為我們的系統錯誤，付款後服務沒有開通'],
    processDays: optional(given.processDays) || '7 到 14 個工作天',
  };
  const paths = { refund: '/refund', contact: '/contact', terms: '/terms', privacy: '/privacy', ...(opts.paths || {}) };
  const updated = optional(opts.updated);

  /** 退款政策，一節一節：[{ title, lines }]。頁面、純文字、檢查都從這裡來，所以三個地方說的一定一樣。 */
  function refundSections() {
    const what = refund.sells.join('、');
    const rule = {
      none: [`${brand} 提供的${what}屬於數位服務，付款完成後立即開通，開通後不提供退款。`, '下單前請先確認方案內容；有任何疑問，歡迎先來信詢問。'],
      days: [`付款後 ${refund.days} 天內，可以來信申請全額退款，不需要說明原因。`, `超過 ${refund.days} 天不提供退款。`],
      prorata: ['可以隨時來信申請退款，我們依照剩餘未使用的天數按比例退還。', '已經使用的天數，以及已經用掉的點數或額度不退。'],
    }[refund.policy];
    const sections = [{ title: '退款規則', lines: rule }];
    if (refund.subscription) {
      sections.push({ title: '取消續訂', lines: [`訂閱可以隨時在${refund.cancelAt}取消，取消後不會再扣款。`, '已經付款的這一期可以繼續使用到期滿為止。'] });
    }
    if (refund.policy === 'none') {
      sections.push({ title: '例外情況', lines: ['以下情況我們會全額退款：', ...refund.exceptions.map((one) => `・${one}`)] });
    }
    sections.push({
      title: '怎麼申請',
      lines: [`請來信 ${contact.email}，附上付款時使用的 Email 和訂單編號（或付款日期與金額）。`, `我們會在一個工作天內回覆。核准的退款會退回原付款方式，約 ${refund.processDays}入帳，實際時間依發卡銀行而定。`],
    });
    return sections;
  }

  /** 客服聯絡資訊，一項一項：[{ label, value, href }]。 */
  function contactItems() {
    return [
      { label: '客服信箱', value: contact.email, href: `mailto:${contact.email}` },
      ...(contact.phone ? [{ label: '客服電話', value: contact.phone, href: `tel:${contact.phone.replace(/[^\d+]/g, '')}` }] : []),
      ...(contact.line ? [{ label: 'LINE', value: contact.line, href: /^https?:\/\//.test(contact.line) ? contact.line : null }] : []),
      { label: '服務時間', value: contact.hours, href: null },
    ];
  }

  /** 退款政策的 HTML 片段（<section> 一串，沒有外框和樣式：放進你自己的版面）。 */
  function refundHtml({ heading = 'h2' } = {}) {
    const body = refundSections().map((section) => `<section>\n  <${heading}>${escapeHtml(section.title)}</${heading}>\n${section.lines.map((line) => `  <p>${escapeHtml(line)}</p>`).join('\n')}\n</section>`).join('\n');
    return updated ? `${body}\n<p class="disclosure-updated">最後更新：${escapeHtml(updated)}</p>` : body;
  }

  /** 客服聯絡資訊的 HTML 片段（一個 <dl>）。 */
  function contactHtml() {
    const rows = contactItems().map((item) => `  <dt>${escapeHtml(item.label)}</dt>\n  <dd>${item.href ? `<a href="${escapeHtml(item.href)}">${escapeHtml(item.value)}</a>` : escapeHtml(item.value)}</dd>`).join('\n');
    return `<dl class="disclosure-contact">\n${rows}\n</dl>`;
  }

  /** 頁尾該有的連結：[{ label, href }]。金流審核會在首頁頁尾找這幾個。 */
  function footerLinks() {
    return [
      { label: '退款政策', href: paths.refund },
      { label: '聯絡客服', href: paths.contact },
      { label: '服務條款', href: paths.terms },
      { label: '隱私權政策', href: paths.privacy },
    ];
  }

  /** 付款頁、方案頁要放的一句話（連到退款政策），純文字和 HTML 各一。 */
  function checkoutNote() {
    const words = { none: '數位服務開通後不提供退款', days: `付款後 ${refund.days} 天內可全額退款`, prorata: '可依剩餘天數按比例退款' }[refund.policy];
    const tail = refund.subscription ? '，訂閱可隨時取消續訂' : '';
    return { text: `${words}${tail}。詳見退款政策。`, html: `${escapeHtml(words + tail)}。詳見<a href="${escapeHtml(paths.refund)}">退款政策</a>。` };
  }

  /** 純文字版的退款政策（寄信、貼到後台用）。 */
  function refundText() {
    return refundSections().map((section) => `【${section.title}】\n${section.lines.join('\n')}`).join('\n\n');
  }

  /**
   * 檢查網站上真的看得到這些東西。給它幾頁的 HTML（{ home, refund, contact, pricing?, checkout? }），
   * 回傳缺什麼：[{ id, page, problem, fix }]。空陣列就是都有。
   * 只看「人看得到的字」和連結，不看註解和 script 裡的字。
   */
  function check(pages = {}) {
    const seen = (html) => String(html || '').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ');
    const words = (html) => seen(html).replace(/<[^>]+>/g, ' ').replace(/&middot;|&nbsp;/g, ' ').replace(/\s+/g, ' ');
    const linksTo = (html, href) => new RegExp(`href=["'][^"']*${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\.html)?["'#?/]`, 'i').test(seen(html) + '"');
    const missing = [];
    const miss = (id, page, problem, fix) => missing.push({ id, page, problem, fix });

    if (pages.home !== undefined) {
      if (!linksTo(pages.home, paths.refund)) miss('home-refund-link', 'home', '首頁沒有連到退款政策', `在頁尾加一個「退款政策」連到 ${paths.refund}`);
      if (!linksTo(pages.home, paths.contact) && !words(pages.home).includes(contact.email)) miss('home-contact-link', 'home', '首頁找不到客服聯絡方式', `在頁尾加一個「聯絡客服」連到 ${paths.contact}，或直接寫出客服信箱`);
    }
    if (pages.refund !== undefined) {
      const text = words(pages.refund);
      if (!text.includes('退款')) miss('refund-page-empty', 'refund', '退款政策頁沒有講到退款', '把 refundHtml() 的內容放進這一頁');
      if (!text.includes(contact.email)) miss('refund-page-how', 'refund', '退款政策頁沒有寫怎麼申請（找不到客服信箱）', '政策裡要寫出申請退款要寄到哪個信箱');
    }
    if (pages.contact !== undefined) {
      const text = words(pages.contact);
      if (!text.includes(contact.email)) miss('contact-email', 'contact', '聯絡頁上看不到客服信箱（只有表單不算）', '把 contactHtml() 放進聯絡頁：審核的人要看到寫出來的信箱');
      if (!/服務時間|營業時間|回覆時間/.test(text)) miss('contact-hours', 'contact', '聯絡頁沒有寫服務時間', '把 contactHtml() 放進聯絡頁');
      if (contact.phone && !text.replace(/[\s-]/g, '').includes(contact.phone.replace(/[\s-]/g, ''))) miss('contact-phone', 'contact', '設定裡有客服電話，但聯絡頁上沒有', '把 contactHtml() 放進聯絡頁');
    }
    for (const page of ['pricing', 'checkout']) {
      if (pages[page] !== undefined && !linksTo(pages[page], paths.refund)) miss(`${page}-refund-link`, page, `${page === 'pricing' ? '方案頁' : '付款頁'}沒有連到退款政策`, '在價格或付款按鈕附近放 checkoutNote().html');
    }
    return missing;
  }

  return { refundSections, refundHtml, refundText, contactItems, contactHtml, footerLinks, checkoutNote, check, config: { brand, contact, refund, paths, updated } };
};

module.exports.POLICIES = POLICIES;
