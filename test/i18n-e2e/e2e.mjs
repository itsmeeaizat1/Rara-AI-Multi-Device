// RARA AI — i18n e2e: un-smallcaps + translateUI + makeLangAwareSock
// Fix 18 Sep 2026 (owner: "yg keubah cm caption doang, g semua tampilah
// seluruh teks bot ini dikonversi jadi bahasa yg dipilih")
import { createRequire } from "module";

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// handler anti-mati-senyap (rara-lid swallow exception → exit 0)
process.on("uncaughtException", (e) => { console.log("UNCAUGHT:", e.stack); process.exit(1); });
process.on("unhandledRejection", (e) => { console.log("UNHANDLED:", e && e.stack || e); process.exit(1); });

const DB_DIR = "/tmp/rara-i18n-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(DB_DIR + "/db.json");

let pass = 0, fail = 0;
const w = (s) => console.log(s);
const t = (name, ok, extra) => { ok ? pass++ : fail++; w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : "")); };

const {
  unSmallcaps, translateUI, translateButton, preTranslateButton, needsTranslation,
} = await import(R + "/src/lib/rara-i18n.js");
const { makeLangAwareSock } = await import(R + "/src/lib/rara-i18n-sock.js");
const { getDatabase } = await import(R + "/src/lib/rara-database.js");

// ── fixture db: toggle ON + user set bahasa en ──
const SENDER = "6281234567890@s.whatsapp.net";
const UID = "6281234567890";
const db = getDatabase();
const prevToggle = db.setting("multiLangEnabled");
const prevLang = db.setting("userLang_" + UID);
db.setting("multiLangEnabled", true);
db.setting("userLang_" + UID, "en");
try { await db.save(); } catch {}

// ── mock fetch: Google Translate endpoint → hasil deterministik ──
const GT = "https://translate.googleapis.com/translate_a/single";
let fetchCalls = [];
const realFetch = global.fetch;
global.fetch = async (url, opts) => {
  fetchCalls.push(String(url));
  if (String(url).startsWith(GT)) {
    const q = decodeURIComponent(String(url).match(/q=([^&]+)/)?.[1] || "");
    const ql = q.toLowerCase();
    let out = q;
    if (ql.includes("menu utama bot")) out = "main bot menu, please choose a feature";
    if (ql === "pilih fitur") out = "choose a feature";
    if (ql === "unduhan siap") out = "download ready";
    if (ql === "pilih kategori menu") out = "choose menu category";
    if (ql === "menu selengkapnya") out = "more menu";
    if (ql === "versi") out = "version";
    if (ql.includes("baris panjang")) out = q.replace(/baris panjang/ig, "long line");
    return {
      ok: true,
      json: async () => [[ [out, q, null, null], [null, null, "en"] ]],
    };
  }
  return realFetch(url, opts);
};

w("\n— unSmallcaps —");
t("smallcaps ꜰɪᴛᴜʀ ᴍᴇɴᴜ → fitur menu (balikin sebelum translate)",
  unSmallcaps("ꜰɪᴛᴜʀ ᴍᴇɴᴜ") === "fitur menu");
t("teks polos gak berubah (idempoten buat teks tanpa smallcaps)",
  unSmallcaps("sudah teks biasa 123") === "sudah teks biasa 123");
t("teks campur: smallcaps + angka + em dash utuh",
  unSmallcaps("ᴍᴇɴᴜ 12 — ᴜᴛᴀᴍᴀ") === "menu 12 — utama");

w("\n— needsTranslation —");
t("toggle ON + lang en → butuh translate", needsTranslation(SENDER) === true);
t("lang gak diset → gak butuh", !needsTranslation("6289990000@s.whatsapp.net"), "val=" + needsTranslation("6289990000@s.whatsapp.net"));

w("\n— translateUI: teks SMALLCAPS (akar bug menu-gak-keubah) —");
// AKAR: raraWrap nge-smallcaps teks SEBELUM m.reply → Google gak kenali
// glyph ꜰɪᴛᴜʀ → translate gagal senyap. Fix: un-smallcaps dulu.
const menuSC = "ᴍᴇɴᴜ ᴜᴛᴀᴍᴀ ʙᴏᴛ — ᴘɪʟɪʜ ꜰɪᴛᴜʀ";
const out1 = await translateUI(menuSC, SENDER);
t("teks smallcaps IKUT ke-translate (dulu: gagal senyap → tetap Indonesia)",
  out1 === "main bot menu, please choose a feature", "→ " + out1);
t("query ke Google dikirim versi PLAIN (bukan glyph smallcaps)",
  fetchCalls.some((u) => decodeURIComponent(u).includes("q=menu utama bot")),
  [...new Set(fetchCalls)].join(" "));
t("teks polos tetap ke-translate seperti biasa",
  (await translateUI("pilih fitur", SENDER)) === "choose a feature");

w("\n— translateUI: cache & guard —");
fetchCalls = [];
const out2 = await translateUI(menuSC, SENDER);
t("cache hit: teks sama gak manggil Google lagi",
  out2 === "main bot menu, please choose a feature" && fetchCalls.length === 0,
  "calls=" + fetchCalls.length);
{
  const prev = db.setting("multiLangEnabled");
  db.setting("multiLangEnabled", false);
  try { await db.save(); } catch {}
  fetchCalls = [];
  const outOff = await translateUI("pilih fitur", SENDER);
  t("toggle OFF → teks asli utuh (master switch dihormati)",
    outOff === "pilih fitur" && fetchCalls.length === 0);
  db.setting("multiLangEnabled", true);
  try { await db.save(); } catch {}
}

w("\n— makeLangAwareSock: jalur sock.sendMessage LANGSUNG ikut ke-translate + sanitizer permanen —");
{
  const bs = String.fromCharCode(92);
  const sent = [];
  const sock = {
    sendMessage: async (jid, params, options) => { sent.push({ jid, params, options }); return { key: { id: "m1" } }; },
    relayMessage: async () => ({}),
    readMessages: async () => ({}),
  };
  const wrapped = makeLangAwareSock(sock, SENDER);
  t("user berbahasa → sock dibungkus (bukan sock asli)", wrapped !== sock);
  await wrapped.sendMessage("g@x", { text: "pilih fitur" }, { quoted: {} });
  t("params.text ke-translate otomatis", sent[0].params.text === "choose a feature", "→ " + sent[0].params.text);
  await wrapped.sendMessage("g@x", { caption: "unduhan siap", image: Buffer.from("x") });
  t("params.caption media ke-translate", sent[1].params.caption === "download ready");
  t("field media gak disentuh", !!sent[1].params.image);
  t("method lain tetap ada (relayMessage dll)", typeof wrapped.relayMessage === "function");

  // GOTCHA sanitizer permanen (bug .bot on): sock.sendMessage LANGSUNG
  // (broadcastStatusChange-style, bukan m.reply) tetap kena formatGuard —
  // literal backslash-n jadi baris baru sungguhan, walau user gak punya
  // preferensi bahasa aktif sama sekali.
  const noLang = "6289990000@s.whatsapp.net";
  const plain = makeLangAwareSock(sock, noLang);
  t("user tanpa bahasa → sock TETAP dibungkus (demi sanitizer)", plain !== sock);
  const literalNL = "Bot kembali aktif!" + bs + "nSemua fitur normal." + bs + "n" + bs + "nTerima kasih.";
  await plain.sendMessage("g@x", { text: literalNL });
  const expectedClean = "Bot kembali aktif!" + String.fromCharCode(10) + "Semua fitur normal." + String.fromCharCode(10) + String.fromCharCode(10) + "Terima kasih.";
  t("literal backslash-n disanitasi jadi baris baru sungguhan (tanpa translate)",
    sent[2].params.text === expectedClean,
    JSON.stringify(sent[2].params.text));

  // toggle OFF → translate mati, sanitizer TETAP hidup
  db.setting("multiLangEnabled", false);
  try { await db.save(); } catch {}
  const offSock = makeLangAwareSock(sock, SENDER);
  await offSock.sendMessage("g@x", { text: literalNL });
  t("toggle multi-lang OFF → sanitizer tetap jalan, translate mati",
    sent[3].params.text === expectedClean);
  db.setting("multiLangEnabled", true);
  try { await db.save(); } catch {}
}

w("\n— translateUI: teks panjang (.menu/.allmenu) dipecah per-chunk —");
{
  // FIX 19 Sep 2026 (owner: ".menu/.allmenu masih bahasa bawaan padahal
  // caption fitur lain & tombol udah ke-translate"): endpoint gratis Google
  // Translate dirancang buat teks pendek — 1 request GAGAL/timeout untuk
  // teks panjang dulu langsung nyerah SELURUH teks balik bahasa asli.
  // Sekarang teks > MAX_CHUNK dipecah per-baris, tiap potongan translate
  // SENDIRI (beberapa fetch call), gagal sebagian != gagal semua.
  const longLine = "baris panjang nomor";
  const longText = Array.from({ length: 120 }, (_, i) => `${longLine} ${i}`).join("\n");
  t("teks generate > MAX_CHUNK (1500)", longText.length > 1500, "len=" + longText.length);
  fetchCalls = [];
  const outLong = await translateUI(longText, SENDER);
  t("teks panjang KE-TRANSLATE (dulu: gagal senyap → tetap bahasa asli)",
    outLong.includes("long line") && !outLong.includes("baris panjang"),
    outLong.slice(0, 80));
  t("dipecah jadi LEBIH DARI 1 request Google (bukan 1 request raksasa)",
    fetchCalls.filter((u) => u.startsWith(GT)).length > 1,
    "calls=" + fetchCalls.filter((u) => u.startsWith(GT)).length);
  t("jumlah baris tetap utuh setelah disambung balik (gak ada baris ke-drop)",
    outLong.split("\n").length === longText.split("\n").length,
    outLong.split("\n").length + " vs " + longText.split("\n").length);
}

w("\n— sendMenuCard: menu + tombol ikut ke-translate (hook sebelum smallcaps) —");
{
  const { sendMenuCard } = await import(R + "/src/lib/rara-menu-card.js");
  const mk = () => {
    const sends = [];
    return {
      sends,
      sock: {
        sendMessage: async (jid, params) => { sends.push(params); return { key: { id: "s" + sends.length } }; },
        relayMessage: async (jid, msg) => { sends.push({ relayed: msg }); return {}; },
        newsletterMetadata: async () => null,
      },
      m: {
        chat: "g@x", sender: SENDER, key: { remoteJid: "g@x", participant: SENDER },
        reply: async (txt) => { sends.push({ text: txt }); return {}; },
      },
    };
  };
  const before = mk();
  const ok1 = await sendMenuCard(before.sock, before.m, {
    text: "menu utama bot — pilih fitur",
    footer: "pilih fitur",
    buttons: [
      { type: "quick_reply", text: "Kembali", id: ".menu" },
      { type: "single_select", title: "Menu", sections: [{ title: "pilih fitur", rows: [{ title: "pilih fitur", description: "unduhan siap", id: ".dl" }] }] },
    ],
    thumbnailPath: R + "/test/fixtures/nope.png",
  });
  t("sendMenuCard sukses dengan bahasa aktif", ok1 === true);
  const dumped = JSON.stringify(before.sends);
  const unsc = (await import(R + "/src/lib/rara-i18n.js")).unSmallcaps;
  const plainDump = unsc(dumped);
  t("teks menu ke-translate ke bahasa user (smallcaps setelah translate)",
    plainDump.includes("main bot menu, please choose a feature"), plainDump.slice(0, 160));
  t("footer ke-translate", plainDump.includes("choose a feature"));
  t("label tombol ke-translate (dictionary Kembali → Back)", plainDump.toLowerCase().includes("back"), plainDump.slice(0, 300));
  // FIX 19 Sep 2026: dua chip/popup ini SEBELUMNYA hardcoded Indonesia,
  // gak pernah lewat translateUI — sekarang wajib ikut ke-translate juga.
  t("chip popup list_title ke-translate (Pilih Kategori Menu → choose menu category)",
    plainDump.toLowerCase().includes("choose menu category"), plainDump.slice(0, 400));
  t("chip popup button_title ke-translate (Menu Selengkapnya → more menu)",
    plainDump.toLowerCase().includes("more menu"), plainDump.slice(0, 400));
  t("chip versi label ke-translate (Versi → version)",
    plainDump.toLowerCase().includes("version"), plainDump.slice(0, 400));
  // tanpa bahasa → gak ada translate (sock asli dipakai)
  const mNo = { ...mk().m, sender: "6289990000@s.whatsapp.net" };
  const noLangSends = mk();
  mNo.chat = "g@x";
  await sendMenuCard(noLangSends.sock, { ...mNo, chat: "g@x" }, { text: "pilih fitur", footer: "" });
  t("user tanpa bahasa → teks Indonesia utuh", JSON.stringify(noLangSends.sends).includes("ᴘɪʟɪʜ ꜰɪᴛᴜʀ") || JSON.stringify(noLangSends.sends).includes("pilih fitur"));
}

w("\n— translateButton (dictionary) —");
t("button 'Kembali' → 'Back' (dictionary, tanpa http)",
  translateButton("Kembali", SENDER) === "Back");

global.fetch = realFetch;

// ── restore setting db ──
if (prevToggle === undefined) db.setting("multiLangEnabled", false); else db.setting("multiLangEnabled", prevToggle);
if (prevLang === undefined) db.setting("userLang_" + UID, "id"); else db.setting("userLang_" + UID, prevLang);
try { await db.save(); } catch {}

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
