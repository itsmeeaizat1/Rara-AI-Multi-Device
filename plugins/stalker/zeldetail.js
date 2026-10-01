// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .zeldetail — 7 endpoint ZelAPI kategori Details:
//   appstore | gmaps | googleplay | idnlive | speedtest | whatsapp | xiaomi
// 🔹 Hub: .zeldetail <kind> <query> — kind otomatis kedeteksi dari URL
// 🔹 Alias langsung: .zappstore .zgmaps .zplaystore .zidnlive
//   .zspeedtest .zchannel .zxiaomi
// 🔹 STRICT SATUAN: endpoint mati → error asli, no fallback.
// ═════════════════════════════════════════════

import {
  zeldetailDetail, ZEL_DETAIL_KINDS, findZelDetailKind, detectZelDetailKind,
  resolveGmapsShortlink, resolveAppstoreId,
  _setZelDetailHttpForTest, _setZelDetailKeyForTest, _setItunesHttpForTest, _setZelShortResolverForTest,
} from "../../src/scraper/zeldetail.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "zeldetail",
  alias: ["zappstore", "zgmaps", "zplaystore", "zidnlive", "zspeedtest", "zchannel", "zxiaomi", "zdetail"],
  category: "stalker",
  description: "Detail App Store, Play Store, GMaps, IDN Live, SpeedTest, Channel WA & produk Xiaomi",
  usage: ".zeldetail <kind> <query> | atau .zappstore <nama> .zchannel <link> dll",
  example: ".zchannel <link channel> | .zappstore whatsapp | .zidnlive <link idn.app>",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

const KIND_CMD = { appstore: "zappstore", gmaps: "zgmaps", googleplay: "zplaystore", idnlive: "zidnlive", speedtest: "zspeedtest", whatsapp: "zchannel", xiaomi: "zxiaomi" };
const CMD_KIND = Object.fromEntries(Object.entries(KIND_CMD).map(([k, v]) => [v, k]));

// ── helpers kecil ──
const v = (x) => (x === null || x === undefined || x === "") ? null : String(x).trim();
const short = (s, n = 400) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
};

// ── renderer per kind (defensif — field null diabaikan) ──
function renderAppstore(d) {
  const a = d?.data || {};
  const lines = [];
  if (v(a.title)) lines.push(`📱 ${a.title}`);
  if (v(a.developer)) lines.push(`👩‍💻 Developer: ${a.developer}`);
  const rate = [];
  if (a.rating !== null && a.rating !== undefined && a.rating !== "") rate.push(`⭐ ${a.rating}`);
  if (v(a.total_ratings)) rate.push(`${a.total_ratings} rating`);
  if (rate.length) lines.push(rate.join(" · "));
  if (v(a.price) && a.price !== "0") lines.push(`💰 ${a.price}`);
  if (v(a.genre)) lines.push(`📂 ${a.genre}`);
  if (v(a.version)) lines.push(`🔢 Versi ${a.version}`);
  if (v(a.size)) lines.push(`💾 ${a.size}`);
  if (v(a.url) || v(a.link)) lines.push(`🔗 ${v(a.url) || v(a.link)}`);
  if (v(a.description)) lines.push(`\n📝 ${short(a.description)}`);
  return lines.length ? lines.join("\n") : null;
}

function renderPlaystore(d) {
  const a = d?.data || {};
  const lines = [];
  if (v(a.title)) lines.push(`📱 ${a.title}`);
  if (v(a.developer)) lines.push(`👩‍💻 Developer: ${a.developer}`);
  const rate = [];
  if (a.rating !== null && a.rating !== undefined && a.rating !== "") rate.push(`⭐ ${a.rating}`);
  if (v(a.total_reviews)) rate.push(`${a.total_reviews}`);
  if (rate.length) lines.push(rate.join(" · "));
  if (v(a.downloads)) lines.push(`⬇️ ${a.downloads}`);
  if (v(a.updated)) lines.push(`🔄 Update: ${a.updated}`);
  if (v(a.size)) lines.push(`💾 ${a.size}`);
  if (v(a.version)) lines.push(`🔢 Versi ${a.version}`);
  if (v(a.price) && a.price !== "0") lines.push(`💰 ${a.price}`);
  if (v(a.developer_link)) lines.push(`🔗 play.google.com${a.developer_link}`);
  if (v(a.description)) lines.push(`\n📝 ${short(a.description)}`);
  return lines.length ? lines.join("\n") : null;
}

function renderGmaps(d) {
  const a = d?.result || {};
  const lines = [];
  if (v(a.name)) lines.push(`📍 ${a.name}`);
  const addr = v(a.address?.full) || v(a.address?.road) || v(a.address?.village);
  if (addr) lines.push(`🏠 ${addr}`);
  const comp = a.address?.components;
  if (Array.isArray(comp) && comp.length) lines.push(`🧩 ${comp.slice(0, 4).join(", ")}`);
  const rate = [];
  if (a.rating !== null && a.rating !== undefined && a.rating !== "") rate.push(`⭐ ${a.rating}`);
  if (v(a.review_count)) rate.push(`${a.review_count} ulasan`);
  if (rate.length) lines.push(rate.join(" · "));
  if (v(a.category)) lines.push(`📂 ${a.category}`);
  if (v(a.open_status)) lines.push(`🚪 ${a.open_status}`);
  if (v(a.price_level)) lines.push(`💰 ${a.price_level}`);
  if (v(a.phone)) lines.push(`☎️ ${a.phone}`);
  if (v(a.website)) lines.push(`🔗 ${a.website}`);
  const c = a.coordinates;
  if (c && (v(c.lat) || v(c.latitude))) lines.push(`🌐 ${v(c.lat) || v(c.latitude)}, ${v(c.lng) || v(c.longitude) || "-"}`);
  return lines.length ? lines.join("\n") : null;
}

function renderIdnlive(d) {
  const cr = d?.creator || {};
  const lines = [];
  if (v(d?.title)) lines.push(`📺 ${d.title}`);
  if (v(cr.name)) lines.push(`👤 ${cr.name}${v(cr.username) ? " (@" + cr.username + ")" : ""}`);
  if (cr?.followers !== null && cr?.followers !== undefined) lines.push(`👥 ${cr.followers} followers`);
  if (v(d?.category)) lines.push(`📂 ${d.category}`);
  const st = v(d?.status) || "live";
  if (st === "scheduled" || st === "upcoming") lines.push(`📅 Terjadwal${v(d?.started_at) ? " — " + d.started_at : ""}`);
  else if (v(d?.started_at)) lines.push(`🎬 Mulai: ${d.started_at}`);
  if (v(d?.view_count)) lines.push(`👁️ ${d.view_count} penonton`);
  if (v(d?.playback_url)) lines.push(`▶️ ${d.playback_url}`);
  if (v(d?.image_url)) lines.push(`🖼️ ${d.image_url}`);
  if (v(d?.source_url)) lines.push(`🔗 ${d.source_url}`);
  return lines.length ? lines.join("\n") : null;
}

function renderSpeedtest(d) {
  const a = d?.data || {};
  const lines = [];
  if (v(a.id)) lines.push(`🆔 ${a.id}`);
  const any = ["ping", "download", "upload"].some((k) => a[k] !== null && a[k] !== undefined && a[k] !== "");
  if (any) lines.push(`⚡ ${v(a.download) || "-"} ⬇️ · ${v(a.upload) || "-"} ⬆️ · ping ${v(a.ping) || "-"}`);
  if (v(a.isp)) lines.push(`🏢 ISP: ${a.isp}`);
  if (v(a.date)) lines.push(`📅 ${a.date}`);
  if (v(a.url)) lines.push(`🔗 ${a.url}`);
  if (!any && !v(a.isp) && !v(a.date)) return `Hasil speedtest ${a.id || "?"} gak ada datanya (mungkin udah kedaluwarsa)`;
  return lines.join("\n");
}

function renderChannel(d) {
  const ch = d?.channel || {};
  const lines = [];
  if (v(ch.name)) lines.push(`📢 ${ch.name}`);
  if (v(ch.handle)) lines.push(` @${String(ch.handle).replace(/^@/, "")}`);
  if (v(ch.followers)) lines.push(`👥 ${ch.followers}`);
  if (v(ch.bio)) lines.push(`\n📝 ${short(ch.bio, 300)}`);
  if (v(ch.id)) lines.push(`\n🆔 ${ch.id}`);
  if (v(ch.invite_url)) lines.push(`🔗 ${ch.invite_url}`);
  return lines.length ? lines.join("\n") : null;
}

function renderXiaomi(d) {
  const p = d?.product || {};
  const spec = d?.specifications || {};
  const lines = [];
  if (v(p.name)) lines.push(`📱 ${p.name}`);
  if (v(p.price)) lines.push(`💰 ${p.price}`);
  if (v(p.description)) lines.push(`\n📝 ${short(p.description, 350)}`);
  const kf = spec.key_features;
  if (Array.isArray(kf) && kf.length) lines.push(`\n✨ ${kf.slice(0, 5).join(" · ")}`);
  const pr = spec.processor;
  if (pr && (v(pr.chip) || v(pr.cpu_speed))) lines.push(`🧠 ${v(pr.chip) || "-"}${v(pr.cpu_speed) ? " · " + pr.cpu_speed : ""}`);
  const b = spec.battery;
  if (b && (v(b.capacity) || v(b.charging))) lines.push(`🔋 ${v(b.capacity) || "-"}${v(b.charging) ? " · " + b.charging : ""}`);
  const disp = spec.display;
  if (disp && (v(disp.size) || v(disp.resolution))) lines.push(`🖥️ ${v(disp.size) || "-"}${v(disp.resolution) ? " · " + disp.resolution : ""}`);
  const cam = spec.camera;
  if (cam) {
    const cparts = [v(cam.main), v(cam.ultra_wide), v(cam.macro), v(cam.depth)].filter(Boolean);
    if (cparts.length) lines.push(`📷 ${cparts.join(" · ")}`);
  }
  if (v(d?.source_url)) lines.push(`🔗 ${d.source_url}`);
  return lines.length ? lines.join("\n") : null;
}

const RENDER = { appstore: renderAppstore, googleplay: renderPlaystore, gmaps: renderGmaps, idnlive: renderIdnlive, speedtest: renderSpeedtest, whatsapp: renderChannel, xiaomi: renderXiaomi };

// ── value akhir per kind (resolve sebelum kirim) ──
async function resolveValue(kind, raw) {
  const s = raw.trim();
  if (kind === "appstore") return resolveAppstoreId(s);
  if (kind === "gmaps") {
    const r = await resolveGmapsShortlink(s);
    return r.ok ? { ok: true, value: r.url, via: "url" } : r;
  }
  if (kind === "googleplay") {
    if (/play\.google\.com/.test(s)) {
      const m = s.match(/\/(?:store\/apps\/details\?id=|apps\/details\?id=)([a-zA-Z0-9._]+)/) || s.match(/[?&]id=([a-zA-Z0-9._]+)/);
      if (m) return { ok: true, value: m[1], via: "link" };
      return { ok: false, error: "Link Play Store gak punya id package — copy link lengkap dari halaman app" };
    }
    if (/^[a-zA-Z][a-zA-Z0-9._]*\.[a-zA-Z0-9._]+$/.test(s)) return { ok: true, value: s, via: "package" };
    return { ok: false, error: "Butuh package (contoh: com.whatsapp) atau link play.google.com" };
  }
  if (kind === "idnlive") {
    if (!/idn\.app/.test(s)) return { ok: false, error: "Butuh link dari domain idn.app (contoh: https://www.idn.app/jkt48-official/live/xxx)" };
    return { ok: true, value: s, via: "url" };
  }
  if (kind === "whatsapp") {
    if (!/whatsapp\.com\/channel/.test(s)) return { ok: false, error: "Butuh link channel WhatsApp (whatsapp.com/channel/xxxx)" };
    return { ok: true, value: s, via: "url" };
  }
  if (kind === "xiaomi") {
    if (!/mi\.com/.test(s)) return { ok: false, error: "Butuh link produk mi.com (contoh: https://www.mi.com/id/product/redmi-note-14)" };
    return { ok: true, value: s, via: "url" };
  }
  if (kind === "speedtest") {
    const m = s.match(/result\/(?:c\/)?([0-9a-zA-Z]+)/);
    if (m) return { ok: true, value: m[1], via: "link" };
    if (/^\d{5,}$/.test(s)) return { ok: true, value: s, via: "id" };
    return { ok: false, error: "Butuh id hasil speedtest.net (angka) atau link speedtest.net/result/xxx" };
  }
  return { ok: true, value: s, via: "raw" };
}

function usageCard(prefix) {
  const rows = Object.entries(ZEL_DETAIL_KINDS).map(([k, s]) => `▸ ${KIND_CMD[k]} — ${s.label}`);
  return [
    "🔍 ZELAPI DETAILS — 7 pencarian detail:",
    "",
    ...rows,
    "",
    `cara: ${prefix}zeldetail <kind> <query> — atau langsung .zappstore <nama> / .zchannel <link> dll`,
    `contoh: ${prefix}zappstore whatsapp · ${prefix}zchannel <link channel> · ${prefix}zidnlive <link idn.app>`,
  ].join("\n");
}

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map(String);
    const command = String(m.command || "").toLowerCase();
    let kind = CMD_KIND[command] || null;           // alias langsung
    let rest = args.join(" ").trim();
    if (!kind) {
      // hub .zeldetail — kind dari args[0] atau deteksi URL
      const k0 = findZelDetailKind(args[0]);
      if (k0) { kind = k0; rest = args.slice(1).join(" ").trim(); }
      else {
        const det = detectZelDetailKind(rest);
        if (det) { kind = det; }
        else if (!rest) { await m.reply(raraWrap("zeldetail", usageCard(m.prefix))); return; }
        else {
          await m.reply(raraWrap("zeldetail", [
            `Gak tau harus cari apa dari "${short(rest, 60)}" 😅`,
            "",
            `ketik ${m.prefix}zeldetail buat liat 7 pencarian yang ada`,
          ].join("\n")));
          return;
        }
      }
    }
    if (!rest) {
      await m.reply(raraWrap("zeldetail", [
        `${ZEL_DETAIL_KINDS[kind].label} — detail dari zelapi`,
        "",
        `cara pakai: ${ZEL_DETAIL_KINDS[kind].hint}`,
        "",
        `contoh: ${m.prefix}${KIND_CMD[kind]} <query>`,
      ].join("\n")));
      return;
    }

    await m.react("🧠");

    // resolve value → id/url final
    const rv = await resolveValue(kind, rest);
    if (!rv.ok) { await m.react("❌"); await m.reply(raraWrap("zeldetail", rv.error)); return; }
    let value = rv.value;
    if (kind === "appstore" && rv.appId) value = rv.appId;

    const r = await zeldetailDetail(kind, value);
    if (!r.ok) { await m.react("❌"); await m.reply(raraWrap("zeldetail", `Endpoint ${kind} bermasalah: ${r.error}`)); return; }

    const body = RENDER[kind](r.data);
    if (!body) { await m.react("❌"); await m.reply(raraWrap("zeldetail", `Data ${ZEL_DETAIL_KINDS[kind].label} kosong — coba link/id lain`)); return; }

    await m.reply(raraWrap("zeldetail", [
      `✅ ${ZEL_DETAIL_KINDS[kind].label}`,
      "",
      body,
      "",
      `via ${r.url} · ${rv.via === "search" ? "ditemukan via pencarian nama" : "input " + rv.via}`,
    ].join("\n")));
    await m.react("🐣");
  } catch (e) {
    try { await m.react("❌"); } catch {}
    await m.reply(raraWrap("zeldetail", `fitur error: ${e?.message || e}`));
  }
}

export default { pluginConfig, handler, command: pluginConfig.name };
export { pluginConfig as config, handler };
export { _setZelDetailHttpForTest, _setZelDetailKeyForTest, _setItunesHttpForTest, _setZelShortResolverForTest };
