// E2E: MODE OTOMATIS auto cuaca realtime (request owner 12 Sep 2026:
// "klo mode otomatis aktif tiap cuaca berubah dia kirim notifikasi —
// adanya mode jadwal semua gak da mode otomatisnya").
// Test: realtimeKey deteksi perubahan, branch otomatis di checkAndSend
// (kirim pas berubah, diam kalau sama, throttle cek, jeda min anti-spam),
// command plugin .autoweatherrealtime otomatis.
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

const { realtimeKey, conditionKey, formatWeatherUpdate } = await import(R + "/src/lib/nova-weather-notify.js");
const { toSC } = await import(R + "/src/lib/nova-menu-style.js");
const {
  checkAndSend, getSchedulerStatus, resetAutoState, _setAutoStateForTest, _setWeatherFetcherForTest,
} = await import(R + "/src/lib/nova-weather-realtime-scheduler.js");

// ═══ 1. realtimeKey — deteksi perubahan cuaca TANPA time ═══
out("\n— realtimeKey (deteksi perubahan cuaca) —");
const d1 = { temperature: 30.4, condition: "Cerah", time: "10:00" };
const d2 = { temperature: 30.44, condition: "Cerah", time: "11:00" }; // suhu mirip + jam beda
const d3 = { temperature: 29, condition: "Hujan", time: "11:00" };   // kondisi berubah
t("1a. realtimeKey gak ikut time (beda jam, cuaca sama = key sama)", realtimeKey(d1) === realtimeKey(d2));
t("1b. realtimeKey berubah pas kondisi berubah", realtimeKey(d1) !== realtimeKey(d3));
t("1c. realtimeKey bulatin suhu (30.4 ≈ 30.44 = sama)", realtimeKey(d1).startsWith("30_"));
t("1d. conditionKey (lama) beda walau cuma ganti jam", conditionKey(d1) !== conditionKey(d2));

// ═══ 2. formatWeatherUpdate footer mode otomatis ═══
out("\n— footer mode otomatis —");
const msgAuto = formatWeatherUpdate({ temperature: 30, humidity: 70, condition: "Cerah", wind_speed: 5, wind_direction: 90, wind_direction_text: "Timur", precipitation: 0, max_temp: 32, min_temp: 24, provider: "Open-Meteo", time: "10:00" }, "Serang", 2, { autoMinutes: 5 });
t("2a. footer otomatis: cek tiap 5 menit + kirim saat berubah", /Mode Otomatis/.test(msgAuto) && /tiap 5 menit/.test(msgAuto) && /saat cuaca berubah/.test(msgAuto));
t("2b. footer otomatis gak ada 'next update N jam'", !/Next update/.test(msgAuto));
const msgInterval = formatWeatherUpdate({ temperature: 30, humidity: 70, condition: "Cerah", wind_speed: 5, wind_direction: 90, wind_direction_text: "Timur", precipitation: 0, max_temp: 32, min_temp: 24, provider: "Open-Meteo", time: "10:00" }, "Serang", 2);
t("2c. tanpa opts: footer interval lama tetep ada", /Next update/.test(msgInterval));

// ═══ 3. checkAndSend mode otomatis — pakai fetch fake ═══
out("\n— checkAndSend mode otomatis (fetch fake) —");
const sent = [];
const sockMock = { sendMessage: async (jid, content) => { sent.push({ jid, text: content.text }); return { key: { id: "x" } }; } };
let fakeData = { temperature: 30, condition: "Cerah", time: "10:00", provider: "Open-Meteo", humidity: 70, wind_speed: 5, wind_direction: 90, wind_direction_text: "Timur", precipitation: 0, max_temp: 32, min_temp: 24 };
_setWeatherFetcherForTest(async () => fakeData);
resetAutoState();

db.saveSetting?.("weatherRealtime", null);
db.setting("weatherRealtime", {
  realtime: true, notification: true,
  location: { name: "Serang", latitude: -6.12, longitude: 106.15 },
  target: "6281234567890@s.whatsapp.net",
  notificationMode: "otomatis", autoCheckMinutes: 5, minGapMinutes: 10,
});

// 3a. tick pertama: cuaca "berubah" dari kosong → kirim sekarang
await checkAndSend(sockMock);
t("3a. tick pertama kirim cuaca sekarang", sent.length === 1, `sent=${sent.length}`);
t("3b. pesan pakai footer mode otomatis", /Mode Otomatis/.test(sent[0]?.text || ""));
const st = getSchedulerStatus();
t("3c. state auto keisi (lastKey + lastSentMs)", st.auto.lastKey === "30_Cerah" && st.auto.lastSentMs > 0, JSON.stringify(st.auto));

// 3b. tick lagi langsung: throttle (belum 5 menit) → gak fetch/gak kirim
sent.length = 0;
await checkAndSend(sockMock);
t("3d. throttle: cek tiap 5 menit — tick cepet gak kirim", sent.length === 0);

// 3c. lewat throttle, cuaca SAMA → gak kirim (dedup)
sent.length = 0;
_setAutoStateForTest({ lastCheckMs: 0 });
await checkAndSend(sockMock);
t("3e. cuaca sama → diam gak kirim ulang", sent.length === 0);

// 3d. cuaca BERUBAH → langsung kirim (kondisi baru beda gak ditahan)
sent.length = 0;
_setAutoStateForTest({ lastCheckMs: 0 });
fakeData = { ...fakeData, condition: "Hujan Lebat", temperature: 26 };
await checkAndSend(sockMock);
t("3f. cuaca berubah → kirim segera", sent.length === 1, `sent=${sent.length}`);
t("3g. lastKey keupdate ke kondisi baru", getSchedulerStatus().auto.lastKey === "26_Hujan Lebat", getSchedulerStatus().auto.lastKey);

// 3e. FLIP-FLOP balik ke Cerah (barusan dikirim < 10 mnt) → ditahan anti-spam
sent.length = 0;
_setAutoStateForTest({ lastCheckMs: 0 }); // bypass throttle
fakeData = { ...fakeData, condition: "Cerah", temperature: 30 };
await checkAndSend(sockMock);
t("3h. anti flip-flop: balik ke kondisi barusan dikirim → tahan", sent.length === 0);
t("3i. key belum keupdate (masih dipegang kondisi terakhir terkirim)", getSchedulerStatus().auto.lastKey === "26_Hujan Lebat");

// 3f. kondisi BARU beda lagi (bukan yang barusan dikirim) → tetep kirim segera
sent.length = 0;
_setAutoStateForTest({ lastCheckMs: 0 });
fakeData = { ...fakeData, condition: "Berawan", temperature: 27 };
await checkAndSend(sockMock);
t("3j. kondisi baru beda → kirim segera (gak nunggu jeda)", sent.length === 1, `sent=${sent.length}`);

// 3g. flip-flop window ke-expire → boleh kirim lagi
sent.length = 0;
_setAutoStateForTest({ lastCheckMs: 0, recentKeys: [], lastKey: "27_Berawan" });
fakeData = { ...fakeData, condition: "Cerah", temperature: 30 };
await checkAndSend(sockMock);
t("3j2. window flip-flop lewat → kondisi lama boleh kirim lagi", sent.length === 1, `sent=${sent.length}`);

// 3g. resetAutoState → state bersih
resetAutoState();
const st2 = getSchedulerStatus();
t("3k. resetAutoState bersihin state", st2.auto.lastKey === "" && st2.auto.lastCheckMs === 0 && st2.auto.lastSentMs === 0 && Array.isArray(st2.auto.recentKeys) && st2.auto.recentKeys.length === 0);
_setWeatherFetcherForTest(null); // balikin fetch asli

// ═══ 4. command plugin .autoweatherrealtime otomatis ═══
out("\n— command plugin —");
const { handler } = await import(R + "/plugins/owner/autoweatherrealtime.js");
const config = { command: { prefix: "." }, weather: { location: { name: "Jakarta", latitude: -6.2, longitude: 106.8 } } };
const replies = [];
function mockM(args) {
  return {
    command: "autoweatherrealtime", args, prefix: ".",
    chat: "628999@s.whatsapp.net", isGroup: false, isOwner: true,
    react: async () => {},
    reply: async (txt) => replies.push(String(txt)),
  };
}

// 4a. tanpa arg → usage
await handler(mockM([]), { sock: sockMock, config });
t("4a. no-arg: usage nyebut otomatis", (replies.at(-1) || "").toLowerCase().includes("otomatis") || (replies.at(-1) || "").includes(toSC("otomatis")), (replies.at(-1) || "").slice(0, 80));

// 4b. otomatis (tanpa menit) → mode aktif default 5 menit
await handler(mockM(["otomatis"]), { sock: sockMock, config });
const s1 = db.setting("weatherRealtime");
t("4b. otomatis: mode otomatis + default 5 menit", s1.notificationMode === "otomatis" && Number(s1.autoCheckMinutes) === 5, JSON.stringify({ mode: s1.notificationMode, mnt: s1.autoCheckMinutes }));
t("4c. reply konfirmasi mode otomatis", (replies.at(-1) || "").includes(toSC("Mode Otomatis aktif")), (replies.at(-1) || "").slice(0, 60));

// 4c. otomatis 15 → menit custom
await handler(mockM(["otomatis", "15"]), { sock: sockMock, config });
const s2 = db.setting("weatherRealtime");
t("4d. otomatis 15: autoCheckMinutes 15", s2.notificationMode === "otomatis" && Number(s2.autoCheckMinutes) === 15, JSON.stringify({ mnt: s2.autoCheckMinutes }));

// 4d. otomatis 999 (invalid) → format error
await handler(mockM(["otomatis", "999"]), { sock: sockMock, config });
t("4e. otomatis 999: error format 1-60", (replies.at(-1) || "").includes(toSC("Format")), (replies.at(-1) || "").slice(0, 60));
t("4f. mode tetep otomatis 15 (gak keubah pas invalid)", db.setting("weatherRealtime").autoCheckMinutes === 15);

// 4e. otomatis off → balik interval (tanpa schedules terdaftar user baru)
await handler(mockM(["otomatis", "off"]), { sock: sockMock, config });
const s3 = db.setting("weatherRealtime");
t("4g. otomatis off: balik mode interval/jadwal", s3.notificationMode === "interval" || s3.notificationMode === "jadwal", s3.notificationMode);

// 4f. status nunjukin mode
await handler(mockM(["otomatis", "5"]), { sock: sockMock, config });
await handler(mockM(["status"]), { sock: sockMock, config });
t("4h. status: tampil mode otomatis + menit", (replies.at(-1) || "").includes(toSC("Otomatis")) && /5/.test(replies.at(-1) || ""), (replies.at(-1) || "").slice(0, 100));

out("\n===== " + pass + " PASS, " + fail + " FAIL =====");
await new Promise((r) => setTimeout(r, 400));
process.exit(fail ? 1 : 0);
