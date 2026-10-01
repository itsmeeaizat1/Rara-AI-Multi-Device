// E2E — PREMIUM LIVE TICKER (13 Sep 2026, batch 4 variasi polos)
// ".premium countdown statis doang" — sisa premium < 24 jam → ticker
// live edit-in-place sampai habis → kartu BERAKHIR + hint upgrade.
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const { buildPremTickerCard } = await import(R + "/src/lib/rara-prem-card.js");
const { runLiveTicker } = await import(R + "/src/lib/rara-countdown.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

const DB_DIR = "/tmp/rara-prem-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(DB_DIR + "/db.json");

const { handler } = await import(R + "/plugins/sewa-premium/premium.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

// ═══════════════════════════════════════════════════════════════
w("\n— buildPremTickerCard (pure) —");
{
  const c = buildPremTickerCard("Budi", 5 * 3600000 + 2 * 60000, ".");
  const cn = norm(c);
  check("tick: 'PREMIUM HAMPIR HABIS' + 5:02:00 + nama", cn.includes("premium hampir habis") && cn.includes("5:02:00") && cn.includes("budi"));
  check("tick: hint buyprem ada", cn.includes("buyprem"));
  const d = buildPremTickerCard("Budi", 0, ".");
  const dn = norm(d);
  check("finish: 'PREMIUM BERAKHIR' + balik Free User 300x", dn.includes("premium berakhir") || dn.includes("sudah berakhir"), dn.slice(0, 60));
  check("finish: limit turun 300x + hint perpanjang", dn.includes("300") && dn.includes("buyprem"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— ticker live (mock sock, sampai habis) —");
{
  const sends = [];
  const sock = { sendMessage: async (chat, payload, opts) => { sends.push({ chat, payload, opts }); return { key: { id: "p" + sends.length } }; } };
  const target = Date.now() + 3200;
  const res = await runLiveTicker({
    sock, chat: "c@g.us", m: null,
    initialCard: buildPremTickerCard("Budi", target - Date.now(), "."),
    tickCard: (st) => buildPremTickerCard("Budi", st.remainingMs, "."),
    mode: "down", targetTs: target,
  });
  const last = norm(sends[sends.length - 1]?.payload?.text || "");
  check("kartu awal + edit + finish BERAKHIR", sends.length >= 2 && res.finished === true && last.includes("berakhir"), last.slice(0, 80));
}

// ═══════════════════════════════════════════════════════════════
w("\n— handler .premium (db beneran, 3 skenario) —");
const makeMock = (replies, sends) => ({
  sender: "628123456789@s.whatsapp.net", chat: "c@g.us", pushName: "Budi",
  reply: async (txt) => { replies.push(txt); return { key: { id: "r" } }; },
  sock: { sendMessage: async (chat, payload, opts) => { sends.push({ chat, payload, opts }); return { key: { id: "s" + sends.length } }; } },
});
{
  // skenario 1: premium sisa 23 jam → ticker live harus KEFIRE
  const database = (await import(R + "/src/lib/rara-database.js")).getDatabase();
  database.data.premium = [{ id: "628123456789", name: "Budi", expired: Date.now() + 23 * 3600000 }];
  const replies = [], sends = [];
  const m = makeMock(replies, sends);
  await handler(m, { sock: m.sock, config: { command: { prefix: "." } }, db: database });
  const card = norm(replies[0] || "");
  check("kartu utama tetep kekirim + status AKTIF", card.includes("status premium kamu") && card.includes("aktif"));
  check("sisa 23 jam tampil di kartu (X jam Y menit)", /jam \d+ menit|menit/.test(card));
  await new Promise((r) => setTimeout(r, 100));
  const tickSends = sends.filter((s) => s.payload?.text && norm(s.payload.text).includes("premium hampir habis"));
  check("ticker kefire (kartu 🕒 kekirim)", tickSends.length >= 1, "sends=" + sends.length);
}
{
  // skenario 2: premium sisa 5 hari → GAK ada ticker
  const database = (await import(R + "/src/lib/rara-database.js")).getDatabase();
  database.data.premium = [{ id: "628123456789", name: "Budi", expired: Date.now() + 5 * 86400000 }];
  const replies = [], sends = [];
  const m = makeMock(replies, sends);
  await handler(m, { sock: m.sock, config: { command: { prefix: "." } }, db: database });
  await new Promise((r) => setTimeout(r, 100));
  check("sisa 5 hari → gak ada ticker (statis cukup)", sends.filter((s) => s.payload?.text && norm(s.payload.text).includes("hampir habis")).length === 0);
}
{
  // skenario 3: free user (gak ada di db) → kartu Free User, gak ticker
  const database = (await import(R + "/src/lib/rara-database.js")).getDatabase();
  database.data.premium = [];
  const replies = [], sends = [];
  const m = makeMock(replies, sends);
  await handler(m, { sock: m.sock, config: { command: { prefix: "." } }, db: database });
  const card = norm(replies[0] || "");
    const noTick = sends.every((s) => !s.payload?.text || !norm(s.payload.text).includes("hampir habis"));
  check("free user → role Free User + gak ticker", card.includes("free user") && noTick, card.slice(0, 100));
  check("emoji robot 🤖 GAK ada lagi di kartu (diganti ⚡)", !replies[0].includes("🤖"));
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
