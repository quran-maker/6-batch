// =========================================================
// ল্যান্ডিং পেইজ — সার্ভার থেকে লেখা এনে পেইজ বানায়, এনিমেশন ও ফর্ম চালায়
// সব লেখা/ছবি/লিংক অ্যাডমিন প্যানেল (/admin.html) থেকে বদলানো যায়।
// =========================================================
(function () {
  "use strict";

  const BN = "০১২৩৪৫৬৭৮৯";
  const bn = (n) => String(n).replace(/\d/g, (d) => BN[d]);
  const en = (s) => String(s).replace(/[০-৯]/g, (d) => BN.indexOf(d));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const lines = (arr) => (arr || []).filter((x) => String(x).trim());
  const pad2 = (n) => bn(String(n).padStart(2, "0"));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ডিফল্টের সাথে সার্ভারের লেখা মেলানো (নতুন ঘর যোগ হলেও কিছু ভাঙবে না)
  function merge(def, val) {
    if (Array.isArray(def)) return Array.isArray(val) ? val : def;
    if (def && typeof def === "object") {
      const out = { ...def };
      if (val && typeof val === "object" && !Array.isArray(val)) for (const k of Object.keys(val)) out[k] = k in def ? merge(def[k], val[k]) : val[k];
      return out;
    }
    return val === undefined || val === null ? def : val;
  }

  /* ---------- আইকন ---------- */
  const I = {
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.4H7.6V14h2.7v8h3.2z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .6 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-4.8 31 31 0 0 0-.4-4.8zM9.8 15.1V8.9l5.7 3.1z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.8-.4-1.9-.9-2.9-2.6-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.4-.3z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 3c.4 2.2 1.8 3.7 4 4v3.1c-1.5.1-2.8-.4-4-1.2v6.4a6 6 0 1 1-6-6v3.2a2.8 2.8 0 1 0 2.8 2.8V3h3.2z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.4 3.6 2.9 10.7c-1.3.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.5c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-.5-1.9-1.5-1.4zM9.3 14.1l9-5.7c.4-.3.8-.1.5.2l-7.7 7-.3 3.2-1.5-4.7z"/></svg>',
    messenger: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.4 2 2 6.1 2 11.7c0 2.9 1.2 5.5 3.2 7.2v3.1l3-1.6c1.2.3 2.5.5 3.8.5 5.6 0 10-4.1 10-9.7S17.6 2 12 2zm1 13-2.5-2.7-5 2.7 5.5-5.8 2.6 2.7 4.9-2.7L13 15z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.2c0-1.3 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8V21h-4z"/></svg>',
    website: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>',
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2.5zM20 19v3H6"/><path d="M9 7h7M9 11h5"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="14" height="14" rx="3"/><path d="m16 10 6-3v10l-6-3"/></svg>',
    record: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>',
    slides: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8M7 12l3-3 2 2 4-4"/></svg>',
    support: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2" y="13" width="5" height="7" rx="2"/><rect x="17" y="13" width="5" height="7" rx="2"/></svg>',
    bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M16 13h2M2 10h20M6 6l9-3 1 3"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.6 7 .7-5.3 4.8 1.6 7L12 17.4 5.7 21l1.6-7L2 9.3l7-.7z"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
    mosque: '<svg viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#ffc727"/><path d="M32 12c-8 6-14 12-14 22v16h28V34c0-10-6-16-14-22z" fill="#0a1a3f"/><rect x="27" y="38" width="10" height="12" rx="5" fill="#ffc727"/></svg>'
  };
  const INC_ICONS = [I.video, I.record, I.slides, I.support];
  const DONE_ICONS = [I.website, I.video, I.wallet, I.bolt];
  const OUT_ICONS = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V11l7-6 7 6v10"/><path d="M10 21v-5a2 2 0 0 1 4 0v5M12 2v3"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/></svg>'
  ];
  const CLASS_ICONS =[I.target, I.slides, I.bolt, I.website, I.record, I.support, I.video, I.website, I.shield];

  /* ---------- ইউটিউব ---------- */
  function ytInfo(url) {
    const u = String(url || "").trim();
    const m = u.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/) || u.match(/^([\w-]{11})$/);
    return m ? { id: m[1], short: /\/shorts\//.test(u) } : null;
  }
  function ytCard(url, title) {
    const y = ytInfo(url);
    if (!y) return "";
    return `<figure class="yt ${y.short ? "short" : ""}">
      <div class="yt-frame">
        <img src="https://i.ytimg.com/vi/${y.id}/hqdefault.jpg" alt="" loading="lazy">
        <button class="yt-play" data-yt="${y.id}" aria-label="ভিডিও চালু করুন"><i></i></button>
      </div>
      ${title ? `<figcaption>${esc(title)}</figcaption>` : ""}
    </figure>`;
  }

  const waLink = (n) => { const d = String(n || "").replace(/\D/g, "").replace(/^0/, "880"); return d ? "https://wa.me/" + d : ""; };
  const telLink = (n) => "tel:" + String(n || "").replace(/[^\d+]/g, "");

  /* ---------- পেইজ বানানো ---------- */
  function render(C) {
    const S = C.settings, H = C.hero, P = C.pricing, Pay = C.payment;
    document.title = C.seo.title || document.title;
    const md = $('meta[name="description"]'); if (md && C.seo.description) md.content = C.seo.description;

    const classes = (C.classes || []).filter((c) => c.title);
    const bonuses = (C.bonuses || []).filter((b) => b.title);
    const shots = (C.screenshots || []).filter((s) => s.image);
    const vids = (C.videos || []).filter((v) => ytInfo(v.url));
    const socials = (C.social || []).filter((s) => s.url && I[s.platform]);
    const heroVid = ytInfo(H.videoUrl);
    const logo = S.logo ? `<img src="${esc(S.logo)}" alt="">` : I.mosque;
    const hasReviews = shots.length || vids.length;
    // ডেমো ক্লাস: অ্যাডমিনে চালু থাকলে আর অন্তত একটা সঠিক ইউটিউব লিংক থাকলে দেখাবে
    const demos = C.demo && C.demo.on ? (C.demo.videos || []).filter((v) => ytInfo(v.url)) : [];

    // হিরোর ডান পাশ: ভিডিও > ছবি > ক্লাসের তালিকা কার্ড
    const heroMedia = heroVid
      ? `<div class="hero-media">${ytCard(H.videoUrl, "")}</div>`
      : H.image
        ? `<div class="hero-media"><img class="hero-img" src="${esc(H.image)}" alt=""></div>`
        : `<div class="hero-media board">
            <div class="board-head"><span class="live"><i></i> LIVE</span><b>${esc(C.classesSubtitle)}</b></div>
            <ol>${classes.slice(0, 9).map((c, i) => `<li style="--i:${i}"><span>${pad2(i + 1)}</span>${esc(c.title)}</li>`).join("")}</ol>
            <div class="chip-float c1">${I.check} পেইজ সেটাপ</div>
            <div class="chip-float c2">${I.bolt} ১ মাসে রেডি</div>
          </div>`;

    const tabs = [["classes", "ক্লাস"], demos.length && ["demo", "ডেমো ক্লাস"],["includes", "যা পাচ্ছেন"], ["gifts", "গিফট"], hasReviews && ["reviews", "রিভিউ"], ["pricing", "ফি ও পেমেন্ট"], ["enroll", "ভর্তি"]].filter(Boolean);

    $("#app").innerHTML = `
    <div class="promo" id="promo">
      <div class="wrap promo-in">
        <span class="promo-txt">${I.bolt}<b>${esc(P.offerLabel)}</b> — মাত্র ৳${esc(P.offer)}</span>
        <span class="promo-cd" id="promoCd">${esc(P.offerNote)}</span>
        <a href="#enroll" class="promo-go">ভর্তি হোন</a>
      </div>
    </div>
    <header class="nav" id="nav">
      <div class="wrap nav-in">
        <a class="brand" href="#top">${logo}<span>${esc(S.brandName)}</span></a>
        ${S.phone ? `<a class="nav-call" href="${telLink(S.phone)}">${I.phone}<span>${esc(S.phone)}</span></a>` : ""}
        <a class="btn sm" href="#enroll">${esc(H.cta)}</a>
      </div>
    </header>

    <main id="top">
      <!-- হিরো -->
      <section class="hero">
        <div class="blob b1"></div><div class="blob b2"></div>
        <div class="wrap hero-grid">
          <div class="hero-text">
            <span class="badge rv"><i></i>${esc(H.badge)}</span>
            <p class="kicker rv" style="--d:.08s">${esc(H.kicker)}</p>
            <h1 class="rv" style="--d:.16s"><span class="hl">${esc(H.title)}</span></h1>
            <p class="sub rv" style="--d:.24s">${esc(H.subtitle)}</p>
            <div class="hero-cta rv" style="--d:.32s">
              <a class="btn lg" href="#enroll">${esc(H.cta)} ${I.arrow}</a>
              <a class="btn outline lg" href="#classes">ক্লাসের তালিকা দেখুন</a>
            </div>
            <div class="hero-price rv" style="--d:.4s"><b>৳${esc(P.offer)}</b><s>৳${esc(P.regular)}</s><em>${I.bolt}${esc(P.offerLabel)}</em></div>
            <ul class="hero-chips rv" style="--d:.48s">${lines(C.includes).map((t, i) => `<li>${INC_ICONS[i % 4]}${esc(t)}</li>`).join("")}</ul>
          </div>
          <div class="rv zoom" style="--d:.2s">${heroMedia}</div>
        </div>
        <div class="wrap">
          <div class="stats">${(H.stats || []).filter((s) => s.num).map((s, i) => `<div class="stat rv up" style="--d:${0.1 * i}s"><b data-count="${esc(s.num)}">${esc(s.num)}</b><span>${esc(s.label)}</span></div>`).join("")}</div>
        </div>
      </section>

      <!-- সেকশনে যাওয়ার ট্যাব -->
      <nav class="tabs" id="tabs"><div class="wrap tabs-in">${tabs.map(([id, t]) => `<a href="#${id}" data-t="${id}">${t}</a>`).join("")}</div></nav>

      <!-- চলমান লাইন -->
      <div class="ticker" aria-hidden="true"><div class="ticker-in">${[0, 1].map(() => classes.map((c) => `<span>${I.star}${esc(c.title)}</span>`).join("")).join("")}</div></div>

      <!-- ক্লাস -->
      <section class="sec" id="classes">
        <div class="wrap">
          <div class="head rv"><span class="eyebrow">কারিকুলাম</span><h2>${esc(C.classesTitle)}</h2>
            <p class="head-meta"><span>${I.video} ${esc(C.classesSubtitle)}</span><span>${I.record} প্রতিটি ক্লাসের রেকর্ডিং</span></p></div>
          <div class="classes">
            ${classes.map((c, i) => `
            <article class="cls rv up ${i === 0 ? "open" : ""}" style="--d:${(i % 2) * 0.08}s">
              <button class="cls-top" aria-expanded="${i === 0}">
                <span class="cls-no"><small>ক্লাস</small><b>${bn(i + 1)}</b></span>
                <span class="cls-meta"><b>${esc(c.title)}</b><small>${I.video} লাইভ ক্লাস · ${bn(lines(c.items).length)}টি টপিক</small></span>
                <span class="cls-tg">${I.plus}</span>
              </button>
              <div class="cls-body"><div><p class="learn">আপনি শিখবেন—</p><ul>${lines(c.items).map((t) => `<li>${I.check}<span>${esc(t)}</span></li>`).join("")}</ul></div></div>
            </article>`).join("")}
          </div>
        </div>
      </section>

      ${demos.length ? `<!-- ডেমো ক্লাস -->
      <section class="sec demo-sec" id="demo">
        <div class="wrap">
          <div class="head rv"><span class="eyebrow"><i class="rec"></i> ডেমো ক্লাস</span><h2>${esc(C.demo.title)}</h2>${C.demo.subtitle ? `<p class="do-sub">${esc(C.demo.subtitle)}</p>` : ""}</div>
          <div class="demos ${demos.length === 1 ? "one" : ""}">${demos.map((v, i) => `<div class="demo rv up" style="--d:${(i % 3) * 0.08}s"><span class="demo-badge">${I.video} ডেমো ${demos.length > 1 ? bn(i + 1) : ""}</span>${ytCard(v.url, v.title)}</div>`).join("")}</div>
          <div class="do-cta rv"><a class="btn lg" href="#enroll">ডেমো ভালো লাগলে — এখনই ভর্তি হোন ${I.arrow}</a></div>
        </div>
      </section>` : ""}

      <!-- যা যা পাচ্ছেন -->
      <section class="sec soft" id="includes">
        <div class="wrap">
          <div class="head rv"><h2>${esc(C.includesTitle)}</h2></div>
          <div class="incs">${lines(C.includes).map((t, i) => `<div class="inc rv up" style="--d:${i * 0.08}s"><span>${INC_ICONS[i % 4]}</span><b>${esc(t)}</b></div>`).join("")}</div>
        </div>
      </section>

      <!-- গিফট -->
      <section class="sec navy" id="gifts">
        <div class="glow"></div>
        <div class="wrap">
          <div class="head rv"><span class="eyebrow y">${I.gift} বোনাস</span><h2>${esc(C.bonusesTitle)}</h2></div>
          <div class="gifts">
            ${bonuses.map((b, i) => `
            <article class="gift rv up" style="--d:${i * 0.08}s">
              <div class="gift-pic">${b.image ? `<img src="${esc(b.image)}" alt="${esc(b.title)}" loading="lazy">` : `<div class="gift-ph">${/বই|পিডিএফ|প্রম্পট/.test(b.tag || "") ? I.book : I.gift}</div>`}
                <span class="gift-no">${pad2(i + 1)}</span>${b.tag ? `<span class="gift-tag">${esc(b.tag)}</span>` : ""}</div>
              <h3>${esc(b.title)}</h3>
              <span class="free">ফ্রি গিফট</span>
            </article>`).join("")}
          </div>
        </div>
      </section>

      <!-- কোর্স না -->
      <section class="statement">
        <div class="wrap rv zoom">
          <p class="strike"><span>${esc(C.notCourse.line1)}</span></p>
          <h2>${esc(C.notCourse.line2)}</h2>
        </div>
      </section>

      <!-- আমরা কী করব -->
      <section class="sec do-sec" id="done">
        <div class="wrap">
          <div class="do-panel rv zoom">
            <div class="head">
              <span class="eyebrow y">${I.bolt} শুধু শেখানো না — করে দিব</span>
              <h2>${esc(C.doneTitle)}</h2>
              <p class="do-sub">এই কাজগুলো আমরা নিজ হাতে আপনার জন্য করে দিব</p>
            </div>
            <div class="journey" id="journey" style="--n:${lines(C.done).length}">
              <div class="j-line"><i></i></div>
              ${lines(C.done).map((t, i, a) => `
              <button class="j-step ${i === a.length - 1 ? "goal" : ""}" data-i="${i}">
                <span class="j-dot">${DONE_ICONS[i % DONE_ICONS.length]}<b class="j-ok">${I.check}</b></span>
                <span class="j-n">${i === a.length - 1 ? "🎯 লক্ষ্য" : "ধাপ " + bn(i + 1)}</span>
                <p>${esc(t)}</p>
              </button>`).join("")}
            </div>
            <div class="do-cta"><a class="btn lg" href="#enroll">আমার মাদরাসাও রেডি করতে চাই ${I.arrow}</a></div>
          </div>
        </div>
      </section>

      ${hasReviews ? `<section class="sec soft" id="reviews">
        <div class="wrap">
          ${shots.length ? `
          <div class="head rv"><span class="eyebrow">${esc(C.shotsSubtitle)}</span><h2>${esc(C.shotsTitle)}</h2></div>
          <div class="shots-wrap rv">
            <div class="shots" id="shots">${shots.map((s, i) => `<button class="shot" data-i="${i}"><img src="${esc(s.image)}" alt="${esc(s.caption || "স্ক্রিনশট রিভিউ")}" loading="lazy">${s.caption ? `<span>${esc(s.caption)}</span>` : ""}</button>`).join("")}</div>
            <div class="shots-nav"><button data-dir="-1" aria-label="আগে">‹</button><button data-dir="1" aria-label="পরে">›</button></div>
          </div>` : ""}
          ${vids.length ? `
          <div class="head rv ${shots.length ? "mt" : ""}"><span class="eyebrow">${esc(C.videosTitle)}</span><h2>${esc(C.videosSubtitle)}</h2></div>
          <div class="vids ${vids.every((v) => ytInfo(v.url).short) ? "all-short" : ""}">${vids.map((v, i) => `<div class="rv up" style="--d:${(i % 3) * 0.08}s">${ytCard(v.url, v.title)}</div>`).join("")}</div>` : ""}
        </div>
      </section>` : ""}

      <!-- ২টার একটা -->
      <section class="sec two-sec" id="two">
        <div class="glow"></div><div class="glow g2"></div>
        <div class="wrap">
          <div class="head rv">
            <span class="eyebrow y">${I.shield} ১০০% ফলাফল</span>
            <h2>${esc(C.outcomes.title)}</h2>
            <span class="stamp" id="stamp">হবেই!</span>
          </div>
          <div class="paths" id="paths">
            ${lines(C.outcomes.items).map((t, i) => `${i ? `<div class="or-coin rv zoom"><span>অথবা</span></div>` : ""}
            <button class="path rv ${i ? "right" : "left"} ${i ? "" : "on"}" data-i="${i}">
              <span class="path-top"><span class="path-ic">${OUT_ICONS[i % OUT_ICONS.length]}</span><span class="path-no">পথ ${bn(i + 1)}</span><span class="path-tick">${I.check}</span></span>
              <p>${esc(t)}</p>
            </button>`).join("")}
          </div>
          <p class="two-hint rv">${I.target} যে পথটা আপনার, সেটায় চাপ দিন</p>
          <div class="two-cta" id="twoCta"><a class="btn lg" href="#enroll"><span id="twoCtaTxt">এই পথে যেতে চাই</span> ${I.arrow}</a></div>
        </div>
      </section>

      <!-- সাপোর্ট -->
      <section class="support">
        <div class="wrap support-in rv">
          <span class="sup-ic">${I.support}</span>
          <div><h2>${esc(C.support.title)}</h2><p>${esc(C.support.text)}</p></div>
          ${S.phone ? `<a class="btn ghost-d" href="${telLink(S.phone)}">${I.phone} ${esc(S.phone)}</a>` : ""}
        </div>
      </section>

      <!-- ফি, পেমেন্ট, ফর্ম -->
      <section class="sec" id="pricing">
        <div class="wrap">
          <div class="head rv"><span class="eyebrow">ফি</span><h2>আজই জয়েন করুন</h2></div>
          <div class="buy">
            <div class="price rv zoom">
              <p class="reg">${esc(P.regularLabel)}: <s>৳${esc(P.regular)}</s></p>
              <span class="offer-tag">${esc(P.offerLabel)}</span>
              <p class="offer-note">${esc(P.offerNote)}</p>
              <div class="amount"><small>মাত্র</small><b>৳${esc(P.offer)}</b></div>
              <div class="countdown" id="countdown" hidden></div>
              <a class="btn lg block" href="#enroll">${esc(H.cta)} ${I.arrow}</a>
              <div class="guarantee"><span>${I.shield}</span><div><b>${esc(P.guaranteeTitle)}</b><p>${esc(P.guaranteeText)}</p></div></div>
            </div>

            <div class="pays">
              <div class="pay rv right">
                <h3><span>${I.wallet}</span>${esc(Pay.mobileLabel)}</h3>
                <div class="chips"><em class="bk">বিকাশ</em><em class="ng">নগদ</em></div>
                <div class="copyrow"><b>${esc(Pay.mobileNumber)}</b><button class="copy" data-copy="${esc(Pay.mobileNumber)}">${I.copy}<span>কপি</span></button></div>
                <p class="hint">“সেন্ড মানি” করুন</p>
              </div>
              <div class="pay rv right" style="--d:.1s">
                <h3><span>${I.bank}</span>ব্যাংক একাউন্ট</h3>
                <dl>
                  <dt>একাউন্টের নাম</dt><dd>${esc(Pay.accountName)}</dd>
                  <dt>একাউন্ট নম্বর</dt><dd class="copyrow"><b>${esc(Pay.accountNo)}</b><button class="copy" data-copy="${esc(Pay.accountNo)}">${I.copy}<span>কপি</span></button></dd>
                  <dt>ব্যাংক</dt><dd>${esc(Pay.bankName)}</dd>
                  <dt>ব্রাঞ্চ</dt><dd>${esc(Pay.bankBranch)}</dd>
                </dl>
              </div>
            </div>
          </div>
          ${Pay.note ? `<p class="pay-note rv">${esc(Pay.note)}</p>` : ""}

          <div class="form-card rv up" id="enroll">
            <div id="formCard">
              <h2>${esc(C.form.title)}</h2>
              <form id="enrollForm" novalidate>
                <label class="full">আপনার নাম *<input name="name" required autocomplete="name"></label>
                <label>মোবাইল নম্বর *<input name="phone" required inputmode="tel" autocomplete="tel" placeholder="01XXXXXXXXX"></label>
                <label>হোয়াটসঅ্যাপ নম্বর<input name="whatsapp" inputmode="tel" placeholder="01XXXXXXXXX"></label>
                <label>পেমেন্ট মাধ্যম *<select name="method" required><option value="">বাছাই করুন</option><option>বিকাশ</option><option>নগদ</option><option>ব্যাংক</option></select></label>
                <label>টাকার পরিমাণ<input name="amount" inputmode="numeric" value="${esc(P.offer)}"></label>
                <label>যে নম্বর/একাউন্ট থেকে পাঠিয়েছেন *<input name="sender" required inputmode="tel"></label>
                <label>ট্রানজেকশন আইডি *<input name="trxid" required autocapitalize="characters"></label>
                <label class="full">মাদরাসা/একাডেমির নাম বা পেইজ লিংক (থাকলে)<input name="academy"></label>
                <label class="full">কিছু বলতে চাইলে<textarea name="note" rows="3"></textarea></label>
                <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
                <div class="full"><button class="btn lg block" type="submit">${esc(C.form.button)} ${I.arrow}</button><p class="form-msg" id="formMsg" role="status"></p></div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="foot">
      <div class="wrap foot-in">
        <a class="brand" href="#top">${logo}<span>${esc(S.brandName)}</span></a>
        ${socials.length ? `<div class="socials">${socials.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.platform)}" class="s-${esc(s.platform)}">${I[s.platform]}</a>`).join("")}</div>` : ""}
        ${S.phone ? `<a class="foot-phone" href="${telLink(S.phone)}">${I.phone} ${esc(S.phone)}</a>` : ""}
        <p>${esc(C.footer)}</p>
      </div>
    </footer>

    <div class="sticky" id="sticky">
      <div class="wrap sticky-in">
        <div class="st-l">${S.phone ? `<a href="${telLink(S.phone)}">${I.phone} কল করুন: <b>${esc(S.phone)}</b></a>` : ""}<p><b>৳${esc(P.offer)}</b><s>৳${esc(P.regular)}</s></p></div>
        <a class="btn" href="#enroll">${esc(H.cta)} ${I.arrow}</a>
      </div>
    </div>
    ${S.whatsapp ? `<a class="fab" href="${waLink(S.whatsapp)}" target="_blank" rel="noopener" aria-label="হোয়াটসঅ্যাপ">${I.whatsapp}</a>` : ""}`;

    wire(C, shots);
  }

  /* ---------- এনিমেশন ও ইন্টারঅ্যাকশন ---------- */
  function wire(C, shots) {
    const nav = $("#nav"), sticky = $("#sticky"), bar = $("#progress"), pricing = $("#enroll");

    // ট্যাব — যে সেকশনে আছেন সেটা হাইলাইট
    const tabLinks = $$("#tabs a");
    const tio = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      tabLinks.forEach((a) => {
        const on = a.dataset.t === e.target.id; a.classList.toggle("on", on);
        if (on) a.parentElement.scrollTo({ left: a.offsetLeft - 16, behavior: "smooth" });
      });
    }), { rootMargin: "-45% 0px -50% 0px" });
    // সব সেকশন দেখা হয় — যেটার ট্যাব নেই, সেখানে কোনো ট্যাব জ্বলবে না
    $$("main > section, main > div, #enroll").forEach((s) => tio.observe(s));

    // স্ক্রল: নেভ, প্রগ্রেস বার, নিচের বাটন
    let ticking = false;
    const onScroll = () => {
      ticking = false;
      const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
      nav.classList.toggle("scrolled", y > 20);
      bar.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
      const pr = pricing.getBoundingClientRect();
      sticky.classList.toggle("show", y > innerHeight * 0.6 && (pr.top > innerHeight || pr.bottom < 0));
      journey();
    };

    // "আমরা কী করব" — স্ক্রল করলে লাইন ভরে, ধাপগুলো একে একে টিক হয়, শেষে কনফেটি
    const jr = $("#journey"), jSteps = $$(".j-step", jr || document);
    let jDone = false;
    function journey() {
      if (!jr) return;
      const r = jr.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (innerHeight * 0.72 - r.top) / (r.height * 0.85)));
      jr.style.setProperty("--p", p);
      jSteps.forEach((s, i) => s.classList.toggle("done", p >= i / Math.max(1, jSteps.length - 1) - 0.02));
      if (p >= 0.99 && !jDone) { jDone = true; confetti(jSteps[jSteps.length - 1]); }
    }
    jSteps.forEach((s) => s.addEventListener("click", () => {
      jSteps.forEach((o) => o.classList.toggle("focus", o === s));
      if (s.classList.contains("goal")) confetti(s);
    }));

    // "২টার একটা হবেই" — দুই পথ পালাক্রমে জ্বলে, চাপ দিলে বেছে নেওয়া হয়
    const paths = $$(".path"), cta = $("#twoCta"), stamp = $("#stamp");
    let auto = null, picked = false;
    const light = (i) => paths.forEach((p) => p.classList.toggle("on", +p.dataset.i === i));
    if (paths.length > 1) {
      let k = 0;
      const sio = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) {
          stamp?.classList.add("slam");
          if (!auto && !picked && !reduce) auto = setInterval(() => light(k = (k + 1) % paths.length), 2400);
        } else if (auto) { clearInterval(auto); auto = null; }
      }, { threshold: 0.35 });
      sio.observe($("#two"));
      paths.forEach((p) => p.addEventListener("click", () => {
        picked = true; clearInterval(auto); auto = null;
        light(+p.dataset.i); paths.forEach((o) => o.classList.toggle("picked", o === p));
        $("#twoCtaTxt").textContent = `পথ ${bn(+p.dataset.i + 1)} — এটাই চাই, ভর্তি হব`;
        cta.classList.add("show"); confetti(p);
      }));
    }
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    requestAnimationFrame(onScroll); // নিচের সব কিছু তৈরি হওয়ার পর প্রথমবার চলবে

    // স্ক্রলে উঠে আসা
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      const c = e.target.querySelector("[data-count]"); if (c) countUp(c);
      io.unobserve(e.target);
    }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    $$(".rv").forEach((el) => io.observe(el));

    // ক্লাস খোলা/বন্ধ
    $$(".cls-top").forEach((b) => b.addEventListener("click", () => {
      const card = b.closest(".cls"), open = !card.classList.contains("open");
      card.classList.toggle("open", open); b.setAttribute("aria-expanded", open);
    }));

    // ইউটিউব — ক্লিক করলে চালু হবে
    document.addEventListener("click", (e) => {
      const p = e.target.closest(".yt-play"); if (!p) return;
      const f = p.closest(".yt-frame");
      f.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${p.dataset.yt}?autoplay=1&rel=0&playsinline=1" title="YouTube ভিডিও" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    });

    // কপি বাটন
    $$(".copy").forEach((b) => b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); } catch {
        const t = document.createElement("textarea"); t.value = b.dataset.copy; document.body.append(t); t.select(); document.execCommand("copy"); t.remove();
      }
      const s = $("span", b), old = s.textContent; b.classList.add("done"); s.textContent = "কপি হয়েছে";
      setTimeout(() => { b.classList.remove("done"); s.textContent = old; }, 1600);
    }));

    // গিফট কার্ড হালকা কাত (কম্পিউটারে)
    if (!reduce && matchMedia("(hover:hover)").matches) $$(".gift").forEach((g) => {
      g.addEventListener("pointermove", (e) => {
        const r = g.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        g.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
      });
      g.addEventListener("pointerleave", () => { g.style.transform = ""; });
    });

    // স্ক্রিনশট স্লাইডার + বড় করে দেখা
    const sc = $("#shots");
    if (sc) {
      $$(".shots-nav button").forEach((b) => b.addEventListener("click", () => sc.scrollBy({ left: +b.dataset.dir * sc.clientWidth * 0.8, behavior: "smooth" })));
      const lb = $("#lightbox"), img = $("img", lb), cnt = $(".lb-count", lb); let cur = 0;
      const show = (i) => { cur = (i + shots.length) % shots.length; img.src = shots[cur].image; cnt.textContent = `${bn(cur + 1)} / ${bn(shots.length)}`; };
      const close = () => { lb.hidden = true; document.body.style.overflow = ""; };
      $$(".shot", sc).forEach((s) => s.addEventListener("click", () => { show(+s.dataset.i); lb.hidden = false; document.body.style.overflow = "hidden"; }));
      $(".lb-close", lb).onclick = close;
      $(".lb-prev", lb).onclick = () => show(cur - 1);
      $(".lb-next", lb).onclick = () => show(cur + 1);
      lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
      addEventListener("keydown", (e) => { if (lb.hidden) return; if (e.key === "Escape") close(); if (e.key === "ArrowLeft") show(cur - 1); if (e.key === "ArrowRight") show(cur + 1); });
      let sx = 0; lb.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
      lb.addEventListener("touchend", (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); });
    }

    // কাউন্টডাউন
    const end = C.pricing.deadline ? new Date(C.pricing.deadline).getTime() : 0;
    const cd = $("#countdown");
    if (end && end > Date.now()) {
      cd.hidden = false;
      const parts = [["d", "দিন"], ["h", "ঘণ্টা"], ["m", "মিনিট"], ["s", "সেকেন্ড"]].filter(([k]) => k !== "d" || end - Date.now() >= 86400000);
      cd.innerHTML = `<p>অফার শেষ হতে বাকি</p><div>${parts.map(([k, l]) => `<span><b data-k="${k}">০০</b><small>${l}</small></span>`).join("")}</div>`;
      const tick = () => {
        const t = Math.max(0, end - Date.now()) / 1000;
        const v = { d: Math.floor(t / 86400), h: Math.floor(t / 3600) % (parts[0][0] === "d" ? 24 : 1e9), m: Math.floor(t / 60) % 60, s: Math.floor(t) % 60 };
        $("#promoCd").innerHTML = `শেষ হতে বাকি <b>${parts.map(([k, l]) => pad2(v[k]) + l.charAt(0)).join(" : ")}</b>`;
        $$("b", cd).forEach((b) => { const s = pad2(v[b.dataset.k]); if (b.textContent !== s) { b.textContent = s; b.classList.remove("flip"); void b.offsetWidth; b.classList.add("flip"); } });
        if (t <= 0) { clearInterval(timer); cd.hidden = true; }
      };
      tick(); const timer = setInterval(tick, 1000);
    }

    // ফর্ম
    const form = $("#enrollForm"), msg = $("#formMsg");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const phone = en(data.phone || "").replace(/\D/g, "").replace(/^88/, "");
      const need = [["name", "নাম"], ["phone", "মোবাইল নম্বর"], ["method", "পেমেন্ট মাধ্যম"], ["sender", "যে নম্বর থেকে পাঠিয়েছেন"], ["trxid", "ট্রানজেকশন আইডি"]];
      const miss = need.find(([k]) => !String(data[k] || "").trim());
      msg.className = "form-msg err";
      if (miss) { msg.textContent = `দয়া করে "${miss[1]}" দিন`; form.elements[miss[0]].focus(); return; }
      if (!/^01\d{9}$/.test(phone)) { msg.textContent = "সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (01XXXXXXXXX)"; form.elements.phone.focus(); return; }
      data.phone = phone;
      const btn = $("button[type=submit]", form); btn.disabled = true; msg.className = "form-msg"; msg.textContent = "পাঠানো হচ্ছে…";
      try {
        const r = await fetch("/api/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
        if (!r.ok) throw new Error(r.status);
        if (window.fbq) fbq("track", "Lead");
        // হোয়াটসঅ্যাপে তথ্যসহ মেসেজ — লেখা আগে থেকেই বসানো থাকবে, শুধু Send চাপতে হবে
        const L = { name: "নাম", phone: "মোবাইল", whatsapp: "হোয়াটসঅ্যাপ", method: "পেমেন্ট মাধ্যম", amount: "টাকা", sender: "যে নম্বর থেকে পাঠিয়েছি", trxid: "TrxID", academy: "একাডেমি/পেইজ", note: "নোট" };
        const txt = `আসসালামু আলাইকুম। আমি "${C.hero.title}" প্রোগ্রামে ভর্তি হতে চাই।\n\n` + Object.entries(L).filter(([k]) => data[k]).map(([k, l]) => `${l}: ${data[k]}`).join("\n");
        const wa = C.settings.whatsapp ? waLink(C.settings.whatsapp) + "?text=" + encodeURIComponent(txt) : "";
        $("#formCard").innerHTML = `<div class="success"><div class="ok">${I.check}</div><h2>সফলভাবে জমা হয়েছে</h2><p>${esc(C.form.success)}</p>
          ${wa ? `<p class="wa-step">শেষ ধাপ: হোয়াটসঅ্যাপে আপনার তথ্য পাঠিয়ে দিন <span id="waCount"></span></p>
          <a class="btn wa" id="waGo" href="${esc(wa)}" target="_blank" rel="noopener">${I.whatsapp} হোয়াটসঅ্যাপে পাঠান</a>` : ""}</div>`;
        if (wa) {
          // ৩ সেকেন্ড পর নিজে থেকেই হোয়াটসঅ্যাপ খুলবে (ব্লক হলে বাটন তো আছেই)
          let n = 3; const c = $("#waCount"); c.textContent = `(${bn(n)})`;
          const t = setInterval(() => { n--; c.textContent = n > 0 ? `(${bn(n)})` : ""; if (n <= 0) { clearInterval(t); location.href = wa; } }, 1000);
          $("#waGo").addEventListener("click", () => { clearInterval(t); c.textContent = ""; });
        }
      } catch {
        btn.disabled = false; msg.className = "form-msg err"; msg.textContent = "জমা হয়নি। ইন্টারনেট চেক করে আবার চেষ্টা করুন, অথবা সরাসরি কল করুন।";
      }
    });
  }

  // ছোট কনফেটি (রঙিন কাগজ ঝরে পড়া)
  function confetti(el) {
    if (reduce || !el) return;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 3;
    const colors = ["#ffc727", "#ffdb5c", "#ffffff", "#4f8cff", "#25d366"];
    for (let i = 0; i < 36; i++) {
      const c = document.createElement("i"); c.className = "cf";
      const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 130;
      c.style.cssText = `left:${cx}px;top:${cy}px;background:${colors[i % colors.length]};--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d - 60}px;--r:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * 0.08}s`;
      document.body.append(c); setTimeout(() => c.remove(), 1500);
    }
  }

  // সংখ্যা গুনে গুনে বাড়া (৯, ২৪/৭ ইত্যাদি)
  function countUp(el) {
    const raw = el.dataset.count, m = en(raw).match(/^(\D*)(\d+)(.*)$/);
    if (!m || reduce) return;
    const target = +m[2], isBn = /[০-৯]/.test(raw), t0 = performance.now(), dur = 1200;
    const f = (now) => {
      const p = Math.min(1, (now - t0) / dur), v = Math.round(target * (1 - Math.pow(1 - p, 3)));
      el.textContent = m[1] + (isBn ? bn(v) : v) + (isBn ? bn(m[3]) : m[3]);
      if (p < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }

  // ফেসবুক পিক্সেল (অ্যাডমিনে আইডি দিলে চালু হবে)
  function pixel(id) {
    if (!/^\d{6,20}$/.test(String(id || ""))) return;
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", id); fbq("track", "PageView");
  }

  /* ---------- শুরু ---------- */
  async function start() {
    let saved = {};
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
      const r = await fetch("/api/content", { signal: ctl.signal, cache: "no-store" }); clearTimeout(t);
      if (r.ok) saved = await r.json();
    } catch {}
    const C = merge(window.DEFAULT_CONTENT, saved);
    render(C);
    pixel(C.settings.pixelId);
    $("#loader").classList.add("done");
    setTimeout(() => $("#loader")?.remove(), 600);
    if (location.hash) setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView(), 60);
  }
  start();
})();
