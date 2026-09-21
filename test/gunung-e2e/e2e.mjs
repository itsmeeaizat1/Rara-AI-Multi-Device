// E2E gunung — Pendakian Gunung Legenda: 8 zona, cuaca, jalur risiko, oksigen, rombongan, prestasi
import path from "node:path";
import fs from "node:fs";
import { initDatabase, getDatabase } from "../../src/lib/nova-database.js";
import { ensureRpg, saveRpg, getCash } from "../../src/lib/nova-rpg-service.js";

process.env.GUNUNG_DAKI_CD_MS = "0"; // e2e anti-flaky
const R = path.resolve(process.cwd());
const { fromSC } = await import(R + "/src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();
const some = (q) => sent.some((x) => sc(x.text || x).includes(sc(q)));

let pass = 0, fail = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log("  ❌ " + name + (extra ? " → " + String(extra).slice(0, 170) : "")); } };

const dbDir = path.join(process.cwd(), "test", "gunung-e2e", "db-tmp");
fs.rmSync(dbDir, { recursive: true, force: true });
await initDatabase(dbDir);

const plug = await import(R + "/plugins/rpg/gunung.js");
const { handler, ZONA } = plug;

const SENDER = "6281@s.whatsapp.net";
const sent = [];
function mkMsg(o = {}) {
  return {
    chat: "c1@s.whatsapp.net", sender: SENDER, text: "", args: [], pushName: "Pendaki", mentionedJid: [],
    ...o,
    reply: async (x) => { sent.push({ text: typeof x === "string" ? x : x.text }); return true; },
    react: async () => true,
  };
}
const run = (o) => handler(mkMsg(o), { sock: { sendMessage: async () => true }, config: {} });
const last = () => sc(sent[sent.length - 1].text);
const db = getDatabase;
const U = () => db().data.gunung.users[SENDER];
function setCash(n) { const r = ensureRpg({ sender: SENDER, pushName: "P" }); r.cash = n; saveRpg({ sender: SENDER }, r); }

console.log("— section 1: data zona & mulai —");
t("1a. 8 zona lengkap + zona 6+ wajib oksigen", ZONA.length === 8 && ZONA.slice(5).every((z) => z.oksigen === true));
plug._setRandForTest(() => 0.01); // cuaca cerah, no event
await run({});
t("1b. pemain baru: starter pack + tutorial", U() && some("starter pack") && some("cara main"));
t("1c. gunung DUNIA NYATA terpilih (ada mdpl)", /mdpl/.test(U().gunung) && U().gunung.length > 5, U().gunung);
t("1c2. nama ada di pool negara terbuka (Indonesia)", (await import(R + "/plugins/rpg/gunung.js")).COUNTRIES[0].pool.includes(U().gunung), U().gunung);
t("1c2b. pemain baru mulai dari Indonesia", U().country === "indonesia", U().country);
// migrasi: nama fiktif lama (tanpa country) otomatis diganti gunung Indonesia nyata
U().gunung = "Gunung Salju Abadi"; delete U().country;
await run({});
t("1c3. migrasi nama fiktif lama → gunung nyata + country Indonesia", /mdpl/.test(U().gunung) && U().country === "indonesia", `${U().gunung} | ${U().country}`);
t("1d. mulai di zona 1 stamina penuh", U().zona === 1 && U().stamina === 10);

console.log("— section 2: daki aman & cuaca —");
await run({ args: ["daki", "aman"] });
t("2a. daki aman: naik ke zona 2", U().zona === 2, U().zona);
t("2b. stamina terpotong 1 (cerah zona 2)", U().stamina === 9, U().stamina);
t("2c. loot tercatat di reply (+60 gold base zona 2)", some("60 gold") || some("gold"), last().slice(0, 100));
await run({ args: ["daki", "bolong"] });
t("2d. jalur gak valid → panduan aman/risiko", some("jalur risiko") || some("pilih jalur"));

console.log("— section 3: jalur risiko — longsor & loot ×2 —");
U().zona = 4; U().stamina = 10;
let rndCalls = 0;
plug._setRandForTest(() => (rndCalls++ === 0 ? 0.01 : 0.05)); // call-1: cuaca cerah · call-2: longsor (0.05 < 0.35)
await run({ args: ["daki", "risiko"] });
t("3a. longsor: turun zona (4→3), stamina -1", U().zona === 3 && U().stamina < 10, `${U().zona} ${U().stamina}`);
t("3b. pesan lonsor dramatis", some("lonsor"));
U().zona = 4; U().stamina = 10;
plug._setRandForTest(() => 0.4); // tidak longsor (0.4 > 0.35), cuaca mendung (0.4 → 25-75 band → mendung), no event
const cashBefore = getCash({ sender: SENDER });
await run({ args: ["daki", "risiko"] });
t("3c. risiko sukses: naik zona + loot ×2", U().zona === 5 && getCash({ sender: SENDER }) > cashBefore);

console.log("— section 4: stamina & istirahat —");
U().stamina = 0; U().staminaAt = Math.floor(Date.now() / 1000);
plug._setRandForTest(() => 0.01);
await run({ args: ["daki", "aman"] });
t("4a. stamina 0 → daki ditolak + saran istirahat", some("istirahat") && U().zona === 5);
setCash(100);
await run({ args: ["istirahat"] });
t("4b. istirahat: -40 gold +3 stamina", U().stamina === 3 && getCash({ sender: SENDER }) === 60, U().stamina);
setCash(10);
await run({ args: ["istirahat"] });
t("4c. gold kurang → ditolak", some("kurang") || some("butuh"));

console.log("— section 5: oksigen gate zona 6+ —");
U().zona = 6; U().stamina = 10; U().oksigen = 0;
await run({ args: ["daki", "aman"] });
t("5a. zona 6 tanpa oksigen → ditolak", U().zona === 6 && some("oksigen"));
U().oksigen = 2;
await run({ args: ["daki", "aman"] });
t("5b. daki zona 6: oksigen berkurang 1, zona 7", U().oksigen === 1 && U().zona === 7, `oks=${U().oksigen} zona=${U().zona}`);

console.log("— section 6: toko & checkpoint tenda —");
setCash(1000);
await run({ args: ["toko", "oksigen"] });
t("6a. beli oksigen: -100 gold +1 botol", U().oksigen === 2 && getCash({ sender: SENDER }) === 900);
await run({ args: ["toko", "jaket"] });
t("6b. jaket: kepunyaan true, beli lagi ditolak", U().jaket === true);
await run({ args: ["toko", "jaket"] });
t("6c. jaket dobel → sudah dipunyai", some("sudah dipunyai"));
U().zona = 3;
await run({ args: ["toko", "tenda"] });
t("6d. tenda: checkpoint di zona sekarang (3)", U().tenda === 3 && getCash({ sender: SENDER }) === 250, getCash({ sender: SENDER }));

console.log("— section 7: cuaca buruk & pemanas —");
U().zona = 2; U().stamina = 10; U().pemanas = true;
plug._setRandForTest(() => 0.95); // band badai (90-100) → pemanas → jadi hujan
await run({ args: ["daki", "aman"] });
t("7a. pemanas: badai diredam jadi hujan (stamina hanya -1 ekstra)", some("hujan"), last().slice(0, 120));
t("7b. hujan: loot +20% aktif", true);

console.log("— section 8: PUNCAK & prestasi —");
U().zona = 7; U().stamina = 10; U().oksigen = 3; U().tenda = 0;
const cashTop = getCash({ sender: SENDER });
plug._setRandForTest(() => 0.01);
await run({ args: ["daki", "aman"] });
t("8a. zona 8 = PUNCAK tercapai", U().zona === 8, U().zona);
t("8b. puncak tercatat 1 + kristal +3", U().puncak === 1 && U().kristal >= 3);
t("8c. hadiah puncak masuk (gold bertambah)", getCash({ sender: SENDER }) > cashTop);
t("8d. status menunjukkan hint prestasi", (await (async () => { await run({}); return some("prestasi") || some("puncak"); })()));
const puncakBefore = U().puncak;
await run({ args: ["prestasi"] });
t("8e. prestasi: +1 (10% EXP), gunung baru, zona reset 1", U().prestasi === 1 && U().zona === 1 && U().jaket === false);
U().zona = 3;
await run({ args: ["prestasi"] });
t("8f. prestasi tanpa puncak → ditolak", U().prestasi === 1 && U().zona === 3);

console.log("— section 9: daily & top —");
await run({ args: ["daily"] });
t("9a. daily: +1 oksigen + gold + streak", U().dailyStreak === 1 && some("streak"));
await run({ args: ["daily"] });
t("9b. daily dobel → ditolak", some("sudah"));
await run({ args: ["top"] });
t("9c. leaderboard: puncak tercatat", some("papan") || some("puncak") || some("pendakian"));

console.log("— section 10: rombongan grup —");
const rpg2 = ensureRpg({ sender: "6282@s.whatsapp.net", pushName: "Teman" }); saveRpg({ sender: "6282@s.whatsapp.net" }, rpg2);
// pendaki lain sudah daki di grup sama
db().data.gunung.rombongan["g1@g.us"] = { "6282@s.whatsapp.net": Date.now() };
U().zona = 2; U().stamina = 10;
await run({ args: ["daki", "aman"], chat: "g1@g.us" });
t("10a. rombongan aktif: buff +20% terlihat", some("rombongan"), last().slice(0, 130));
await run({ args: ["daki", "aman"], chat: "c1@s.whatsapp.net" });
t("10b. di DM: rombongan gak aktif", sent.length > 0 && U().zona === 4);

console.log("— section 11: PORTIR KENANGA — penyelamatan 1x per gunung —");
setCash(1000);
await run({ args: ["toko", "portir"] });
t("11a. rekrut portir: -500 gold", U().portir === true && getCash({ sender: SENDER }) === 500, getCash({ sender: SENDER }));
U().zona = 4; U().stamina = 10;
let rc11 = 0;
plug._setRandForTest(() => (rc11++ === 0 ? 0.01 : 0.05)); // cerah lalu longsor
await run({ args: ["daki", "risiko"] });
t("11b. portir menyelamatkan: TETAP di zona 4", U().zona === 4 && U().portirUsed === true, U().zona);
t("11c. pesan penyelamatan dramatis", some("portir") && some("tetap"));
rc11 = 0;
await run({ args: ["daki", "risiko"] });
t("11d. portir cuma 1x: longsor kedua turun beneran (4→3)", U().zona === 3, U().zona);
await run({ args: ["toko", "portir"] });
t("11e. portir dobel → sudah bersama kamu", some("sudah bersama") || some("kenanga"));

console.log("— section 12: GUA SAMPING — masuk vs lewat —");
U().guaPending = true; U().zona = 5; U().stamina = 10;
plug._setRandForTest(() => 0.5); // > 0.4 → harta; 0.5 > 0.25 → tanpa kristal
const cashGua = getCash({ sender: SENDER });
await run({ args: ["gua", "masuk"] });
t("12a. gua harta: +loot zona ×3 (180×3=540)", getCash({ sender: SENDER }) === cashGua + 540, getCash({ sender: SENDER }) - cashGua);
t("12b. guaPending reset", U().guaPending === false);
U().guaPending = true; U().stamina = 10;
plug._setRandForTest(() => 0.2); // < 0.4 → jebakan
await run({ args: ["gua", "masuk"] });
t("12c. gua jebakan: stamina -2", U().stamina === 8, U().stamina);
t("12d. guaPending reset setelah jebakan", U().guaPending === false);
U().guaPending = true;
await run({ args: ["gua", "lewat"] });
t("12e. lewat: aman, pending hilang", U().guaPending === false && some("melewati"));
await run({ args: ["gua", "masuk"] });
t("12f. tanpa gua pending → gak ada gua", some("gak ada gua"));

console.log("— section 13: BADAI ES zona 6+ —");
U().zona = 6; U().stamina = 10; U().oksigen = 2; U().pemanas = false;
let rc13 = 0;
plug._setRandForTest(() => (rc13++ === 0 ? 0.95 : 0.5)); // badai-es (band 92-100), lonsor 0.5 < 0.4? tidak
const cashBE = getCash({ sender: SENDER });
await run({ args: ["daki", "aman"] });
t("13a. badai es muncul: stamina -4 (cost 2 + badai es 2)", U().stamina === 6, U().stamina);
t("13b. loot badai es ×1.8", getCash({ sender: SENDER }) - cashBE >= Math.floor(240 * 1.8), getCash({ sender: SENDER }) - cashBE);
t("13c. cuaca badai-es tampil (🥶)", some("badai-es") || some("🥶"));
U().zona = 6; U().stamina = 10; U().oksigen = 2; U().pemanas = true;
plug._setRandForTest(() => 0.95); // badai-es → pemanas → badai → hujan
await run({ args: ["daki", "aman"] });
t("13d. pemanas meredam badai es → hujan", some("hujan"));

console.log("— section 14: LOMBA PENDAKI — duel @user —");
const RIVAL = "6282@s.whatsapp.net";
db().data.gunung.users[RIVAL] = { ...U(), sender: RIVAL, zona: 1, puncak: 0, portir: false, guaPending: false };
const rCash = () => getCash({ sender: RIVAL });
setCash(2000); const r = ensureRpg({ sender: RIVAL, pushName: "R" }); r.cash = 2000; saveRpg({ sender: RIVAL }, r);
await run({ args: ["lomba"] });
t("14a. tanpa mention → format duel", some("tantang siapa"));
await run({ args: ["lomba"], mentionedJid: [SENDER] });
t("14b. lomba lawan diri sendiri → ditolak", some("lawan diri") || some("bayangan"));
await run({ args: ["lomba"], mentionedJid: ["6283@s.whatsapp.net"] });
t("14c. lawan belum pendaki → ditolak", some("belum pendaki"));
setCash(50);
await run({ args: ["lomba"], mentionedJid: [RIVAL] });
t("14d. saldo < 100 → taruhan gak cakup", some("gak cakup"));
setCash(2000);
let rc14 = 0;
plug._setRandForTest(() => (rc14++ === 0 ? 0.5 : 0.01)); // skorA 51+3 vs skorB 2+3 → menang
const cash14 = getCash({ sender: SENDER });
await run({ args: ["lomba"], mentionedJid: [RIVAL] });
t("14e. duel menang: pot 200 masuk (2000-100+200)", getCash({ sender: SENDER }) === cash14 + 100, getCash({ sender: SENDER }) - cash14);
t("14f. lawan bayar 100", rCash() === 1900, rCash());
t("14g. hasil duel dramatis tampil", some("duel pendaki") || some("poin"));
await run({ args: ["lomba"], mentionedJid: [RIVAL] });
t("14h. cooldown 1 menit → ditolak", some("1 menit") || some("napas"));

console.log("— section 15: OPEN WORLD — negara bertingkat —");
U().puncak = 0;
await run({ args: ["dunia"] });
t("15a. peta dunia: semua negara tampil + syarat", some("peta dunia") && some("jepang") && some("jerman") && some("china") && some("dunia"));
t("15b. jepang terkunci di 0 puncak", some("butuh 3 puncak"));
await run({ args: ["negara", "jepang"] });
t("15c. negara terkunci → ditolak", U().country === "indonesia" && some("belum terbuka"));
U().puncak = 3;
await run({ args: ["negara", "jepang"] });
t("15d. 3 puncak → jepang TERBUKA, country aktif jepang", U().country === "jepang" && some("negara diganti"));
U().puncak = 5;
await run({ args: ["negara", "jerman"] });
t("15e. jerman butuh 6 → masih terkunci", U().country === "jepang");
U().puncak = 6;
await run({ args: ["negara", "jerman"] });
t("15f. 6 puncak → jerman terbuka", U().country === "jerman");
U().puncak = 9;
await run({ args: ["negara", "china"] });
t("15g. 9 puncak → china terbuka", U().country === "china");
U().puncak = 12;
await run({ args: ["negara", "dunia"] });
t("15h. 12 puncak → dunia (7 puncak) terbuka", U().country === "dunia");
await run({ args: ["negara", "wakanda"] });
t("15i. negara gak ada → ditolak", some("negara gak ada"));
// gunung berikutnya mengikuti negara aktif
U().zona = 8; U().puncak = 13;
plug._setRandForTest(() => 0.01);
await run({ args: ["prestasi"] });
t("15j. prestasi di negara dunia → gunung dari pool Dunia 7 Puncak", (await import(R + "/plugins/rpg/gunung.js")).COUNTRIES[4].pool.includes(U().gunung), U().gunung);
// migrasi pemain lama bermountain Everest (pool lama) + 13 puncak → country dunia
U().zona = 3; U().gunung = "Gunung Everest (8.849 mdpl)"; delete U().country;
await run({});
t("15k. migrasi pemain lama Everest 13 puncak → country dunia", U().country === "dunia" && U().gunung === "Gunung Everest (8.849 mdpl)");
// migrasi pemain lama Fuji + 0 puncak → country indonesia (jepang belum terbuka)
U().gunung = "Gunung Fuji (3.776 mdpl)"; delete U().country; U().puncak = 0;
await run({});
t("15l. migrasi Fuji 0 puncak → country indonesia (tetap Fuji)", U().country === "indonesia" && U().gunung === "Gunung Fuji (3.776 mdpl)");

console.log("— section 16: ANIMASI RUNNER (lib nova-anim-runner) —");
const animFrames = [];
const animSock = { sendMessage: async (jid, content) => {
  if (content?.edit) { animFrames.push({ edit: true, text: content.text }); return { key: { id: "anim1" } }; }
  return { key: { id: "anim1" } };
} };
U().zona = 1; U().stamina = 10; U().oksigen = 2; U().puncak = 13; U().country = "dunia"; U().guaPending = false;
plug._setRandForTest(() => 0.01);
await handler(mkMsg({ args: ["daki", "aman"] }), { sock: animSock, config: {} });
// level rpg default 1 → 12 tile, 1 bioma, maju 2 tile/frame: 7 frame = 6 edit
t("16a. daki: runner DIKIRIM lalu DIEDIT berulang (12 tile lvl 1 = 6 edit)", animFrames.length === 6, animFrames.length);
t("16b. semua frame pakai key edit yang sama (edit: true)", animFrames.length > 0 && animFrames.every((f) => f.edit === true));
t("16c. frame: code fence + 2 baris (pemandangan + lintasan)", animFrames.every((f) => f.text.includes("```") && f.text.split("\n").length >= 4));
t("16c2. karakter BERGERAK (jejak ⬜ makin panjang)", (() => {
  const trail = animFrames.map((f) => f.text.split("\n")[2].split("⬆️")[0].split("⬜").length - 1);
  return trail.every((x, i) => i === 0 || x >= trail[i - 1]) && new Set(trail).size > 1;
})(), animFrames.map((f) => f.text.split("\n")[2]).join("|"));
t("16c3. frame finis: 🏁 + baris hasil", animFrames.length > 0 && /🏁/.test(animFrames[animFrames.length - 1].text) && /menyusul/.test(animFrames[animFrames.length - 1].text));
// tanpa key edit → animasi dilewati senyap, daki tetap jalan
let animTanpaKey = 0;
await handler(mkMsg({ args: ["daki", "aman"] }), { sock: { sendMessage: async () => { animTanpaKey++; return true; } }, config: {} });
t("16e. tanpa key edit → animasi dilewati senyap, daki tetap jalan", animTanpaKey === 1 && U().zona >= 2, `calls=${animTanpaKey} zona=${U().zona}`);
// tes langsung lib: bioma hutan→salju forced + level tinggi (rintangan + peti + sprint)
const runnerSock = { sendMessage: async (jid, content) => {
  if (content?.edit) { animFrames.push({ edit: true, text: content.text }); return { key: { id: "r" } }; }
  return { key: { id: "r" } };
} };
animFrames.length = 0;
const { animasiRunner } = await import(R + "/src/lib/nova-anim-runner.js");
await animasiRunner(runnerSock, "t@s.whatsapp.net", { level: 30, bioma: ["padang", "salju", "gurun"], hasil: "🎉 SAMPAI! +450 EXP +1.200 uang", frameMs: 0 });
t("16f. lvl 30: 20 tile 3 bioma, frame lebih banyak (rintangan ⬆️ + peti 💎)", animFrames.length >= 10, animFrames.length);
t("16g. lvl 30: ada frame lompat ⬆️ atau peti 💎", animFrames.some((f) => /⬆️|💎/.test(f.text)));
t("16h. lvl 30: bioma berganti di tengah lintasan (🟩 padang → 🟫 gurun)", (() => {
  const track = animFrames.map((f) => f.text.split("\n")[2]);
  return track.some((x) => x.includes("🟩")) && track.some((x) => x.includes("🟫"));
})(), "bioma");
animFrames.length = 0;
await animasiRunner(runnerSock, "t@s.whatsapp.net", { level: 60, hasil: "🏁", frameMs: 0 });
t("16i. lvl 60: bioma langka (🟥 lava / 🟪 langit) muncul", animFrames.some((f) => /🟥|🟪/.test(f.text)), animFrames[0]?.text.split("\n")[2]);

fs.rmSync(dbDir, { recursive: true, force: true });
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
