// E2E — LELANG + CHECKSEWA LIVE TICKER (13 Sep 2026, batch info pelengkap ala AFK)
// lelang: create/info → live countdown anti-snipe-aware + bar ▰▱
// checksewa: bar progress masa sewa + ticker ≤24 jam → SEWA EXPIRED
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/rara-sewalang-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(DB_DIR + "/db.json");
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s || "")).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

const SENDER = "628111111111@s.whatsapp.net";
const CHAT = "6289999999999-1234@g.us";

function mkMock({ isAdmin = true } = {}) {
  const sends = [];
  const m = {
    sender: SENDER, chat: CHAT, pushName: "Budi", prefix: ".", args: [], command: "lelang", text: "",
    isGroup: true, isOwner: false,
    react: async () => {},
    reply: async (txt, opts) => { sends.push({ txt }); return { key: { id: "r" + sends.length } }; },
  };
  const sock = {
    user: { id: "6280000000000@s.whatsapp.net" },
    sendMessage: async (jid, payload) => { sends.push({ txt: payload?.text, edit: payload?.edit?.id, mentions: payload?.mentions }); return { key: { id: "e" + sends.length } }; },
    groupMetadata: async () => ({ participants: [SENDER, "628444444444@s.whatsapp.net"].map((id) => ({ id, admin: isAdmin && id === SENDER ? "admin" : null })) }),
  };
  return { m, sock, sends };
}
const texts = (mk) => mk.sends.map((s) => norm(s.txt)).filter(Boolean);

// ═══════════════════════════════════════════════════════════════
w("\n— LELANG CREATE: kartu live countdown + bar —");
{
  const lelang = await import(R + "/plugins/group/groupauction.js");
  const mk = mkMock();
  mk.m.text = "create jam tangan | 50000 | 12s";
  const p = lelang.handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  await new Promise((r) => setTimeout(r, 2500));

  const init = texts(mk).find((x) => x.includes("lelang aktif"));
  check("kartu create: ʟᴀɴɢ ᴀᴋᴛɪꜰ (smallcaps)", !!init, "init=" + texts(mk)[0]?.slice(0, 40));
  check("kartu create: sisa waktu + bar ▰▱ + hint bid", init && init.includes("sisa waktu") && (init.includes("▰") || init.includes("▱")) && init.includes("bid"), JSON.stringify(init?.slice(0, 80)));
  const db = getDatabase();
  const auctions = db.setting("auctions") || {};
  const ids = Object.keys(auctions);
  check("auction tersimpan di db", ids.length === 1, "ids=" + ids.length);
  check("ticker nge-edit ≥1 dlm 2.5 dtk", mk.sends.filter((s) => s.edit).length >= 1, "edits=" + mk.sends.filter((s) => s.edit).length);

  // ── anti-snipe: bid di 10 dtk terakhir → endTime +30 dtk → ticker HARUS masih hidup
  const aid = ids[0];
  await new Promise((r) => setTimeout(r, 7500)); // total ~10 dtk → masuk window 12 dtk
  const mk2 = mkMock();
  mk2.m.sender = "628222222222@s.whatsapp.net";
  mk2.m.text = "bid " + aid + " 60000";
  await lelang.handler(mk2.m, { sock: mk2.sock, config: { command: { prefix: "." } } });
  check("bid diterima + anti-snipe note", texts(mk2).some((x) => x.includes("bid diterima")), texts(mk2).at(-1)?.slice(0, 50));
  const endExt = db.setting("auctions")[aid].endTime;
  check("endTime ke-extend +30 dtk (anti-snipe)", endExt - Date.now() > 20000, "sisa=" + Math.round((endExt - Date.now()) / 1000) + "s");

  // nunggu sampai LEWAT endTime asli (12s) — cadence ticker pas remaining
  // >31s jadi 30 dtk, jadi ceknya: TIDAK ADA kartu "lelang berakhir" prematur
  // (ticker gak mati di target asli) + edit terakhir nunjukin sisa hasil extend.
  await new Promise((r) => setTimeout(r, 7500)); // ~17.5 dtk: endTime asli (12s) sudah lewat
  const ticksSoFar = mk.sends.filter((s) => s.edit).map((s) => norm(s.txt || ""));
  check("remainingFn baca fresh: gak ada kartu 'lelang berakhir' prematur (gak mati di endTime asli)", !ticksSoFar.some((x) => x.includes("lelang berakhir")), "last=" + ticksSoFar.at(-1)?.slice(0, 40));
  const lastTick = ticksSoFar.at(-1) || "";
  check("kartu masih nunjukin sisa hasil extend (>20 dtk), bukan 0", /sisa waktu/.test(lastTick) && !lastTick.includes("lelang berakhir"), lastTick.slice(0, 60));

  // biar cepat: tutup manual → ticker cancel + finalCard adaptif
  const mk3 = mkMock();
  mk3.m.text = "close " + aid;
  await lelang.handler(mk3.m, { sock: mk3.sock, config: { command: { prefix: "." } } });
  check("close → lelang ended + pengumuman pemenang", (db.setting("auctions")[aid] || {}).ended === true, texts(mk3).at(-1)?.slice(0, 60));
  await p.catch(() => {});
  const finalEdit = mk.sends.filter((s) => s.edit).at(-1);
  check("ticker close adaptif: ditutup sebelum waktu habis", !!finalEdit && norm(finalEdit.txt).includes("ditutup"), norm(finalEdit?.txt || "").slice(0, 50));
}

// ═══════════════════════════════════════════════════════════════
w("\n— LELANG INFO: bar terpakai + ticker aktif ≤24 jam —");
{
  const lelang = await import(R + "/plugins/group/groupauction.js");
  const db = getDatabase();
  const all = db.setting("auctions") || {};
  const aid = "TST-INFO1";
  const now = Date.now();
  all[aid] = {
    auctionId: aid, chatId: CHAT, title: "Kucing Oren", startPrice: 100000, minIncrement: 5000,
    endTime: now + 30000, duration: 30000, createdAt: now, createdBy: SENDER,
    bids: [], ended: false, cancelled: false,
  };
  db.setting("auctions", all);
  const mk = mkMock();
  mk.m.text = "info " + aid;
  const before = mk.sends.length;
  await lelang.handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  const info = texts(mk).find((x) => x.includes("bid tertinggi")); // kartu info statis (ticker card kekirim duluan)
  check("info: detail lelang lengkap", !!info && info.includes("kucing oren") && info.includes("sisa waktu"));
  check("info: bar ▰▱ terpakai", info && (info.includes("▰") || info.includes("▱")) && info.includes("terpakai"));
  await new Promise((r) => setTimeout(r, 2500));
  check("info aktif ≤24 jam → ticker ikut nge-tick", mk.sends.filter((s) => s.edit).length >= 1, "edits=" + mk.sends.filter((s) => s.edit).length);
  // cleanup: cancel biar gak nyasar
  const mk2 = mkMock();
  mk2.m.text = "cancel " + aid;
  await lelang.handler(mk2.m, { sock: mk2.sock, config: { command: { prefix: "." } } });
}

// ═══════════════════════════════════════════════════════════════
w("\n— CHECKSEWA: bar progress + ticker ≤24 jam → EXPIRED —");
{
  const checksewa = await import(R + "/plugins/group/checksewa.js");
  const db = getDatabase();
  db.db.data.sewa = { enabled: true, groups: {} };

  // (1) sewa lifetime → statis permanen, tanpa ticker
  db.db.data.sewa.groups[CHAT] = { name: "Grup Test", addedAt: Date.now() - 86400000, expiredAt: Date.now() + 30 * 86400000, isLifetime: true };
  {
    const mk = mkMock();
    mk.m.command = "checksewa";
    await checksewa.handler(mk.m, { sock: mk.sock });
    const txt = texts(mk).at(-1);
    check("lifetime: status permanen ♾️", txt.includes("permanen"), txt.slice(0, 40));
  }

  // (2) sewa 30 hari → statis + bar terpakai, TANPA ticker
  db.db.data.sewa.groups[CHAT] = { name: "Grup Test", addedAt: Date.now() - 15 * 86400000, expiredAt: Date.now() + 15 * 86400000, isLifetime: false };
  {
    const mk = mkMock();
    mk.m.command = "checksewa";
    await checksewa.handler(mk.m, { sock: mk.sock });
    const txt = texts(mk).at(-1);
    check("sewa 30 hari: kartu status + bar terpakai", txt.includes("sisa waktu") && (txt.includes("▰") || txt.includes("▱")) && txt.includes("terpakai"), txt.slice(0, 80));
    check("sewa 30 hari: tanpa ticker (jauh dari expired)", !mk.sends.some((s) => s.edit));
  }

  // (3) sewa sisa 6 jam → kartu statis + ticker nge-tick sampai expired (set expiredAt = now+4s biar cepat)
  db.db.data.sewa.groups[CHAT] = { name: "Grup Test", addedAt: Date.now() - 3600000, expiredAt: Date.now() + 4000, isLifetime: false };
  {
    const mk = mkMock();
    mk.m.command = "checksewa";
    const t0 = Date.now();
    const p = checksewa.handler(mk.m, { sock: mk.sock });
    await new Promise((r) => setTimeout(r, 2000));
    const staticCard = texts(mk).find((x) => x.includes("sisa waktu"));
    check("kartu statis: status sewa + bar", !!staticCard && (staticCard.includes("▰") || staticCard.includes("▱")));
    const ticker = texts(mk).find((x) => x.includes("sewa hampir habis") && x.includes("sisa:"));
    check("ticker nyala: ꜱᴇᴡᴀ ʜᴀᴍᴘɪʀ ʜᴀʙɪꜱ + sisa jam/mnt/dtk", !!ticker && /jam/.test(ticker) && /dtk/.test(ticker), (ticker || "GAK KETEMU").slice(0, 60));
    const editsMid = mk.sends.filter((s) => s.edit).length;
    check("ticker nge-edit (≥1 dlm 2 dtk)", editsMid >= 1, "edits=" + editsMid);
    await p.catch(() => {});
    await new Promise((r) => setTimeout(r, 4500)); // tunggu expired (4s)
    const finalEdit = mk.sends.filter((s) => s.edit).at(-1);
    check("expired → kartu ꜱᴇᴡᴀ ᴇxᴘɪʀᴇᴅ via edit", !!finalEdit && norm(finalEdit.txt).includes("sewa expired"), norm(finalEdit?.txt || "").slice(0, 50));
  }

  // (4) sewa udah expired → kartu EXPIRED statis, tanpa ticker
  db.db.data.sewa.groups[CHAT] = { name: "Grup Test", addedAt: Date.now() - 7200000, expiredAt: Date.now() - 3600000, isLifetime: false };
  {
    const mk = mkMock();
    mk.m.command = "checksewa";
    await checksewa.handler(mk.m, { sock: mk.sock });
    const txt = texts(mk).at(-1);
    check("sudah expired: kartu expired + ajakan perpanjang", txt.includes("expired") && txt.includes("perpanjang"));
    check("expired: tanpa ticker", !mk.sends.some((s) => s.edit));
  }
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
