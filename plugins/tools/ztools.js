// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .ztools — 6 tools ZelAPI yang hidup (kategori /tools, disweep live 15 Sep 2026):
//   .zcode <js>       — Code Runner (sandbox Node v24 + axios/cheerio prebundled)
//   .zobfuscate <js>  — JS Obfuscator
//   .zconvert <toesm|tocjs> <js> — ESM ↔ CJS converter
//   .zdomain <domain> — Domain/IP lookup (geo, ISP, ASN)
//   .zsource <url>    — Source HTML situs (dikirim sebagai file .txt)
//   .zwebtest <url>   — Website Speed Test (DebugBear, device mobile/desktop)
// 🔹 Endpoint zelapi lain mati server-side / duplikat fitur bot — gak dipasang.
// 🔹 STRICT SATUAN: error asli, no fallback.
// ═════════════════════════════════════════════

import {
  zelToolCall, ZEL_TOOLS_KINDS, ZEL_CONVERT_TYPES,
  _setZelToolsHttpForTest, _setZelToolsKeyForTest,
} from "../../src/scraper/zeltools.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ztools",
  alias: ["zcode", "zobfuscate", "zesmcjs", "zconvert", "zdomain", "zsource", "zwebtest", "zspeedweb"],
  category: "tools",
  description: "ZelAPI Tools — sandbox kode, obfuscator, domain lookup, source situs, web speed test",
  usage: ".ztools — daftar | .zcode <js> | .zdomain <domain> | .zsource <url> | .zwebtest <url>",
  example: ".zcode console.log(1+1)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

const v = (x) => (x === null || x === undefined || x === "") ? null : String(x).trim();
const short = (s, n = 400) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
};

// kode dari args, atau reply pesan kode
function getCodeInput(m, args) {
  const fromArgs = args.join(" ").trim();
  if (fromArgs) return fromArgs;
  const q = m.quoted || m.quote || m.quotedMsg;
  if (q && (typeof q.text === "string" || typeof q === "string")) {
    const t = String(typeof q === "string" ? q : q.text).trim();
    if (t) return t;
  }
  return "";
}

function usageCard() {
  return raraWrap("ztools", [
    "🧰 ZELAPI TOOLS — 6 tool hidup:",
    "",
    "▸ .zcode <kode js> — jalanin kode di sandbox (Node v24, axios/cheerio tersedia); reply pesan kode juga bisa",
    "▸ .zobfuscate <kode js> — obfuscate kode jadi susah dibaca",
    "▸ .zconvert <toesm|tocjs> <kode> — konversi module ESM ↔ CJS",
    "▸ .zdomain <domain> — info domain: IP, ISP, lokasi, ASN",
    "▸ .zsource <url> — ambil source HTML situs (file .txt)",
    "▸ .zwebtest <url> [mobile|desktop] — tes kecepatan website",
    "",
    "endpoint zelapi lain mati server-side atau udah ada fitur lain — gak dipasang.",
  ].join("\n"));
}

// ── renderer ──
function cardCode(d) {
  const r = d?.result || {};
  const lines = [];
  const outs = Array.isArray(r.output) ? r.output : [];
  for (const o of outs) {
    if (typeof o === "string") lines.push(o);
    else if (o?.text !== undefined) lines.push(`${o.type === "error" ? "⛔" : "📤"} ${o.text}`);
  }
  if (!lines.length && v(d?.message)) lines.push(d.message);
  if (v(r.executionTime)) lines.push("", `⏱️ ${r.executionTime}ms`);
  const dbg = r.__debug?.nodeVersion;
  if (dbg) lines.push(`⚙️ ${dbg}`);
  return lines.length ? lines.join("\n") : "Gak ada output.";
}

function cardDomain(d) {
  const lines = [];
  if (v(d.domain)) lines.push(`🌐 ${d.domain}`);
  if (v(d.ip)) lines.push(`🔌 ${d.ip}${v(d.type) ? " (" + d.type + ")" : ""}`);
  const org = v(d.org) || v(d.isp);
  if (org) lines.push(`🏢 ${org}`);
  const loc = [v(d.city), v(d.region), v(d.country)].filter(Boolean).join(", ");
  if (loc) lines.push(`📍 ${loc}`);
  if (v(d.timezone?.id)) lines.push(`🕰️ ${d.timezone.id} (UTC${d.timezone.utc || ""})`);
  if (v(d.asn)) lines.push(`🏷️ ASN ${d.asn}`);
  if (v(d.location_url)) lines.push(`🗺️ ${d.location_url}`);
  return lines.length ? lines.join("\n") : null;
}

function cardSource(d) {
  const lines = [];
  if (v(d.title)) lines.push(`📄 ${d.title}`);
  if (v(d.url)) lines.push(`🔗 ${short(d.url, 120)}`);
  const html = typeof d.html === "string" ? d.html : "";
  lines.push(`📊 ${html.length.toLocaleString("id-ID")} karakter HTML`);
  if (html) lines.push("", "👀 cuplikan:", short(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "), 220));
  return { card: lines.join("\n"), html };
}

function cardWebtest(d) {
  const rj = d?.result?.result?.resultJson || {};
  const ps = rj?.perfSummary || {};
  const dt = ps?.docTiming || {};
  const rm = ps?.requestMetrics || {};
  const pm = rj?.lhData?.performanceMetrics || {};
  const meta = rj?.meta || {};
  const ms = (x) => (x === null || x === undefined || x === "" || isNaN(Number(x))) ? null : Math.round(Number(x)) + "ms";
  const lines = [`${v(d.device) || v(meta.formFactor) || "?"} · region ${v(meta.region) || "?"}`];
  const row = [];
  if (ms(dt.dns)) row.push(`DNS ${ms(dt.dns)}`);
  if (ms(dt.tcp)) row.push(`TCP ${ms(dt.tcp)}`);
  if (ms(dt.ssl)) row.push(`SSL ${ms(dt.ssl)}`);
  if (ms(dt.ttfb)) row.push(`TTFB ${ms(dt.ttfb)}`);
  if (row.length) lines.push("🔌 " + row.join(" · "));
  const row2 = [];
  if (ms(pm.firstContentfulPaint)) row2.push(`FCP ${ms(pm.firstContentfulPaint)}`);
  const lcp = Array.isArray(rj?.lcps) && rj.lcps[0] ? ms(rj.lcps[0].loadTime || rj.lcps[0].startTime) : null;
  if (lcp) row2.push(`LCP ${lcp}`);
  if (ms(dt.duration)) row2.push(`Load ${ms(dt.duration)}`);
  if (row2.length) lines.push("⚡ " + row2.join(" · "));
  const req = v(rm.requestCount);
  if (req) {
    const kb = v(rm.totalEncodedBodyLength) ? ` · ${(Number(rm.totalEncodedBodyLength) / 1024).toFixed(1)}KB` : "";
    lines.push(`📦 ${req} request${kb}`);
  }
  if (v(d.status) && d.status !== "completed") lines.unshift(`⚠️ status: ${d.status}`);
  return lines.join("\n");
}

async function handler(m, { sock }) {
  try {
    const command = String(m.command || "").toLowerCase();
    const args = (m.args || []).map(String);
    if (command === "ztools") return m.reply(usageCard());

    let kind = null;
    if (command === "zcode") kind = "code";
    else if (command === "zobfuscate") kind = "obfuscate";
    else if (command === "zconvert" || command === "zesmcjs") kind = "convert";
    else if (command === "zdomain") kind = "domain";
    else if (command === "zsource") kind = "source";
    else if (command === "zwebtest" || command === "zspeedweb") kind = "webtest";
    if (!kind) return m.reply(usageCard());

    let params = {};
    if (kind === "convert") {
      const t = (args[0] || "").toLowerCase();
      if (!ZEL_CONVERT_TYPES.includes(t)) {
        return m.reply(raraWrap("ztools", "Format salah — pakai: *.zconvert toesm* atau *.zconvert tocjs* diikuti kode (atau reply pesan kode)"));
      }
      params = { type: t, code: args.slice(1).join(" ").trim() || getCodeInput(m, []) };
    } else if (kind === "domain") {
      params = { q: args.join(" ").trim() };
    } else if (kind === "source") {
      params = { url: args.join(" ").trim() };
    } else if (kind === "webtest") {
      const device = (args[1] || "").toLowerCase() === "desktop" ? "desktop" : "mobile";
      params = { url: args[0] || "", device };
    } else {
      params = { code: getCodeInput(m, args) };
    }

    await m.react("🧠");
    const r = await zelToolCall(kind, params);
    if (!r.ok) {
      await m.react("❌");
      return m.reply(raraWrap("ztools", `${ZEL_TOOLS_KINDS[kind].label} bermasalah: ${r.error}`));
    }
    const d = r.data;

    if (kind === "code") {
      await m.reply(raraWrap("ztools", "✅ CODE RUNNER (zelapi)\n\n" + cardCode(d)));
    } else if (kind === "obfuscate" || kind === "convert") {
      const out = typeof d?.result === "string" ? d.result : (typeof d?.result === "object" && d.result ? JSON.stringify(d.result) : null);
      if (!out) { await m.react("❌"); return m.reply(raraWrap("ztools", "Output kosong dari zelapi")); }
      const label = kind === "obfuscate" ? "OBFUSCATED CODE" : "CONVERTED CODE (" + params.type + ")";
      if (out.length <= 3500) {
        await m.reply(raraWrap("ztools", `✅ ${label}:\n\n\`\`\`\n${out.slice(0, 3400)}\n\`\`\``));
      } else {
        await sock.sendMessage(m.chat, {
          document: Buffer.from(out, "utf-8"),
          fileName: `${kind === "obfuscate" ? "obfuscated" : "converted"}.js`,
          mimetype: "application/javascript",
          caption: `_(via zelapi ${kind})_`,
        }, { quoted: m });
      }
    } else if (kind === "domain") {
      const card = cardDomain(d);
      if (!card) { await m.react("❌"); return m.reply(raraWrap("ztools", `Domain gak ketemu: ${v(d?.message) || v(d?.error) || "coba domain lain"}`)); }
      await m.reply(raraWrap("ztools", "✅ DOMAIN CHECKER (zelapi)\n\n" + card));
    } else if (kind === "source") {
      const { card, html } = cardSource(d);
      await m.reply(raraWrap("ztools", "✅ GET SOURCE (zelapi)\n\n" + card));
      if (html && html.length > 300) {
        await sock.sendMessage(m.chat, {
          document: Buffer.from(html, "utf-8"),
          fileName: `${(d.title || "source").replace(/[\\/:*?"<>|]/g, "").slice(0, 50) || "source"}.html`,
          mimetype: "text/html",
          caption: "_(source via zelapi)_",
        }, { quoted: m });
      }
    } else if (kind === "webtest") {
      if (v(d?.result?.result?.resultJson?.meta)) {
        await m.reply(raraWrap("ztools", "✅ WEBSITE SPEED TEST (zelapi)\n\n" + cardWebtest(d)));
      } else {
        await m.react("❌");
        return m.reply(raraWrap("ztools", `Tes gagal — ${v(d?.result?.result?.error) || v(d?.message) || "coba lagi / cek URL-nya"}`));
      }
    }
    await m.react("🐣");
  } catch (e) {
    try { await m.react("❌"); } catch {}
    await m.reply(raraWrap("ztools", `fitur error: ${e?.message || e}`));
  }
}

export default { pluginConfig, handler, command: pluginConfig.name };
export { pluginConfig as config, handler };
