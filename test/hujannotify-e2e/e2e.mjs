// E2E .hujannotif — nowcast hujan per-menit, 100% offline (fetcher di-inject)
import fs from "fs";
const w = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
const check = (name, ok) => { w((ok ? "  ✅ " : "  ❌ ") + name); ok ? pass++ : fail++; };

// db fresh (pola bola e2e)
const DB = "/tmp/hujan-e2e-db.json";
fs.rmSync(DB, { recursive: true, force: true });
const { initDatabase, getDatabase } = await import("../../src/lib/rara-database.js");
await initDatabase(DB);

import * as lib from "../../src/lib/rara-rain-notify.js";
import { fromSC } from "../../src/lib/styler.js";

// ── mock nowcast: 61 titik data per-menit, bisa digeser dari test ──
let nowcast = Array.from({ length: 61 }, () => ({ precip: 0 })); // cerah default
// v24.2.6: tambah sumber cadangan OWM Forecast 2.5 (pakai key OWM free tier)
let owmUp = true, omUp = true, owmFcUp = true, owmCalls = 0, omCalls = 0, owmFcCalls = 0, aiCalls = 0;
lib.setRainFetcher({
  owm: async () => { owmCalls++; if (!owmUp) throw new Error("owm down"); return nowcast.map((m) => ({ precip: m.precip })); },
  openmeteo: async () => { omCalls++; if (!omUp) throw new Error("om down"); return nowcast.map((m) => ({ precip: m.precip })); },
  owmForecast: async () => { owmFcCalls++; if (!owmFcUp) throw new Error("owm forecast down"); return nowcast.map((m) => ({ precip: m.precip })); },
  aiTip: async (an) => { aiCalls++; return "Segera siapkan payung atau cari tempat teduh ya 😊"; },
});
lib.setRainSock({ sendMessage: async (chatId, c) => sent.push({ chatId, text: c?.text || "" }) });
const sent = [];
const CHAT = "62812xxx@s.whatsapp.net";

// ═══ 1. analyzeRain murni (spec owner) ═══
let an = lib.analyzeRain([{ precip: 0 }, ...Array.from({ length: 29 }, () => ({ precip: 0.2 }))]);
check("1a. hujan menit ke-1 → menitTunggu 1, total 5.8, intensitas sedang", an.willRain && an.menitTunggu === 1 && an.total > 3 && an.intensity === "sedang");
an = lib.analyzeRain([...Array.from({ length: 14 }, () => ({ precip: 0 })), ...Array.from({ length: 16 }, () => ({ precip: 0.28 }))]);
check("1b. hujan mulai menit ke-14, total 4.5mm (contoh spec owner)", an.willRain && an.menitTunggu === 14 && an.total > 4 && an.total < 5);
an = lib.analyzeRain(Array.from({ length: 30 }, () => ({ precip: 0.8 })));
check("1c. total 24 → lebat", an.intensity === "lebat");
an = lib.analyzeRain([{ precip: 0.4 }, ...Array.from({ length: 29 }, () => ({ precip: 0 }))]);
check("1d. total 0.4 < 0.5 → gak willRain", an.willRain === false);
an = lib.analyzeRain([{ precip: 0.3 }, ...Array.from({ length: 29 }, () => ({ precip: 0 }))]);
check("1e. hujan LAGI turun (idx 0) → rainingNow", an.rainingNow === true);

// ═══ 2. settings default + key ═══
let st = lib.getStatus();
check("2a. default off, interval 10, cooldown 120, window 30", st.enabled === false && st.intervalMenit === 10 && st.cooldownMenit === 120 && st.windowMenit === 30);
check("2b. key OWM kebaca", st.keyOwm === true);

// ═══ 3. set lokasi + langganan ═══
check("3a. set lokasi", lib.setLocation({ name: "Serang", lat: -6.1203, lon: 106.1504 }) === true);
check("3b. lokasi tersimpan", lib.getLocation()?.name === "Serang");
lib.addTarget(CHAT);
st = lib.getStatus();
check("3c. langganan pertama auto-enable + monitor jalan", st.enabled === true && st.targets.includes(CHAT) && st.running === true);

// ═══ 4. runRainCheck: cerah → skip diam ═══
let r = await lib.runRainCheck();
check("4a. cerah → sent 0, sumber owm", r.sent === 0 && r.source === "openweathermap-onecall3");

// ═══ 5. hujan datang dalam 14 menit → NOTIF (contoh spec owner) ═══
nowcast = [...Array.from({ length: 14 }, () => ({ precip: 0 })), ...Array.from({ length: 16 }, () => ({ precip: 0.26 }))];
sent.length = 0;
r = await lib.runRainCheck();
check("5a. notif terkirim ke subscriber", r.sent === 1 && sent.length === 1);
check("5b. isi notif: PERINGATAN + 14 menit + total mm + AI tip", sent[0].text.includes("PERINGATAN HUJAN") && sent[0].text.includes("14 menit") && sent[0].text.includes("mm") && sent[0].text.includes("siapkan payung"));
check("5c. AI tip dipanggil 1x", aiCalls === 1);

// ═══ 6. ANTI-SPAM: masih hujan, cek lagi dalam 2 jam → skip ═══
sent.length = 0;
r = await lib.runRainCheck();
check("6a. cooldown aktif → 0 kirim (anti-spam spec owner)", r.sent === 0 && sent.length === 0);

// ═══ 7. force (manual .cek) → bypass cooldown ═══
r = await lib.runRainCheck({ force: true, chatId: CHAT });
check("7a. force+chatId bypass cooldown → terkirim", r.sent === 1 && r.targets === 1);

// ═══ 8. fallback provider: OWM mati → Open-Meteo ═══
owmUp = false;
sent.length = 0;
lib.getDatabase; // no-op
const st2 = lib.getStatus();
// reset cooldown biar keliatan kirimnya
getDatabase().setting("rainNotify", { ...st2, lastNotified: {} });
r = await lib.runRainCheck();
check("8a. OWM down → fallback Open-Meteo jalan", r.source === "open-meteo-minutely15" && r.sent === 1 && omCalls === 1);
owmUp = true;

// ═══ 9. SEMUA provider mati → error jelas (v24.2.6: termasuk OWM Forecast) ═══
owmUp = false; omUp = false; owmFcUp = false;
let err = null;
try { await lib.runRainCheck(); } catch (e) { err = e; }
check("9a. semua sumber down → throw error asli", !!err && /semua sumber nowcast down/.test(err.message));
owmUp = true; owmFcUp = true;

// ═══ 9b. v24.2.6: One Call + Open-Meteo down → key OWM dipakai (Forecast 2.5) ═══
owmUp = false; omUp = false; owmFcUp = true; owmFcCalls = 0; // One Call & Open-Meteo down, OWM Forecast hidup
sent.length = 0;
nowcast = Array.from({ length: 61 }, (_, i) => ({ precip: i >= 5 && i < 35 ? 1.5 : 0 }));
const r9b = await lib.runRainCheck();
check("9b. One Call + Open-Meteo down → fallback OWM Forecast 2.5 (key OWM terpakai)",
  r9b.source === "openweathermap-forecast25" && owmFcCalls === 1, `source=${r9b.source} calls=${owmFcCalls}`);
owmUp = true; omUp = true; owmFcUp = true;

// ═══ 10. interval & cooldown validasi ═══
check("10a. interval 3 ditolak (min 5)", lib.setIntervalMenit(3) === null);
check("10b. interval 90 ditolak (max 60)", lib.setIntervalMenit(90) === null);
check("10c. interval 5 diterima", lib.setIntervalMenit(5) === 5);
check("10d. cooldown 10 ditolak (min 30)", lib.setCooldownMenit(10) === null);
check("10e. cooldown 60 diterima", lib.setCooldownMenit(60) === 60);

// ═══ 11. rainNowCard: manual cek — aman vs hujan ═══
nowcast = Array.from({ length: 61 }, () => ({ precip: 0 }));
let card = await lib.rainNowCard(lib.getLocation());
check("11a. cerah → kartu aman", card.text.includes("Aman") && card.an.willRain === false);
nowcast = [...Array.from({ length: 20 }, () => ({ precip: 0 })), ...Array.from({ length: 10 }, () => ({ precip: 0.5 }))];
card = await lib.rainNowCard(lib.getLocation());
check("11b. hujan → kartu peringatan 20 menit", card.text.includes("PERINGATAN HUJAN") && card.text.includes("20 menit"));

// ═══ 12. warisan lokasi weatherScheduler ═══
getDatabase().setting("rainNotify", { enabled: true, targets: [CHAT], location: null, lastNotified: {} });
check("12a. lokasi dihapus → warisi weatherScheduler", lib.getStatus().location === null);
getDatabase().setting("weatherScheduler", { location: { name: "Lokasi Cuaca Owner", latitude: -6.2, longitude: 106.8 } });
nowcast = Array.from({ length: 61 }, () => ({ precip: 0 }));
r = await lib.runRainCheck();
check("12b. runRainCheck jalan pakai lokasi warisan", r.source === "openweathermap-onecall3" && r.sent === 0);

// ═══ 13. plugin handler: set via geocode mock + on + cek ═══
const hj = await import("../../plugins/cuaca/autoweatherrain.js");
hj._setHujanHttpForTest({ geocode: async (q) => q.toLowerCase().includes("serang") ? { name: "Serang", lat: -6.1203, lon: 106.1504 } : null });
getDatabase().setting("rainNotify", { enabled: false, targets: [], location: null, lastNotified: {} });
let replies = [];
const sockP = { sendMessage: async (jid, c) => replies.push(c?.text || "") };
const mkM = (args, quoted) => ({ args, chat: CHAT, quoted, reply: async (s) => replies.push(String(s)), react: async () => {} });
await hj.handler(mkM(["set", "Serang"]), { sock: sockP, args: ["set", "Serang"] });
check("13a. .set Serang → sukses (geocode)", fromSC(replies[replies.length - 1]).includes("lokasi nowcast diset"));
await hj.handler(mkM(["set", "Kota Fiktif 123"]), { sock: sockP, args: ["set", "Kota Fiktif 123"] });
check("13b. tempat gak ketemu → error", fromSC(replies[replies.length - 1]).includes("gak ketemu"));
// reply lokasi WA (3 shape, pola kiblat)
const mLoc = mkM(["set"], { locationMessage: { degreesLatitude: -6.9, degreesLongitude: 107.6, name: "Bandung" } });
await hj.handler(mLoc, { sock: sockP, args: ["set"] });
check("13c. reply lokasi WA → lokasi kebaca", lib.getLocation()?.name === "Bandung");
// on → langganan
await hj.handler(mkM(["on"]), { sock: sockP, args: ["on"] });
check("13d. .on → kartu SISTEM NOTIF HUJAN AKTIF", replies.some((t) => t.includes("SISTEM NOTIF HUJAN AKTIF") && t.includes("Bandung")));
nowcast = [...Array.from({ length: 10 }, () => ({ precip: 0 })), ...Array.from({ length: 20 }, () => ({ precip: 0.3 }))];
replies = [];
await hj.handler(mkM(["cek"]), { sock: sockP, args: ["cek"] });
check("13e. .cek → kartu nowcast hujan", replies.some((t) => t.includes("PERINGATAN HUJAN") && t.includes("10 menit")));
// status
replies = [];
await hj.handler(mkM(["status"]), { sock: sockP, args: ["status"] });
check("13f. .status → info lengkap", replies.some((t) => t.includes("HUJANNOTIF") || fromSC(t).toLowerCase().includes("interval cek")));

// ═══ 14. cleanup ═══
lib.setEnabled(false);
check("14a. off global → monitor stop", lib.getStatus().running === false);
lib.stopRainMonitor();
w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
