// E2E — RAMADHAN PENGHITUNG HARI (13 Sep 2026, batch 4 variasi polos)
// ".ramadhan gak ada penghitung hari menuju Ramadhan 1448H" —
// computeRamadhanPhase (countdown/during) + header menu + ticker live < 24 jam.
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const { computeRamadhanPhase, ramadhanHeaderLine, buildRamadhanCard } = await import(R + "/src/lib/nova-ramadhan.js");
const { runLiveTicker } = await import(R + "/src/lib/nova-countdown.js");
const moment = (await import("moment-timezone")).default;
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

const DB_DIR = "/tmp/nova-ramadhan-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(DB_DIR + "/db.json");

const { handler } = await import(R + "/plugins/islami/ramadhan.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

// ═══════════════════════════════════════════════════════════════
w("\n— computeRamadhanPhase —");
{
  const now = Date.now();
  const ph = computeRamadhanPhase(now);
  check("sekarang (Sep 2026) → countdown 1448H", ph?.phase === "countdown" && ph.hijri === 1448, JSON.stringify(ph));
  const expectedDays = Math.ceil((moment.tz("2027-02-08 00:00", "YYYY-MM-DD HH:mm", "Asia/Jakarta").valueOf() - now) / 86400000);
  check("daysLeft sesuai tanggal estimasi 1 Ramadhan 1448", ph && Math.abs(ph.daysLeft - expectedDays) <= 1, `actual=${ph?.daysLeft} expected=${expectedDays}`);
  const ts1 = moment.tz("2027-02-05 12:00", "YYYY-MM-DD HH:mm", "Asia/Jakarta").valueOf();
  check("3 hari sebelum 1448 → daysLeft 3", computeRamadhanPhase(ts1)?.daysLeft === 3);
}
{
  // during: 10 Feb 2027 10:00 WIB → hari ke-3 (1 Ramadhan = 8 Feb)
  const tsIn = moment.tz("2027-02-10 10:00", "YYYY-MM-DD HH:mm", "Asia/Jakarta").valueOf();
  const ph = computeRamadhanPhase(tsIn);
  check("tengah Ramadhan 1448 → phase during", ph?.phase === "during" && ph.hijri === 1448);
  check("hari ke-3 dari ~29", ph?.dayOf === 3 && ph?.totalDays === 29, JSON.stringify(ph));
  check("header during: 'Hari ke-3 dari 29'", norm(ramadhanHeaderLine(ph)).includes("hari ke-3 dari 29"));
}
{
  const tsOld = moment.tz("2026-06-01 10:00", "YYYY-MM-DD HH:mm", "Asia/Jakarta").valueOf();
  check("tengah 2026 (udah lewat 1447) → countdown 1448", computeRamadhanPhase(tsOld)?.hijri === 1448);
  const tsFar = moment.tz("2031-01-01 10:00", "YYYY-MM-DD HH:mm", "Asia/Jakarta").valueOf();
  check("lewat 1451 → null senyap (panduan tetep jalan)", computeRamadhanPhase(tsFar) === null);
}

// ═══════════════════════════════════════════════════════════════
w("\n— kartu + header —");
{
  const ph = computeRamadhanPhase();
  const h = norm(ramadhanHeaderLine(ph));
  check("header countdown: Menuju Ramadhan 1448H + N hari lagi", h.includes("menuju ramadhan 1448h") && h.includes("hari lagi"));
  check("header ada tanggal estimasi (± DD MMMM YYYY)", /\d{2} [a-z]+ 2027/.test(h), h);
  const c = buildRamadhanCard(ph, 5 * 3600000 + 2 * 60000);
  const cn = norm(c);
  check("kartu ticker: 5:02:00 lagi + estimasi tanggal", cn.includes("5:02:00") && cn.includes("2027"), cn.slice(0, 100));
  const d = buildRamadhanCard(ph, 0);
  const dn = norm(d);
  check("remaining 0 → RAMADHAN DIMULAI + Marhaban", dn.includes("ramadhan dimulai") && dn.includes("marhaban"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— ticker live (mock sock) —");
{
  const sends = [];
  let firstKey = null;
  const sock = {
    sendMessage: async (chat, payload, opts) => {
      sends.push({ chat, payload, opts });
      const key = { id: "r" + sends.length };
      if (!firstKey) firstKey = key;
      return { key };
    },
  };
  const target = Date.now() + 3200;
  const phase = { phase: "countdown", hijri: 1448, startTs: target, endTs: target + 86400000, daysLeft: 1, dayOf: 0, totalDays: 29, startDateStr: "2027-02-08" };
  const res = await runLiveTicker({
    sock, chat: "c@g.us", m: null,
    initialCard: buildRamadhanCard(phase, target - Date.now()),
    tickCard: (st) => buildRamadhanCard(phase, st.remainingMs),
    mode: "down", targetTs: target,
  });
  check("kartu awal + edit-in-place + finish", sends.length >= 2 && res.finished === true && norm(sends[sends.length - 1].payload.text).includes("ramadhan dimulai"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— handler .ramadhan (menu + topik tetep utuh) —");
{
  const replies = [];
  const m = {
    sender: "6281234567890@s.whatsapp.net", chat: "c@g.us", pushName: "Tes",
    args: [], reply: async (txt) => { replies.push(txt); return { key: { id: "x" } }; },
  };
  await handler(m, { sock: null, conn: null, args: [], text: "", usedPrefix: ".", command: "ramadhan" });
  const menu = norm(replies[0] || "");
  check("menu: header penghitung muncul", menu.includes("menuju ramadhan 1448h") && menu.includes("hari lagi"), menu.slice(0, 120));
  check("menu: 10 topik + cara pakai tetep ada", menu.includes("panduan ramadhan - 10 topik") && menu.includes("ramadhan <nomor>"));
  check("menu: catatan estimasi rukyatul hilal", menu.includes("estimasi kalender") && menu.includes("rukyatul hilal"));

  replies.length = 0;
  await handler({ ...m, args: ["3"] }, { sock: null, conn: null, args: ["3"], text: ".ramadhan 3", usedPrefix: ".", command: "ramadhan" });
  const doa = norm(replies[0] || "");
  check("topik 3 (Doa Buka Puasa) tetep jalan", doa.includes("buka puasa") && doa.includes("allaahumma laka shumtu"), doa.slice(0, 80));
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
