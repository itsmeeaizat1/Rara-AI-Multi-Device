// E2E palung — Palung Misteri: 4 zona, oksigen, risiko, event, toko, boss Titik Terdalam, prestasi
import path from "node:path";
import fs from "node:fs";
import { initDatabase, getDatabase } from "../../src/lib/nova-database.js";
import { ensureRpg, saveRpg, getCash } from "../../src/lib/nova-rpg-service.js";

process.env.PALUNG_SELAM_CD_MS = "0"; // e2e anti-flaky
process.env.PALUNG_ANIM_MS = "0";
process.env.PALUNG_CINEMATIC_MS = "0"; // e2e anti-flaky
const R = path.resolve(process.cwd());
const { fromSC } = await import(R + "/src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();
const some = (q) => sent.some((x) => sc(x.text || x).includes(sc(q)));

let pass = 0, fail = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log("  ❌ " + name + (extra ? " → " + String(extra).slice(0, 170) : "")); } };

const dbDir = path.join(process.cwd(), "test", "palung-e2e", "db-tmp");
fs.rmSync(dbDir, { recursive: true, force: true });
await initDatabase(dbDir);

const plug = await import(R + "/plugins/rpg/palung.js");
const { handler, ZONA, TOKO } = plug;

const SENDER = "6281@s.whatsapp.net";
const sent = [];
function mkMsg(o = {}) {
  return {
    chat: "c1@s.whatsapp.net", sender: SENDER, text: "", args: [], pushName: "Penyelam", mentionedJid: [],
    ...o,
    reply: async (x) => { sent.push({ text: typeof x === "string" ? x : x.text }); return true; },
    react: async () => true,
  };
}
const run = (o) => handler(mkMsg(o), { sock: { sendMessage: async () => true }, config: {} });
const last = () => sc(sent[sent.length - 1].text);
const U = () => getDatabase().data.palung.users[SENDER];
function setCash(n) { const r = ensureRpg({ sender: SENDER, pushName: "P" }); r.cash = n; saveRpg({ sender: SENDER }, r); }

console.log("— section 1: mulai —");
t("1a. 4 zona kedalaman, zona 3+ wajib lampu", ZONA.length === 4 && ZONA[2].butuhLampu === true && ZONA[3].butuhLampu === true);
t("1b. zona 4 (Hadal) butuh tabung upgrade", ZONA[3].butuhTabung === 2);
plug._setRandForTest(() => 0.01); // no event, no bahaya
setCash(0);
await run({});
t("1c. mulai: welcome + starter pack", some("SELAMAT DATANG") && some("STARTER PACK"));
t("1d. user terdaftar zona 1 oksigen penuh", U().zona === 1 && U().oksigen === 10 && U().pelampung === 1);
t("1e. starter pack +2.000 uang", getCash({ sender: SENDER }) === 2000);

console.log("— section 2: selam aman —");
await run({ args: ["selam", "aman"] });
t("2a. selam sukses: hasil menyelam di Zona Cahaya", some("HASIL MENYELAM") && last().includes("zona cahaya"));
t("2b. oksigen dipotong (10 → 8)", U().oksigen === 8);
t("2c. selam kedua tanpa cooldown (env 0) tetap jalan", (await run({ args: ["selam"] }), U().oksigen === 6));
t("2d. stats selam tercatat", U().stats.selam === 2);
t("2e. jalur tak dikenal ditolak", (await run({ args: ["selam", "ngawur"] }), some("JALUR TIDAK KENAL")));

console.log("— section 3: risiko & bahaya —");
plug._setRandForTest(() => 0.2); // bahaya risiko ON (0.2 < 0.35), tanpa event (0.2 > 0.18)
await run({ args: ["selam", "risiko"] });
t("3a. risiko: pelampung darurat menyelamatkan (tidak turun hasil)", some("PELAMPUNG DARURAT MENYELAMATKAN") && U().pelampung === 0);
await run({ args: ["selam", "risiko"] });
t("3b. risiko tanpa pelampung: kena bahaya (loot -30%, -1 oksigen)", U().stats.bahaya === 1, `bahaya=${U().stats.bahaya} o2=${U().oksigen}`);
t("3c. oksigen cukup dipotong risiko+bahaya (0 → dari 1)", U().oksigen === 0, `o2=${U().oksigen}`);
await run({ args: ["selam", "risiko"] });
t("3d. oksigen habis → ditolak (butuh 3)", some("OKSIGEN HABIS"));

console.log("— section 4: naik & istirahat —");
await run({ args: ["naik"] });
t("4a. naik: oksigen penuh kembali", U().oksigen === U().maxOksigen && some("KE PERMUKAAN"));
U().oksigen = 5; // turunkan manual biar bonus istirahat kelihatan
setCash(100);
await run({ args: ["istirahat"] });
t("4b. istirahat: +3 oksigen (5 → 8), uang dipotong", U().oksigen === 8, `o2=${U().oksigen}`);
t("4c. istirahat uang habis → ditolak", (setCash(0), await run({ args: ["istirahat"] }), some("KURANG UANG")));

console.log("— section 5: toko & beli —");
await run({ args: ["toko"] });
t("5a. toko menampilkan 4 barang", some("TABUNG") && some("LAMPU") && some("PELAMPUNG") && some("SONAR"));
setCash(0);
await run({ args: ["beli", "lampu"] });
t("5b. beli tanpa uang → ditolak", some("KURANG UANG"));
setCash(2000);
await run({ args: ["beli", "lampu"] });
t("5c. beli lampu sukses (500)", U().lampu === true && getCash({ sender: SENDER }) === 1500);
await run({ args: ["beli", "lampu"] });
t("5d. lampu dobel → SUDAH PUNYA", some("SUDAH PUNYA"));
await run({ args: ["beli", "tabung"] });
t("5e. beli tabung: maks oksigen +2 (12)", U().maxOksigen === 12, `max=${U().maxOksigen}`);
await run({ args: ["beli", "ngawur"] });
t("5f. barang tak ada ditolak", some("BARANG TAK ADA"));

console.log("— section 6: gerbang zona —");
U().zona = 3; U().lampu = false; U().oksigen = 10;
await run({ args: ["selam", "aman"] });
t("6a. zona 3 tanpa lampu → TERLALU GELAP", some("TERLALU GELAP"));
U().lampu = true; U().dives = 4; // 1 lagi naik zona
plug._setRandForTest(() => 0.01);
await run({ args: ["selam", "aman"] });
t("6b. zona 3 selam sukses & kedalaman baru terbuka (zona 4)", U().zona === 4 && some("KEDALAMAN BARU TERBUKA"));
U().maxOksigen = 12; // kurang (butuh 14)
await run({ args: ["selam", "aman"] });
t("6c. zona Hadal tabung kurang → TEKANAN TERLALU BESAR", some("TEKANAN TERLALU BESAR"));
U().maxOksigen = 14; U().oksigen = 14;
await run({ args: ["selam", "aman"] });
t("6d. zona Hadal dengan gear lengkap → jalan", U().zona === 4 && some("HADAL"));

console.log("— section 7: boss Titik Terdalam —");
U().dives = 5; // 1 lagi boss (DIVES_BOSS 6)
await run({ args: ["selam", "aman"] });
t("7a. boss Sesuatu di Dasar Palung + Titik Terdalam +1", some("SESUATU DI DASAR PALUNG") && U().titik === 1);
t("7b. setelah titik: naik ke Zona Cahaya (ekspedisi baru)", U().zona === 1 && U().dives === 0);
t("7c. reward kristal +3", U().kristal >= 3, `kristal=${U().kristal}`);
await run({ args: ["top"] });
t("7d. leaderboard: penyelam tampil", some("PAPAN LEGENDA PALUNG") && some(SENDER.split("@")[0]));
await run({ args: ["prestasi"] });
t("7e. prestasi: lencana +1, rank Rare, gear reset", U().lencana === 1 && U().lampu === false && some("RARE"));
t("7f. prestasi tanpa titik → BELUM LAYAK", (await run({ args: ["prestasi"] }), some("BELUM LAYAK")));

console.log("— section 8: daily —");
await run({ args: ["daily"] });
t("8a. daily: bonus harian + streak 1", some("BONUS HARIAN PENYELAM") && U().dailyStreak === 1);
await run({ args: ["daily"] });
t("8b. daily dobel → SUDAH DIKLAIM", some("SUDAH DIKLAIM"));

const pos2 = () => animFrames.map((f) => f.text.split("\n")[2].indexOf("\u{1F93F}")).join(",");
console.log("— section 10: sub tak dikenal → bantuan —");
await run({ args: ["ngawur"] });
t("10a. subcommand tak dikenal → menu bantuan", some("PALUNG MISTERI"));

console.log("— section C: ANIMASI CINEMATIC (lib libtrenchdiverrpg, gaya Nintendo) —");
const animLib2 = await import(R + "/src/lib/libanimationrpg/libtrenchdiverrpg.js");
const { sceneTotalMs } = await import(R + "/src/lib/nova-anim-runner.js");
const animFramesP = [];
const animSockP = { sendMessage: async (jid, content) => {
  if (content?.edit) { animFramesP.push({ edit: true, text: content.text }); return { key: { id: "p1" } }; }
  return { key: { id: "p1" } };
} };
U().zona = 1; U().oksigen = 10; U().maxOksigen = 10; U().dives = 0; U().titik = 0; U().lampu = false; U().pelampung = 0;
plug._setRandForTest(() => 0.99); // tanpa event/bahaya
await handler(mkMsg({ args: ["selam", "aman"] }), { sock: animSockP, config: {} });
// zona 1 aman: perahu 2 + selam (3+1=4) + loot 3 = 9 frame → 8 edit
t("Ca. selam: cinematic DIKIRIM lalu DIEDIT berulang (9 frame = 8 edit)", animFramesP.length === 8, animFramesP.length);
t("Cb. semua frame pakai key edit sama", animFramesP.length > 0 && animFramesP.every((f) => f.edit === true));
t("Cc. selam vertikal khas palung: penyelam turun kolom + gelembung", animFramesP.filter((f) => f.text.includes("🤿")).length >= 3 && animFramesP.some((f) => f.text.includes("🫧")));
t("Cd. frame final: loot naik berdetak full", /\+\d+ ✅/.test(animFramesP[animFramesP.length - 1].text));
let tanpaKeyP = 0;
await handler(mkMsg({ args: ["selam", "aman"] }), { sock: { sendMessage: async () => { tanpaKeyP++; return true; } }, config: {} });
t("Ce. tanpa key edit → cinematic senyap, selam tetap jalan", tanpaKeyP === 1 && U().dives >= 2, `calls=${tanpaKeyP}`);
animFramesP.length = 0;
U().zona = 4; U().dives = 5; U().lampu = true; U().maxOksigen = 14; U().oksigen = 14; U().pelampung = 1;
plug._setRandForTest(() => 0.01); // bahaya (risiko) + event mutiara
await handler(mkMsg({ args: ["selam", "risiko"] }), { sock: animSockP, config: {} });
t("Cf. zona 4 + bahaya + event + boss: edit LEBIH BANYAK dari zona 1", animFramesP.length > 8, animFramesP.length);
t("Cg. babak bahaya pelampung terlihat", animFramesP.some((f) => f.text.includes("PELAMPUNG DARURAT")));
t("Ch. babak boss Sesuatu di Dasar Palung terlihat", animFramesP.some((f) => f.text.includes("TITIK TERDALAM") || f.text.includes("RAKSASA")));
animLib2._setTrenchdiverAnimMsForTest(700);
const scLow = animLib2.selamCinematic({ zona: 1, zonaNama: "Zona Cahaya", zonaTile: "🌊", jalur: "aman", bahaya: false, selamat: false, event: null, loot: 40, boss: false });
const scHigh = animLib2.selamCinematic({ zona: 4, zonaNama: "Zona Hadal", zonaTile: "⬛", jalur: "risiko", bahaya: true, selamat: true, event: "kapal", loot: 300, boss: true });
t("Ci. durasi nyesuaikan situasi: hadal+event+boss > zona 1 aman", sceneTotalMs(scHigh, 700) > sceneTotalMs(scLow, 700), sceneTotalMs(scHigh, 700) + " vs " + sceneTotalMs(scLow, 700));
t("Cj. selam normal ±7-10 dtk", sceneTotalMs(scLow, 700) >= 7000 && sceneTotalMs(scLow, 700) <= 10000, "ms=" + sceneTotalMs(scLow, 700));
t("Ck. naik permukaan: cinematic pendek sendiri", sceneTotalMs(animLib2.naikCinematic({}), 700) >= 1500 && sceneTotalMs(animLib2.naikCinematic({}), 700) <= 3500, "ms=" + sceneTotalMs(animLib2.naikCinematic({}), 700));
t("Cl. grid emoji: frame selam 4 baris (HUD · kolom · gelap · status)", (() => {
  const f = animLib2.selamCinematic({ zona: 3, zonaNama: "Zona Gelap", zonaTile: "🌑", jalur: "risiko", bahaya: true, selamat: true, event: "hiu", loot: 200, boss: false }).flatMap((x) => x.frames.map(String));
  return f.every((x) => x.includes("```")) && f.some((x) => (x.match(/\n/g) || []).length >= 5);
})());
t("Cm. grid situasional: kolom makin gelap saat turun (⬛)", (() => {
  const f = animLib2.selamCinematic({ zona: 1, zonaNama: "Zona Cahaya", zonaTile: "🌊", jalur: "aman", bahaya: false, selamat: false, event: null, loot: 40, boss: false }).flatMap((x) => x.frames.map(String));
  return f.some((x) => x.includes("⬛"));
})());
t("Cn. event grid impact: hiu 💥", (() => {
  const f = animLib2.selamCinematic({ zona: 2, zonaNama: "Zona Senja", zonaTile: "🌑", jalur: "aman", bahaya: false, selamat: false, event: "hiu", loot: 100, boss: false }).flatMap((x) => x.frames.map(String));
  return f.some((x) => x.includes("💥"));
})());
animLib2._setTrenchdiverAnimMsForTest(0);

fs.rmSync(dbDir, { recursive: true, force: true });
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
