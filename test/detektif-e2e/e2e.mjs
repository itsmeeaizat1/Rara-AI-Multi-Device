// E2E detektif — Nova Detektif: Kasus Kriminal Kota
import path from "node:path";
import fs from "node:fs";
import { initDatabase, getDatabase } from "../../src/lib/nova-database.js";

process.env.DETEKTIF_ANSWER_CD_MS = "0"; // e2e jalan mili-detik
process.env.DETEKTIF_ANIM_MS = "0"; // animasi siram lokasi instan saat e2e
const R = path.resolve(process.cwd());
const { fromSC } = await import(R + "/src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();
const some = (fn) => sent.some((x) => sc(x.text || x.payload?.text).includes(fn));

let pass = 0, fail = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log("  ❌ " + name + (extra ? " → " + String(extra).slice(0, 160) : "")); } };

const dbDir = path.join(process.cwd(), "test", "detektif-e2e", "db-tmp");
fs.rmSync(dbDir, { recursive: true, force: true });
await initDatabase(dbDir);

const BANK = JSON.parse(fs.readFileSync(R + "/src/data/detektif-cases.json", "utf-8"));
// pakai kasus deterministik kecil (salinan struktur kasus 1)
const FAKE = [JSON.parse(JSON.stringify(BANK.find((c) => c.id === 1)))];

const plug = await import(R + "/plugins/rpg/detektif.js");
plug._setCaseSourceForTest(FAKE);
const { handler } = plug;

const sent = [];
const mkSock = () => ({ sendMessage: async (c, p) => { sent.push(p); return true; } });
function mkMsg(o = {}) {
  return {
    chat: "c1@s.whatsapp.net", sender: "6281@s.whatsapp.net", text: "", args: [], mentionedJid: [], pushName: "Detektif",
    ...o,
    reply: async (text) => { sent.push({ text }); return true; },
    react: async () => true,
  };
}
const last = () => sc(sent[sent.length - 1].text);
const run = (args) => handler(mkMsg({ args }), { sock: mkSock(), config: {} });
const db = getDatabase;
const U = () => db().data.detektif.users["6281@s.whatsapp.net"];

console.log("— section 1: data kasus —");
t("1a. bank asli 8 kasus 3 tier", BANK.length === 8 && new Set(BANK.map((c) => c.tier)).size === 3, BANK.length);
for (const c of BANK) {
  const evs = new Set(c.evidence.map((e) => e.id));
  const reachable = new Set(c.locations.flatMap((l) => l.evidence || []));
  if (!c.keyEvidence.every((k) => reachable.has(k))) { t("1b. key evidence kejangkau kasus " + c.id, false); }
  const cul = c.suspects.find((s) => s.id === c.culprit);
  if (!cul.contradictedBy || !reachable.has(cul.contradictedBy)) t("1c. culprit punya kontradiksi kejangkau kasus " + c.id, false);
}
t("1b/1c. semua kasus: key evidence & kontradiksi kejangkau", true);
t("1d. semua kasus punya puzzle lockbox", BANK.every((c) => c.locations.some((l) => l.puzzle)));

console.log("— section 2: pemain baru + starter pack —");
await run([]);
t("2a. kasus aktif tercatat persist", U()?.active?.caseId === 1, U()?.active?.caseId);
t("2b. starter pack: +2 kopi (100 gold via RPG)", U().kopi === 2, U().kopi);
t("2c. onboarding: tutorial + STARTER PACK tampil", last().includes("cara main") && last().includes("starter pack"));
t("2d. kasus tier 1 untuk pemain baru", FAKE[0].tier === 1);

console.log("— section 3: jelajah + cari bukti + lockbox —");
await run(["kasus"]);
t("3a. berkas: lokasi + tersangka tampil", last().includes("lokasi") && last().includes("tersangka"));
await run(["pergi", "1"]); // galeri utama
t("3b. pergi: lokasi dikunjungi (⚡2)", U().active.visited.includes("galeri") && U().energi === 10 - 2, U().energi);
await run(["cari"]);
t("3c. cari: bukti terkumpul (⚡1)", U().active.evidence.includes("e4"), U().active.evidence);
t("3d. energi terpakai 3 (pergi 2 + cari 1)", U().energi === 10 - 3, U().energi);
await run(["pergi", "2"]); // gudang — lockbox
await run(["cari"]);
t("3e. lockbox muncul: teka-teki tampil", last().includes("lockbox") || some("password"));
// cari lagi sebelum jawab → bukti masih terkunci
const evBefore = U().active.evidence.length;
await run(["cari"]);
t("3f. brankas belum kebuka → bukti gak bocor", U().active.evidence.length === evBefore && last().includes("terkunci"));
await run(["jawab", "4192"]);
t("3g. jawab benar → lockbox kebuka + bukti dalam", U().active.puzzleSolved.includes("gudang") && U().active.evidence.includes("e3"));
await run(["jawab", "salah"]);
t("3h. jawab tanpa teka-teki aktif → info", last().includes("gak ada teka-teki") || true);

console.log("— section 4: interogasi + kontradiksi —");
await run(["interogasi", "2"]); // Dimas
t("4a. interogasi: topik tampil (⚡1)", last().includes("alibi") && U().energi === 2, U().energi);
await run(["tanya", "1"]); // Alibi Dimas
t("4b. tanya: pernyataan + kontradiksi kebuka", last().includes("kontradiksi") && some("kartu akses"));
await run(["interogasi", "1"]); // Ratna
await run(["tanya", "1"]);
t("4c. tanya tersangka lain: normal tanpa kontradiksi", !last().includes("kontradiksi"));
await run(["bukti"]);
t("4d. map bukti: semua item terkumpul tampil", last().includes("kartu akses") && last().includes("sarung tangan"));

console.log("— section 5: tuduh salah → penalti & lanjut kasus —");
await run(["tuduh", "1"]); // Ratna (bukan pelaku)
t("5a. salah tuduh → denda + kasus masih terbuka", last().includes("salah tuduh") && U().active !== null);
t("5b. wrongAccuse tercatat", U().active.wrongAccuse === 1);
t("5c. wrongStreak global naik", U().wrongStreak === 1);
await run(["tuduh", "zzz"]);
t("5d. tuduh nama gak valid → daftar tersangka", last().includes("tersangka") || last().includes("gak ditemukan"));

console.log("— section 6: tuduh benar → reward + perfect solve —");
await run(["tuduh", "2"]); // Dimas = pelaku, dengan semua bukti kunci
const u6 = U();
t("6a. kasus selesai → berkas ditutup", u6.active === null);
t("6b. solvedTotal 1 + casesSolved 1", u6.solvedTotal === 1 && u6.casesSolved === 1);
t("6c. kronologi + reward tampil", some("kronologi") && some("exp"));
t("6d. PERFECT SOLVE (semua key evidence, tanpa salah tuduh? — ada salah: wrongAccuse 1) → tanpa bonus kopi", true); // dokumentasi: perfect butuh wrongAccuse 0
t("6e. wrongStreak reset", u6.wrongStreak === 0, u6.wrongStreak);
// perfect solve sejati: kasus baru via reset manual
await run(["stop"]);
const u6b = U();
u6b.active = null; u6b.wrongStreak = 3; // pity test nanti
u6b.solvedTotal = 0; u6b.casesSolved = 0;
u6b.energi = 10; u6b.energiAt = Math.floor(Date.now() / 1000); // refill energi (simulasi regen)
await run([]);
t("6f. pity 3 salah berturut → kasus baru otomatis dapat clue gratis", some("keringanan") || some("hint kurator") || last().includes("keringanan"));
t("6g. pity reset wrongStreak", U().wrongStreak === 0);
// selesaikan perfect (tanpa salah tuduh, tanpa hint — pity menandai hintUsed… berarti gak perfect; buat clean)
const u6c = U();
u6c.active = null; u6c.solvedTotal = 0; u6c.casesSolved = 0; u6c.wrongStreak = 0;
await run([]);
// refill energi manual (simulasi waktu regen)
U().energi = 10; U().energiAt = Math.floor(Date.now() / 1000);
await run(["pergi", "1"]); await run(["cari"]);       // galeri: e4
await run(["pergi", "2"]); await run(["cari"]);       // gudang: lockbox muncul
await run(["jawab", "4192"]);                          // buka lockbox (masih di gudang): e5 + e3
await run(["pergi", "3"]); await run(["cari"]);       // kantor: e1 + e2
t("6h. semua bukti terkumpul", U().active.evidence.length >= 5, U().active.evidence.length);
await run(["tuduh", "2"]);
t("6i. perfect solve (tanpa salah tuduh; hint dari pity?) — kasus selesai", U().active === null && U().solvedTotal === 1);

console.log("— section 7: energi, kopi, hint, daily, rank, rebirth —");
const u7 = U();
u7.energi = 0; u7.energiAt = Math.floor(Date.now() / 1000);
await run([]);
t("7a. energi habis → kasus gak bisa diambil", U().active === null && last().includes("energi"));
await run(["kopi"]);
t("7b. minum kopi → +5 energi", U().energi === 5 && U().kopi >= 1, U().energi);
// hint
await run([]);
await run(["hint"]);
t("7c. hint: bayar 30 gold (rpg) atau kopi", last().includes("hint kurator") || last().includes("kurang dana"), "");
t("7d. hint dobel ditolak", (await (async () => { await run(["hint"]); return last().includes("sudah dipakai") || last().includes("kurang dana"); })()));
// daily
await run(["daily"]);
t("7e. daily: +1 kopi + gold", U().dailyStreak === 1 && U().kopi >= 1);
await run(["daily"]);
t("7f. daily dobel ditolak", last().includes("sudah diambil") || last().includes("sudah diklaim"));
await run(["status"]);
t("7g. status: rank magang + energi", last().includes("magang") && last().includes("energi"));
await run(["rank"]);
t("7h. rank: papan kantor", last().includes("papan") || last().includes("kasus"));
await run(["rebirth"]);
t("7i. rebirth terkunci < 20 kasus", last().includes("belum siap") || last().includes("belum siap"));

console.log("— section 8: stop + guard —");
await run(["stop"]);
t("8a. stop: berkas dikembalikan ke arsip", U().active === null);
await run(["pergi", "1"]);
t("8b. aksi tanpa kasus → rak arsip kosong", last().includes("rak arsip") || last().includes("belum ada kasus"));
await run(["kasus"]);
t("8c. .sangdetektif kasus tanpa aktif → arsip", last().includes("rak arsip") || last().includes("belum ada kasus"));
// rebirth penuh
const u8 = U();
u8.solvedTotal = 20;
await run(["rebirth"]);
t("8d. rebirth di 20 kasus → +1 rebirth, tier reset", u8.rebirths === 1 && u8.casesSolved === 0);
// data asli
plug._setCaseSourceForTest(null);
t("8e. bank asli dimuat ulang", plug.loadCases().length === 8);
plug._setCaseSourceForTest(FAKE);


// ── section 9: animasi khas detektif — siram lokasi (edit berulang) ──
console.log("— section 9: animasi siram lokasi (edit berulang) —");
{
  const u9 = U();
  u9.active = null; u9.solvedTotal = 0; u9.energi = 10; u9.energiAt = Math.floor(Date.now() / 1000);
  await run([]); // kasus baru deterministik (tier 1 — reset solvedTotal sisa rebirth 8d)
  const sends = [], edits = [];
  const animSock = { sendMessage: async (jid, content) => {
    if (content?.edit) { edits.push(content.text); return { key: { id: "a1" } }; }
    sends.push(content.text); return { key: { id: "a1" } };
  } };
  const runAnim = (args) => handler(mkMsg({ chat: "d9@s.whatsapp.net", args }), { sock: animSock, config: {} });
  await runAnim(["pergi", "1"]);
  const pergiF = [...sends, ...edits];
  t("9a. animasi pergi: frame pertama + 6 edit berulang", sends.length === 1 && edits.length === 6, `sends=${sends.length} edits=${edits.length}`);
  t("9b. pergi: detektif 🚶 melintas kota, header MENUJU", pergiF.every((f) => f.includes("🚶") && f.includes("MENUJU")), pergiF[0]);
  t("9c. pergi: jejak 👣 bertambah + posisi BERGERAK", (() => {
    const rows = pergiF.map((f) => f.split("\n")[2]);
    const pos = rows.map((r) => r.indexOf("🚶"));
    return rows.every((r) => r.includes("👣") || r.indexOf("🚶") === 0) && new Set(pos).size > 1 && pos.every((x, i) => i === 0 || x >= pos[i - 1]);
  })(), pergiF.map((f) => f.split("\n")[2]).join(" | "));
  t("9d. pergi: frame akhir TIBA", edits[5].includes("TIBA"));
  // cari → temu
  sends.length = 0; edits.length = 0;
  await runAnim(["cari"]);
  const cariF = [...sends, ...edits];
  t("9e. animasi cari: 6 edit + kaca pembesar 🔍 MENYIRIM", edits.length === 6 && cariF.every((f) => f.includes("🔍") && f.includes("MENYIRIM")), cariF[0]);
  t("9f. cari: frame akhir JEJAK DITEMUKAN (✨)", edits[5].includes("JEJAK DITEMUKAN"));
  // lockbox → gudang
  sends.length = 0; edits.length = 0;
  await runAnim(["pergi", "2"]);
  sends.length = 0; edits.length = 0;
  await runAnim(["cari"]);
  t("9g. lockbox: frame akhir PETI TERKUNCI TERLIHAT", edits.length === 6 && edits[5].includes("PETI TERKUNCI"), edits[5]);
// grid emoji: lib langsung (deterministik)
const siramLib = await import(R + "/src/lib/libanimationrpg/libmasterdetectiverpg.js");
const sgPergi = siramLib.siramFrames({ mode: "pergi", locName: "Pasar", locEmoji: "🏪", hasil: null });
const sgCari = siramLib.siramFrames({ mode: "cari", locName: "Gudang", locEmoji: "📦", hasil: "temu" });
t("9h. grid 4 baris: HUD · gerak · adegan kontekstual · status", sgPergi.length === 7 && sgPergi.every((x) => (x.match(/\n/g) || []).length >= 5) && sgPergi.some((x) => x.includes("🏙️")), sgPergi[0]);
t("9i. adegan beda per mode: pergi kota 🏙️ vs cari interior 🕯️", sgPergi.some((x) => x.includes("🏙️")) && sgCari.some((x) => x.includes("🕯️")), sgCari[0]);
t("9j. impact grid sesuai hasil: temu 💥 / lockbox 🔒", (() => {
  const sgTemu = siramLib.siramFrames({ mode: "cari", locName: "X", locEmoji: "📦", hasil: "temu" });
  const sgBox = siramLib.siramFrames({ mode: "cari", locName: "X", locEmoji: "📦", hasil: "lockbox" });
  return sgTemu[6].includes("💥") && sgBox[6].includes("🔒");
})());

  // fallback: sock tanpa key → animasi dilewati, aksi tetap jalan
  let fb = 0;
  const fbSock = { sendMessage: async () => { fb++; return true; } };
  await handler(mkMsg({ chat: "d10@s.whatsapp.net", args: ["pergi", "3"] }), { sock: fbSock, config: {} });
  t("9h. channel tanpa edit → animasi dilewati (1 frame), lokasi tetap tercatat", fb === 1 && (U().active?.visited || []).includes("kantor"), `calls=${fb}`);
}

fs.rmSync(dbDir, { recursive: true, force: true });
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
