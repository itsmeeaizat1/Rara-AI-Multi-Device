// E2E — KARTU LIMIT + COUNTDOWN RESET HARIAN (13 Sep 2026, batch 4)
// Request owner pilih no 4 dari audit: ".energi/.mylimit kartu polos,
// kalau energi regen otomatis dikasih countdown penuh".
// Limit akses fitur di-reset dailyLimitReset jam resetHour WIB → kartu
// sekarang: meter terpakai ▓▓░░ + ticker live menuju reset.
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const { computeNextResetTs, buildLimitCard } = await import(R + "/src/lib/nova-limit-card.js");
const { runLiveTicker } = await import(R + "/src/lib/nova-countdown.js");
const moment = (await import("moment-timezone")).default;
const { fromSC } = await import(R + "/src/lib/styler.js");
// GOTCHA (ke-5x): claraWrap smallcaps → assert WAJIB norm fromSC + lowercase
const norm = (s) => fromSC(String(s)).toLowerCase();

const DB_DIR = "/tmp/nova-limit-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
const db = await initDatabase(DB_DIR + "/db.json");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

// ═══════════════════════════════════════════════════════════════
w("\n— computeNextResetTs (WIB, tahan beda timezone VPS) —");
{
  const ts = computeNextResetTs(0, 0);
  const diff = ts - Date.now();
  check("reset 00:00 → selalu dalam < 24 jam", diff > 0 && diff <= 86400000, `${(diff / 3600000).toFixed(2)} jam`);
  check("target tepat jam 00:00 WIB", moment.tz(ts, "Asia/Jakarta").format("HH:mm") === "00:00");
}
{
  // target TEPAT now+1h (jam+1 rounded ke jam berikutnya itu flaky: 1-60 mnt tergantung menit)
  const satuJam = moment.tz("Asia/Jakarta").add(1, "hours");
  const ts = computeNextResetTs(satuJam.hour(), satuJam.minute());
  const diff = ts - Date.now();
  check("reset now+1h → diff ~1 jam (±2 mnt), hari ini gak dibesokkan", Math.abs(diff - 3600000) < 120000, `${(diff / 60000).toFixed(1)} mnt`);
}
{
  // reset yang udah lewat hari ini → besok
  const lewat = (moment.tz("Asia/Jakarta").hour() + 23) % 24; // selalu 23 jam sebelum sekarang (lewat)
  const ts = computeNextResetTs(lewat, 0);
  check("jam lewat → dibesokkan (diff ~23 jam)", Math.abs(ts - Date.now() - 23 * 3600000) < 3600000, `${((ts - Date.now()) / 3600000).toFixed(1)} jam`);
}

// ═══════════════════════════════════════════════════════════════
w("\n— buildLimitCard —");
{
  const c = buildLimitCard({
    title: "My Limit", name: "Budi", status: "Free",
    sisa: "280", terpakai: 20, total: 300,
    resetTime: "00:00", remainingMs: 90 * 60 * 1000,
    footer: "Beli limit? Ketik `.buyenergi <jumlah>`",
  });
  const cn = norm(c);
  check("kartu: nama + status + sisa + terpakai", cn.includes("budi") && cn.includes("free") && cn.includes("280") && cn.includes("20/300"));
  check("meter bar ▰▱ + persen", /▰+▱*/.test(c) && c.includes("%"));
  check("baris countdown 1:30:00", cn.includes("1:30:00"), cn.slice(0, 200));
  check("reset pukul 00:00 WIB", cn.includes("00:00 wib"));
  const d = buildLimitCard({ title: "My Limit", status: "Free", sisa: "0", terpakai: 300, total: 300, resetTime: "00:00", remainingMs: 0 });
  check("remainingMs 0 → RESET HARIAN TIBA", norm(d).includes("reset harian tiba"));
  const u = buildLimitCard({ title: "Energi", status: "Owner (Unlimited)", sisa: "∞ Unlimited", isUnlimited: true, remainingMs: -1 });
  check("unlimited → gak ada baris countdown/reset", !norm(u).includes("direset dalam") && !norm(u).includes("reset pukul") && norm(u).includes("unlimited"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— ticker live end-to-end (mock sock) —");
{
  const sends = [];
  let firstKey = null;
  const sock = {
    sendMessage: async (chat, payload, opts) => {
      sends.push({ chat, payload, opts });
      const key = { id: "t" + sends.length };
      if (!firstKey) firstKey = key;
      return { key };
    },
  };
  const target = Date.now() + 3200;
  const ctx = { title: "My Limit", status: "Free", sisa: "280", terpakai: 20, total: 300, resetTime: "00:00" };
  const res = await runLiveTicker({
    sock, chat: "c@g.us", m: null,
    initialCard: buildLimitCard({ ...ctx, remainingMs: target - Date.now() }),
    tickCard: (st) => buildLimitCard({ ...ctx, remainingMs: st.remainingMs }),
    finalCard: (st) => buildLimitCard({ ...ctx, remainingMs: st.remainingMs }),
    mode: "down", targetTs: target,
  });
  const edits = sends.filter((s) => s.payload?.edit);
  check("kartu awal + edit-in-place berulang", sends.length >= 2 && edits.length >= 1, `${sends.length}/${edits.length}`);
  check("selesai di waktunya (finished)", res.finished === true);
  check("kartu akhir = RESET HARIAN TIBA", norm(sends[sends.length - 1].payload.text).includes("reset harian tiba"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— handler .mylimit (db beneran, isolated) —");
{
  const { handler: mylimitHandler } = await import(R + "/plugins/user/mylimit.js");
  const jid = "6281111222233@s.whatsapp.net";
  db.setUser(jid);
  const u = db.getUser(jid);
  u.energi = 280; // free default 300 → terpakai 20
  const sends = [];
  let firstKey = null;
  const sock = {
    sendMessage: async (chat, payload, opts) => {
      sends.push({ chat, payload, opts });
      const key = { id: "h" + sends.length };
      if (!firstKey) firstKey = key;
      return { key };
    },
  };
  const replies = [];
  const m = {
    sender: jid, chat: "c@g.us", pushName: "Budi", isOwner: false,
    reply: async (txt) => { replies.push(txt); return { key: { id: "r" } }; },
  };
  const p = mylimitHandler(m, { sock });
  const t0 = Date.now();
  check("handler langsung balik (fire-and-forget ticker)", (async () => { await Promise.race([p, new Promise((r) => setTimeout(() => r("slow"), 1500))]); return Date.now() - t0 < 1500; })());
  await p;
  await new Promise((r) => setTimeout(r, 300));
  check("ticker card kekirim (bukan reply statis doang)", sends.length >= 1 && norm(sends[0].payload.text).includes("direset dalam"), sends[0]?.payload?.text?.slice(0, 80) || "-");
  // HARI INI MINGGU → weekend bonus x2 aktif (totalLimit 600, terpakai 320)
  const isSunday = moment.tz("Asia/Jakarta").day() === 0;
  const expectPair = isSunday ? "320/600" : "20/300";
  check(`kartu handler: meter ${expectPair} (weekend aware) + countdown`, norm(sends[0].payload.text).includes(expectPair) && /▰/.test(sends[0].payload.text), norm(sends[0].payload.text).slice(0, 200));
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
