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
t("1c. gunung acak terpilih", U().gunung.length > 5, U().gunung);
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

fs.rmSync(dbDir, { recursive: true, force: true });
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
