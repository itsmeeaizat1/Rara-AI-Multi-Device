// E2E — HARI LIBUR PENGHITUNG (13 Sep 2026, batch 4 variasi polos)
// ".harilibur daftar doang gak ada penghitung libur terdekat" —
// header libur terdekat + deteksi hari-ini-libur + ticker live < 24 jam.
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const { computeNextMidnightWib, buildLiburHeader, buildLiburCard } = await import(R + "/src/lib/nova-libur-card.js");
const { runLiveTicker } = await import(R + "/src/lib/nova-countdown.js");
const moment = (await import("moment-timezone")).default;
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

const DB_DIR = "/tmp/nova-libur-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(DB_DIR + "/db.json");

const { handler } = await import(R + "/plugins/info/holiday.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

// ═══════════════════════════════════════════════════════════════
w("\n— computeNextMidnightWib —");
{
  const ts = computeNextMidnightWib();
  check("target tengah malam WIB besok", moment.tz(ts, "Asia/Jakarta").format("HH:mm") === "00:00" && ts > Date.now());
  check("selalu < 24 jam dari sekarang", ts - Date.now() <= 86400000 && ts - Date.now() > 0);
}

// ═══════════════════════════════════════════════════════════════
w("\n— buildLiburHeader —");
{
  check("hari ini libur → 'HARI INI: X'", norm(buildLiburHeader({ events: ["Tahun Baru"] }, { event: "X", daysUntil: 3 })).includes("hari ini: tahun baru"));
  const h5 = norm(buildLiburHeader({ events: [] }, { date: "12-25", event: "Natal", daysUntil: 5 }));
  check("libur 5 hari lagi → '5 hari lagi'", h5.includes("libur terdekat: natal") && h5.includes("5 hari lagi") && h5.includes("12-25"));
  const h1 = norm(buildLiburHeader({ events: [] }, { date: "09-17", event: "Hari Perhubungan Nasional", daysUntil: 1 }));
  check("libur besok → 'BESOK!'", h1.includes("besok!"), h1);
  check("gak ada apa-apa → string kosong", buildLiburHeader({ events: [] }, null) === "");
  check("hari ini libur prioritas daripada terdekat", norm(buildLiburHeader({ events: ["Idul Fitri"] }, { event: "Natal", daysUntil: 2 })).includes("hari ini: idul fitri"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— buildLiburCard (ticker) —");
{
  const c = buildLiburCard("Natal", 5 * 3600000 + 2 * 60000);
  const cn = norm(c);
  check("kartu countdown: 5:02:00 + nama event", cn.includes("5:02:00") && cn.includes("natal"));
  const d = buildLiburCard("Natal", 0);
  const dn = norm(d);
  check("remaining 0 → LIBUR TIBA + selamat", dn.includes("libur tiba") && dn.includes("selamat"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— ticker live (mock sock) —");
{
  const sends = [];
  const sock = {
    sendMessage: async (chat, payload, opts) => { sends.push({ chat, payload, opts }); return { key: { id: "l" + sends.length } }; },
  };
  const target = Date.now() + 3200;
  const res = await runLiveTicker({
    sock, chat: "c@g.us", m: null,
    initialCard: buildLiburCard("Natal", target - Date.now()),
    tickCard: (st) => buildLiburCard("Natal", st.remainingMs),
    mode: "down", targetTs: target,
  });
  check("kartu awal + edit + finish LIBUR TIBA", sends.length >= 2 && res.finished === true && norm(sends[sends.length - 1].payload.text).includes("libur tiba"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— handler .harilibur (LIVE api nexray) —");
{
  const replies = [];
  const sends = [];
  const sock = {
    sendMessage: async (chat, payload, opts) => { sends.push({ chat, payload, opts }); return { key: { id: "h" + sends.length } }; },
  };
  const m = {
    sender: "6281234567890@s.whatsapp.net", chat: "c@g.us", pushName: "Tes",
    reply: async (txt) => { replies.push(txt); return { key: { id: "r" } }; },
  };
  await handler(m, { sock });
  const txt = norm(replies[0] || "");
  check("live: kartu kekirim (API hidup)", txt.length > 50, txt.slice(0, 60));
  check("live: ada header penghitung (hari ini / terdekat)", txt.includes("hari ini:") || txt.includes("terdekat") || txt.includes("besok"), txt.slice(0, 150));
  check("live: daftar libur/nasional tetep ada", txt.includes("ʜᴀʀɪ ʟɪʙᴜʀ ᴍᴇɴᴅᴀᴛᴀɴɢ".toLowerCase()) || txt.includes("mendatang") || txt.includes("nasional"));
  check("live: item ada 'hari lagi'", /hari lagi|besok|hari ini/.test(txt));
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
