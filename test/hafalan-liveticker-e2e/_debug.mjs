// E2E — HAFALAN LIVE TICKER + METER (13 Sep 2026, batch kelengkapan)
// .hafalan add/list/progress/streak/review → ETA per item, meter ▰▱,
// streak bar ke milestone, countdown 🕒 ke review terdekat ≤24 jam
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/nova-hafalan-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(DB_DIR + "/db.json");
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s || "")).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

const SENDER = "628111111111@s.whatsapp.net";
const config = { command: { prefix: "." } };

function mkMock() {
  const sends = [];
  const m = {
    sender: SENDER, chat: SENDER, pushName: "Budi", isGroup: false, isOwner: true, text: "",
    react: async () => {},
    reply: async (txt) => { sends.push({ txt }); return { key: { id: "r" + sends.length, remoteJid: SENDER } }; },
  };
  const sock = {
    user: { id: "6280000000000@s.whatsapp.net" },
    sendMessage: async (jid, payload) => { sends.push({ txt: payload?.text || payload?.caption, edit: payload?.edit?.id }); return { key: { id: "e" + sends.length } }; },
  };
  return { m, sock, sends };
}
const texts = (mk) => mk.sends.map((s) => norm(s.txt)).filter(Boolean);
const tickerCards = (mk) => texts(mk).filter((x) => x.includes("sedang dekat"));

const hafalan = await import(R + "/plugins/islami/memorization.js");
const run = async (mk, text) => { mk.m.text = text; await hafalan.handler(mk.m, { sock: mk.sock, config }); };

const db = getDatabase();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const findItem = (id) => (db.setting("hafalan") || {})[SENDER]?.items?.find((i) => String(i.id).toLowerCase() === String(id).toLowerCase());

// ═══════════════════════════════════════════════════════════════
w("\n— ADD: konfirmasi + ETA + ticker 24 jam nyala —");
let ITEM_ID;
{
  const mk = mkMock();
  await run(mk, "add Al-Fatihah 1-7");
  await sleep(2200);
  const conf = texts(mk).find((x) => x.includes("ditambahkan"));
  check("add: konfirmasi lengkap", !!conf && conf.includes("al-fatihah") && conf.includes("hfz-"), (conf || "").slice(0, 60));
  console.log("=== CONF MENTAH ==="); console.log(JSON.stringify(conf));
  const tk = tickerCards(mk)[0];
  check("add: kartu ʀᴇᴠɪᴇᴡ ꜱᴇᴅᴀɴɢ ᴅᴇᴋᴀᴛ", !!tk && tk.includes("sisa:") && tk.includes("al-fatihah"), (tk || "GAK ADA TICKER").slice(0, 60));
  check("add: ticker nge-edit", mk.sends.filter((s) => s.edit).length >= 1, "edits=" + mk.sends.filter((s) => s.edit).length);
  ITEM_ID = (conf?.match(/hfz-[a-z0-9]+/i) || [])[0];
  check("add: item persist di db", !!findItem(ITEM_ID), "id=" + ITEM_ID);
}

// ═══════════════════════════════════════════════════════════════
w("\n— LIST: meter mastery + ETA per item + ticker —");
{
  // ubah nextReview jadi +2 jam biar ETA jam tampil jelas
  const raw = db.setting("hafalan");
  raw[SENDER].items[0].nextReview = Date.now() + 2 * 3600000;
  db.setting("hafalan", raw); db.save();

  const mk = mkMock();
  await run(mk, "list");
  await sleep(2000);
  const list = texts(mk).find((x) => x.includes("mastery:") && (x.includes("▰") || x.includes("▱")));
  check("list: meter mastery ▰▱ header", !!list, (list || "GAK KETEMU").slice(0, 60));
  check("list: ETA per item (🕒 jam lagi)", list && list.includes("hfz-") && list.includes("jam") && list.includes("mnt lagi"), (list || "").slice(0, 140));
  check("list: total + item count", list && list.includes("total: 1 hafalan"), (list || "").slice(0, 80));
  check("list: ticker ikut nyala (≤24 jam)", tickerCards(mk).length >= 1, "tickers=" + tickerCards(mk).length);
}

// ═══════════════════════════════════════════════════════════════
w("\n— CLOSING: countdown selesai → 📖 WAKTU REVIEW —");
{
  const raw = db.setting("hafalan");
  raw[SENDER].items[0].nextReview = Date.now() + 3000; // 3 dtk
  db.setting("hafalan", raw); db.save();

  const mk = mkMock();
  await run(mk, "list");
  await sleep(6000);
  const closing = texts(mk).find((x) => x.includes("waktu review"));
  check("closing: 📖 ᴡᴀᴋᴛᴜ ʀᴇᴠɪᴇᴡ muncul pas waktunya", !!closing && closing.includes("waktu review") && closing.includes(".hafalan review"), texts(mk).at(-1)?.slice(0, 70));
  check("closing: hint review command", !!closing && closing.includes("hafalan review"), (closing || "").slice(0, 100));
}

// ═══════════════════════════════════════════════════════════════
w("\n— REVIEW ok: mastery bar + ETA baru (3 hari, gak ticker) —");
{
  const mk = mkMock();
  await run(mk, "review " + ITEM_ID + " ok");
  await sleep(1500);
  const done = texts(mk).find((x) => x.includes("review tercatat"));
  check("review ok: konfirmasi + mastery bar ▰▱", !!done && done.includes("▰"), (done || "").slice(0, 80));
  check("review ok: review berikutnya ETA (3 hari)", done && done.includes("3 hari lagi"), (done || "").slice(0, 140));
  check("review ok: streak tampil (1 hari)", done && done.includes("streak hafalan: 1 hari"), (done || "").slice(0, 160));
  check("review ok: gak ada ticker baru (masih jauh)", tickerCards(mk).length === 0, "tickers=" + tickerCards(mk).length);
  const it = findItem(ITEM_ID);
  check("review ok: data persist (reviewCount=1, mastery naik)", it && it.reviewCount === 1 && it.mastery > 0);
}

// ═══════════════════════════════════════════════════════════════
w("\n— PROGRESS: meter breakdown + streak bar —");
{
  const mk = mkMock();
  await run(mk, "progress");
  await sleep(1200);
  const prog = texts(mk).find((x) => x.includes("total hafalan") || x.includes("total hafalan:"));
  check("progress: meter mastery ▰▱", !!prog && prog.includes("mastery:"), (prog || "").slice(0, 50));
  check("progress: breakdown mastery item bar", prog && prog.includes("mastery:") && prog.includes("▱"), (prog || "").slice(0, 160));
  check("progress: streak bar ke milestone", prog && /→ milestone 7 hari/.test(prog), (prog || "").slice(0, 180));
  check("progress: estimasi juz tetep ada", prog && prog.includes("estimasi juz"), (prog || "").slice(0, 80));
}

// ═══════════════════════════════════════════════════════════════
w("\n— STREAK: bar milestone + status hari ini —");
{
  const mk = mkMock();
  await run(mk, "streak");
  const st = texts(mk).find((x) => x.includes("streak saat ini"));
  check("streak: streak count + bar milestone", !!st && st.includes("→ milestone 7 hari") && st.includes("▰"), (st || "").slice(0, 80));
  check("streak: status hari ini (sudah)", st && st.includes("status hari ini"), (st || "").slice(0, 120));
}

// ═══════════════════════════════════════════════════════════════
w("\n— BATAL ADAPTIF: ticker jalan → item dihapus → closing dibatalkan —");
{
  const raw = db.setting("hafalan");
  raw[SENDER].items[0].nextReview = Date.now() + 2 * 3600000;
  db.setting("hafalan", raw); db.save();

  const mk = mkMock();
  await run(mk, "progress"); // → ticker nyala
  check("batal: ticker nyala dulu", tickerCards(mk).length >= 1, "tickers=" + tickerCards(mk).length);

  await run(mk, "remove " + ITEM_ID);
  await sleep(1800); // ticker cek isCancelled pas loop
  const cancel = texts(mk).find((x) => x.includes("countdown review dibatalkan"));
  check("batal: closing adaptif 'dibatalkan' (bukan waktu review palsu)", !!cancel, texts(mk).at(-1)?.slice(0, 70));
  check("batal: item ilang dari db", !findItem(ITEM_ID));
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
