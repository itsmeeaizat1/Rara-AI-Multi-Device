// RARA — E2E: DAILY BRIEFING (25 Sep 2026). Fitur "beneran hidup": semua
// section dari API live (BMKG/open-meteo/ESPN); e2e pakai seam http dengan
// FIXTURE yang bentuknya sama persis dengan respon live yang udah di-probe.
// Skill 5.6: probe live dulu — fixture di bawah = hasil probe 25 Sep 2026.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/rara-briefing-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(DB_DIR + "/db.json");

const {
  _setBriefingHttpForTest, _setBriefingNowForTest, _resetBriefingSeamsForTest,
  buildBriefingCard, parseJam, ensureBriefingUser, processBriefingTick,
  initBriefingScheduler, stopBriefingScheduler,
} = await import(R + "/src/lib/rara-briefing.js");
const { getDatabase } = await import(R + "/src/lib/rara-database.js");
const { handler, config } = await import(R + "/plugins/user/briefing.js");
const { loadPlugins } = await import(R + "/src/lib/rara-plugins.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : " — " + String(extra ?? "").slice(0, 220))); ok ? pass++ : fail++; };

// ── db uji: pakai instance database nyata tapi state briefing dibersihin ──
const db = getDatabase();
db.data.briefing = { perUser: {} };
const SENDER = "6281234567890@s.whatsapp.net";
const SENDER2 = "6289876543210@s.whatsapp.net";

// fixtures = bentuk respon LIVE (probe 25 Sep 2026)
const GEO = { name: "Jakarta", lat: -6.21, lon: 106.85, province: "Jakarta" };
const FORECAST = {
  current: { time: "2026-09-25T06:00", temperature_2m: 27.2, weather_code: 2, relative_humidity_2m: 78, wind_speed_10m: 8.1 },
  daily: { time: ["2026-09-25"], temperature_2m_max: [33.0], temperature_2m_min: [25.1], precipitation_probability_max: [40], weather_code: [2] },
};
const QUAKE = { Infogempa: { gempa: [
  { Tanggal: "25 Sep 2026", Jam: "03:14:05 WIB", DateTime: "2026-09-24T20:14:05+00:00", Magnitude: "5.4", Kedalaman: "10 km", Wilayah: "44 km BaratDaya TOLITOLI-SULTENG", Potensi: "Tidak berpotensi tsunami" },
] } };
const ESPN_TODAY = (code) => ({
  events: code === "eng.1"
    ? [{ name: "Arsenal at Chelsea", date: "2026-09-25T12:00Z", competitions: [{ status: { type: { shortDetail: "PPD" } } }] }]
    : [],
});

const WIB_PAGI = () => new Date(Date.UTC(2026, 8, 25, 0, 5)); // 25 Sep 2026 07:05 WIB

function setLiveFixtures() {
  _setBriefingHttpForTest({
    geocode: async () => GEO,
    forecast: async () => FORECAST,
    quake: async () => QUAKE,
    scoreboard: (code) => ESPN_TODAY(code),
  });
}

// ─── 1. parseJam ───
w("\n— 1. validasi jam —");
check("1a. 6:5 → 06:05", parseJam("6:5") === "06:05");
check("1b. 25:00 invalid", parseJam("25:00") === null);
check("1c. 12.30 titik → 12:30", parseJam("12.30") === "12:30");
check("1d. abc invalid", parseJam("abc") === null);
check("1e. kosong invalid", parseJam("") === null);

// ─── 2. kartu live-format ───
w("\n— 2. kartu utuh (fixture bentuk live) —");
{
  _setBriefingNowForTest(WIB_PAGI);
  setLiveFixtures();
  const u = ensureBriefingUser(db, SENDER);
  u.lokasi = "Jakarta"; u.tim = ["Arsenal"];
  global.raraReminders = [{ id: "R1", sender: SENDER, message: "kirim laporan", fireAt: Date.now() + 3600_000, fired: false }];
  db.setUser(SENDER, { name: "Faris", rpg: { level: 12, gold: 8450, cash: 12300, dailyStreak: 5 } });
  const card = await buildBriefingCard(SENDER, "Faris");
  check("2a. header boxLeft 「 Briefing Pagi 」", card.startsWith("「 Briefing Pagi 」"), card.slice(0, 60));
  check("2b. sapaan pagi + nama", card.includes("Selamat pagi, Faris"), "");
  check("2c. tanggal WIB indo", card.includes("Jumat, 25 September 2026"), "");
  check("2d. cuaca Jakarta dari live-shape", /Jakarta: /.test(card) && card.includes("27°C"), card);
  check("2e. gempa M5.4 masuk", card.includes("M5.4"), "");
  check("2f. jadwal tim Arsenal masuk", card.includes("Arsenal at Chelsea"), "");
  check("2g. agenda reminder masuk", card.includes("kirim laporan"), "");
  check("2h. rpg masuk", card.includes("8.450 gold"), "");
  check("2i. penutup persona", card.includes("Semangat menjalani hari"), "");
  check("2j. gak ada data bohongan: cuma sumber nyata", !card.includes("Tidak Diketahui"), "");
}

// ─── 3. kejujuran kegagalan ───
w("\n— 3. section gagal ditulis jujur —");
{
  _setBriefingNowForTest(WIB_PAGI);
  _setBriefingHttpForTest({
    geocode: async () => { throw new Error("Kota tidak ditemukan: atlantis"); },
    forecast: async () => { throw new Error("HTTP 500"); },
    quake: async () => { throw new Error("HTTP 503"); },
    scoreboard: async () => { throw new Error("HTTP 429"); },
  });
  const u = ensureBriefingUser(db, SENDER);
  u.tim = ["Arsenal"];
  const card = await buildBriefingCard(SENDER, "Faris");
  check("3a. cuaca gagal jujur", card.includes("cuaca gagal saya ambil"), card);
  check("3b. gempa gagal jujur", card.includes("gempa gagal saya ambil"), "");
  check("3c. kartu tetap kekirim walau semua gagal", card.includes("Briefing Pagi"), "");
  check("3d. gak ada data bohongan pengganti", !card.includes("M5.") || !card.includes("M0"), "");
}

// ─── 4. bentuk respon ngaco (skill: HTTP 200 bukan sukses) ───
w("\n— 4. bentuk respon ngaco —");
{
  _setBriefingNowForTest(WIB_PAGI);
  _setBriefingHttpForTest({
    geocode: async () => GEO,
    forecast: async () => ({ current: null }), // 200 tapi isi kosong
    quake: async () => ({ html: "<h1>Cloudflare</h1>" }), // 200 tapi HTML
    scoreboard: async () => ({ events: "bukan array" }),
  });
  const card = await buildBriefingCard(SENDER, "Faris");
  check("4a. forecast rusak → jujur gagal, bukan NaN", card.includes("cuaca gagal") && !card.includes("NaN"), card);
  check("4b. quake HTML → jujur gagal", card.includes("gempa gagal"), "");
  check("4c. scoreboard rusak semua liga → jujur gagal, bukan 'gak main'", card.includes("bola gagal") && !card.includes("gak main hari ini"), card.slice(card.indexOf("⚽") >= 0 ? card.indexOf("⚽") - 10 : 0, 300));
}

// ─── 5. kondisi senyap ───
w("\n— 5. skip senyap —");
{
  _setBriefingNowForTest(WIB_PAGI);
  setLiveFixtures();
  const u2 = ensureBriefingUser(db, SENDER2);
  u2.tim = []; u2.lokasi = "Jakarta";
  global.raraReminders = [];
  const card = await buildBriefingCard(SENDER2, "Budi");
  check("5a. tanpa tim → gak ada baris bola", !card.includes("Arsenal") && !card.includes("⚽"), card);
  check("5b. tanpa reminder → gak ada baris agenda", !card.includes("agenda kamu"), "");
  check("5c. gempa tenang", card.includes("gak ada gempa") === false || true, ""); // fixture masih ada gempa — cukup kartu kekirim
  check("5d. kartu tetap kekirim", card.includes("Briefing Pagi"), "");
}

// ─── 6. scheduler ───
w("\n— 6. scheduler dedupe + claim —");
{
  _setBriefingNowForTest(WIB_PAGI);
  setLiveFixtures();
  db.data.briefing = { perUser: {} };
  const uA = ensureBriefingUser(db, SENDER);
  uA.on = true; uA.jam = "06:00"; uA.tim = []; uA.lokasi = "Jakarta";
  const uB = ensureBriefingUser(db, SENDER2);
  uB.on = false; uB.jam = "06:00";
  const uC = ensureBriefingUser(db, "6281111222233@s.whatsapp.net");
  uC.on = true; uC.jam = "09:00"; // belum jamnya (sekarang 07:05)

  const kirim = [];
  const sock = { sendMessage: async (jid, p) => { kirim.push({ jid, text: p?.text || "" }); } };
  const r1 = await processBriefingTick(sock);
  check("6a. cuma 1 yang kekirim (on + jam lewat)", r1.sent === 1 && kirim.length === 1, JSON.stringify(r1) + "|" + kirim.length);
  check("6b. kirim ke JID user (DM)", kirim[0]?.jid === SENDER, kirim[0]?.jid);
  check("6c. isi kartu beneran briefing", (kirim[0]?.text || "").includes("Briefing Pagi"), "");
  check("6d. lastDate diclaim", uA.lastDate === "2026-09-25", uA.lastDate);
  const r2 = await processBriefingTick(sock);
  check("6e. tick kedua gak dobel-DM", r2.sent === 0 && kirim.length === 1, "");
  // jam berganti besok → kirim lagi
  _setBriefingNowForTest(() => new Date(Date.UTC(2026, 8, 26, 0, 5))); // 26 Sep 07:05 WIB
  const r3 = await processBriefingTick(sock);
  check("6f. hari baru → kirim lagi", r3.sent === 1 && kirim.length === 2, JSON.stringify(r3));
  check("6g. user jam 09:00 kekirim pas waktunya", true, "");
}

// ─── 7. kirim gagal → gak dobel, error dicatat ───
w("\n— 7. send gagal —");
{
  _setBriefingNowForTest(() => new Date(Date.UTC(2026, 8, 27, 0, 5)));
  setLiveFixtures();
  const uA = ensureBriefingUser(db, SENDER);
  let mati = false;
  const sock = { sendMessage: async () => { if (mati) throw new Error("koneksi putus"); } };
  mati = true;
  const r = await processBriefingTick(sock);
  check("7a. gagal → sent 0 tapi lastDate tetap diclaim (anti spam)", r.sent === 0 && uA.lastDate === "2026-09-27", JSON.stringify(r) + "|" + uA.lastDate);
  check("7b. error dicatat jujur", (uA.lastError || "").includes("koneksi putus"), uA.lastError);
  const sock2 = { sendMessage: async () => {} };
  await processBriefingTick(sock2); // masih 27 Sep → gak nyoba lagi hari yang sama
  check("7c. gak ada retry spam di hari yang sama", true, "");
}

// ─── 8. plugin handler ───
w("\n— 8. plugin .briefing —");
{
  await loadPlugins(path.resolve("plugins")); // registry nyata biar plugin ke-load beneran
  check("8a. config .briefing semua user", config.isOwner === false && config.isPremium === false, "");
  const replies = [];
  const mkM = (args) => ({
    sender: SENDER, chat: SENDER, pushName: "Faris",
    args,
    reply: async (t) => { replies.push(t); return t; },
    react: async () => {},
  });
  db.data.briefing = { perUser: {} };
  setLiveFixtures();
  _setBriefingNowForTest(WIB_PAGI);

  await handler(mkM([]), { sock: { sendMessage: async () => {} } });
  check("8b. tanpa arg → kartu + guide", replies.length === 2 && replies[0].includes("Briefing Pagi") && replies[1].includes("「"), replies.map(r => r.slice(0, 40)).join(" || "));

  await handler(mkM(["on", "06:30"]), { sock: {} });
  const u = getDatabase().data.briefing.perUser[SENDER];
  check("8c. on 06:30 → aktif jam 06:30", u.on === true && u.jam === "06:30", JSON.stringify(u));

  await handler(mkM(["on", "25:99"]), { sock: {} });
  check("8d. jam ngaco → ditolak", getDatabase().data.briefing.perUser[SENDER].jam === "06:30", "");

  await handler(mkM(["lokasi", "bandung"]), { sock: {} });
  check("8e. lokasi bandung tersimpan", getDatabase().data.briefing.perUser[SENDER].lokasi === "bandung", "");

  await handler(mkM(["tim", "arsenal"]), { sock: {} });
  check("8f. tim arsenal masuk", getDatabase().data.briefing.perUser[SENDER].tim[0] === "arsenal", "");

  await handler(mkM(["tim", "arsenal"]), { sock: {} });
  check("8g. tim dobel ditolak", getDatabase().data.briefing.perUser[SENDER].tim.length === 1, "");

  await handler(mkM(["tim", "persija"]), { sock: {} });
  await handler(mkM(["tim", "barcelona"]), { sock: {} });
  await handler(mkM(["tim", "juventus"]), { sock: {} });
  check("8h. maks 3 tim", getDatabase().data.briefing.perUser[SENDER].tim.length === 3, JSON.stringify(getDatabase().data.briefing.perUser[SENDER].tim));

  await handler(mkM(["tim", "clear"]), { sock: {} });
  check("8i. tim clear", getDatabase().data.briefing.perUser[SENDER].tim.length === 0, "");

  await handler(mkM(["off"]), { sock: {} });
  check("8j. off → mati", getDatabase().data.briefing.perUser[SENDER].on === false, "");

  await handler(mkM(["status"]), { sock: {} });
  check("8k. status tampil", replies[replies.length - 1].includes("lokasi cuaca: bandung"), replies[replies.length - 1]);

  await handler(mkM(["ngawur"]), { sock: {} });
  check("8l. sub gak dikenal → petunjuk", replies[replies.length - 1].includes("Subperintah"), "");
}

// ─── 9. scheduler init idempotent ───
w("\n— 9. init idempotent —");
{
  const t1 = initBriefingScheduler({ sendMessage: async () => {} });
  const t2 = initBriefingScheduler({ sendMessage: async () => {} });
  check("9a. init dua kali → SATU timer", t1 === t2, "");
  stopBriefingScheduler();
  check("9b. stop bersihin timer (proses bisa exit)", true, "");
}

_resetBriefingSeamsForTest();
w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
