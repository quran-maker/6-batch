// =========================================================
// অ্যাডমিন প্যানেল — ভর্তির তথ্য দেখা + পেইজের সবকিছু এডিট
// =========================================================
(function () {
  "use strict";
  const root = document.getElementById("root");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clone = (o) => JSON.parse(JSON.stringify(o));

  let auth = null;           // { phone, password }
  let C = null;              // এডিট হচ্ছে এমন কন্টেন্ট
  let dirty = false;
  let leads = [];
  const selected = new Set();
  let filter = { q: "", status: "" };

  function merge(def, val) {
    if (Array.isArray(def)) return Array.isArray(val) ? val : def;
    if (def && typeof def === "object") {
      const out = { ...def };
      if (val && typeof val === "object" && !Array.isArray(val)) for (const k of Object.keys(val)) out[k] = k in def ? merge(def[k], val[k]) : val[k];
      return out;
    }
    return val === undefined || val === null ? def : val;
  }
  const getP = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), C);
  function setP(path, v) {
    const ks = path.split("."); const last = ks.pop();
    const o = ks.reduce((o, k) => o[k], C); o[last] = v;
  }

  function toast(t, err) {
    const d = document.createElement("div"); d.className = "toast" + (err ? " err" : ""); d.textContent = t;
    document.body.append(d); setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 300); }, 2600);
  }

  async function api(action, extra = {}) {
    const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...auth, action, ...extra }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { if (action !== "login") logout(); throw new Error("লগইন মেয়াদ শেষ"); }
    if (!r.ok) throw new Error(j.error || r.status);
    return j;
  }

  /* ================= লগইন ================= */
  function loginView(err) {
    root.innerHTML = `<div class="login"><form id="lf">
      <h1>অ্যাডমিন প্যানেল</h1><p>লগইন করুন</p>
      <div class="stack">
        <label class="fl">মোবাইল নম্বর<input name="phone" inputmode="tel" required autocomplete="username"></label>
        <label class="fl">পাসওয়ার্ড<input name="password" type="password" required autocomplete="current-password"></label>
        <label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="remember" checked> এই ডিভাইসে মনে রাখুন</label>
        <button class="btn p big" style="width:100%">লগইন</button>
        <div class="bad" id="lerr">${err ? esc(err) : ""}</div>
      </div></form></div>`;
    $("#lf").onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      auth = { phone: f.get("phone"), password: f.get("password") };
      try {
        await api("login");
        try { (f.get("remember") ? localStorage : sessionStorage).setItem("adm", JSON.stringify(auth)); } catch {}
        boot();
      } catch { auth = null; $("#lerr").textContent = "নম্বর বা পাসওয়ার্ড ভুল"; }
    };
  }
  function logout() {
    try { localStorage.removeItem("adm"); sessionStorage.removeItem("adm"); } catch {}
    auth = null; loginView();
  }

  /* ================= মূল প্যানেল ================= */
  async function boot() {
    root.innerHTML = `<div class="empty">লোড হচ্ছে…</div>`;
    let saved = {};
    try { saved = await (await fetch("/api/content", { cache: "no-store" })).json(); } catch {}
    C = merge(clone(window.DEFAULT_CONTENT), saved);
    root.innerHTML = `
      <div class="top">
        <div class="in">
          <button class="menu-btn" id="menuBtn" aria-label="মেনু">${ICON.menu}</button>
          <h1>অ্যাডমিন প্যানেল</h1>
          <span class="dirty" id="dirtyTag"></span>
          <a class="btn sm" href="/" target="_blank">পেইজ দেখুন ↗</a>
          <button class="btn sm" id="logoutBtn">লগআউট</button>
        </div>
      </div>
      <div class="shell">
        <aside class="side" id="side">
          ${MENU.map(([g, items]) => `<div class="side-g">${g}</div>${items.map(([id, label, ic]) => `<a href="#${id}" data-sec="${id}"><span class="ic">${ICON[ic]}</span><span class="lb">${label}</span>${id === "leads" ? `<span class="cnt" id="leadCnt"></span>` : ""}</a>`).join("")}`).join("")}
        </aside>
        <main>
          <div class="card" id="leads"></div>
          <div class="card" id="wa"></div>
          <div id="editor"></div>
        </main>
      </div>
      <div class="scrim" id="scrim"></div>
      <div class="savebar"><div class="in">
        <span class="msg" id="saveMsg">${C.updated ? "শেষ সেভ: " + new Date(C.updated).toLocaleString("bn-BD") : "এখনো সেভ হয়নি (ডিফল্ট লেখা দেখাচ্ছে)"}</span>
        <button class="btn r sm" id="resetBtn">ডিফল্টে ফেরত</button>
        <button class="btn p big" id="saveBtn">সেভ করুন</button>
      </div></div>`;
    $("#logoutBtn").onclick = logout;
    // সাইডবার: যেটায় ক্লিক, শুধু সেটাই ডানে খুলবে
    $$("#side a").forEach((a) => a.onclick = (e) => { e.preventDefault(); showSec(a.dataset.sec); scrollTo(0, 0); });
    $("#menuBtn").onclick = () => document.body.classList.toggle("side-open");
    $("#scrim").onclick = () => document.body.classList.remove("side-open");
    $("#saveBtn").onclick = save;
    $("#resetBtn").onclick = async () => {
      if (!confirm("পেইজের সব লেখা শুরুর অবস্থায় ফিরে যাবে (ভর্তির তথ্য মুছবে না)। নিশ্চিত?")) return;
      try { await api("reset"); toast("ডিফল্টে ফেরত গেছে"); dirty = false; boot(); } catch (e) { toast("হয়নি: " + e.message, true); }
    };
    addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
    renderEditor();
    loadLeads();
    loadWa();
  }

  /* ================= হোয়াটসঅ্যাপ নোটিফিকেশন ================= */
  async function loadWa() {
    const box = $("#wa");
    let w = { on: false, phone: "", hasKey: false };
    try { w = (await api("waGet")).wa; } catch (e) { box.innerHTML = `<h2>হোয়াটসঅ্যাপ নোটিফিকেশন</h2><p class="bad">লোড হয়নি: ${esc(e.message)}</p>`; return; }
    box.innerHTML = `<h2>হোয়াটসঅ্যাপ নোটিফিকেশন ${w.on ? `<span class="st confirmed">চালু</span>` : `<span class="st new">বন্ধ</span>`}</h2>
      <p class="help">কেউ ভর্তি ফর্ম জমা দিলে তথ্যগুলো ওয়েবসাইটে (উপরের টেবিলে) সেভ হয়, আর সাথে সাথে আপনার হোয়াটসঅ্যাপেও মেসেজ চলে আসবে।<br>
      এছাড়া ফর্ম জমা দেওয়ার পর স্টুডেন্টের ফোনে হোয়াটসঅ্যাপ খুলে যায়, তার তথ্য লেখা অবস্থায় — সে Send চাপলেই আপনার কাছে আসে। (এটার জন্য “সেটিংস” এ হোয়াটসঅ্যাপ নম্বর থাকতে হবে।)</p>
      <details style="margin:10px 0 14px"><summary style="cursor:pointer;font-weight:700">অটো মেসেজ চালু করার নিয়ম (একবারই করতে হবে)</summary>
        <ol style="margin:8px 0 0 20px;line-height:1.9">
          <li><a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noopener">CallMeBot এর পেইজটা</a> খুলুন — সেখানে একটা হোয়াটসঅ্যাপ নম্বর দেওয়া আছে।</li>
          <li>সেই নম্বরটা ফোনে সেভ করে, আপনার হোয়াটসঅ্যাপ থেকে ওই পেইজে লেখা মেসেজটা পাঠান (<b>I allow callmebot to send me messages</b>)।</li>
          <li>কিছুক্ষণের মধ্যে আপনাকে একটা <b>APIKey</b> (কয়েকটা সংখ্যা) পাঠাবে। সেটা নিচে বসান।</li>
          <li>“সেভ ও টেস্ট মেসেজ” চাপুন — হোয়াটসঅ্যাপে টেস্ট মেসেজ এলে কাজ শেষ।</li>
        </ol>
        <p class="help" style="margin-top:6px">CallMeBot একটা ফ্রি সার্ভিস, শুধু নিজের নম্বরে মেসেজ পাঠায়। ভর্তির তথ্য এই সার্ভিসের মাধ্যমে আপনার কাছে যাবে।</p>
      </details>
      <form id="waf" class="stack" style="max-width:520px">
        <label style="display:flex;gap:8px;align-items:center;font-weight:700"><input type="checkbox" name="on" ${w.on ? "checked" : ""}> অটো মেসেজ চালু রাখুন</label>
        <div class="grid2">
          <label class="fl">যে নম্বরে মেসেজ আসবে<input name="waPhone" inputmode="tel" value="${esc(w.phone || "01724649947")}" placeholder="01XXXXXXXXX"></label>
          <label class="fl">APIKey<input name="apikey" inputmode="numeric" autocomplete="off" placeholder="${w.hasKey ? "সেভ করা আছে — বদলাতে চাইলে নতুনটা দিন" : "CallMeBot থেকে পাওয়া কোড"}"></label>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn p" name="test" value="1">সেভ ও টেস্ট মেসেজ</button><button class="btn" name="test" value="">শুধু সেভ</button></div>
      </form>`;
    $("#waf").onsubmit = async (e) => {
      e.preventDefault(); const f = new FormData(e.target); const test = !!(e.submitter && e.submitter.value);
      try {
        const r = await api("waSet", { on: !!f.get("on"), waPhone: f.get("waPhone"), apikey: f.get("apikey"), test });
        if (r.testError) toast("সেভ হয়েছে, কিন্তু টেস্ট মেসেজ যায়নি: " + r.testError, true);
        else toast(test && f.get("on") ? "সেভ হয়েছে ✓ হোয়াটসঅ্যাপ চেক করুন" : "সেভ হয়েছে ✓");
        loadWa();
      } catch (err) { toast(err.message === "wa-fields" ? "সঠিক নম্বর আর APIKey দিন" : "হয়নি: " + err.message, true); }
    };
  }

  /* ================= সাইডবার মেনু ================= */
  const MENU = [
    ["ভর্তি ও যোগাযোগ", [["leads", "ভর্তির তথ্য", "users"], ["wa", "হোয়াটসঅ্যাপ নোটিফিকেশন", "chat"]]],
    ["পেইজের অংশ", [["e-hero", "হিরো (উপরের অংশ)", "home"], ["e-classes", "ক্লাস", "book"], ["e-demo", "ডেমো ক্লাস", "play"],["e-includes", "যা পাচ্ছেন", "check"], ["e-gifts", "গিফট", "gift"],
      ["e-done", "আমরা কী করব", "steps"], ["e-shots", "স্ক্রিনশট রিভিউ", "image"], ["e-videos", "ভিডিও রিভিউ", "play"], ["e-price", "ফি ও অফার", "tag"],
      ["e-pay", "পেমেন্ট", "wallet"], ["e-more", "অন্যান্য লেখা", "text"], ["e-social", "সোশ্যাল লিংক", "link"]]],
    ["সেটিংস", [["e-settings", "সেটিংস", "gear"], ["e-json", "সব কন্টেন্ট (কপি)", "copy"], ["e-pass", "পাসওয়ার্ড", "lock"]]]
  ];
  const sv = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    menu: sv('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    users: sv('<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 9M22 21a7 7 0 0 0-4-6.3"/>'),
    chat: sv('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
    home: sv('<path d="M3 11 12 4l9 7M5 10v10h14V10"/>'),
    book: sv('<path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2.5zM20 19v3H6"/>'),
    check: sv('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>'),
    gift: sv('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>'),
    steps: sv('<circle cx="5" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h5v4M14 12h5v4"/>'),
    image: sv('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
    play: sv('<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>'),
    tag: sv('<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="8" cy="8" r="1.5"/>'),
    wallet: sv('<rect x="2" y="6" width="20" height="14" rx="3"/><path d="M16 13h2M2 10h20"/>'),
    text: sv('<path d="M4 6h16M4 12h16M4 18h10"/>'),
    link: sv('<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>'),
    gear: sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    copy: sv('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'),
    lock: sv('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>')
  };
  let sec = "leads";
  try { sec = localStorage.getItem("admSec") || "leads"; } catch {}
  function showSec(id) {
    if (!document.getElementById(id)) id = "leads";
    sec = id;
    $$("main .card").forEach((c) => c.classList.toggle("act", c.id === id));
    $$("#side a").forEach((a) => a.classList.toggle("on", a.dataset.sec === id));
    try { localStorage.setItem("admSec", id); } catch {}
    document.body.classList.remove("side-open");
  }

  function markDirty() { dirty = true; const t = $("#dirtyTag"); if (t) t.textContent = "● সেভ করা হয়নি"; }

  async function save() {
    const b = $("#saveBtn"); b.disabled = true; b.textContent = "সেভ হচ্ছে…";
    try {
      const r = await api("save", { content: C });
      C.updated = r.updated; dirty = false; $("#dirtyTag").textContent = "";
      $("#saveMsg").textContent = "শেষ সেভ: " + new Date(r.updated).toLocaleString("bn-BD");
      const j = $("#jsonBox"); if (j) j.value = JSON.stringify(C, null, 2);
      toast("সেভ হয়েছে ✓ পেইজে এখনই দেখা যাবে");
    } catch (e) { toast("সেভ হয়নি: " + e.message, true); }
    b.disabled = false; b.textContent = "সেভ করুন";
  }

  /* ================= ভর্তির তথ্য ================= */
  const COLS = [
    ["date", "তারিখ"], ["name", "নাম"], ["phone", "মোবাইল"], ["whatsapp", "হোয়াটসঅ্যাপ"], ["method", "মাধ্যম"],
    ["sender", "যে নম্বর থেকে"], ["trxid", "ট্রানজেকশন আইডি"], ["amount", "টাকা"], ["academy", "একাডেমি/পেইজ"], ["note", "মন্তব্য"], ["status", "স্ট্যাটাস"]
  ];
  const ST = { new: "নতুন", confirmed: "কনফার্মড", cancelled: "বাতিল" };
  const fmtDate = (d) => { try { return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return d; } };
  const cell = (l, k) => k === "date" ? fmtDate(l.date) : k === "status" ? ST[l.status] || l.status : (l.data?.[k] ?? "");

  async function loadLeads() {
    const box = $("#leads");
    box.innerHTML = `<h2>ভর্তির তথ্য</h2><p class="help">লোড হচ্ছে…</p>`;
    try { leads = (await api("leads")).leads || []; } catch (e) { box.innerHTML = `<h2>ভর্তির তথ্য</h2><p class="bad">লোড হয়নি: ${esc(e.message)}</p>`; return; }
    { const n = leads.filter((l) => l.status === "new").length, c = $("#leadCnt"); if (c) { c.textContent = n || ""; c.title = n ? `${n}টি নতুন ভর্তি` : ""; } }
    for (const k of [...selected]) if (!leads.some((l) => l.key === k)) selected.delete(k);
    renderLeads();
  }

  function visibleLeads() {
    const q = filter.q.trim().toLowerCase();
    return leads.filter((l) => (!filter.status || l.status === filter.status) && (!q || JSON.stringify(l.data).toLowerCase().includes(q)));
  }

  function asTSV(rows) {
    const clean = (v) => String(v ?? "").replace(/[\t\r\n]+/g, " ");
    return [COLS.map((c) => c[1]).join("\t"), ...rows.map((l) => COLS.map(([k]) => clean(cell(l, k))).join("\t"))].join("\n");
  }

  function renderLeads() {
    const box = $("#leads"); const rows = visibleLeads();
    const cnt = (s) => leads.filter((l) => l.status === s).length;
    const allSel = rows.length && rows.every((l) => selected.has(l.key));
    box.innerHTML = `
      <h2>ভর্তির তথ্য</h2>
      <p class="help">ফর্মে যারা তথ্য দিয়েছেন সবাই এখানে। টেবিল থেকে সরাসরি সিলেক্ট/কপি করতে পারবেন, অথবা “সব কপি” চাপলে Excel/Google Sheet এ পেস্ট করার মতো করে কপি হবে।</p>
      <div class="counts"><span>মোট: <b>${leads.length}</b></span><span>নতুন: <b>${cnt("new")}</b></span><span>কনফার্মড: <b>${cnt("confirmed")}</b></span><span>বাতিল: <b>${cnt("cancelled")}</b></span></div>
      <div class="tools">
        <input class="inp" id="lq" placeholder="খুঁজুন: নাম, নম্বর, ট্রানজেকশন আইডি…" value="${esc(filter.q)}">
        <select class="inp" id="ls"><option value="">সব স্ট্যাটাস</option>${Object.entries(ST).map(([k, v]) => `<option value="${k}" ${filter.status === k ? "selected" : ""}>${v}</option>`).join("")}</select>
        <button class="btn sm" id="lRefresh">↻ রিফ্রেশ</button>
      </div>
      <div class="tools">
        <b id="selCount">${selected.size} টি সিলেক্টেড</b>
        <button class="btn g sm" data-bulk="confirmed">কনফার্ম</button>
        <button class="btn sm" data-bulk="new">নতুন হিসেবে রাখুন</button>
        <button class="btn r sm" data-bulk="cancelled">বাতিল</button>
        <button class="btn r sm" id="lDel">ডিলিট</button>
        <button class="btn sm" id="copySel">সিলেক্টেড কপি</button>
        <button class="btn p sm" id="copyAll">সব কপি (${rows.length})</button>
      </div>
      ${rows.length ? `<div class="tbl-wrap"><table>
        <thead><tr><th><input type="checkbox" id="selAll" ${allSel ? "checked" : ""} title="সব সিলেক্ট"></th>${COLS.map((c) => `<th>${c[1]}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((l) => `<tr class="${selected.has(l.key) ? "sel" : ""}">
          <td><input type="checkbox" data-k="${esc(l.key)}" ${selected.has(l.key) ? "checked" : ""}></td>
          ${COLS.map(([k]) => {
            const v = cell(l, k);
            if (k === "phone" || k === "whatsapp") return `<td class="nowrap">${v ? `<a href="https://wa.me/88${esc(String(v).replace(/\D/g, "").replace(/^88/, ""))}" target="_blank" rel="noopener">${esc(v)}</a>` : ""}</td>`;
            if (k === "status") return `<td><span class="st ${esc(l.status)}">${esc(v)}</span></td>`;
            return `<td class="${k === "date" || k === "trxid" ? "nowrap" : ""}">${esc(v)}</td>`;
          }).join("")}
        </tr>`).join("")}</tbody></table></div>` : `<div class="empty">${leads.length ? "খোঁজার সাথে কিছু মেলেনি" : "এখনো কেউ ফর্ম পূরণ করেনি"}</div>`}
      <h3 style="margin:18px 0 6px;font-size:16px">সব তথ্য একসাথে (টেক্সট)</h3>
      <p class="help" style="margin:0 0 8px">বক্সে ক্লিক করলেই সব সিলেক্ট হবে — তারপর কপি করে যেকোনো জায়গায় পেস্ট করুন।</p>
      <textarea class="alltext" id="allText" readonly>${esc(asTSV(rows))}</textarea>`;

    $("#lq").oninput = (e) => { filter.q = e.target.value; const pos = e.target.selectionStart; renderLeads(); const n = $("#lq"); n.focus(); n.setSelectionRange(pos, pos); };
    $("#ls").onchange = (e) => { filter.status = e.target.value; renderLeads(); };
    $("#lRefresh").onclick = loadLeads;
    $("#allText").onclick = (e) => e.target.select();
    $("#selAll") && ($("#selAll").onchange = (e) => { rows.forEach((l) => e.target.checked ? selected.add(l.key) : selected.delete(l.key)); renderLeads(); });
    $$("tbody input[data-k]", box).forEach((c) => c.onchange = () => { c.checked ? selected.add(c.dataset.k) : selected.delete(c.dataset.k); c.closest("tr").classList.toggle("sel", c.checked); $("#selCount").textContent = selected.size + " টি সিলেক্টেড"; });
    const needSel = () => { if (!selected.size) { toast("আগে টিক দিয়ে সিলেক্ট করুন", true); return false; } return true; };
    $$("[data-bulk]", box).forEach((b) => b.onclick = async () => {
      if (!needSel()) return;
      try { await api("status", { keys: [...selected], status: b.dataset.bulk }); toast("আপডেট হয়েছে"); loadLeads(); } catch (e) { toast(e.message, true); }
    });
    $("#lDel").onclick = async () => {
      if (!needSel() || !confirm(`${selected.size} টি তথ্য চিরতরে মুছে যাবে, আর ফেরত আনা যাবে না। নিশ্চিত?`)) return;
      try { await api("delete", { keys: [...selected] }); selected.clear(); toast("মুছে ফেলা হয়েছে"); loadLeads(); } catch (e) { toast(e.message, true); }
    };
    const copy = async (txt) => { try { await navigator.clipboard.writeText(txt); toast("কপি হয়েছে ✓ এখন Excel/Sheet এ পেস্ট করুন"); } catch { const t = $("#allText"); t.value = txt; t.select(); document.execCommand("copy"); toast("কপি হয়েছে ✓"); } };
    $("#copyAll").onclick = () => copy(asTSV(rows));
    $("#copySel").onclick = () => { if (needSel()) copy(asTSV(leads.filter((l) => selected.has(l.key)))); };
  }

  /* ================= এডিটর হেল্পার ================= */
  const T = (p, label, o = {}) => {
    const v = getP(p) ?? "";
    const ph = o.ph ? ` placeholder="${esc(o.ph)}"` : "";
    const hint = o.hint ? ` <span class="sub">${esc(o.hint)}</span>` : "";
    return o.multi
      ? `<label class="fl">${label}${hint}<textarea data-p="${p}" rows="${o.rows || 3}"${ph}>${esc(v)}</textarea></label>`
      : `<label class="fl">${label}${hint}<input data-p="${p}" type="${o.type || "text"}" value="${esc(v)}"${ph}></label>`;
  };
  // এক লাইনে একটা — লিস্টের জন্য
  const L = (p, label, hint) => `<label class="fl">${label} <span class="sub">${esc(hint || "প্রতি লাইনে একটা")}</span><textarea data-lines="${p}" rows="${Math.max(3, (getP(p) || []).length + 1)}">${esc((getP(p) || []).join("\n"))}</textarea></label>`;
  const IMG = (p, label) => {
    const v = getP(p) || "";
    return `<div class="fl"><b style="font-size:14px;color:#3a4766">${label}</b><div class="imgf" style="margin-top:6px">
      <div class="thumb">${v ? `<img src="${esc(v)}" alt="">` : "কোনো ছবি নেই"}</div>
      <div class="ctl">
        <input class="inp" data-p="${p}" data-img value="${esc(v)}" placeholder="ছবির লিংক, অথবা নিচে আপলোড করুন">
        <div class="row">
          <label class="btn g sm" style="margin:0">ছবি আপলোড<input type="file" accept="image/*" data-upload="${p}" hidden></label>
          ${v ? `<button class="btn r sm" data-clearimg="${p}">ছবি সরান</button>` : ""}
        </div>
      </div></div></div>`;
  };
  const YT = (p, label) => {
    const v = getP(p) || ""; const y = ytId(v);
    return `<div>${T(p, label, { ph: "https://youtu.be/... অথবা youtube.com/shorts/..." })}
      <div class="yt-prev" data-ytprev="${p}">${v ? (y ? `<img src="https://i.ytimg.com/vi/${y}/mqdefault.jpg" alt="">✓ ভিডিও পাওয়া গেছে` : `<span class="bad">এটা ইউটিউব লিংক মনে হচ্ছে না</span>`) : ""}</div></div>`;
  };
  function ytId(u) { const m = String(u || "").match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/) || String(u || "").trim().match(/^([\w-]{11})$/); return m ? m[1] : ""; }

  // পুনরাবৃত্ত আইটেমের লিস্ট
  function LIST(p, label, itemHtml, blank) {
    const arr = getP(p) || [];
    return `<div data-list="${p}">${arr.map((_, i) => `<div class="item">
        <div class="item-head"><b>${label} ${i + 1}</b>
          <button class="btn sm" data-mv="${p}|${i}|-1" ${i === 0 ? "disabled" : ""} title="উপরে">↑</button>
          <button class="btn sm" data-mv="${p}|${i}|1" ${i === arr.length - 1 ? "disabled" : ""} title="নিচে">↓</button>
          <button class="btn r sm" data-rm="${p}|${i}">মুছুন</button>
        </div>${itemHtml(`${p}.${i}`, i)}</div>`).join("")}
      <button class="add" data-add="${p}" data-blank='${esc(JSON.stringify(blank))}'>+ নতুন ${label} যোগ করুন</button></div>`;
  }

  const SOCIAL = [["facebook", "ফেসবুক পেইজ"], ["youtube", "ইউটিউব"], ["whatsapp", "হোয়াটসঅ্যাপ"], ["messenger", "মেসেঞ্জার"], ["instagram", "ইনস্টাগ্রাম"], ["tiktok", "টিকটক"], ["telegram", "টেলিগ্রাম"], ["linkedin", "লিংকডইন"], ["website", "ওয়েবসাইট"]];

  /* ================= এডিটর ================= */
  function renderEditor() {
    const y = scrollY;
    $("#editor").innerHTML = `
    <div class="card" id="e-hero"><h2>হিরো (একদম উপরের অংশ)</h2><p class="help">পেইজ খুললেই প্রথমে যা দেখা যায়।</p>
      <div class="stack">
        <div class="grid2">${T("hero.badge", "ব্যাজ (লাল ডট সহ)")}${T("hero.kicker", "ছোট শিরোনাম")}</div>
        ${T("hero.title", "বড় শিরোনাম")}
        ${T("hero.subtitle", "নিচের লেখা", { multi: true })}
        ${T("hero.cta", "বাটনের লেখা")}
        ${YT("hero.videoUrl", "প্রোমো ভিডিও (ইউটিউব লিংক — না দিলে খালি থাকবে)")}
        ${IMG("hero.image", "অথবা একটা ছবি (ভিডিও না থাকলে দেখাবে)")}
        <b style="font-size:14px">সংখ্যার ঘর</b>
        ${LIST("hero.stats", "ঘর", (b) => `<div class="grid2">${T(b + ".num", "সংখ্যা")}${T(b + ".label", "লেখা")}</div>`, { num: "", label: "" })}
      </div></div>

    <div class="card" id="e-classes"><h2>ক্লাসসমূহ</h2><p class="help">প্রতিটা ক্লাসের শিরোনাম আর “আপনি যা শিখবেন” পয়েন্টগুলো।</p>
      <div class="stack">
        <div class="grid2">${T("classesTitle", "সেকশনের শিরোনাম")}${T("classesSubtitle", "উপরের ছোট লেখা")}</div>
        ${LIST("classes", "ক্লাস", (b) => `<div class="stack">${T(b + ".title", "ক্লাসের নাম")}${L(b + ".items", "যা শিখবেন")}</div>`, { title: "", items: [] })}
      </div></div>

    <div class="card" id="e-demo"><h2>ডেমো ক্লাস ${getP("demo.on") ? `<span class="st confirmed">পেইজে দেখাচ্ছে</span>` : `<span class="st new">লুকানো</span>`}</h2>
      <p class="help">ইউটিউব লিংক বসিয়ে নিচের সুইচ চালু করে সেভ করলে পেইজে “ডেমো ক্লাস” অংশ দেখাবে (ক্লাসের তালিকার ঠিক পরে)। সুইচ বন্ধ করলে লুকিয়ে যাবে — লিংকগুলো মুছবে না।</p>
      <div class="stack">
        <label class="switch"><input type="checkbox" data-p="demo.on" ${getP("demo.on") ? "checked" : ""}><span class="sw"></span><b>ডেমো ক্লাস পেইজে দেখান</b></label>
        <div class="grid2">${T("demo.title", "শিরোনাম")}${T("demo.subtitle", "নিচের ছোট লেখা")}</div>
        ${LIST("demo.videos", "ডেমো ক্লাস", (b) => `<div class="stack">${YT(b + ".url", "ইউটিউব লিংক")}${T(b + ".title", "ক্লাসের নাম (ঐচ্ছিক)", { ph: "যেমন: ফেসবুক পেইজ সেটাপ — লাইভ ডেমো" })}</div>`, { url: "", title: "" })}
      </div></div>

    <div class="card" id="e-includes"><h2>যা যা পাচ্ছেন</h2>
      <div class="stack">${T("includesTitle", "শিরোনাম")}${L("includes", "পয়েন্টগুলো")}</div></div>

    <div class="card" id="e-gifts"><h2>বোনাস গিফট</h2><p class="help">প্রতিটা গিফটের ছবি আপলোড করুন (বইয়ের কভার/মকআপ)। ছবি না দিলে গিফট আইকন দেখাবে।</p>
      <div class="stack">${T("bonusesTitle", "শিরোনাম")}
        ${LIST("bonuses", "গিফট", (b) => `<div class="stack"><div class="grid2">${T(b + ".title", "গিফটের নাম")}${T(b + ".tag", "ধরন", { ph: "পিডিএফ বই / ভিডিও" })}</div>${IMG(b + ".image", "গিফটের ছবি")}</div>`, { title: "", tag: "", image: "" })}
      </div></div>

    <div class="card" id="e-done"><h2>কোর্স না, প্রোগ্রাম + আমরা কী করব</h2>
      <div class="stack">
        <div class="grid2">${T("notCourse.line1", "কাটা দাগের লেখা")}${T("notCourse.line2", "বড় লেখা")}</div>
        ${T("doneTitle", "শিরোনাম")}${L("done", "ধাপগুলো")}
      </div></div>

    <div class="card" id="e-shots"><h2>স্ক্রিনশট রিভিউ</h2><p class="help">স্টুডেন্টদের মেসেজ/কমেন্টের স্ক্রিনশট। একটাও না থাকলে সেকশনটা পেইজে লুকানো থাকবে।</p>
      <div class="stack">
        <div class="grid2">${T("shotsTitle", "শিরোনাম")}${T("shotsSubtitle", "উপরের ছোট লেখা")}</div>
        <label class="btn g" style="display:inline-block">একসাথে অনেকগুলো স্ক্রিনশট আপলোড<input type="file" accept="image/*" multiple id="multiShots" hidden></label>
        ${LIST("screenshots", "স্ক্রিনশট", (b) => `<div class="stack">${IMG(b + ".image", "ছবি")}${T(b + ".caption", "ক্যাপশন (ঐচ্ছিক)")}</div>`, { image: "", caption: "" })}
      </div></div>

    <div class="card" id="e-videos"><h2>ভিডিও রিভিউ</h2><p class="help">শুধু ইউটিউব লিংক বসান — ভিডিও নিজে থেকেই পেইজে দেখাবে। Shorts লিংকও চলবে।</p>
      <div class="stack">
        <div class="grid2">${T("videosTitle", "উপরের ছোট লেখা")}${T("videosSubtitle", "শিরোনাম")}</div>
        ${LIST("videos", "ভিডিও", (b) => `<div class="stack">${YT(b + ".url", "ইউটিউব লিংক")}${T(b + ".title", "ভিডিওর নিচের লেখা (ঐচ্ছিক)", { ph: "যেমন: আব্দুল্লাহ ভাই, সিলেট" })}</div>`, { url: "", title: "" })}
      </div></div>

    <div class="card" id="e-price"><h2>ফি ও অফার</h2>
      <div class="stack">
        <div class="grid2">${T("pricing.regularLabel", "রেগুলার ফি লেখা")}${T("pricing.regular", "রেগুলার ফি (কাটা দাগ)", { hint: "টাকা লিখবেন না" })}</div>
        <div class="grid3">${T("pricing.offerLabel", "অফারের নাম")}${T("pricing.offerNote", "অফারের সময়")}${T("pricing.offer", "অফার মূল্য", { hint: "টাকা লিখবেন না" })}</div>
        ${T("pricing.deadline", "অফার শেষের সময় (কাউন্টডাউন)", { type: "datetime-local", hint: "খালি রাখলে কাউন্টডাউন দেখাবে না" })}
        <div class="grid2">${T("pricing.guaranteeTitle", "গ্যারান্টির শিরোনাম")}${T("pricing.guaranteeText", "গ্যারান্টির লেখা")}</div>
      </div></div>

    <div class="card" id="e-pay"><h2>পেমেন্ট তথ্য</h2>
      <div class="stack">
        <div class="grid2">${T("payment.mobileLabel", "মোবাইল ব্যাংকিং লেখা")}${T("payment.mobileNumber", "বিকাশ/নগদ নম্বর")}</div>
        <div class="grid2">${T("payment.accountName", "একাউন্ট নাম")}${T("payment.accountNo", "একাউন্ট নম্বর")}</div>
        <div class="grid2">${T("payment.bankName", "ব্যাংকের নাম")}${T("payment.bankBranch", "ব্রাঞ্চ")}</div>
        ${T("payment.note", "পেমেন্টের নিচের নির্দেশনা", { multi: true })}
      </div></div>

    <div class="card" id="e-more"><h2>অন্যান্য লেখা</h2>
      <div class="stack">
        ${T("outcomes.title", "“২টার একটা হবেই” শিরোনাম")}${L("outcomes.items", "দুইটা ফলাফল")}
        <div class="grid2">${T("support.title", "সাপোর্ট শিরোনাম")}${T("support.text", "সাপোর্টের লেখা")}</div>
        <div class="grid3">${T("form.title", "ফর্মের শিরোনাম")}${T("form.button", "ফর্মের বাটন")}${T("form.success", "জমা হলে যে লেখা দেখাবে")}</div>
        ${T("footer", "ফুটারের লেখা")}
      </div></div>

    <div class="card" id="e-social"><h2>সোশ্যাল মিডিয়া লিংক</h2><p class="help">পেইজের একদম নিচে আইকন হিসেবে দেখাবে। লিংক খালি থাকলে আইকন দেখাবে না।</p>
      ${LIST("social", "লিংক", (b) => `<div class="grid2"><label class="fl">প্ল্যাটফর্ম<select data-p="${b}.platform">${SOCIAL.map(([k, v]) => `<option value="${k}" ${getP(b + ".platform") === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>${T(b + ".url", "লিংক", { ph: "https://..." })}</div>`, { platform: "facebook", url: "" })}
    </div>

    <div class="card" id="e-settings"><h2>সেটিংস</h2>
      <div class="stack">
        <div class="grid2">${T("settings.brandName", "ব্র্যান্ড/প্রোগ্রামের নাম (উপরে বামে)")}${T("settings.phone", "যোগাযোগ নম্বর (ফুটারে)")}</div>
        <div class="grid2">${T("settings.whatsapp", "হোয়াটসঅ্যাপ নম্বর (সবুজ ভাসমান বাটন)", { hint: "খালি রাখলে বাটন থাকবে না" })}${T("settings.pixelId", "ফেসবুক পিক্সেল আইডি (ঐচ্ছিক)", { ph: "যেমন 1234567890" })}</div>
        ${IMG("settings.logo", "লোগো (না দিলে ডিফল্ট আইকন)")}
        <div class="grid2">${T("seo.title", "ব্রাউজার ট্যাব/শেয়ারের শিরোনাম")}${T("seo.description", "গুগল/শেয়ারের বর্ণনা", { multi: true, rows: 2 })}</div>
      </div></div>

    <div class="card" id="e-json"><h2>সব কন্টেন্ট একসাথে</h2><p class="help">পেইজের সব লেখা/লিংক এখানে খোলা অবস্থায় আছে। বক্সে ক্লিক করলে সব সিলেক্ট হবে — কপি করে ব্যাকআপ রাখতে পারেন। আগের ব্যাকআপ পেস্ট করে “এই লেখা বসান” চাপলে সব ফেরত আসবে।</p>
      <textarea class="alltext" id="jsonBox" spellcheck="false">${esc(JSON.stringify(C, null, 2))}</textarea>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" id="jsonCopy">সব কপি</button><button class="btn g sm" id="jsonApply">এই লেখা বসান</button></div>
    </div>

    <div class="card" id="e-pass"><h2>লগইন নম্বর ও পাসওয়ার্ড বদলান</h2>
      <form id="pf" class="stack" style="max-width:420px">
        <label class="fl">নতুন লগইন নম্বর<input name="newPhone" value="${esc(auth.phone)}" inputmode="tel"></label>
        <label class="fl">নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)<input name="newPassword" type="password" minlength="8" required autocomplete="new-password"></label>
        <button class="btn p">পাসওয়ার্ড বদলান</button>
      </form>
    </div>`;
    scrollTo(0, y);
    wireEditor();
    showSec(sec);
  }

  function wireEditor() {
    const ed = $("#editor");
    ed.oninput = (e) => {
      const t = e.target;
      if (t.dataset.p) {
        setP(t.dataset.p, t.type === "checkbox" ? t.checked : t.value); markDirty();
        const pv = ed.querySelector(`[data-ytprev="${t.dataset.p}"]`);
        if (pv) { const y = ytId(t.value); pv.innerHTML = t.value ? (y ? `<img src="https://i.ytimg.com/vi/${y}/mqdefault.jpg" alt="">✓ ভিডিও পাওয়া গেছে` : `<span class="bad">এটা ইউটিউব লিংক মনে হচ্ছে না</span>`) : ""; }
        if (t.dataset.img !== undefined) { const th = t.closest(".imgf").querySelector(".thumb"); th.innerHTML = t.value ? `<img src="${esc(t.value)}" alt="">` : "কোনো ছবি নেই"; }
      } else if (t.dataset.lines) {
        setP(t.dataset.lines, t.value.split("\n").map((s) => s.trim()).filter(Boolean)); markDirty();
      }
    };
    ed.onchange = (e) => { if (e.target.tagName === "SELECT" && e.target.dataset.p) { setP(e.target.dataset.p, e.target.value); markDirty(); } };
    ed.onclick = async (e) => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.add) {
        e.preventDefault(); const arr = getP(t.dataset.add); arr.push(JSON.parse(t.dataset.blank)); markDirty(); renderEditor();
        const items = $$(`[data-list="${t.dataset.add}"] > .item`); items[items.length - 1]?.scrollIntoView({ block: "center" });
      } else if (t.dataset.rm) {
        e.preventDefault(); const [p, i] = t.dataset.rm.split("|");
        if (!confirm("এটা মুছে ফেলবেন?")) return;
        getP(p).splice(+i, 1); markDirty(); renderEditor();
      } else if (t.dataset.mv) {
        e.preventDefault(); const [p, i, d] = t.dataset.mv.split("|"); const a = getP(p); const j = +i + +d;
        [a[+i], a[j]] = [a[j], a[+i]]; markDirty(); renderEditor();
      } else if (t.dataset.clearimg) {
        e.preventDefault(); setP(t.dataset.clearimg, ""); markDirty(); renderEditor();
      }
    };
    $$("[data-upload]", ed).forEach((inp) => inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      const lab = inp.parentElement; const old = lab.firstChild.textContent; lab.firstChild.textContent = "আপলোড হচ্ছে…";
      try { const url = await upload(f); setP(inp.dataset.upload, url); markDirty(); renderEditor(); toast("ছবি আপলোড হয়েছে — সেভ করতে ভুলবেন না"); }
      catch (e) { toast("আপলোড হয়নি: " + e.message, true); lab.firstChild.textContent = old; }
    });
    $("#multiShots").onchange = async (e) => {
      const files = [...e.target.files]; if (!files.length) return;
      let n = 0;
      for (const f of files) {
        toast(`আপলোড হচ্ছে ${++n}/${files.length}…`);
        try { C.screenshots.push({ image: await upload(f), caption: "" }); } catch (err) { toast(f.name + ": " + err.message, true); }
      }
      markDirty(); renderEditor(); toast("সব আপলোড হয়েছে — এখন সেভ করুন");
    };
    $("#jsonBox").onclick = (e) => { if (e.target.selectionStart === e.target.selectionEnd) e.target.select(); };
    $("#jsonCopy").onclick = async () => { const b = $("#jsonBox"); b.select(); try { await navigator.clipboard.writeText(b.value); } catch { document.execCommand("copy"); } toast("কপি হয়েছে ✓"); };
    $("#jsonApply").onclick = () => {
      try { const v = JSON.parse($("#jsonBox").value); C = merge(clone(window.DEFAULT_CONTENT), v); markDirty(); renderEditor(); toast("বসানো হয়েছে — এখন সেভ করুন"); }
      catch { toast("লেখাটা ঠিক ফরম্যাটে নেই", true); }
    };
    $("#pf").onsubmit = async (e) => {
      e.preventDefault(); const f = new FormData(e.target);
      try {
        await api("password", { newPhone: f.get("newPhone"), newPassword: f.get("newPassword") });
        auth = { phone: String(f.get("newPhone")).replace(/\D/g, "").replace(/^88/, ""), password: f.get("newPassword") };
        try { if (localStorage.getItem("adm")) localStorage.setItem("adm", JSON.stringify(auth)); else sessionStorage.setItem("adm", JSON.stringify(auth)); } catch {}
        e.target.reset(); toast("পাসওয়ার্ড বদলানো হয়েছে ✓");
      } catch (err) { toast(err.message === "short" ? "পাসওয়ার্ড কমপক্ষে ৮ অক্ষর" : err.message === "phone" ? "সঠিক মোবাইল নম্বর দিন" : "হয়নি: " + err.message, true); }
    };
  }

  // ছবি ছোট করে আপলোড (বড় ছবি ১৬০০px এ নামিয়ে আনে)
  async function upload(file) {
    let blob = file, type = file.type;
    if (!/^image\//.test(type)) throw new Error("ছবি নয়");
    if (type !== "image/gif") {
      const bmp = await createImageBitmap(file).catch(() => null);
      if (bmp) {
        const max = 1600, sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
        if (sc < 1 || file.size > 900 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(type)) {
          const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc);
          const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
          blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.86)); type = "image/jpeg";
        }
      }
    }
    if (blob.size > 4 * 1024 * 1024) throw new Error("ছবি ৪ MB এর বেশি");
    const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.onerror = rej; fr.readAsDataURL(blob); });
    const r = await api("upload", { type, data });
    return r.url;
  }

  /* ================= শুরু ================= */
  try { auth = JSON.parse(localStorage.getItem("adm") || sessionStorage.getItem("adm") || "null"); } catch {}
  if (auth) api("login").then(boot).catch(() => loginView()); else loginView();
})();
