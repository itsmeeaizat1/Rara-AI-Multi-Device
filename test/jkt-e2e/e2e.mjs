// E2E JKT — .jktai (18 member AI persona) + .jkt48 (5 endpoint SHOWROOM)
// dari zelapi.eu.cc. Semua http di-mock via seam _setZelJktHttpForTest.
// STRICT SATUAN: key kosong/401/429/status false → error asli (gak fallback).
import fs from "node:fs";
import { initDatabase } from "../../src/lib/nova-database.js";
import jktai, { _setZelJktHttpForTest as setHttp1, _setZelJktKeyForTest as setKey1 } from "../../plugins/ai/jktai.js";
import jkt48, { _setZelJktHttpForTest as setHttp2, _setZelJktKeyForTest as setKey2 } from "../../plugins/stalker/jkt48.js";
import { findJktaiMember, ZEL_JKTAI_MEMBERS, ZEL_JKT48_KINDS } from "../../src/scraper/zeljkt.js";
import { fromSC } from "../../src/lib/styler.js";

const sc = (s) => fromSC(String(s || "")).toLowerCase();

const DB = "/tmp/jkt-e2e-db.json";
fs.rmSync(DB, { recursive: true, force: true });
await initDatabase(DB);

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => {
  w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : ""));
  ok ? pass++ : fail++;
};

// ── mock m / sock ──
function mkM(text, cmd, args) {
  const o = {
    args: (text || "").split(/\s+/).filter(Boolean),
    command: cmd,
    prefix: ".",
    text,
    chat: "62812@g.us",
    sender: "62812@s.whatsapp.net",
    replyed: [],
    reacts: [],
    reply: async (s) => { o.replyed.push(s); return o; },
    react: async (e) => { o.reacts.push(e); return o; },
  };
  return o;
}

const setKey = (k) => { setKey1(k); setKey2(k); };
const setHttp = (fn) => { setHttp1(fn); setHttp2(fn); };
// default: key valid + fetch gak boleh kepanggil (offline test)
setKey("zel-e2e-key");

// ═══ 1. REGISTRY ═══
w("\n— registry —");
t("  18 member jktai lengkap (slug unik)",
  ZEL_JKTAI_MEMBERS.length === 18 && new Set(ZEL_JKTAI_MEMBERS.map((m) => m.slug)).size === 18,
  "→ " + ZEL_JKTAI_MEMBERS.length);
t("  18 nama display unik", new Set(ZEL_JKTAI_MEMBERS.map((m) => m.name)).size === 18);
t("  5 kind showroom", ZEL_JKT48_KINDS.length === 5 && ZEL_JKT48_KINDS.join() === "info,comments,gift,rank,stream");
t("  findJktaiMember: slug + nama + case-insensitive",
  findJktaiMember("marsha")?.slug === "marsha" && findJktaiMember("Marsha")?.slug === "marsha" && findJktaiMember("ANIN")?.slug === "anindya");
t("  findJktaiMember gak nemu → null", findJktaiMember("sukijan") === null);

// ═══ 2. SCRAPER — jktAiChat ═══
w("\n— scraper jktAiChat —");
let lastUrl = "";
setHttp(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, creator: "Hazel", data: { text: "Halo! Aku Marsha dari JKT48 ✨" } }) }; });
let r = await import("../../src/scraper/zeljkt.js").then((z) => z.jktAiChat(findJktaiMember("marsha"), "halo marsha"));
t("  chat ok → reply ke-ekstrak", r.ok && /Marsha/.test(r.reply), JSON.stringify(r).slice(0, 80));
t("  URL bener: /jktai/marsha?text=...&apikey=",
  lastUrl.includes("/jktai/marsha?") && lastUrl.includes("text=halo+marsha") && lastUrl.includes("apikey=zel-e2e-key"), lastUrl.slice(0, 70));

// bentuk respon lain: data string langsung
setHttp(async () => ({ status: 200, json: async () => ({ status: true, data: "jawaban versi datar" }) }));
r = await import("../../src/scraper/zeljkt.js").then((z) => z.jktAiChat(findJktaiMember("freya"), "hai"));
t("  data string langsung kebaca", r.ok && r.reply === "jawaban versi datar");

setHttp(async () => ({ status: 200, json: async () => ({ status: false, error: "Failed to create session" }) }));
r = await import("../../src/scraper/zeljkt.js").then((z) => z.jktAiChat(findJktaiMember("lily"), "tes"));
t("  status:false → error asli keluar (strict)", !r.ok && /Failed to create session/.test(r.error));

setHttp(async () => ({ status: 401, json: async () => ({ status: false }) }));
r = await import("../../src/scraper/zeljkt.js").then((z) => z.jktAiChat(findJktaiMember("trisha"), "tes"));
t("  401 → API_KEY_INVALID", !r.ok && /API_KEY_INVALID/.test(r.error));

setHttp(async () => ({ status: 429, json: async () => ({}) }));
r = await import("../../src/scraper/zeljkt.js").then((z) => z.jktAiChat(findJktaiMember("cathy"), "tes"));
t("  429 → RATE_LIMIT", !r.ok && /RATE_LIMIT/.test(r.error));

setKey("");
r = await import("../../src/scraper/zeljkt.js").then((z) => z.jktAiChat(findJktaiMember("ella"), "tes"));
t("  key kosong → API_KEY", !r.ok && r.error === "API_KEY");
setKey("zel-e2e-key");

// ═══ 3. SCRAPER — jktShowroom ═══
w("\n— scraper jktShowroom —");
setHttp(async (u) => { lastUrl = u; return { status: 200, json: async () => ({ status: true, data: { room_name: "JKT48 Official", is_live: true } }) }; });
r = await import("../../src/scraper/zeljkt.js").then((z) => z.jktShowroom("info", "123456"));
t("  info ok + URL /jkt48/info?roomId=&apikey=",
  r.ok && lastUrl.includes("/jkt48/info?") && lastUrl.includes("roomId=123456") && lastUrl.includes("apikey="));
await import("../../src/scraper/zeljkt.js").then((z) => z.jktShowroom("stream", "999", "abc=xyz"));
t("  cookies dikirim kalau ada", lastUrl.includes("cookies=abc%3Dxyz"));
r = await import("../../src/scraper/zeljkt.js").then((z) => z.jktShowroom("bogus", "1"));
t("  kind invalid → KIND_INVALID", !r.ok && /KIND_INVALID/.test(r.error));
r = await import("../../src/scraper/zeljkt.js").then((z) => z.jktShowroom("gift", ""));
t("  roomId kosong → ROOM_ID_KOSONG", !r.ok && /ROOM_ID_KOSONG/.test(r.error));
r = await import("../../src/scraper/zeljkt.js").then((z) => z.jktShowroom("gift", "abc123"));
t("  roomId bukan angka → ROOM_ID_KOSONG", !r.ok && /ROOM_ID_KOSONG/.test(r.error));

// ═══ 4. PLUGIN .jktai ═══
w("\n— plugin .jktai —");
setHttp(async () => ({ status: 200, json: async () => ({ status: true, data: { text: "Halo! Aku Freya ✨ salam kenal ya!" } }) }));
let m = mkM("", "jktai", []);
await jktai.handler(m, { sock: {} });
t("  tanpa argumen → usage + 18 nama member",
  m.replyed.length === 1 && sc(m.replyed[0]).includes("freya") && sc(m.replyed[0]).includes("marsha"));

m = mkM("marsha halo apa kabar", "jktai", ["marsha", "halo", "apa", "kabar"]);
await jktai.handler(m, { sock: {} });
t("  chat member ok → reply berisi jawaban AI",
  m.replyed.length === 1 && sc(m.replyed[0]).includes("halo! aku freya") && sc(m.replyed[0]).includes("marsha"), JSON.stringify(m.replyed[0]).slice(0, 80));
t("  react 🧠 → 🐣", m.reacts[0] === "🧠" && m.reacts.includes("🐣"), m.reacts.join(","));

m = mkM("sukijan halo", "jktai", ["sukijan", "halo"]);
await jktai.handler(m, { sock: {} });
t("  member gak ada → error ramah", sc(m.replyed[0]).includes("gak ada"));

m = mkM("marsha", "jktai", ["marsha"]);
await jktai.handler(m, { sock: {} });
t("  tanpa pesan → hint kirim pesan", sc(m.replyed[0]).includes("pesan"));

setHttp(async () => ({ status: 500, json: async () => ({ status: false, error: "server sibuk" }) }));
m = mkM("marsha tes", "jktai", ["marsha", "tes"]);
await jktai.handler(m, { sock: {} });
t("  endpoint 500 → error asli + react ❌ (strict, gak fallback)",
  m.reacts.includes("❌") && sc(m.replyed[0]).includes("server sibuk"));

// ═══ 5. PLUGIN .jkt48 ═══
w("\n— plugin .jkt48 —");
setHttp(async () => ({ status: 200, json: async () => ({ status: true, data: { room_name: "JKT48 Official", is_live: true, viewers: 1500 } }) }));
m = mkM("info 123456", "jkt48", ["info", "123456"]);
await jkt48.handler(m, { sock: {} });
t("  .jkt48 info <roomId> → kartu berisi data room",
  m.replyed.length === 1 && sc(m.replyed[0]).includes("jkt48 official") && m.replyed[0].includes("1500"));

m = mkM("", "jkt48", []);
await jkt48.handler(m, { sock: {} });
t("  usage → 5 jenis ke-list",
  sc(m.replyed[0]).includes("info") && sc(m.replyed[0]).includes("gift") && sc(m.replyed[0]).includes("stream"));

m = mkM("bogus 123", "jkt48", ["bogus", "123"]);
await jkt48.handler(m, { sock: {} });
t("  kind gak dikenal → error pilihan", sc(m.replyed[0]).includes("gak ada"));

m = mkM("info", "jkt48", ["info"]);
await jkt48.handler(m, { sock: {} });
t("  tanpa roomId → minta roomId", sc(m.replyed[0]).includes("roomid"));

// stream URL nemu → ditonjolin
setHttp(async () => ({ status: 200, json: async () => ({ status: true, data: { stream: { url: "https://cdn.showroom.live/hls/x.m3u8", quality: "low" } } }) }));
m = mkM("stream 123456", "jkt48", ["stream", "123456"]);
await jkt48.handler(m, { sock: {} });
t("  stream → link m3u8 keliatan jelas", m.replyed[0].includes("https://cdn.showroom.live/hls/x.m3u8"));

// cookies via pipe
let seenUrl = "";
setHttp(async (u) => { seenUrl = u; return { status: 200, json: async () => ({ status: true, data: [] }) }; });
m = mkM("rank 123456 | sid=abc", "jkt48", ["rank", "123456", "|", "sid=abc"]);
await jkt48.handler(m, { sock: {} });
t("  .jkt48 rank <id> | <cookies> → cookies ikut kekirim",
  seenUrl.includes("cookies=sid%3Dabc") && seenUrl.includes("roomId=123456"), seenUrl.slice(0, 80));

// ═══ 6. STRUCT — plugin config standar ═══
w("\n— config —");
const cfg1 = jktai.pluginConfig || jktai.config;
const cfg2 = jkt48.pluginConfig || jkt48.config;
t("  jktai: kategori ai, cd 15, energi 1, enabled", cfg1.category === "ai" && cfg1.cooldown === 15 && cfg1.energi === 1 && cfg1.isEnabled === true);
t("  jkt48: kategori stalker, cd 10, enabled", cfg2.category === "stalker" && cfg2.cooldown === 10 && cfg2.isEnabled === true);
t("  alias gak bentrok tebakjkt48", !cfg1.alias.includes("tebakjkt48") && !cfg2.alias.includes("tebakjkt48"));
t("  18 slug di registry == 18 endpoint /jktai/<slug> (beda slugs)", new Set(ZEL_JKTAI_MEMBERS.map((x) => x.slug)).size === 18);

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exitCode = fail > 0 ? 1 : 0;
