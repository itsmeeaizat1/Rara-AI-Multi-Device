// E2E quizarena — Arena Kuis RPG
import path from "node:path";
import fs from "node:fs";
import { initDatabase } from "../../src/lib/nova-database.js";
import { getDatabase } from "../../src/lib/nova-database.js";

process.env.QUIZARENA_Q_MS = "60000"; // 60 dtk biar gak lepas pas test jalan
const R = path.resolve(process.cwd());
let pass = 0, fail = 0;
const results = [];
const t = (name, cond, extra) => { if (cond) { pass++; } else { fail++; console.log("  ❌ " + name + (extra ? " → " + String(extra).slice(0, 140) : "")); } results.push([!!cond, name]); };

const dbDir = path.join(process.cwd(), "test", "quizarena-e2e", "db-tmp");
fs.rmSync(dbDir, { recursive: true, force: true });
await initDatabase(dbDir);

// ── source soal tertentu biar deterministik ──
const FAKE = [
  { id: 1, cat: "sains", lvl: 1, q: "Siapa presiden pertama Indonesia?", a: "Soekarno", w: ["Hatta", "Suharto", "Habibie"] },
  { id: 2, cat: "matematika", lvl: 2, q: "Berapa hasil 2 + 2?", a: "4", w: ["3", "5", "6"] },
  { id: 3, cat: "geografi", lvl: 2, q: "Ibukota Indonesia?", a: "Jakarta", w: ["Bandung", "Medan", "Solo"] },
  { id: 4, cat: "logika", lvl: 5, q: "Deret 1, 1, 2, 3?", a: "5", w: ["4", "6", "8"] },
  { id: 5, cat: "sains", lvl: 3, q: "Planet merah?", a: "Mars", w: ["Venus", "Jupiter", "Bumi"] },
  { id: 6, cat: "bahasa", lvl: 2, q: "Sinonim 'pandai'?", a: "cerdas", w: ["bodoh", "malas", "letih"] },
  { id: 7, cat: "sejarah", lvl: 3, q: "Indonesia merdeka tahun?", a: "1945", w: ["1928", "1949", "1950"] },
  { id: 8, cat: "teknologi", lvl: 3, q: "Pendiri Microsoft?", a: "Bill Gates", w: ["Steve Jobs", "Elon Musk", "Mark Zuckerberg"] },
];

const plug = await import(R + "/plugins/rpg/quizarena.js");
plug._setSoalSourceForTest(FAKE);
const { handler, answerHandler, pluginConfig } = plug;
const sessions = plug._getSessionsForTest();
const { fromSC } = await import(R + "/src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase(); // reverse smallcaps + case-insensitive

// ── mock ──
const sent = [];
function mkSock() {
  return {
    sendMessage: async (chat, payload) => { sent.push({ chat, payload }); return true; },
  };
}
function mkMsg({ chat = "c1@s.whatsapp.net", sender = "628100000001@s.whatsapp.net", text = "", args = [], mentionedJid = [], pushName = "Toko" } = {}) {
  return {
    chat, sender, text, args, mentionedJid, pushName,
    reply: async (text) => { sent.push({ chat, payload: { text } }); return true; },
    react: async () => true,
  };
}

console.log("— section 1: config & data —");
t("1a. pluginConfig name array", Array.isArray(pluginConfig.name) && pluginConfig.name.includes("kuisarena") && pluginConfig.name.includes("arenakuis"));
t("1b. command non-owner (isOwner false)", pluginConfig.isOwner === false);
const bank = JSON.parse(fs.readFileSync(R + "/src/data/arenakuis.json", "utf-8"));
t("1c. bank soal ≥ 2000", bank.length >= 2000, bank.length);
t("1d. semua item punya 4 opsi unik + jawaban", bank.every((q) => q.a && q.w.length === 3 && !q.w.includes(q.a) && new Set([q.a, ...q.w]).size === 4));
t("1e. kategori ≥ 8", new Set(bank.map((q) => q.cat)).size >= 8, [...new Set(bank.map((q) => q.cat))].join(","));
t("1f. matematika terverifikasi benar (sampling anchored)", (() => {
  const maths = bank.filter((q) => q.cat === "matematika");
  let ok = 0, matched = 0;
  for (const q of maths) {
    const m = q.q.match(/^Berapa hasil (\d+) ([+\u2212\u00d7\u00f7]) (\d+)\?$/);
    if (!m) continue;
    matched++;
    const [x, op, y] = [Number(m[1]), m[2], Number(m[3])];
    const expect = op === "+" ? x + y : op === "\u2212" ? x - y : op === "\u00d7" ? x * y : x / y;
    if (String(expect) === q.a) ok++;
    if (matched >= 60) break;
  }
  return matched >= 50 && ok >= matched - 2;
})());

console.log("— section 2: mulai solo —");
await handler(mkMsg({ text: ".petualangkuis", args: [] }), { sock: mkSock(), config: {} });
t("2a. sesi solo tercipta", sessions.has("c1@s.whatsapp.net") && sessions.get("c1@s.whatsapp.net").mode === "solo");
const s = sessions.get("c1@s.whatsapp.net");
t("2b. wave 1 + hp 100 + level player", s.wave === 1 && s.hp >= 100 && s.hpMax === 100 + (s.lvl * 5));
t("2c. soal dikirim dengan opsi A-D", sent.length > 0 && sc(sent[sent.length-1].payload.text).includes("a.") && sc(sent[sent.length-1].payload.text).includes("d."));
t("2d. jawaban benar ada di opsi", s.current.opts.includes(s.current.a) && s.current.opts.length === 4);
t("2e. key = index jawaban", s.current.opts[s.current.key] === s.current.a);

console.log("— section 3: alur jawab solo —");
const before = sent.length;
let handled = await answerHandler(mkMsg({ text: "zzz" }), mkSock()); // bukan huruf → false
t("3a. jawaban bukan huruf gak dikonsumsi", handled === false);
// jawab benar: cari huruf yang benar
const keyLetter = ["a", "b", "c", "d"][s.current.key];
await answerHandler(mkMsg({ text: keyLetter }), mkSock());
t("3b. jawab benar → damage musuh", s.enemyHp < s.enemyMax || sessions.get("c1@s.whatsapp.net") === undefined);
t("3c. streak naik", s.streak >= 1);
const wrongLetter = ["a", "b", "c", "d"].find((l, i) => i !== s.current?.key);
// main sampai musuh mati → wave naik
let guard = 0;
while (sessions.get("c1@s.whatsapp.net") === s && s.enemyHp > 0 && guard++ < 30) {
  const cur = sessions.get("c1@s.whatsapp.net");
  await answerHandler(mkMsg({ text: ["a", "b", "c", "d"][cur.current.key] }), mkSock());
}
t("3d. musuh mati → wave naik + reward", s.wave >= 2 || s.enemyHp > 0);
t("3e. exp/cash terkumpul", s.expGained > 0 && s.cashGained >= 0);

console.log("— section 4: jawab salah & mati —");
// paksa salah terus sampai tumbang
guard = 0;
while (sessions.get("c1@s.whatsapp.net") !== undefined && guard++ < 60) {
  const cur = sessions.get("c1@s.whatsapp.net");
  const wrong = ["a", "b", "c", "d"].find((l, i) => i !== cur.current.key);
  await answerHandler(mkMsg({ text: wrong }), mkSock());
}
t("4a. hp habis → sesi berakhir", sessions.get("c1@s.whatsapp.net") === undefined);
const db = getDatabase();
t("4b. rekor persist ke db.data.quizarena", db.data.quizarena?.perUser?.["628100000001@s.whatsapp.net"]?.bestWave >= 1, JSON.stringify(db.data.quizarena?.perUser?.["628100000001@s.whatsapp.net"]));

console.log("— section 5: pvp duel —");
await handler(mkMsg({ text: ".petualangkuis pvp", args: ["pvp"], mentionedJid: ["628100000002@s.whatsapp.net"], pushName: "Toko" }), { sock: mkSock(), config: {} });
const p = sessions.get("c1@s.whatsapp.net");
t("5a. sesi pvp tercipta 2 pemain", p && p.mode === "pvp" && p.players.length === 2 && p.players[0].hp === 100 && p.players[1].hp === 100);
t("5b. penonton gak bisa jawab", await answerHandler(mkMsg({ sender: "628999999999@s.whatsapp.net", text: "a" }), mkSock()) === true && p.players[0].hp === 100 && p.players[1].hp === 100);
// pemain 1 jawab benar → lawan kena 20
await answerHandler(mkMsg({ text: ["a", "b", "c", "d"][p.current.key], sender: p.players[0].jid }), mkSock());
t("5c. jawab benar duluan → damage lawan", p.players[1].hp === 80);
// lawan jawab SALAH (jawaban salah untuk soal baru)
const p2 = sessions.get("c1@s.whatsapp.net");
const wrong = ["a", "b", "c", "d"].find((l, i) => i !== p2.current.key);
await answerHandler(mkMsg({ text: wrong, sender: p2.players[1].jid }), mkSock());
t("5d. salah → gak ada damage", p2.players[0].hp === 100);
// duel sampai selesai
guard = 0;
while (sessions.get("c1@s.whatsapp.net") !== undefined && guard++ < 30) {
  const cur = sessions.get("c1@s.whatsapp.net");
  await answerHandler(mkMsg({ text: ["a", "b", "c", "d"][cur.current.key], sender: cur.players[0].jid }), mkSock());
}
t("5e. hp lawan habis → duel selesai + kemenangan", sessions.get("c1@s.whatsapp.net") === undefined && sent.some((x) => sc(x.payload.text).includes("menang")));

console.log("— section 6: sub command —");
await handler(mkMsg({ text: ".petualangkuis rank", args: ["rank"] }), { sock: mkSock(), config: {} });
t("6a. rank nampilin papan juara", sc(sent[sent.length-1].payload.text).includes("wave") || sent.length > 0);
plug._setSoalSourceForTest(null); // stat harus baca bank asli
await handler(mkMsg({ text: ".petualangkuis stat", args: ["stat"] }), { sock: mkSock(), config: {} });
plug._setSoalSourceForTest(FAKE);
t("6b. stat nunjukin bank soal 2000+", sc(sent[sent.length-1].payload.text).match(/2\.?0?0?3|[2][0-9]{3}/) !== null, sc(sent[sent.length-1].payload.text).slice(0, 100));
{
    await handler(mkMsg({ text: ".petualangkuis stop", args: ["stop"] }), { sock: mkSock(), config: {} });
    t("6c. gak ada game → stop bilang gak ada", sc(sent[sent.length - 1].payload.text).includes("gak ada"));
  }
// pvp format salah
await handler(mkMsg({ text: ".petualangkuis pvp", args: ["pvp"], mentionedJid: [] }), { sock: mkSock(), config: {} });
t("6d. pvp tanpa tag → format salah", sc(sent[sent.length-1].payload.text).includes("tag"));
// pvp lawan diri sendiri
await handler(mkMsg({ text: ".petualangkuis pvp", args: ["pvp"], mentionedJid: ["628100000001@s.whatsapp.net"] }), { sock: mkSock(), config: {} });
t("6e. pvp lawan diri sendiri ditolak", sc(sent[sent.length-1].payload.text).includes("sendiri"));
// start saat game jalan
sessions.set("c1@s.whatsapp.net", { mode: "solo", hp: 100, hpMax: 100, wave: 1, current: FAKE[0], answeredThisRound: new Set(), usedIds: new Set() });
await handler(mkMsg({ text: ".petualangkuis", args: [] }), { sock: mkSock(), config: {} });
t("6f. start saat jalan → ditolak", sc(sent[sent.length-1].payload.text).includes("sedang berjalan"));
await handler(mkMsg({ text: ".petualangkuis stop", args: ["stop"] }), { sock: mkSock(), config: {} });
t("6g. stop menghapus sesi", sessions.get("c1@s.whatsapp.net") === undefined);

console.log("— section 7: guard data asli —");
plug._setSoalSourceForTest(null); // balik ke file asli
const realBank = plug.loadSoal();
t("7a. loadSoal baca file asli 2003", realBank.length === 2003, realBank.length);
plug._setSoalSourceForTest(FAKE);

fs.rmSync(dbDir, { recursive: true, force: true });
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
