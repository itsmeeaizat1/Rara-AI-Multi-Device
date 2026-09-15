// E2E: MODE OTOMATIS auto cuaca realtime (request owner 12 Sep 2026 +
// UPGRADE 15 Sep 2026: "notif tiap cuaca berganti gak kekirim" —
// dokumen diagnosis owner: deteksi per GRUP cuaca + state PERSIST ke db
// biar tahan restart). Test: grup deteksi, kirim pas grup berubah,
// diam kalau cuma ganti kode dalam grup sama, throttle, anti flip-flop,
// persist + pulihkan state tiap "restart", command plugin.
import path from "node:path";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; out("✅ " + label); }
  else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); }
}

const R = path.resolve(".");
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase("/tmp/weather-otomatis-e2e/nova.json");
const db = getDatabase();

const { realtimeKey, conditionKey, formatWeatherUpdate, formatWeatherChange, weatherGroupOf, WEATHER_GROUPS } = await import(R + "/src/lib/nova-weather-notify.js");
const { toSC } = await import(R + "/src/lib/nova-menu-style.js");
const {
  checkAndSend, getSchedulerStatus, resetAutoState, _setAutoStateForTest, _setWeatherFetcherForTest, setAutoGroupForTest,
} = await import(R + "/src/lib/nova-weather-realtime-scheduler.js");

// ═══ 1. weatherGroupOf — deteksi per GRUP (kunci dokumen diagnosis) ═══
out("\n— weatherGroupOf (grup cuaca) —");
t("1a. WMO 0/1 → cerah", weatherGroupOf({ weather_code: 0 }) === "cerah" && weatherGroupOf({ weather_code: 1 }) === "cerah");
t("1b. WMO 2/3/45/48 → mendung", weatherGroupOf({ weather_code: 2 }) === "mendung" && weatherGroupOf({ weather_code: 3 }) === "mendung" && weatherGroupOf({ weather_code: 45 }) === "mendung");
t("1c. WMO 61/65/80/82 → hujan", weatherGroupOf({ weather_code: 61 }) === "hujan" && weatherGroupOf({ weather_code: 65 }) === "hujan" && weatherGroupOf({ weather_code: 82 }) === "hujan");
t("1d. WMO 95/96/99 → hujan_petir", weatherGroupOf({ weather_code: 95 }) === "hujan_petir" && weatherGroupOf({ weather_code: 99 }) === "hujan_petir");
t("1e. fallback teks: Hujan Ringan → hujan (provider tanpa weather_code)", weatherGroupOf({ condition: "Hujan Ringan" }) === "hujan");
t("1f. fallback teks: Cerah → cerah", weatherGroupOf({ condition: "Cerah" }) === "cerah");
t("1g. fallback teks: Hujan Petir → hujan_petir", weatherGroupOf({ condition: "Hujan Petir" }) === "hujan_petir");

// ═══ 2. formatWeatherChange — pesan ala dokumen diagnosis ═══
out("\n— formatWeatherChange —");
const msgCh = formatWeatherChange(
  { temperature: 26, condition: "Hujan Lebat", weather_code: 65, precipitation: 4.2, wind_speed: 12, wind_direction_text: "Barat" },
  "Serang", "cerah", "Cerah"
);
t("2a. judul CUACA BERUBAH + lokasi", /CUACA BERUBAH — Serang/.test(msgCh));
t("2b. ada Dari/Ke (Cerah → Hujan Lebat)", /_Dari:_ Cerah/.test(msgCh) && /_Ke:_ \*Hujan Lebat\*/.test(msgCh));
t("2c. suhu + curah hujan + angin", /26°C/.test(msgCh) && /4\.2 mm/.test(msgCh) && /12 km\/j/.test(msgCh));
t("2d. saran payung (grup hujan)", /payung/i.test(msgCh));
const msgChPetir = formatWeatherChange({ temperature: 25, condition: "Hujan Petir", weather_code: 95, precipitation: 8, wind_speed: 20 }, "Serang", "hujan", "Hujan Ringan");
t("2e. grup petir → peringatan petir", /petir/i.test(msgChPetir) && /hindari area terbuka/.test(msgChPetir));

// ═══ 3. checkAndSend mode otomatis — fetch fake ═══
out("\n— checkAndSend mode otomatis (fetch fake) —");
const sent = [];
const sockMock = { sendMessage: async (jid, content) => { sent.push({ jid, text: content.text }); return { key: { id: "x" } }; } };
let fakeData = { temperature: 30, condition: "Cerah", weather_code: 0, time: "10:00", provider: "Open-Meteo", humidity: 70, wind_speed: 5, wind_direction: 90, wind_direction_text: "Timur", precipitation: 0, max_temp: 32, min_temp: 24 };
_setWeatherFetcherForTest(async () => fakeData);
resetAutoState();

db.saveSetting?.("weatherRealtime", null);
db.setting("weatherRealtime", {
  realtime: true, notification: true,
  location: { name: "Serang", latitude: -6.12, longitude: 106.15 },
  target: "6281234567890@s.whatsapp.net",
  notificationMode: "otomatis", autoCheckMinutes: 5, minGapMinutes: 10,
  alertEnabled: false, // e2e hermetic: alert ekstrem fetch LIVE
});

// 3a. tick pertama: belum ada state grup → kirim cuaca sekarang
await checkAndSend(sockMock);
t("3a. tick pertama kirim cuaca sekarang", sent.length === 1, `sent=${sent.length}`);
t("3b. pesan format CUACA BERUBAH (Dari: -)", /CUACA BERUBAH — Serang/.test(sent[0]?.text || ""));
const st = getSchedulerStatus();
t("3c. state auto keisi per GRUP (lastGroup cerah)", st.auto.lastGroup === "cerah" && st.auto.lastCondition === "Cerah", JSON.stringify(st.auto));

// 3b. throttle: tick cepet → gak fetch/gak kirim
sent.length = 0;
await checkAndSend(sockMock);
t("3d. throttle: cek tiap 5 menit — tick cepet gak kirim", sent.length === 0);

// 3c. lewat throttle, GRUP SAMA (Cerah 30 → Cerah Berawan 31, masih cerah-ish
//     tapi weather_code 2 = mendung → pakai kondisi dalam grup sama biar murni)
sent.length = 0;
_setAutoStateForTest({ lastCheckMs: 0 });
fakeData = { ...fakeData, weather_code: 0, condition: "Cerah", temperature: 31 }; // suhu naik, grup sama
await checkAndSend(sockMock);
t("3e. grup sama + suhu naik → diam gak kirim (kunci grup)", sent.length === 0, `sent=${sent.length}`);

// 3d. kode ganti dalam GRUP SAMA (Hujan Ringan → Hujan Lebat) → gak kirim
sent.length = 0;
_setAutoStateForTest({ lastCheckMs: 0 });
fakeData = { ...fakeData, weather_code: 61, condition: "Hujan Ringan", temperature: 28 };
await checkAndSend(sockMock);
t("3f. GRUP BERUBAH cerah→hujan → kirim segera", sent.length === 1, `sent=${sent.length}`);
t("3g. pesan nunjukin perubahan Dari Cerah → Hujan Ringan", /_Dari:_ Cerah/.test(sent[0]?.text || "") && /_Ke:_ \*Hujan Ringan\*/.test(sent[0]?.text || ""));
const stg = getSchedulerStatus();
t("3h. lastGroup keupdate ke hujan", stg.auto.lastGroup === "hujan", stg.auto.lastGroup);
sent.length = 0;
_setAutoStateForTest({ lastCheckMs: 0 });
fakeData = { ...fakeData, weather_code: 65, condition: "Hujan Lebat", temperature: 26 }; // MASIH grup hujan
await checkAndSend(sockMock);
t("3i. hujan ringan → hujan lebat (grup sama) → gak spam notif", sent.length === 0, `sent=${sent.length}`);

// 3e. FLIP-FLOP balik ke cerah (barusan dikirim < gap) → ditahan anti-spam
sent.length = 0;
_setAutoStateForTest({ lastCheckMs: 0 });
fakeData = { ...fakeData, weather_code: 0, condition: "Cerah", temperature: 30 };
await checkAndSend(sockMock);
t("3j. anti flip-flop: balik ke grup barusan dikirim → tahan", sent.length === 0, `sent=${sent.length}`);

// 3f. grup BARU beda lagi (mendung) → tetep kirim segera
sent.length = 0;
_setAutoStateForTest({ lastCheckMs: 0 });
fakeData = { ...fakeData, weather_code: 3, condition: "Berawan", temperature: 27 };
await checkAndSend(sockMock);
t("3k. grup baru beda (mendung) → kirim segera", sent.length === 1, `sent=${sent.length}`);

// 3g. flip-flop window ke-expire → boleh kirim lagi
sent.length = 0;
_setAutoStateForTest({ lastCheckMs: 0, recentKeys: [], lastGroup: "mendung", lastCondition: "Berawan" });
fakeData = { ...fakeData, weather_code: 0, condition: "Cerah", temperature: 30 };
await checkAndSend(sockMock);
t("3l. window flip-flop lewat → grup lama boleh kirim lagi", sent.length === 1, `sent=${sent.length}`);

// ═══ 4. PERSIST — state grup tersimpan di db & kepulihkan (inti dokumen diagnosis #1) ═══
out("\n— persist state tahan restart —");
const savedDb = db.setting("weatherRealtimeAuto");
t("4a. state grup tersimpan di database", savedDb?.lastGroup === "cerah" && savedDb?.lastCondition === "Cerah", JSON.stringify(savedDb || null));
// SIMULASI RESTART: in-memory state hilang (loaded=false biar ke-load ulang dari db)
_setAutoStateForTest({ loaded: false, lastCheckMs: 0, lastGroup: "", lastCondition: "", lastSentMs: 0, recentKeys: [] });
sent.length = 0;
fakeData = { ...fakeData, weather_code: 0, condition: "Cerah", temperature: 30 }; // grup SAMA dengan db
await checkAndSend(sockMock);
t("4b. restart + grup sama → PULIHKAN dari db, gak kirim dobel", sent.length === 0, `sent=${sent.length}`);
t("4c. state kepulihkan dari db ke memory", getSchedulerStatus().auto.lastGroup === "cerah");
// cuaca berganti PAS BOT MATI → begitu nyala langsung kekirim
_setAutoStateForTest({ loaded: false, lastCheckMs: 0, lastGroup: "", lastCondition: "", lastSentMs: 0, recentKeys: [] });
sent.length = 0;
fakeData = { ...fakeData, weather_code: 65, condition: "Hujan Lebat", temperature: 25 };
await checkAndSend(sockMock);
t("4d. restart + grup BERUBAH saat mati → langsung kirim", sent.length === 1, `sent=${sent.length}`);

// setAutoGroupForTest (command tesubah)
setAutoGroupForTest("cerah", "Cerah");
sent.length = 0;
_setAutoStateForTest({ lastCheckMs: 0 });
fakeData = { ...fakeData, weather_code: 61, condition: "Hujan Ringan", temperature: 27 };
await checkAndSend(sockMock);
t("4e. tesubah: grup dipaksa cerah → real hujan → notif kekirim", sent.length === 1 && /_Dari:_ Cerah/.test(sent[0]?.text || ""));

// resetAutoState → bersih + db ikut kebersihin
resetAutoState();
const st2 = getSchedulerStatus();
t("4f. resetAutoState bersihin state + db", st2.auto.lastGroup === "" && db.setting("weatherRealtimeAuto") == null);
_setWeatherFetcherForTest(null); // balikin fetch asli

// ═══ 5. command plugin ═══
out("\n— command plugin —");
const { handler } = await import(R + "/plugins/owner/weathersystemwatch.js");
const config = { command: { prefix: "." }, weather: { location: { name: "Jakarta", latitude: -6.2, longitude: 106.8 } } };
const replies = [];
function mockM(args) {
  return {
    command: "weathersystemwatch", args, prefix: ".",
    chat: "628999@s.whatsapp.net", isGroup: false, isOwner: true,
    react: async () => {},
    reply: async (txt) => replies.push(String(txt)),
  };
}

// 5a. notification on dengan mode jadwal lama → auto pindah OTOMATIS (fix inti)
db.setting("weatherRealtime", {
  realtime: true, notification: false,
  location: { name: "Serang", latitude: -6.12, longitude: 106.15 },
  schedules: [{ key: "pagi", label: "Pagi", hour: 6, minute: 30 }],
  target: "628999@s.whatsapp.net",
  notificationMode: "jadwal", // mode lama penyebab notif gak kekirim
});
await handler(mockM(["notification", "on"]), { sock: sockMock, config });
const sOn = db.setting("weatherRealtime");
t("5a. notification on: mode jadwal → OTOMATIS otomatis", sOn.notification === true && sOn.notificationMode === "otomatis", JSON.stringify({ mode: sOn.notificationMode }));

// 5b. otomatis (tanpa menit) → mode aktif default 5 menit
await handler(mockM(["otomatis"]), { sock: sockMock, config });
const s1 = db.setting("weatherRealtime");
t("5b. otomatis: mode otomatis + default 5 menit", s1.notificationMode === "otomatis" && Number(s1.autoCheckMinutes) === 5, JSON.stringify({ mode: s1.notificationMode, mnt: s1.autoCheckMinutes }));
t("5c. reply konfirmasi mode otomatis", (replies.at(-1) || "").includes(toSC("Mode Otomatis aktif")), (replies.at(-1) || "").slice(0, 60));

// 5c. otomatis 15 → menit custom
await handler(mockM(["otomatis", "15"]), { sock: sockMock, config });
const s2 = db.setting("weatherRealtime");
t("5d. otomatis 15: autoCheckMinutes 15", s2.notificationMode === "otomatis" && Number(s2.autoCheckMinutes) === 15, JSON.stringify({ mnt: s2.autoCheckMinutes }));

// 5d. otomatis 999 (invalid) → format error
await handler(mockM(["otomatis", "999"]), { sock: sockMock, config });
t("5e. otomatis 999: error format 1-60", (replies.at(-1) || "").includes(toSC("Format")), (replies.at(-1) || "").slice(0, 60));
t("5f. mode tetep otomatis 15 (gak keubah pas invalid)", Number(db.setting("weatherRealtime").autoCheckMinutes) === 15);

// 5e. tesubah → set state grup + reply petunjuk
await handler(mockM(["tesubah", "cerah"]), { sock: sockMock, config });
const stT = db.setting("weatherRealtimeAuto");
t("5g. tesubah cerah: state grup terakhir dipaksa", stT?.lastGroup === "cerah", JSON.stringify(stT || null));
t("5h. reply tesubah: petunjuk cek berikutnya", (replies.at(-1) || "").includes(toSC("Tes paksa")) && /otomatis/i.test(replies.at(-1) || ""), (replies.at(-1) || "").slice(0, 80));

// 5f. status → nunjukin mode otomatis + grup terakhir
await handler(mockM(["status"]), { sock: sockMock, config });
const stTxt = replies.at(-1) || "";
t("5i. status: mode otomatis + grup terakhir", stTxt.includes(toSC("Otomatis")) && stTxt.includes(toSC("Cerah")), stTxt.slice(0, 120));

// 5g. jadwal eksplisit tetap dihormati (user yang mau mode jam)
await handler(mockM(["jadwal", "06:30", "12:00"]), { sock: sockMock, config });
t("5j. jadwal eksplisit: mode balik jadwal", db.setting("weatherRealtime").notificationMode === "jadwal", db.setting("weatherRealtime").notificationMode);

// 5h. otomatis off → balik interval/jadwal
await handler(mockM(["otomatis", "off"]), { sock: sockMock, config });
const s3 = db.setting("weatherRealtime");
t("5k. otomatis off: balik mode interval/jadwal", s3.notificationMode === "interval" || s3.notificationMode === "jadwal", s3.notificationMode);

out("\n===== " + pass + " PASS, " + fail + " FAIL =====");
await new Promise((r) => setTimeout(r, 400));
process.exit(fail ? 1 : 0);
