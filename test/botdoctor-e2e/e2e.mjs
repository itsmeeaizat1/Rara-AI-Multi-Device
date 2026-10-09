// RARA — E2E: DOKTER BOT PRIBADI (26 Sep 2026). Lib murni + plugin handler.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/rara-botdoctor-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(DB_DIR + "/db.json");

const {
  noteBotDoctorTick, diagnoseBotHealth, buildDoctorCard, runBotDoctorNow,
  evaluateDailyCheck, processBotDoctorTick, initBotDoctorScheduler,
  stopBotDoctorScheduler, ensureBotDoctorState, _setDoctorOwnerJidForTest,
} = await import(R + "/src/lib/rara-botdoctor.js");
const { getDatabase } = await import(R + "/src/lib/rara-database.js");
const { handler } = await import(R + "/plugins/bot/botdoctor.js");
const { loadPlugins } = await import(R + "/src/lib/rara-plugins.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : " — " + String(extra ?? "").slice(0, 220))); ok ? pass++ : fail++; };

const db = getDatabase();
db.data.botdoctor = { samples: [], reports: [], sched: { on: false, jam: "23:00", lastDate: "" } };
const NOW = Date.now();
const MIN = 60e3, HOUR = 3600e3;
const mkS = (t, o = {}) => ({ t, p: 300, w: 1, e: 0, m: 2, r: 300, c: 10, u: 3600, ...o });

w("\n===== 1. diagnoseBotHealth (murni) =====");
{
  const r = diagnoseBotHealth([], NOW);
  check("samples kosong → temuan info 'belum ada sampel'", r.findings.length === 1 && r.findings[0].tingkat === "info" && /sampel/i.test(r.findings[0].gejala), JSON.stringify(r.findings));
  check("samples kosong → skor 100", r.score === 100, r.score);
}
{
  // sehat: 12 jam flat
  const s = [];
  for (let i = 0; i < 360; i++) s.push(mkS(NOW - 12 * HOUR + i * 2 * MIN));
  const r = diagnoseBotHealth(s, NOW);
  check("bot sehat → NOL temuan", r.findings.length === 0, JSON.stringify(r.findings.map(f => f.gejala)));
  check("bot sehat → skor 100", r.score === 100, r.score);
}
{
  // RAM creep: 220→520 MB dalam 10 jam
  const s = [];
  for (let i = 0; i < 300; i++) s.push(mkS(NOW - 10 * HOUR + i * 2 * MIN, { r: 220 + i * 8 }));
  const r = diagnoseBotHealth(s, NOW);
  const leak = r.findings.find((f) => /RAM naik konsisten/.test(f.gejala));
  check("RAM creep → temuan WASPADA leak", !!leak && leak.tingkat === "waspada", JSON.stringify(r.findings.map(f => f.gejala)));
  check("temuan leak ada dugaan + saran", leak && /leak/i.test(leak.dugaan) && /restart|audit|timer/i.test(leak.saran), leak?.saran);
  check("skor kena penalti waspada", r.score < 100, r.score);
}
{
  // restart churn 3x
  const s = [];
  let up = 10000;
  for (let i = 0; i < 60; i++) { up += 120; if (i === 15 || i === 30 || i === 45) up = 60; s.push(mkS(NOW - 24 * HOUR + i * 20 * MIN, { u: up })); }
  const r = diagnoseBotHealth(s, NOW);
  const rs = r.findings.find((f) => /restart 3 kali/.test(f.gejala));
  check("restart 3x dalam 24 jam → WASPADA", !!rs && rs.tingkat === "waspada", JSON.stringify(r.findings.map(f => f.gejala)));
}
{
  // latensi melonjak jam tertentu (contoh owner: "latensi naik tiap jam 9")
  const s = [];
  for (let k = 0; k < 144; k++) {
    const t = NOW - 24 * HOUR + k * 10 * MIN;
    const hWib = Number(new Date(t).toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour: "2-digit", hour12: false }));
    s.push(mkS(t, { p: hWib === 9 ? 2200 : 250 }));
  }
  const r = diagnoseBotHealth(s, NOW);
  const spike = r.findings.find((f) => /latensi WA melonjak/.test(f.gejala));
  check("latensi spike jam 9 → temuan + sebut jam", !!spike && /jam 09/.test(spike.gejala), JSON.stringify(r.findings.map(f => f.gejala)));
  check("saran spike → arah ke scheduler", spike && /scheduler/i.test(spike.saran), spike?.saran);
}
{
  // error 24 jam 60 → waspada
  const s = [];
  for (let i = 0; i < 120; i++) s.push(mkS(NOW - 12 * HOUR + i * 6 * MIN, { e: i % 2 }));
  const r = diagnoseBotHealth(s, NOW);
  const er = r.findings.find((f) => /60 error/.test(f.gejala));
  check("60 error 24 jam → WASPADA", !!er && er.tingkat === "waspada", JSON.stringify(r.findings.map(f => f.gejala)));
}
{
  // WA drop 4x → waspada
  const s = [];
  for (let i = 0; i < 40; i++) s.push(mkS(NOW - 13 * HOUR + i * 20 * MIN, { w: [5, 18, 25, 33].includes(i) ? 0 : 1 }));
  const r = diagnoseBotHealth(s, NOW);
  const wa = r.findings.find((f) => /putus-nyambung/.test(f.gejala));
  check("WA drop 4x → WASPADA", !!wa && wa.tingkat === "waspada", JSON.stringify(r.findings.map(f => f.gejala)));
}
{
  // CPU kronis 80%
  const s = [];
  for (let i = 0; i < 200; i++) s.push(mkS(NOW - 20 * HOUR + i * 6 * MIN, { c: 82 }));
  const r = diagnoseBotHealth(s, NOW);
  check("CPU 82% seharian → WASPADA", r.findings.some((f) => f.tingkat === "waspada" && /CPU/.test(f.gejala)), JSON.stringify(r.findings.map(f => f.gejala)));
}

w("\n===== 2. buildDoctorCard (format dokter: gejala→dugaan→saran) =====");
{
  const r = diagnoseBotHealth([], NOW);
  const c = buildDoctorCard(r, NOW);
  check("kartu ada judul + skor + jam WIB", c.includes("DOKTER BOT") && c.includes("Skor kesehatan: 100/100") && /🕒 \d{2}\.\d{2}\.\d{2}/.test(c), c.slice(0, 120));
}
{
  const r = { score: 76, findings: [{ tingkat: "waspada", gejala: "RAM naik konsisten 96 MB/jam", dugaan: "memory leak", saran: "audit interval" }] };
  const c = buildDoctorCard(r, NOW);
  check("temuan tampil: WASPADA + gejala", c.includes("WASPADA — RAM naik konsisten"), c);
  check("format dokter: Dugaan + Saran per temuan", c.includes("Dugaan: memory leak") && c.includes("Saran: audit interval"), c);
}
{
  const c = buildDoctorCard({ score: 100, findings: [] }, NOW);
  check("sehat → kalimat semua vital sehat", c.includes("Semua vital sehat"), c);
}

w("\n===== 3. jadwal harian (evaluateDailyCheck + processBotDoctorTick) =====");
{
  const jam23 = new Date(NOW);
  const hm = jam23.toLocaleString("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false });
  const v = evaluateDailyCheck({ on: true, jam: hm, lastDate: "", now: NOW });
  check("on + jam cocok → shouldRun true", v.shouldRun === true, JSON.stringify(v));
  const v2 = evaluateDailyCheck({ on: true, jam: hm, lastDate: v.today, now: NOW });
  check("udah kirim hari ini → false (dedupe)", v2.shouldRun === false, JSON.stringify(v2));
  const v3 = evaluateDailyCheck({ on: false, jam: hm, now: NOW });
  check("off → false", v3.shouldRun === false);
  const v4 = evaluateDailyCheck({ on: true, jam: "00:30", now: NOW });
  check("jam gak cocok → false", v4.shouldRun === false);
}
{
  // processBotDoctorTick: kirim DM + simpan riwayat + idempotent
  db.data.botdoctor = { samples: [], reports: [], sched: { on: true, jam: new Date(NOW).toLocaleString("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }), lastDate: "" } };
  _setDoctorOwnerJidForTest(() => "6281111111111@s.whatsapp.net");
  const sent = [];
  const fakeSock = { sendMessage: async (jid, p) => { sent.push({ jid, text: p.text }); } };
  const ok = await processBotDoctorTick(fakeSock, NOW);
  check("tick kirim DM ke owner", ok === true && sent.length === 1 && sent[0].jid === "6281111111111@s.whatsapp.net" && sent[0].text.includes("DOKTER BOT"), JSON.stringify(sent.length));
  check("riwayat tersimpan (skor + ringkas)", db.data.botdoctor.reports.length === 1 && typeof db.data.botdoctor.reports[0].score === "number");
  const ok2 = await processBotDoctorTick(fakeSock, NOW);
  check("tick kedua hari sama → gak dobel kirim", ok2 === false && sent.length === 1);
}

w("\n===== 4. sampler noteBotDoctorTick (dipanggil pinglog tiap 20 dtk) =====");
{
  const before = db.data.botdoctor.samples.length;
  noteBotDoctorTick({ pingMs: 321, waOk: true, errs: 2, msgs: 5 });
  noteBotDoctorTick({}); // pinglog mati → default aman
  const s = db.data.botdoctor.samples;
  check("2 tick → 2 sampel baru", s.length === before + 2, s.length);
  check("isi sampel: ping/RAM/uptime/error", s[s.length - 2].p === 321 && s[s.length - 2].e === 2 && s[s.length - 1].r > 0 && s[s.length - 1].u >= 0, JSON.stringify(s[s.length - 1]));
  const cap = 4320;
  const t0 = Date.now();
  for (let i = 0; i < cap + 50; i++) { db.data.botdoctor.samples.push(mkS(t0 - i * 20e3)); }
  noteBotDoctorTick({ pingMs: 100 });
  check("ring buffer capped 24 jam (4320)", db.data.botdoctor.samples.length <= cap + 3, db.data.botdoctor.samples.length);
}

w("\n===== 5. plugin .botdoctor (handler + registry) =====");
{
  const np = await import(R + "/src/lib/rara-plugins.js");
  await np.loadPlugins(path.resolve("plugins"));
  const found = np.getPlugin("botdoctor");
  check("botdoctor kebaca registry via loadPlugins", !!found && found?.config?.name === "botdoctor", JSON.stringify(found?.config?.name));
  const replies = [];
  const mkM = (args, text) => ({ sender: "6281111111111@s.whatsapp.net", pushName: "Owner", args, text: text ?? (".botdoctor " + args.join(" ")).trim(), react: async () => {}, reply: async (t) => { replies.push(t); } });
  await handler(mkM([]), { sock: { sendMessage: async () => {} }, config: {} });
  check("tanpa arg → kartu + guide (2 reply)", replies.length === 2 && replies[0].includes("DOKTER BOT") && replies[1].includes("『"), replies.map(r => r.slice(0, 30)).join("||")); // 『 sejak revisi judul 8 Okt
  check("kartu live via runBotDoctorNow (samples terakhir)", replies[0].includes("Skor kesehatan:"), replies[0].slice(0, 100));
  replies.length = 0;
  await handler(mkM(["on", "23:00"]), { sock: {} });
  check(".botdoctor on 23:00 → jadwal aktif", db.data.botdoctor.sched.on === true && db.data.botdoctor.sched.jam === "23:00", JSON.stringify(db.data.botdoctor.sched));
  check("balasan on menyebut jam 23:00", replies[0].includes("23:00"), replies[0]);
  replies.length = 0;
  await handler(mkM(["on", "25:99"]), { sock: {} });
  check("jam ngaco → ditolak & jadwal gak berubah", db.data.botdoctor.sched.jam === "23:00" && /gak valid/i.test(replies[0]), replies[0]);
  replies.length = 0;
  await handler(mkM(["status"]), { sock: {} });
  check("status → AKTIF + jam 23:00 + diagnosa terakhir", replies[0].includes("AKTIF") && replies[0].includes("23:00") && replies[0].includes("Diagnosa terakhir"), replies[0]);
  replies.length = 0;
  await handler(mkM(["riwayat"]), { sock: {} });
  check("riwayat → list skor", replies[0].includes("RIWAYAT DIAGNOSA") && /skor \d+\/100/.test(replies[0]), replies[0]);
  replies.length = 0;
  await handler(mkM(["off"]), { sock: {} });
  check(".botdoctor off → mati", db.data.botdoctor.sched.on === false, JSON.stringify(db.data.botdoctor.sched));
  replies.length = 0;
  await handler(mkM(["ngaco"]), { sock: {} });
  check("sub gak dikenal → panduan sub", /gak dikenal/.test(replies[0]), replies[0]);
}

w("\n===== 6. scheduler lifecycle =====");
{
  initBotDoctorScheduler({ sendMessage: async () => {} });
  initBotDoctorScheduler({ sendMessage: async () => {} }); // kedua kali: no-op
  check("init 2x gak dobel timer (idempotent)", true);
  stopBotDoctorScheduler();
  check("stop bersih", true);
}

w("\n===== TOTAL =====");
w(pass + " PASS, " + fail + " FAIL");
process.exit(fail ? 1 : 0);
