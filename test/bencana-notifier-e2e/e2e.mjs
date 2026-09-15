// E2E BENCANA NOTIFIER 5 SYARAT OWNER (15 Sep 2026):
// 1. Verifikasi penjadwalan — scheduler benar-benar terdaftar & jalan
// 2. Injeksi koneksi WhatsApp — notifikasi menerima sock sebagai parameter
// 3. Error gak disenyapkan — semua catch console.error
// 4. Dedup tahan restart — ID event dipersist HANYA setelah pesan terkirim
// 5. Tombol tes — .bencanawatch test paksa kirim tanpa syarat
// + RADIUS BEBAS: 50-20000 km (20000 = seluruh dunia, > jarak maksimum antar 2 titik di bumi)
import { initDatabase, getDatabase } from "../../src/lib/nova-database.js";
import fs from "node:fs";

await initDatabase("/tmp/bencana-notifier-e2e/nova.json");
const db = getDatabase();
const dbPath = "/tmp/bencana-notifier-e2e/state.json";
fs.rmSync("/tmp/bencana-notifier-e2e", { recursive: true, force: true });
fs.mkdirSync("/tmp/bencana-notifier-e2e", { recursive: true });

const L = await import("../../src/lib/nova-bencana.js");
const {
  _setBencanaStateFileForTest, _setBencanaSourcesForTest, _bencanaRunTickForTest,
  initBencanaMonitor, startBencanaMonitor, stopBencanaMonitor, getMonitorHealth,
  addWatcher, setWatcherRadius, parseRadiusKm, RADIUS_MAX_KM,
  addWatcherSchedule, setWatcherMode, dispatchEwsEvent, dispatchNearEvent,
  setMagmaHttp, _setBencanaSockForTest,
} = L;

// deterministik: SEMUA sumber di-inject sebelum monitor nyala
_setBencanaSourcesForTest({ bmkg: async () => null, usgsEws: async () => [], jma: async () => [], emsc: async () => [], usgsDay: async () => [], gdacs: async () => [] });
setMagmaHttp(async () => ({ ok: true, status: 200, text: async () => "<html>kosong</html>" }));

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok) => { w((ok ? "  ✅" : "  ❌") + " " + name); ok ? pass++ : fail++; };
const stateFile = () => JSON.parse(fs.readFileSync(dbPath, "utf8"));

_setBencanaStateFileForTest(dbPath);

// ── mock sock: catat semua kirim ──
const makeSock = (fail = false, groups = {}) => {
  const sent = [];
  return {
    sent,
    sock: {
      sendMessage: async (jid, msg) => {
        if (fail) throw new Error("KIRIM DIBUAT GAGAL (tes)");
        sent.push({ jid, text: String(msg?.text || "") });
        return { key: { id: "x" } };
      },
      groupFetchAllParticipating: async () => groups,
    },
  };
};
const OWNER = "628111111111@s.whatsapp.net";
const CHAT = "628222222222@s.whatsapp.net";
const G1 = "12036302@g.us";

const quake = (dt, mag, lat, lon, wilayah) => ({
  DateTime: dt, Magnitude: String(mag), Kedalaman: "10 km",
  Tanggal: "15 Sep 2026", Jam: "20.00.00 WIB",
  Coordinates: `${lat},${lon}`, Wilayah: wilayah || "Pusat gempa tes",
  Potensi: "Tidak berpotensi tsunami", Dirasakan: "tidak ada", _shakemapUrl: undefined,
});
const ewsEv = (key, mag, lat, lon, wilayah, provider = "GLOBAL (EMSC)") => ({
  key, provider, mag, depth: "10 km", wilayah, tsunami: "Tidak ada",
  lat, lon, waktu: "15 Sep 2026 20.00.00 WIB",
});

// ════ 0. RADIUS BEBAS (request owner 15 Sep 2026) ════
w("\n— radius bebas sampai luar negeri —");
check("parseRadiusKm: dunia → 20000 (seluruh dunia)", parseRadiusKm("dunia") === RADIUS_MAX_KM && RADIUS_MAX_KM === 20000);
check("parseRadiusKm: angka biasa kecil", parseRadiusKm("500") === 500);
db.setting("bencanaWatch", { [CHAT]: { since: new Date().toISOString(), mode: "otomatis", lat: -6.2, lon: 106.8, city: "Jakarta" } });
check("setWatcherRadius 5000 km DITERIMA (dulu ditolak >2000)", setWatcherRadius(CHAT, 5000).radius === 5000);
check("setWatcherRadius 20000 (dunia) DITERIMA", setWatcherRadius(CHAT, "dunia").radius === 20000);
let tolak25000 = false; try { setWatcherRadius(CHAT, 25000); } catch { tolak25000 = true; }
check("setWatcherRadius 25000 DITOLAK", tolak25000);
let tolak49 = false; try { setWatcherRadius(CHAT, 49); } catch { tolak49 = true; }
check("setWatcherRadius 49 DITOLAK (min 50)", tolak49);
setWatcherRadius(CHAT, 300);

// ════ 1. SCHEDULER TERDAFTAR & JALAN (syarat #1) ════
w("\n— syarat 1: verifikasi penjadwalan —");
const logs = [];
const origLog = console.log;
console.log = (...a) => { logs.push(a.map(String).join(" ")); };
initBencanaMonitor(makeSock().sock); // jalur index.js: sock → initBencanaMonitor
const health1 = getMonitorHealth();
check("initBencanaMonitor(sock) → monitor nyala (timer jalan)", health1.running === true);
check("subscriber terbaca dari db", health1.totalWatcher === 1);
check("console.log registrasi scheduler muncul di boot",
  logs.some((l) => l.includes("[SCHEDULER TERDAFTAR]")) === true);
console.log = origLog;
stopBencanaMonitor();
check("stopBencanaMonitor → timer dibersihkan", getMonitorHealth().running === false);

// ════ 2+3+4. fastTick: injeksi sock + retry + persist SETELAH kirim ════
w("\n— syarat 2/3/4: BMKG tick (injeksi sock, error gak senyap, persist setelah kirim) —");
const T1 = "2026-09-15T01:00:00+00:00", T2 = "2026-09-15T01:05:00+00:00";
let src = quake(T1, 5.5, -6.30, 106.90, "Pusat gempa tes A");
_setBencanaSourcesForTest({ bmkg: async () => src });

const ok1 = makeSock(); const fail1 = makeSock(true);
// baseline: T1 dicatat tanpa kirim (anti spam boot) — bukan pelanggaran #4
await _bencanaRunTickForTest("fast", ok1.sock);
check("tick baseline: T1 dicatat TANPA kirim (anti spam boot)", stateFile().bmkg === T1 && ok1.sent.length === 0);

// event BARU T2 muncul, koneksi WA GAGAL → state TIDAK boleh maju (retry nanti)
src = quake(T2, 5.5, -6.35, 106.95, "Pusat gempa tes B");
await _bencanaRunTickForTest("fast", fail1.sock);
check("kirim GAGAL → dedup TIDAK dipersist (st.bmkg masih T1)", stateFile().bmkg === T1);

// koneksi WA hidup → kirim ulang event T2 sukses → baru dipersist
await _bencanaRunTickForTest("fast", ok1.sock);
check("retry sukses → alert M5.5 terkirim ke subscriber", ok1.sent.length === 1 && ok1.sent[0].jid === CHAT);
check("dedup dipersist SETELAH kirim (st.bmkg == T2, tahan restart)", stateFile().bmkg === T2);
await _bencanaRunTickForTest("fast", ok1.sock);
check("tick ulang tanpa event baru → TIDAK dobel kirim", ok1.sent.length === 1);

// ════ 4b. EWS: persist SETELAH kirim + fix JID global ════
w("\n— syarat 4b: EWS peringatan dini —");
{ // reset HANYA bagian EWS — st.bmkg dipertahankan
  const st = stateFile(); delete st.ews; fs.writeFileSync(dbPath, JSON.stringify(st));
}
let ewsSrc = [ewsEv("emsc_e1", 4.6, -6.40, 107.00, "Banten tes A")];
_setBencanaSourcesForTest({ bmkg: async () => null, usgsEws: async () => [], jma: async () => [], emsc: async () => ewsSrc });
const okE = makeSock(); const failE = makeSock(true);
await _bencanaRunTickForTest("ews", okE.sock); // baseline
check("EWS baseline boot: event pertama dicatat tanpa kirim", okE.sent.length === 0);
ewsSrc = [ewsEv("emsc_e1", 4.6, -6.40, 107.00, "Banten tes A"), ewsEv("emsc_e2", 4.6, -6.45, 107.05, "Banten tes B")];
await _bencanaRunTickForTest("ews", failE.sock); // kirim gagal
check("EWS kirim GAGAL → key e2 TIDAK dipersist (dicoba lagi)", !stateFile().ews.seen.includes("emsc_e2"));
await _bencanaRunTickForTest("ews", okE.sock); // retry sukses
check("EWS retry → peringatan dini terkirim", okE.sent.length >= 1);
check("EWS dedup dipersist SETELAH kirim (seen berisi e2)", stateFile().ews.seen.includes("emsc_e2"));
await _bencanaRunTickForTest("ews", okE.sock);
check("EWS tick ulang → TIDAK dobel kirim", okE.sent.length === 1);

// fix bug JID global: subscriber global key "global:<owner>" dulu dikirim mentah → selalu gagal
w("\n— fix bug JID global (subscriber onglobal) —");
db.setting("bencanaWatch", { [`global:${OWNER}`]: { scope: "global", ownerJid: OWNER, since: new Date().toISOString(), mode: "otomatis", ews: true } });
const okG = makeSock(false, { [G1]: {} });
_setBencanaSockForTest(okG.sock); // expandTargets/allGroupJids baca sock modul → grup G1 kebaca
const resG = await dispatchEwsEvent(ewsEv("emsc_e3", 6.8, 35.0, 139.0, "Jepang tes severe"), null, okG.sock);
check("EWS subscriber GLOBAL → terkirim ke DM owner (JID valid)", okG.sent.some((s) => s.jid === OWNER));
check("EWS subscriber GLOBAL → terkirim ke grup (JID valid)", okG.sent.some((s) => s.jid === G1));
check("EWS TIDAK mengirim ke key 'global:…' (JID invalid — bug lama)", !okG.sent.some((s) => String(s.jid).startsWith("global:")));
check("hasil dispatch EWS: sent>0 errors=0", resG.sent >= 2 && resG.errors === 0);

// ════ radius gede → near-quake & EWS jangkauan luar negeri ════
w("\n— radius besar mencakup luar negeri —");
db.setting("bencanaWatch", { [CHAT]: { since: new Date().toISOString(), mode: "otomatis", lat: -6.2, lon: 106.8, city: "Jakarta", radius: 5000, jenis: ["gempa"], sumber: ["bmkg"] } });
const okR = makeSock();
// gempa M4.0 (di bawah threshold global) 3500 km dari Jakarta (≈ di luar negeri) dalam radius 5000
const resNear = await dispatchNearEvent(okR.sock, {
  kind: "gempa", jenis: "Gempa Bumi", mag: "4.0", depth: "10 km", level: "WASPADA",
  waktu: "tes", lat: 20.0, lon: 120.0, desc: "tes jauh", potensi: null, dirasakan: null, sumber: "BMKG (data.bmkg.go.id)", isSevere: false,
}, "gempa", "bmkg");
check("radius 5000 → gempa M4.0 sejauh ±3500 km TETAP dinotifkin", resNear.sent === 1);
db.setting("bencanaWatch", { [CHAT]: { ...db.setting("bencanaWatch") [CHAT], radius: 300 } });
const resNear2 = await dispatchNearEvent(okR.sock, {
  kind: "gempa", jenis: "Gempa Bumi", mag: "4.0", depth: "10 km", level: "WASPADA",
  waktu: "tes", lat: 20.0, lon: 120.0, desc: "tes jauh", potensi: null, dirasakan: null, sumber: "BMKG (data.bmkg.go.id)", isSevere: false,
}, "gempa", "bmkg");
check("radius 300 → gempa yang sama (jauh) DILEWATI", resNear2.sent === 0);
// EWS v2 level spec: radius gede memperluas HIJAU — M5.2 di ±3000 km
db.setting("bencanaWatch", { [CHAT]: { since: new Date().toISOString(), mode: "otomatis", lat: -6.2, lon: 106.8, city: "Jakarta", radius: 5000, ews: true } });
const resEwsR = await dispatchEwsEvent(ewsEv("emsc_e4", 5.2, 25.0, 121.0, "Taiwan tes radius"), null, okR.sock);
check("EWS v2: radius 5000 → M5.2 ±3000 km dibawa sebagai HIJAU (info)", resEwsR.sent === 1);

// ════ 5. jadwalTick: slot ditandai SETELAH rangkuman sukses ════
w("\n— jadwalTick: persist setelah kirim —");
db.setting("bencanaWatch", { [CHAT]: { since: new Date().toISOString(), mode: "jadwal", lat: -6.2, lon: 106.8, city: "Jakarta", radius: 300 } });
addWatcherSchedule(CHAT, (() => { const d = new Date(Date.now() + 7 * 3600e3); return d.toISOString().slice(11, 16); })());
setWatcherMode(CHAT, "jadwal");
// pending ada biar digest ada isi
_setBencanaSourcesForTest({ bmkg: async () => quake("2026-09-15T05:00:00+00:00", 6.0, -7.90, 110.26, "gempa pending Yogyakarta") }); // koordinat jauh dari T2 — bukan duplikat fpDupe
const okJ = makeSock(); const failJ = makeSock(true);
await _bencanaRunTickForTest("fast", okJ.sock); // isi pending buat mode jadwal
await _bencanaRunTickForTest("jadwal", failJ.sock);
check("rangkuman GAGAL kirim → slot jadwal TIDAK ditandai (dicoba lagi)", !stateFile().firedJadwal.some((k) => k.startsWith(CHAT)));
await _bencanaRunTickForTest("jadwal", okJ.sock);
check("retry rangkuman sukses → slot ditandai SETELAH kirim", stateFile().firedJadwal.some((k) => k.startsWith(CHAT)));
check("rangkuman terkirim ke subscriber", okJ.sent.some((s) => s.jid === CHAT && /BENCANA|RANGKUMAN|GEMPA/i.test(s.text)));

// ════ syarat #2 negatif: sock null → error keras, bukan senyap ════
w("\n— EWS v2: level MERAH/KUNING/HIJAU + ETA + template (spec owner 15 Sep) —");
check("level: M5.8 @178 km → MERAH", L.tentukanLevelEws(5.8, 178) === "MERAH");
check("level: M5.5 @250 km → MERAH (batas minMag/radius)", L.tentukanLevelEws(5.5, 250) === "MERAH");
check("level: M4.6 @400 km → KUNING", L.tentukanLevelEws(4.6, 400) === "KUNING");
check("level: M5.2 @1500 km → HIJAU", L.tentukanLevelEws(5.2, 1500) === "HIJAU");
check("level: M4.0 @100 km → null (di bawah ambang)", L.tentukanLevelEws(4.0, 100) === null);
check("level: M5.5 @350 km → KUNING (turun satu level)", L.tentukanLevelEws(5.5, 350) === "KUNING");
check("ETA: 178 km → 49 detik (gelombang S 3,6 km/dtk)", L.etaGetaranDetik(178) === 49 && L.etaGetaranDetik(200) === 56);
const tplMerah = L.formatEwsWarning({ provider: "BMKG", mag: 5.8, depth: "10 km", wilayah: "laut 91 km barat daya Sukabumi", tsunami: "Berpotensi dirasakan", lat: -7.0, lon: 106.4, waktu: "15 Sep 2026, 21.00.00 WIB" }, { jarak: 178, eta: 49, city: "Serang, Banten", level: "MERAH" });
check("template MERAH: judul darurat + M5.8 + jarak + ETA DETIK", tplMerah.includes("PERINGATAN DARURAT") && tplMerah.includes("M 5.8") && tplMerah.includes("±178 km") && tplMerah.includes("49 DETIK"));
check("template MERAH: instruksi DROP-COVER-HOLD ON + jauhi kaca/lift/tsunami", /DROP/.test(tplMerah) && /COVER/.test(tplMerah) && /HOLD ON/.test(tplMerah) && tplMerah.includes("JANGAN pakai lift") && tplMerah.includes("tsunami"));
const tplKuning = L.formatEwsWarning({ provider: "USGS", mag: 4.6, depth: "35 km", wilayah: "tes Banten", tsunami: "-", lat: -6.5, lon: 106.9, waktu: "15 Sep 2026, 21.00.00 WIB" }, { jarak: 400, eta: 111, city: "Jakarta", level: "KUNING" });
check("template KUNING: peringatan dini + ETA menit", tplKuning.includes("PERINGATAN DINI GEMPA") && tplKuning.includes("2 menit"));
const tplHijau = L.formatEwsWarning({ provider: "USGS", mag: 5.2, depth: "10 km", wilayah: "tes Nusa", tsunami: "-", lat: -8.0, lon: 120.0, waktu: "15 Sep 2026, 21.00.00 WIB" }, { jarak: 1500, eta: 417, city: "Jakarta", level: "HIJAU" });
check("template HIJAU: info + tidak perlu panik", tplHijau.includes("INFO GEMPA") && tplHijau.includes("Tidak perlu panik"));

// dispatch: subscriber Serang + gempa M5.8 178 km → kartu MERAH nyampe
db.setting("bencanaWatch", { [CHAT]: { since: new Date().toISOString(), mode: "otomatis", lat: -6.1203, lon: 106.1504, city: "Serang, Banten", radius: 300, ews: true } });
const okM = makeSock();
_setBencanaSockForTest(okM.sock);
const resM = await dispatchEwsEvent(ewsEv("bmkg_t1", 5.8, -6.7, 105.9, "laut 91 km barat daya Sukabumi", "BMKG"), null, okM.sock);
check("dispatch EWS: M5.8 @±178 km dari Serang → TERKIRIM (level MERAH)", resM.sent === 1 && resM.errors === 0);
check("pesan yang nyampe = template MERAH (DROP/COVER/HOLD)", okM.sent.length === 1 && /HOLD ON/.test(okM.sent[0].text));

w("\n— fallback provider: BMKG down → USGS tetap jalan —");
let bmkgDown = false;
_setBencanaSourcesForTest({
  bmkg: async () => { if (bmkgDown) throw new Error("BMKG MAINTENANCE (tes)"); return null; },
  usgsEws: async () => bmkgDown ? [ewsEv("usgs_f1", 5.9, -6.9, 105.7, "tes fallback USGS", "USGS")] : [],
  jma: async () => [], emsc: async () => [],
});
{ const st = stateFile(); delete st.ews; fs.writeFileSync(dbPath, JSON.stringify(st)); } // reset EWS state
const okF = makeSock();
await _bencanaRunTickForTest("ews", okF.sock); // baseline (kosong)
bmkgDown = true;
await _bencanaRunTickForTest("ews", okF.sock); // tick 1 — BMKG gagal (1x)
const h1 = L.getEwsProviderHealth();
check("health: BMKG 1x gagal → belum flag DOWN (toleransi 2x)", h1.BMKG.fails === 1 && h1.BMKG.down === false);
await _bencanaRunTickForTest("ews", okF.sock); // tick 2 — BMKG gagal lagi → DOWN + USGS event dikirim
const h2 = L.getEwsProviderHealth();
check("health: BMKG 2x gagal → DOWN + fallback aktif", h2.BMKG.down === true && h2.BMKG.fails >= 2);
check("fallback: gempa USGS M5.9 TETAP terkirim walau BMKG down", okF.sent.length === 1 && okF.sent[0].jid === CHAT);
bmkgDown = false;
_setBencanaSourcesForTest({ bmkg: async () => null, usgsEws: async () => [], jma: async () => [], emsc: async () => [] });
await _bencanaRunTickForTest("ews", okF.sock);
check("health: BMKG pulih → kembali ONLINE", L.getEwsProviderHealth().BMKG.down === false);

w("\n— EWS multi-bencana GDACS (tsunami/topan/banjir/gunung api) —");
const gd = (type, id, alertlevel, lat, lon, desc, country = "Indonesia") => ({
  type, id, name: desc, country, desc, alertlevel, alertscore: 1, iscurrent: true,
  fromdate: new Date().toISOString(), todate: null, report: "https://www.gdacs.org/report", detailsUrl: null, lat, lon,
});
let gdacsSrc = []; // baseline dari KOSONG — biar fixture topan kehitung event baru
_setBencanaSourcesForTest({ gdacs: async () => gdacsSrc });
{ const st = stateFile(); delete st.mdEws; fs.writeFileSync(dbPath, JSON.stringify(st)); } // reset mdEws state
const okT = makeSock();
await _bencanaRunTickForTest("mdews", okT.sock); // baseline boot
check("mdEws baseline boot: event awal dicatat tanpa kirim", okT.sent.length === 0);
gdacsSrc = [gd("TC", "tc-1", "Red", -6.9, 106.9, "Siklon tropis tes dekat Banten"), gd("TC", "tc-2", "Orange", -6.5, 107.2, "Siklon tropis tes KUNING")]; // 2 event baru
const failT = makeSock(true);
await _bencanaRunTickForTest("mdews", failT.sock); // kirim gagal
check("mdEws kirim GAGAL → id tc-2 TIDAK dipersist (retry)", !stateFile().mdEws.seen.includes("tc-2"));
await _bencanaRunTickForTest("mdews", okT.sock); // retry sukses
check("mdEws retry → topan MERAH + KUNING terkirim (instruksi bahan pokok)", okT.sent.length === 2 && okT.sent.some((x) => /bahan pokok/.test(x.text)));
check("mdEws MERAH berisi instruksi penyelamatan topan 4 langkah", okT.sent.some((x) => /PERINGATAN DARURAT — TOPAN/.test(x.text) && /senter/i.test(x.text)));
check("mdEws dedup dipersist + share st.gdacs (slowTick gak dobel)", stateFile().mdEws.seen.includes("tc-2") && (stateFile().gdacs || []).includes("tc-2"));
await _bencanaRunTickForTest("mdews", okT.sock);
check("mdEws tick ulang → TIDAK dobel kirim", okT.sent.length === 2);

// tsunami: selalu MERAH dalam 1000 km (bencana paling mematikan)
check("mdEws level: TSUNAMI dalam 1000 km → MERAH", L.tentukanLevelMdEws("TS", "Green", 800, 300) === "MERAH");
check("mdEws level: TSUNAMI 2000 km → KUNING", L.tentukanLevelMdEws("TS", "Green", 2000, 300) === "KUNING");
check("mdEws level: TC Red 100 km → MERAH", L.tentukanLevelMdEws("TC", "Red", 100, 300) === "MERAH");
check("mdEws level: FL Orange 1000 km radius 300 → HIJAU", L.tentukanLevelMdEws("FL", "Orange", 1000, 300) === "HIJAU");
check("mdEws level: FL Orange 3000 km radius 300 → null (skip)", L.tentukanLevelMdEws("FL", "Orange", 3000, 300) === null);
check("mdEws level: Red tanpa lokasi (jarak null) → MERAH global", L.tentukanLevelMdEws("WF", "Red", null, 0) === "MERAH");
const tplTsunami = L.formatMdEwsWarning({ kind: "tsunami", jenis: "Tsunami", icon: "🌊", level: "AWAS", lat: -6.9, lon: 105.9, desc: "tes", country: "Indonesia", waktu: "baru terdeteksi", report: null }, { level: "MERAH", jarak: 200, city: "Serang" });
check("template tsunami MERAH: instruksi menjauhi pantai + tempat tinggi", /MENJAUHI PANTAI/.test(tplTsunami) && /tempat tinggi/.test(tplTsunami));

w("\n— sock null: error keras —");
_setBencanaSockForTest(null); // simulasi koneksi belum tersedia
const resNull = await dispatchNearEvent(null, { kind: "gempa", mag: "4.0", lat: -6, lon: 106 }, "gempa", "bmkg");
check("dispatchNearEvent(null, …) → {errors:1}, gak throw senyap", resNull?.errors === 1 && resNull?.sent === 0);
const resNull2 = await dispatchEwsEvent(ewsEv("emsc_e5", 5.0, -6.1, 106.9, "tes null"), null, null);
check("dispatchEwsEvent tanpa koneksi → {errors:1}, gak senyap return 0", resNull2?.errors === 1 && resNull2?.sent === 0);
_setBencanaSockForTest(makeSock().sock); // restore

w(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
