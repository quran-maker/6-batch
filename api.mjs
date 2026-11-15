// =========================================================
// সার্ভার — Netlify Functions + Netlify Blobs (ফ্রি ডাটাবেস)
// এই কোড ব্রাউজারে যায় না, শুধু Netlify সার্ভারে চলে।
//  - পেইজের সব লেখা/ছবি/লিংক সংরক্ষণ (অ্যাডমিন প্যানেল থেকে এডিট)
//  - ভর্তি ফর্মের তথ্য জমা রাখা
//  - ছবি আপলোড
//  - অ্যাডমিন লগইন (মোবাইল নম্বর + পাসওয়ার্ড)
// =========================================================
import { getStore } from "@netlify/blobs";
import { createHash, randomBytes } from "node:crypto";

// শুরুর লগইন। প্যানেল থেকে পাসওয়ার্ড বদলালে নতুনটা ডাটাবেসে থাকে।
const ADMIN_PHONE = "01724649947";
const DEFAULT_HASH = "39b9faacaaf801a600b9b0bc9d56317af4ddfe7abedf17a0017530f769264ebe";

const IMG_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const STATUSES = ["new", "confirmed", "cancelled"];

const sha256 = (s) => createHash("sha256").update(String(s)).digest("hex");
const normPhone = (p) => String(p || "").replace(/\D/g, "").replace(/^88/, "");
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export function createApi(storeFor) {
  const site = () => storeFor("site");
  const leads = () => storeFor("leads");
  const imgs = () => storeFor("images");

  async function checkAdmin(body) {
    const auth = (await site().get("auth", { type: "json" })) || {};
    const phone = auth.phone || ADMIN_PHONE;
    const hash = auth.hash || DEFAULT_HASH;
    return normPhone(body.phone) === phone && sha256(body.password || "") === hash;
  }

  // ---------- হোয়াটসঅ্যাপ নোটিফিকেশন (CallMeBot — ফ্রি, শুধু নিজের নম্বরে) ----------
  // কনফিগ আলাদা জায়গায় থাকে, পাবলিক কন্টেন্টে যায় না (API key গোপন থাকে)।
  async function waConfig() { return (await site().get("wa", { type: "json" })) || {}; }
  async function sendWa(text, cfg) {
    cfg = cfg || (await waConfig());
    if (!cfg.on || !cfg.phone || !cfg.apikey) return { skipped: true };
    const phone = "+880" + normPhone(cfg.phone).replace(/^0/, "");
    const u = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(cfg.apikey)}`;
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(u, { signal: ctl.signal });
      const body = (await r.text()).slice(0, 300);
      // সফল হলে CallMeBot "Message queued" বা "sent" লেখে, না হলে কারণটা লেখে
      if (!r.ok || !/queued|sent/i.test(body)) throw new Error(body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || String(r.status));
      return { ok: true };
    } finally { clearTimeout(t); }
  }
  const FIELD_BN = { name: "নাম", phone: "মোবাইল", whatsapp: "হোয়াটসঅ্যাপ", method: "পেমেন্ট মাধ্যম", amount: "টাকা", sender: "যে নম্বর থেকে", trxid: "TrxID", academy: "একাডেমি/পেইজ", note: "নোট" };
  function leadText(d, date) {
    const lines = Object.entries(FIELD_BN).filter(([k]) => d[k]).map(([k, l]) => `${l}: ${d[k]}`);
    const when = new Date(date).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" });
    return `✅ নতুন ভর্তি\n\n${lines.join("\n")}\n\nসময়: ${when}`;
  }

  async function listLeads() {
    const s = leads();
    const { blobs } = await s.list();
    const items = await Promise.all(blobs.map(async (b) => {
      const v = await s.get(b.key, { type: "json" });
      return v ? { key: b.key, ...v } : null;
    }));
    return items.filter(Boolean).sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  return async function handler(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "");

    try {
      // ---------- পাবলিক ----------
      if (req.method === "GET" && path === "/api/content") {
        const c = await site().get("content", { type: "json" });
        return json(c || {});
      }

      if (req.method === "GET" && path.startsWith("/api/img/")) {
        const key = decodeURIComponent(path.slice("/api/img/".length));
        const r = await imgs().getWithMetadata(key, { type: "arrayBuffer" });
        if (!r) return new Response("Not found", { status: 404 });
        return new Response(r.data, { headers: { "Content-Type": r.metadata?.type || "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
      }

      if (req.method === "POST" && path === "/api/submit") {
        const body = await req.json().catch(() => ({}));
        const d = body.data;
        if (typeof d !== "object" || !d) return json({ error: "bad" }, 400);
        if (d.website) return json({ ok: true }); // বট ফাঁদ
        const data = {};
        for (const [k, v] of Object.entries(d).slice(0, 20)) data[String(k).slice(0, 40)] = String(v ?? "").trim().slice(0, 1000);
        if (!data.name || !/^01\d{9}$/.test(normPhone(data.phone))) return json({ error: "fields" }, 400);
        const key = `${Date.now()}-${randomBytes(4).toString("hex")}`;
        const date = new Date().toISOString();
        await leads().setJSON(key, { date, status: "new", data });
        // অ্যাডমিনের হোয়াটসঅ্যাপে সাথে সাথে খবর (চালু থাকলে)। না গেলেও ভর্তি সেভ থাকবে।
        await sendWa(leadText(data, date)).catch(() => {});
        return json({ ok: true });
      }

      // ---------- অ্যাডমিন ----------
      if (req.method === "POST" && path === "/api/admin") {
        const body = await req.json().catch(() => ({}));
        if (!(await checkAdmin(body))) return json({ error: "auth" }, 401);
        const a = body.action;

        if (a === "login") return json({ ok: true });

        if (a === "leads") return json({ ok: true, leads: await listLeads() });

        if (a === "status") {
          if (!STATUSES.includes(body.status)) return json({ error: "bad" }, 400);
          const keys = [].concat(body.keys || []).map(String);
          for (const k of keys) {
            const v = await leads().get(k, { type: "json" });
            if (v) { v.status = body.status; await leads().setJSON(k, v); }
          }
          return json({ ok: true });
        }

        if (a === "delete") {
          const keys = [].concat(body.keys || []).map(String);
          for (const k of keys) await leads().delete(k);
          return json({ ok: true });
        }

        if (a === "save") {
          const c = body.content;
          if (!c || typeof c !== "object") return json({ error: "bad" }, 400);
          if (JSON.stringify(c).length > 2_000_000) return json({ error: "too-big" }, 413);
          c.updated = new Date().toISOString();
          await site().setJSON("content", c);
          return json({ ok: true, updated: c.updated });
        }

        if (a === "reset") {
          await site().delete("content");
          return json({ ok: true });
        }

        if (a === "upload") {
          const ext = IMG_TYPES[body.type];
          if (!ext || typeof body.data !== "string") return json({ error: "type" }, 400);
          const buf = Buffer.from(body.data, "base64");
          if (buf.length > 4 * 1024 * 1024) return json({ error: "too-big" }, 413);
          const key = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
          await imgs().set(key, buf, { metadata: { type: body.type } });
          return json({ ok: true, url: "/api/img/" + key });
        }

        if (a === "waGet") {
          const c = await waConfig();
          return json({ ok: true, wa: { on: !!c.on, phone: c.phone || "", hasKey: !!c.apikey } });
        }

        if (a === "waSet") {
          const old = await waConfig();
          const cfg = { on: !!body.on, phone: normPhone(body.waPhone), apikey: String(body.apikey || "").trim() || old.apikey || "" };
          if (cfg.on && (!/^01\d{9}$/.test(cfg.phone) || !cfg.apikey)) return json({ error: "wa-fields" }, 400);
          await site().setJSON("wa", cfg);
          if (body.test && cfg.on) {
            try { await sendWa("✅ টেস্ট মেসেজ — ওয়েবসাইটের ভর্তি ফর্ম থেকে এখন থেকে এখানে মেসেজ আসবে।", cfg); }
            catch (e) { return json({ ok: true, testError: String(e.message || e) }); }
          }
          return json({ ok: true });
        }

        if (a === "password") {
          const np = String(body.newPassword || "");
          if (np.length < 8) return json({ error: "short" }, 400);
          const phone = normPhone(body.newPhone) || normPhone(body.phone);
          if (!/^01\d{9}$/.test(phone)) return json({ error: "phone" }, 400);
          await site().setJSON("auth", { phone, hash: sha256(np) });
          return json({ ok: true });
        }

        return json({ error: "action" }, 400);
      }

      return json({ error: "not-found" }, 404);
    } catch (e) {
      return json({ error: "server", message: String(e?.message || e) }, 500);
    }
  };
}

const handler = createApi((name) => getStore({ name, consistency: "strong" }));
export default handler;
export const config = { path: "/api/*" };
