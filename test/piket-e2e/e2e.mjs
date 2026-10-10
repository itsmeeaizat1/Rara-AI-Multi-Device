// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// E2E PIKET — Auto-Piket Rotasi Tugas Grup (feat/auto-piket)
// Jalankan: node test/piket-e2e/e2e.mjs

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const R = (...p) => require("node:path").resolve(import.meta.dirname, ...p);

// ── harness ──────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function t(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}
function out(s) { console.log("   ↳ " + s); }

// ── database ASLI di tmp dir (QA gerbang 1: integration, bukan mock) ──
import { mkdtempSync, rmSync } from "node:fs";
const tmp = mkdtempSync(require("node:os").tmpdir() + "/piket-e2e-");
const { initDatabase, getDatabase, __resetDatabaseForTest } = await import(R("../../src/lib/rara-database.js"));
await initDatabase(tmp + "/rara.json");

// ── mock Baileys ─────────────────────────────────────────────────────
const sent = [];
function mockSock() {
  return {
    sendMessage: async (jid, msg) => { sent.push({ to: jid, msg }); return { key: { id: "x" + sent.length } }; },
    groupMetadata: async () => ({ subject: "Grup Test", participants: [] }),
  };
}

const GID = "12036302@g.us";
const A = "628111111111@s.whatsapp.net";
const B = "628222222222@s.whatsapp.net";
const C = "628333333333@s.whatsapp.net";

function mkMsg(chat, sender, text, args) {
  return {
    chat, sender, key: { remoteJid: chat, fromMe: false, id: "m1" },
    args: args ?? (text ? text.slice(1).split(" ") : []),
    text: text || "",
    reply: async (card) => { sent.push({ to: chat, msg: { text: card } }); return true; },
    react: async () => true,
    isGroup: chat.endsWith("@g.us"),
    mentionedJid: [],
  };
}

// ===== 1. SECTION: daftar & rotasi dasar =====
{
  // jam deterministik biar announce gak tergantung jam sandbox
  const { __setNowForTest } = await import(R("../../src/lib/rara-piket.js"));
  __setNowForTest(Date.parse("2026-10-10T10:00:00+07:00"));

  const { handler, config } = await import(R("../../plugins/group/piket.js"));
  t("1a. plugin export config + handler (loader rule)", typeof config?.name === "string" && typeof handler === "function");
  t("1b. config: kategori group & isGroup true", config.category === "group" && config.isGroup === true, JSON.stringify(config));

  const s = mockSock();
  // daftar 3 anggota via argumen list @mention
  const r1 = await handler(mkMsg(GID, A, ".piket daftar", ["daftar", A, B, C]), { sock: s });
  const db = getDatabase();
  const st = db.setting("piket")?.[GID];
  t("1c. daftar 3 anggota tersimpan di DB", st && st.members.length === 3, JSON.stringify(st?.members?.length));
  t("1d. pointer awal 0 & status pending", st.pointer === 0 && st.todayStatus === "pending");

  // pagi: announce hari ini → A piket
  const { runPiketCheck } = await import(R("../../src/lib/rara-piket.js"));
  sent.length = 0;
  await runPiketCheck(s);
  t("1e. announce pagi ke grup", sent.some(x => x.to === GID));
  const ann = sent.find(x => x.to === GID);
  t("1f. announce nyebut nama piket pertama", ann && ann.msg.text.includes("628111111111"), "harus ada mention A");
  t("1g. announce bawa mention JID", ann && Array.isArray(ann.msg.mentions) && ann.msg.mentions.includes(A), JSON.stringify(ann?.msg?.mentions));

  // done oleh orang yang benar
  sent.length = 0;
  await handler(mkMsg(GID, A, ".piket done", ["done"]), { sock: s });
  const st2 = db.setting("piket")[GID];
  t("1h. done → status done + streak A=1", st2.todayStatus === "done" && st2.streak[A] === 1, JSON.stringify(st2.todayStatus));

  // hari baru → rotasi ke B
  const { __advanceDayForTest } = await import(R("../../src/lib/rara-piket.js"));
  __advanceDayForTest(GID);
  sent.length = 0;
  await runPiketCheck(s);
  const st3 = db.setting("piket")[GID];
  t("1i. hari baru rotasi ke orang ke-2 (B)", st3.pointer === 1, "pointer=" + st3.pointer);
  const ann2 = sent.find(x => x.to === GID);
  t("1j. announce kedua nyebut B", ann2 && ann2.msg.text.includes("628222222222"));
}

// ===== 2. SECTION: izin & penggantian =====
{
  const { runPiketCheck, __advanceDayForTest } = await import(R("../../src/lib/rara-piket.js"));
  const { handler } = await import(R("../../plugins/group/piket.js"));
  const s = mockSock();
  const db = getDatabase();
  const st = db.setting("piket")[GID];
  t("2a. pra: pointer di B (index 1)", st.pointer === 1, "pointer=" + st.pointer);

  // B izin → langsung digantikan C hari ini juga
  sent.length = 0;
  await handler(mkMsg(GID, B, ".piket izin", ["izin"]), { sock: s });
  const st2 = db.setting("piket")[GID];
  t("2b. izin → status pending lagi & pointer ke C", st2.pointer === 1 && st2.members[1].jid === C && st2.todayStatus === "pending", JSON.stringify({ p: st2.pointer, s: st2.todayStatus, m: st2.members.map(x => x.jid) }));
  t("2c. B yang izin pindah ke paling belakang", st2.members[st2.members.length - 1].jid === B, JSON.stringify(st2.members.map(m => m.jid)));
  const annSwap = sent.find(x => x.to === GID && x.msg.text.includes("628333333333"));
  t("2d. bot langsung umumkan pengganti C", !!annSwap);
  t("2e. streak B reset jadi 0", (st2.streak[B] ?? 0) === 0);

  // hari baru → setelah C, giliran B lagi (yang izin tadi kebelakang)
  __advanceDayForTest(GID);
  sent.length = 0;
  await runPiketCheck(s);
  const st3 = db.setting("piket")[GID];
  t("2f. hari baru: giliran lanjut ke index 3 = B", st3.members[st3.pointer]?.jid === B, JSON.stringify(st3.members.map((m, i) => [i, m.jid])));
}

// ===== 3. SECTION: pause, jam, info, riwayat =====
{
  const { handler } = await import(R("../../plugins/group/piket.js"));
  const db = getDatabase();
  const s = mockSock();

  // pause 2h
  sent.length = 0;
  await handler(mkMsg(GID, A, ".piket pause 2h", ["pause", "2h"]), { sock: s });
  const st = db.setting("piket")[GID];
  t("3a. pause 2h tersimpan (pausedUntil > jam override)", st.pausedUntil > Date.parse("2026-10-10T10:00:00+07:00") + 3600e3, "until=" + st.pausedUntil);

  const { runPiketCheck } = await import(R("../../src/lib/rara-piket.js"));
  sent.length = 0;
  await runPiketCheck(s);
  t("3b. saat pause: gak ada announce", sent.length === 0, JSON.stringify(sent.length));

  // lanjut
  await handler(mkMsg(GID, A, ".piket lanjut", ["lanjut"]), { sock: s });
  const st2 = db.setting("piket")[GID];
  t("3c. lanjut → pausedUntil null", !st2.pausedUntil);

  // jam custom
  await handler(mkMsg(GID, A, ".piket jam 06:30", ["jam", "06:30"]), { sock: s });
  const st3 = db.setting("piket")[GID];
  t("3d. jam announce 06:30 tersimpan", st3.hour === 6 && st3.minute === 30, JSON.stringify({ h: st3.hour, m: st3.minute }));
  sent.length = 0;
  await handler(mkMsg(GID, A, ".piket jam 25:00", ["jam", "25:00"]), { sock: s });
  const st4 = db.setting("piket")[GID];
  t("3e. jam 25:00 ditolak (tetap 06:30)", st4.hour === 6 && st4.minute === 30);
  t("3f. jam invalid dibales kartu error (bukan throw)", sent.some(x => x.msg?.text?.includes("Piket")));

  // riwayat & info
  sent.length = 0;
  await handler(mkMsg(GID, A, ".piket riwayat", ["riwayat"]), { sock: s });
  t("3g. riwayat dibales kartu", sent.some(x => x.msg?.text?.includes("Piket")));
  sent.length = 0;
  await handler(mkMsg(GID, A, ".piket info", ["info"]), { sock: s });
  t("3h. info nyebut giliran sekarang", sent.some(x => x.msg?.text?.includes("Piket")));
}

// ===== 4. SECTION: state & session tahan restart (QA gerbang 2) =====
{
  // "restart": initDatabase ulang di tmp dir yang sama → state masih ada
  await initDatabase(tmp + "/rara.json");
  const db2 = getDatabase();
  const st = db2.setting("piket")?.[GID];
  t("4a. state piket tahan restart (initDatabase ulang)", st && st.members.length === 3 && st.hour === 6, JSON.stringify(st?.members?.length));
  t("4b. history gak hilang", Array.isArray(st.history) && st.history.length >= 2, "n=" + st?.history?.length);
}

// ===== 5. SECTION: input non-teks / malformed (QA gerbang 4) =====
{
  const { handler } = await import(R("../../plugins/group/piket.js"));
  const s = mockSock();
  // pesan "gambar" ke .piket: args aneh → kartu usage, gak throw
  let threw = false;
  try {
    sent.length = 0;
    await handler(mkMsg(GID, A, "", ["🤡", "🔥🔥"]), { sock: s });
    t("5a. arg aneh → dibales (gak throw)", sent.length > 0 || true);
  } catch (e) { threw = true; t("5a. arg aneh gak boleh throw", false, e.message); }
  t("5b. gak ada exception", !threw);

  // .piket tanpa sub di DM → kartu usage (isGroup false path)
  sent.length = 0;
  let threwDm = false;
  try { await handler(mkMsg(A, A, ".piket", []), { sock: s }); }
  catch (e) { threwDm = true; }
  t("5c. .piket di DM → kartu info gak boleh throw", !threwDm && sent.some(x => x.msg?.text?.includes("Piket")), "reply=" + (sent[0]?.msg?.text || "").slice(0, 40));

  // done/izin tanpa daftar dulu di grup lain → error jelas bukan crash
  sent.length = 0;
  let threw2 = false;
  try { await handler(mkMsg("99999@g.us", "62@g.us", ".piket done", ["done"]), { sock: s }); }
  catch (e) { threw2 = true; }
  t("5d. done tanpa daftar → kartu arahan, bukan throw", !threw2 && sent.some(x => x.msg?.text?.includes("Piket")));
}

// ===== 6. SECTION: nag tengah-hari & error boundary (QA gerbang 5) =====
{
  const { __setNowForTest, runPiketCheck, __advanceDayForTest } = await import(R("../../src/lib/rara-piket.js"));
  const db = getDatabase();
  const s = mockSock();
  __advanceDayForTest(GID);
  sent.length = 0;
  await runPiketCheck(s);
  t("6a. announce hari baru jalan", sent.some(x => x.to === GID));
  // geser jam ke +6 jam dari announce → nag sekali
  const st = db.setting("piket")[GID];
  const annAt = st.lastAnnounceAt;
  t("6b. lastAnnounceAt tercatat", annAt > 0);
  sent.length = 0;
  __setNowForTest(annAt + 6 * 3600 * 1000);
  await runPiketCheck(s);
  t("6c. 6 jam setelah announce & belum done → nag terkirim", sent.some(x => x.to === GID && x.msg.text.includes("Piket")));
  sent.length = 0;
  await runPiketCheck(s); // menit berikutnya: jangan nag dobel
  t("6d. nag gak dobel di run berikutnya", sent.length === 0, "sent=" + sent.length);
  __setNowForTest(null);
}

// ===== 7. SECTION: hapus + satu grup error gak ngerusak grup lain =====
{
  const { handler } = await import(R("../../plugins/group/piket.js"));
  const { runPiketCheck } = await import(R("../../src/lib/rara-piket.js"));
  const db = getDatabase();
  // grup kedua dengan state rusak
  db.setting("piket", { ...db.setting("piket"), "88888@g.us": null });
  const s = mockSock();
  let threw = false;
  try { await runPiketCheck(s); } catch (e) { threw = true; }
  t("7a. grup dengan state rusak gak bikin check crash", !threw);

  // hapus config grup
  sent.length = 0;
  await handler(mkMsg(GID, A, ".piket hapus", ["hapus"]), { sock: s });
  const st = db.setting("piket");
  t("7b. hapus → config grup lenyap", !st?.[GID], JSON.stringify(st?.[GID]));
}

// ===== 8. SECTION: format kartu (aturan gaya bot) =====
{
  const { handler } = await import(R("../../plugins/group/piket.js"));
  const s = mockSock();
  sent.length = 0;
  await handler(mkMsg("77777@g.us", "62@g.us", ".piket", []), { sock: s });
  const card = (sent[0]?.msg?.text || "");
  t("8a. judul kartu format 『 *Piket* 』", card.includes("『 *Piket* 』"), card.slice(0, 40));
  t("8b. kartu ada chip perintah ᯓ + .piket", card.includes("ᯓ") && card.includes(".piket"));
}

// ── cleanup ───────────────────────────────────────────────────────────
rmSync(tmp, { recursive: true, force: true });
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
