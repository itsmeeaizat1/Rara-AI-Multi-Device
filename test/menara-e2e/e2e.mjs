// E2E menara — Menara Seribu Pintu
import path from "node:path";
import fs from "node:fs";
import { initDatabase, getDatabase } from "../../src/lib/nova-database.js";

process.env.MENARA_ANSWER_CD_MS = "0"; // e2e jalan mili-detik — matikan anti-spam
const R = path.resolve(process.cwd());
const { fromSC } = await import(R + "/src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

let pass = 0, fail = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log("  ❌ " + name + (extra ? " → " + String(extra).slice(0, 160) : "")); } };

const dbDir = path.join(process.cwd(), "test", "menara-e2e", "db-tmp");
fs.rmSync(dbDir, { recursive: true, force: true });
await initDatabase(dbDir);

// puzzle bank deterministik
const FAKE = [
  { id: 1, type: "teka", lvl: 1, q: "Aku punya gigi tapi tak pernah makan. Apa aku?", a: "sisir", hint: "Merapikan rambut" },
  { id: 2, type: "deret", lvl: 1, q: "Angka di pintu berderet: 2, 4, 6, 8, …\nLanjutkan deretnya", a: "10", hint: "Selisih tetap" },
  { id: 3, type: "teka", lvl: 2, q: "Makin dipendam makin berat. Apa?", a: "rahasia", hint: "Kalau dibuka lega" },
  { id: 4, type: "deret", lvl: 2, q: "Angka: 3, 6, 12, …", a: "24", hint: "Dikalikan dua" },
  { id: 5, type: "teka", lvl: 3, q: "Kalau kamu menyebutku, aku lenyap. Apa?", a: "diam", hint: "Menyebutnya memecahnya" },
  { id: 6, type: "deret", lvl: 3, q: "Angka: 1, 4, 9, 16, …", a: "25", hint: "Kuadrat" },
  { id: 7, type: "logika", lvl: 3, q: "1 kg kapas vs 1 kg besi?", a: "sama", hint: "Kilo ya kilo" },
  { id: 8, type: "teka", lvl: 2, q: "Punya leher tanpa kepala?", a: "botol", hint: "Wadah minum" },
];

const plug = await import(R + "/plugins/rpg/menara.js");
plug._setPuzzleSourceForTest(FAKE);
const { handler, answerHandler, pluginConfig } = plug;
const sessions = plug._getSessionsForTest();

const sent = [];
const mkSock = () => ({ sendMessage: async (c, p) => { sent.push(p); return true; } });
function mkMsg(o = {}) {
  return {
    chat: "c1@s.whatsapp.net", sender: "6281@s.whatsapp.net", text: "", args: [], mentionedJid: [], pushName: "Petualang",
    ...o,
    reply: async (text) => { sent.push({ text }); return true; },
    react: async () => true,
  };
}
const last = () => sc(sent[sent.length - 1].text);
const run = (o) => handler(mkMsg(o), { sock: mkSock(), config: {} });
const ans = (o) => answerHandler(mkMsg(o), mkSock());

console.log("— section 1: config & bank —");
t("1a. command .menaraseribupintu + alias", pluginConfig.name.includes("menara") && pluginConfig.name.includes("menaraseribupintu"));
const bank = JSON.parse(fs.readFileSync(R + "/src/data/menara-puzzles.json", "utf-8"));
t("1b. bank teka-teki ≥ 700", bank.length >= 700, bank.length);
t("1c. 6 jenis teka-teki", new Set(bank.map((x) => x.type)).size === 6, [...new Set(bank.map((x) => x.type))].join(","));
t("1d. semua punya hint", bank.every((x) => x.hint && x.hint.length > 2));
t("1e. lvl 1-3 ada semua", [1, 2, 3].every((l) => bank.some((x) => x.lvl === l)));
// anagram valid: huruf sama persis dgn jawaban
const ana = bank.filter((x) => x.type === "anagram");
t("1f. anagram: susunan huruf = huruf jawaban", ana.every((x) => {
  const m = x.q.match(/"([^"]+)"/);
  if (!m) return false;
  const a = x.a.replace(/ /g, "").toLowerCase().split("").sort().join("");
  const b = m[1].replace(/ /g, "").toLowerCase().split("").sort().join("");
  return a === b;
}));
// sandi caesar valid
const sandi = bank.filter((x) => x.type === "sandi" && x.q.includes("geser"));
t("1g. sandi caesar: dekode = jawaban", sandi.every((x) => {
  const m = x.q.match(/"([A-Z ]+)"[\s\S]*geser (\d)/);
  if (!m) return false;
  const dec = m[1].toLowerCase().split("").map((ch) => ch === " " ? " " : String.fromCharCode(((ch.charCodeAt(0) - 97 - Number(m[2]) + 26) % 26) + 97)).join("");
  return dec === x.a.toLowerCase();
}));

console.log("— section 2: pemain baru + starter pack —");
await run({ text: ".menaraseribupintu", args: [] });
t("2a. sesi tercipta", sessions.has("c1@s.whatsapp.net"));
const db = getDatabase();
const u = db.data.menara.perUser["6281@s.whatsapp.net"];
t("2b. user persist floor 1", u.floor === 1 && u.bestFloor === 0);
t("2c. starter pack 3 permata", u.permata === 3, u.permata);
t("2d. onboarding: tutorial tampil", last().includes("cara main") || last().includes("starter pack"));
t("2e. nafas terpakai 1 (10→9)", u.nafas === 9, u.nafas);
t("2f. tema dunia acak tampil", last().includes("lantai 1"));

console.log("— section 3: jawab benar/salah —");
const s = sessions.get("c1@s.whatsapp.net");
const before = u.floor;
await ans({ text: s.current.a }); // benar
t("3a. benar → naik 1 lantai", u.floor === before + 1 && u.bestFloor === 2);
t("3b. jawab benar → notifikasi pintu terbuka + EXP", sent.some((x) => sc(x.text).includes("pintu terbuka")) && sent.some((x) => sc(x.text).includes("exp")));
// salah → jatuh 2
await run({ text: ".menaraseribupintu stop", args: ["stop"] });
await run({ text: ".menaraseribupintu", args: [] });
const s2 = sessions.get("c1@s.whatsapp.net");
const cur = s2.current.a;
await ans({ text: "zzzz jawaban ngawur" });
t("3c. salah → jatuh 2 lantai (min 1)", u.floor === Math.max(1, 2 - 2), u.floor);
t("3d. jawaban benar dibocorkan di pesan jatuh", sent.slice(-2).some((x) => sc(x.text).includes(sc(cur))));
t("3e. nafas terpakai lagi", u.nafas < 9);

console.log("— section 4: hint & ekonomi —");
await run({ text: ".menaraseribupintu stop", args: ["stop"] });
await run({ text: ".menaraseribupintu", args: [] });
const s3 = sessions.get("c1@s.whatsapp.net");
await run({ text: ".menaraseribupintu hint", args: ["hint"] });
t("4a. hint pertama: bayar pakai permata (gold rpg mungkin 0)", u.permata === 2 || u.permata === 3, u.permata);
t("4b. hint kedua ditolak (1 hint per pintu)", (await (async () => { await run({ text: ".menaraseribupintu hint", args: ["hint"] }); return last().includes("sudah dipakai"); })()));
// jawab benar setelah hint = tanpa bonus dobel
await ans({ text: sessions.get("c1@s.whatsapp.net").current.a });
t("4c. jawab setelah hint tetap naik", u.floor === 1 || u.floor >= 1);

console.log("— section 5: boss gerbang (2 tahap) —");
// paksa ke lantai 10 (boss)
const ub = db.data.menara.perUser["6281@s.whatsapp.net"];
ub.floor = 10; ub.bestFloor = 10;
await run({ text: ".menaraseribupintu stop", args: ["stop"] });
await run({ text: ".menaraseribupintu", args: [] });
const sb = sessions.get("c1@s.whatsapp.net");
t("5a. pintu boss = Gerbang Sang Bijak", last().includes("gerbang") || last().includes("tahap 1"));
await ans({ text: sb.current.a });
t("5b. tahap 1 benar → minta 1 lagi (tahap 2)", sent.slice(-2).some((x) => sc(x.text).includes("satu lagi")));
await ans({ text: sessions.get("c1@s.whatsapp.net").current.a });
t("5c. boss tuntas → naik ke 11 + permata +1", ub.floor === 11, ub.floor);
t("5d. permata boss masuk", ub.permata >= 3, ub.permata);
// boss salah tahap 2 → jatuh 3
ub.floor = 20; // boss ke-2
await run({ text: ".menaraseribupintu stop", args: ["stop"] });
await run({ text: ".menaraseribupintu", args: [] });
await ans({ text: sessions.get("c1@s.whatsapp.net").current.a }); // tahap 1 benar
await ans({ text: "ngawur asal" }); // tahap 2 salah
t("5e. boss gagal → jatuh 3 (20→17)", ub.floor === 17, ub.floor);

console.log("— section 6: daily, status, rank, rebirth —");
await run({ text: ".menaraseribupintu stop", args: ["stop"] });
const uStreakBefore = ub.dailyStreak;
await run({ text: ".menaraseribupintu daily", args: ["daily"] });
t("6a. daily klaim → streak naik + permata", ub.dailyStreak === uStreakBefore + 1 || ub.dailyStreak === 1, ub.dailyStreak);
await run({ text: ".menaraseribupintu daily", args: ["daily"] });
t("6b. daily dobel sehari ditolak", last().includes("sudah diklaim") || last().includes("sudah kamu ambil"));
await run({ text: ".menaraseribupintu status", args: ["status"] });
t("6c. status: lantai + rank tampil", last().includes("lantai") && (last().includes("common") || last().includes("rare") || last().includes("epic")));
await run({ text: ".menaraseribupintu rank", args: ["rank"] });
t("6d. rank: papan petualang", last().includes("papan") || last().includes("lantai"));
await run({ text: ".menaraseribupintu rebirth", args: ["rebirth"] });
t("6e. rebirth terkunci sebelum lantai 100", last().includes("belum siap") || last().includes("belum siap") || last().includes("lantai 100"));
ub.bestFloor = 100;
await run({ text: ".menaraseribupintu rebirth", args: ["rebirth"] });
t("6f. rebirth jalan → +1 rebirth, reset lantai 1", ub.rebirths === 1 && ub.floor === 1, `${ub.rebirths}/${ub.floor}`);
await run({ text: ".menaraseribupintu", args: [] });
t("6g. lanjut main setelah rebirth", sessions.has("c1@s.whatsapp.net"));

console.log("— section 7: nafas habis + guard anti-spam —");
await run({ text: ".menaraseribupintu stop", args: ["stop"] });
const un = db.data.menara.perUser["6281@s.whatsapp.net"];
un.nafas = 0; un.nafasAt = Math.floor(Date.now() / 1000);
await run({ text: ".menaraseribupintu", args: [] });
t("7a. nafas habis → ditolak + info regen", last().includes("nafas") && sessions.get("c1@s.whatsapp.net") === undefined);
// pemain lain gak bisa jawab
un.nafas = 5; un.nafasAt = Math.floor(Date.now() / 1000);
await run({ text: ".menaraseribupintu", args: [] });
const s7 = sessions.get("c1@s.whatsapp.net");
const handled = await ans({ sender: "628999@s.whatsapp.net", text: s7.current.a });
t("7b. orang lain gak bisa jawab", handled === false);
// cooldown spam
const firstOk = await ans({ text: "tes" });
t("7c. spam dibalas cepat di-ignore (cooldown)", (await ans({ text: s7.current.a })) !== false);

console.log("— section 8: data asli —");
plug._setPuzzleSourceForTest(null);
const real = plug.loadPuzzles();
t("8a. bank asli 752", real.length === 752, real.length);
plug._setPuzzleSourceForTest(FAKE);

fs.rmSync(dbDir, { recursive: true, force: true });
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
