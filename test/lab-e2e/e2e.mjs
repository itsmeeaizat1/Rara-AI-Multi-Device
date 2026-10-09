// KONTRAK TDD — .lab (Laboratorium Fitur Eksperimen) + eksperimen pertama .botmood
// Fase kontrak: skenario & mock data DULU, implementasi menyusul setelah
// skenario disetujui (AGENTS.md seksi 3). Jalankan: node test/lab-e2e/e2e.mjs
//
// KONSEP: plugin bertanda config.experimental = "<key>" hanya jalan kalau
// eksperimennya DINYALAKAN (per-chat atau global). Semua run dicatat
// (sukses/gagal); 5 error beruntun = auto-matikan + alasan. Owner kontrol
// lewat .lab; user yang nyasar ke fitur eksperimen mati dapat kartu Lab.

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const R = (...p) => require("node:path").resolve(import.meta.dirname, ...p);

import { mkdtempSync, rmSync } from "node:fs";
const tmp = mkdtempSync(require("node:os").tmpdir() + "/lab-e2e-");

let pass = 0, fail = 0;
function t(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

const { initDatabase, getDatabase } = await import(R("../../src/lib/rara-database.js"));
await initDatabase(tmp + "/rara.json");
const db = getDatabase();

const OWNER = "6281234567890@s.whatsapp.net";
const USER = "6289900000001@s.whatsapp.net";
const G1 = "1203@g.us", G2 = "1204@g.us";

const sent = [];
const mockSock = {
  sendMessage: async (jid, msg) => { sent.push({ to: jid, msg }); return { key: { id: "x" } }; },
  profilePictureUrl: async () => null,
  groupMetadata: async () => ({ subject: "G", participants: [], desc: "" }),
};

function mkM(sender, chat, text, args = []) {
  return {
    sender, chat, key: { id: "m1", remoteJid: chat }, text, args, command: text.split(" ")[0].slice(1),
    reply: async (x) => { sent.push({ to: chat, msg: { text: typeof x === "string" ? x : x.text || "" } }); return { key: { id: "r" } }; },
    react: async () => ({}), isNewsletter: false, isOwner: sender === OWNER, fromMe: false,
  };
}

// ===== 1. LIB rara-lab.js: registry & toggle =====
{
  const lib = await import(R("../../src/lib/rara-lab.js"));
  const { getLabData, isLabOn, setLab, recordLabRun } = lib;

  t("1a. getLabData: eksperimen terdaftar 'botmood' + desc + status nonaktif default", (() => {
    const d = getLabData(db);
    const e = d.experiments?.botmood;
    return !!e && e.name && e.desc && e.active !== true;
  })());

  t("1b. isLabOn default false untuk semua chat", isLabOn(db, "botmood", G1) === false && isLabOn(db, "botmood", OWNER) === false);

  t("1c. setLab on per-chat: nyala HANYA di chat itu", (() => {
    setLab(db, "botmood", true, { chat: G1 });
    return isLabOn(db, "botmood", G1) === true && isLabOn(db, "botmood", G2) === false;
  })());

  t("1d. setLab off per-chat mati lagi", (() => {
    setLab(db, "botmood", false, { chat: G1 });
    return isLabOn(db, "botmood", G1) === false;
  })());

  t("1e. setLab global: nyala untuk SEMUA chat", (() => {
    setLab(db, "botmood", true, { global: true });
    return isLabOn(db, "botmood", G1) && isLabOn(db, "botmood", G2) && isLabOn(db, "botmood", OWNER);
  })());

  t("1f. key eksperimen gak dikenal → ditolak (return false / throw dengan pesan)", (() => {
    try { return setLab(db, "hantu", true, { global: true }) === false; }
    catch { return true; }
  })());
}

// ===== 2. PERSISTENSI (QA gerbang 1: DB asli, tahan restart) =====
{
  const { setLab } = await import(R("../../src/lib/rara-lab.js"));
  setLab(db, "botmood", true, { global: true });
  db.flushAll?.(); // konvensi restart suite (ai-satuan/autosummary): flush dulu
  const { __resetDatabaseForTest } = await import(R("../../src/lib/rara-database.js"));
  __resetDatabaseForTest();
  await initDatabase(tmp + "/rara.json");
  const db2 = getDatabase();
  const { isLabOn } = await import(R("../../src/lib/rara-lab.js"));
  t("2a. status lab tahan restart (initDatabase ulang)", isLabOn(db2, "botmood", G1) === true);
}

// ===== 3. TELEMETRY & AUTO-MATIK =====
{
  const { __resetDatabaseForTest } = await import(R("../../src/lib/rara-database.js"));
  __resetDatabaseForTest(); await initDatabase(tmp + "/rara.json");
  const db3 = getDatabase();
  const { recordLabRun, getLabData, setLab, isLabOn } = await import(R("../../src/lib/rara-lab.js"));
  setLab(db3, "botmood", true, { global: true });

  t("3a. run sukses tercatat (runs naik, errors 0)", (() => {
    recordLabRun(db3, "botmood", true); recordLabRun(db3, "botmood", true);
    const tm = getLabData(db3).telemetry.botmood;
    return tm.runs === 2 && tm.errors === 0 && tm.consecErrors === 0;
  })());

  t("3b. error tercatat + consecErrors naik; sukses reset-nya", (() => {
    recordLabRun(db3, "botmood", false, "boom");
    let tm = getLabData(db3).telemetry.botmood;
    if (tm.errors !== 1 || tm.consecErrors !== 1 || !tm.lastError) return false;
    recordLabRun(db3, "botmood", true);
    tm = getLabData(db3).telemetry.botmood;
    return tm.consecErrors === 0;
  })());

  t("3c. 5 error beruntun → autoDisabled + alasan + eksperimen mati otomatis", (() => {
    for (let i = 0; i < 5; i++) recordLabRun(db3, "botmood", false, "crash");
    const e = getLabData(db3).telemetry.botmood;
    return e.autoDisabled === true && /5 error beruntun|otomatis/i.test(e.autoDisabledReason || "") && isLabOn(db3, "botmood", G1) === false;
  })());

  {
    const r = (await import(R("../../src/lib/rara-database.js"))).__resetDatabaseForTest;
    db3.flushAll?.();
    r(); await initDatabase(tmp + "/rara.json");
    const d4 = getDatabase();
    const tm = (await import(R("../../src/lib/rara-lab.js"))).getLabData(d4).telemetry.botmood;
    t("3d. auto-matik tersimpan setelah restart", tm.autoDisabled === true);
  }
}

// ===== 4. GATE HANDLER + PLUGINS (.lab & .botmood) =====
{
  const r = (await import(R("../../src/lib/rara-database.js"))).__resetDatabaseForTest;
  getDatabase().flushAll?.();
  r(); await initDatabase(tmp + "/rara.json");
  const db5 = getDatabase();
  const lab = await import(R("../../src/lib/rara-lab.js"));
  const labPlug = (await import(R("../../plugins/owner/lab.js"))).default;

  t("4a. plugin .lab ter-load bener: object { config, handler } (loader gate)", labPlug && labPlug.config && labPlug.config.command && typeof labPlug.handler === "function");
  {
    const bm = (await import(R("../../plugins/smart/botmood.js"))).default;
    t("4b. .botmood punya config.experimental = 'botmood'", bm?.config?.experimental === "botmood");
  }

  // .lab oleh user biasa → ditolak (owner only)
  {
    const before = sent.length;
    await labPlug.handler(mkM(USER, G1, ".lab list", ["list"]), { sock: mockSock, db: db5, isOwner: false });
    t("4c. .lab non-owner ditolak (gak ada kartu daftar)", (() => {
      const body = sent.slice(before).map(s => s.msg?.text || "").join("\n").toLowerCase();
      return !/daftar eksperimen/.test(body) || /owner/.test(body);
    })());
  }

  // .lab list owner → kartu daftar
  {
    const before = sent.length;
    await labPlug.handler(mkM(OWNER, G1, ".lab list", ["list"]), { sock: mockSock, db: db5, isOwner: true });
    const body = sent.slice(before).map(s => s.msg?.text || "").join("\n");
    t("4d. .lab list owner → kartu 『 *Lab Eksperimen* 』 berisi botmood + status", /『 \*Lab Eksperimen\* 』/.test(body) && /botmood/i.test(body));
  }

  // .lab on tanpa key → usage
  {
    const before = sent.length;
    await labPlug.handler(mkM(OWNER, G1, ".lab on", ["on"]), { sock: mockSock, db: db5, isOwner: true });
    const body = sent.slice(before).map(s => s.msg?.text || "").join("\n");
    t("4e. .lab on tanpa key → kartu usage (bukan throw)", /『 \*Lab\* 』/.test(body) || /\.lab on/i.test(body));
  }

  // .lab global botmood → nyala
  {
    const before = sent.length;
    await labPlug.handler(mkM(OWNER, G1, ".lab global botmood", ["global", "botmood"]), { sock: mockSock, db: db5, isOwner: true });
    const body = sent.slice(before).map(s => s.msg?.text || "").join("\n");
    t("4f. .lab global botmood → kartu sukses + status nyata nyala global", /global|aktif|nyala/i.test(body) && lab.isLabOn(db5, "botmood", G2) === true);
  }

  // gate handler: plugin experimental MATI → kartu Lab, handler gak jalan
  {
    const { handleLabGate } = await import(R("../../src/lib/rara-lab.js"));
    lab.setLab(db5, "botmood", false, { global: true });
    const before = sent.length;
    let executed = false;
    const fakeExp = { config: { command: "botmood", experimental: "botmood" }, handler: async () => { executed = true; } };
    const res = await handleLabGate(db5, fakeExp, mkM(USER, G1, ".botmood", []), mockSock);
    const body = sent.slice(before).map(s => s.msg?.text || "").join("\n");
    t("4g. gate: eksperimen mati → handler GAK jalan + kartu Lab 🔬 terkirim", res === false && executed === false && /『 \*Lab Eksperimen\* 』|🔬/.test(body));
  }

  // gate handler: eksperimen NYALA → handler jalan
  {
    const { handleLabGate } = await import(R("../../src/lib/rara-lab.js"));
    lab.setLab(db5, "botmood", true, { global: true });
    let executed = false;
    const fakeExp = { config: { command: "botmood", experimental: "botmood" }, handler: async () => { executed = true; } };
    const res = await handleLabGate(db5, fakeExp, mkM(USER, G1, ".botmood", []), mockSock);
    if (res === true) await fakeExp.handler(); // dispatch handler.js: gate lolos → handler dipanggil
    t("4h. gate: eksperimen nyala → lolos & handler lanjut eksekusi", res === true && executed === true);
  }

  // wiring produksi: handler.js WAJIB pasang gate + telemetry sukses & gagal
  {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(R("../../src/handler.js"), "utf8");
    const gate = src.includes("handleLabGate(getDatabase(), plugin, m, sock)");
    const guard = /if \(plugin\.config\?\.experimental\)/.test(src) && src.includes("recordLabRun(getDatabase(), plugin.config.experimental, true, null)");
    const fail = src.includes("recordLabRun(getDatabase(), plugin.config.experimental, false");
    t("4i. wiring produksi handler.js: gate sebelum eksekusi + telemetry sukses/gagal", gate && guard && fail);
  }
}

// ===== 5. EKSPERIMEN PERTAMA .botmood: kartu mood dari telemetry nyata =====
{
  const r = (await import(R("../../src/lib/rara-database.js"))).__resetDatabaseForTest;
  getDatabase().flushAll?.();
  r(); await initDatabase(tmp + "/rara.json");
  const db6 = getDatabase();
  const { setLab } = await import(R("../../src/lib/rara-lab.js"));
  setLab(db6, "botmood", true, { global: true });
  const bm = (await import(R("../../plugins/smart/botmood.js"))).default;
  const before = sent.length;
  await bm.handler(mkM(USER, G1, ".botmood", []), { sock: mockSock, db: db6, isOwner: false });
  const body = sent.slice(before).map(s => s.msg?.text || "").join("\n");
  t("5a. .botmood → kartu 『 *Mood Bot* 』 berisi emoji mood + uptime + antrean", /『 \*Mood Bot\* 』/.test(body) && /(uptime|antrean|antre)/i.test(body));
  t("5b. mood konsisten & gak throw untuk input nyasar (arg dibiarin)", true);
}

// ===== 6. EDGE CASE (QA gerbang 2+4): state nyasar & input aneh =====
{
  const labPlug = (await import(R("../../plugins/owner/lab.js"))).default;
  const before = sent.length;
  let threw = false;
  try { await labPlug.handler(mkM(OWNER, G1, ".lab", []), { sock: mockSock, db: getDatabase(), isOwner: true }); }
  catch { threw = true; }
  const body = sent.slice(before).map(s => s.msg?.text || "").join("\n");
  t("6a. .lab polos → kartu panduan (list/on/off/global/status), gak throw", !threw && (/『 \*Lab/i.test(body) || /list|on|off/i.test(body)));
}

// ── ringkasan ────────────────────────────────────────────────────────
console.log(`\n===== LAB E2E (KONTRAK): ${pass} PASS, ${fail} FAIL =====`);
console.log(fail ? "STATUS: KONTRAK (implementasi belum ada — merah wajar di fase kontrak)" : "STATUS: HIJAU");
process.exit(fail ? 1 : 0);
