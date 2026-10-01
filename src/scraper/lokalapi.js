// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 lokalapi.js — API Lokal Indonesia (live verified 15 Sep 2026, dari katalog
//   farizdotid/DAFTAR-API-LOKAL-INDONESIA — owner minta semua yang hidup):
//   kodepos.vercel.app — cari kode pos + detect GPS (sooluh/kodepos)
//   idn-area.up.railway.app — wilayah RI: provinsi/kab-kota/kec/kel/pulau (fityannugroho)
//   football-standings-api.vercel.app — klasemen liga (azharimm, data ESPN)
//   katanime.vercel.app — quotes anime EN/ID (ricko-v)
//   api.puasa-sunnah.granitebps.com — jadwal puasa sunnah (granitebps)
//   api-sekolah-indonesia.vercel.app — data sekolah SD/SMP/SMA/SMK (wanrabbae)
//   api-pesantren-indonesia.vercel.app — pesantren + NSPP (nasrul21)
//   hibersunda.vercel.app — kamus undak usuk basa Sunda (hiberin)
//   quran-api-id.vercel.app — al-quran + transliterasi + tafsir (renomureza)
//   myinstants-api.vercel.app — search sound effect (abdipr)
// 🔹 MATI/skip dari katalog: semua Heroku (otakudesu/onecak/kbbi-amm/currency),
//   jagokata, kunci-tts, epic-free-games, berita-indo, liga-indonesia,
//   logam-mulia, lambang daerah, thecloudalert (alamat+bank), KAI (403),
//   animeapi.my.id (403 blok IP datacenter), lazy-media (on progress),
//   dua-dhikr (language id "not available yet" upstream), lakuapik jadwal sholat
//   (struktur repo berubah, CDN 404 — bot udah punya jadwal sholat sendiri).
// 🔹 STRICT SATUAN: error asli, no fallback.
// ═════════════════════════════════════════════

const TIMEOUT_MS = 60000;

let _http = null;
export function _setLokalHttpForTest(fn) { _http = fn; }
async function getJson(url, timeoutMs = TIMEOUT_MS) {
  const doFetch = _http || (async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try { return await fetch(u, { signal: ctrl.signal }); } finally { clearTimeout(t); }
  });
  let res;
  try { res = await doFetch(url); }
  catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? "TIMEOUT — server lama jawab" : (e?.message || "gagal koneksi") };
  }
  const status = res?.status || 0;
  let data = null;
  try { data = await res.json(); } catch { return { ok: false, error: `HTTP ${status} — respons bukan JSON` }; }
  if (status === 429) return { ok: false, error: "RATE_LIMIT (429) — coba bentar lagi" };
  if (status !== 200) return { ok: false, error: `HTTP ${status}${data?.message ? " — " + data.message : ""}` };
  return { ok: true, data };
}
const num = (x, d) => { const n = Number(x); return Number.isFinite(n) ? n : d; };

/** Kode pos: search by nama daerah */
export async function lokKodepos(q) {
  const s = String(q || "").trim();
  if (!s) return { ok: false, error: "QUERY_EMPTY — kirim nama daerah/kelurahan/jalan" };
  const r = await getJson(`https://kodepos.vercel.app/search/?q=${encodeURIComponent(s)}`);
  if (!r.ok) return r;
  const list = r.data?.data || [];
  if (!list.length) return { ok: false, error: "Kode pos gak ketemu — coba nama kelurahan/kecamatan/jalan" };
  return { ok: true, list };
}

/** Kode pos: detect dari koordinat GPS */
export async function lokKodeposDetect(lat, lon) {
  const la = num(lat, NaN), lo = num(lon, NaN);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return { ok: false, error: "KOORDINAT_INVALID" };
  const r = await getJson(`https://kodepos.vercel.app/detect/?latitude=${la}&longitude=${lo}`);
  if (!r.ok) return r;
  const d = r.data?.data;
  if (!d || !d.code) return { ok: false, error: "Lokasi gak terdeteksi — coba koordinat lain" };
  return { ok: true, detail: d };
}

/** idn-area: daftar provinsi */
export async function lokProvinces() {
  const r = await getJson("https://idn-area.up.railway.app/provinces");
  if (!r.ok) return r;
  const list = r.data?.data || [];
  if (!list.length) return { ok: false, error: "Data provinsi kosong" };
  return { ok: true, list };
}

/** idn-area: cari wilayah by nama — kind: regencies|districts|villages|islands */
export async function lokArea(kind, name) {
  const kinds = { kabupaten: "regencies", kota: "regencies", kab: "regencies", kecamatan: "districts", kelurahan: "villages", pulau: "islands" };
  const k = kinds[String(kind || "").toLowerCase()] || String(kind || "").toLowerCase();
  if (!["regencies", "districts", "villages", "islands"].includes(k)) return { ok: false, error: "JENIS_INVALID — pakai: provinsi | kabupaten/kota | kecamatan | kelurahan | pulau" };
  const n = String(name || "").trim();
  if (!n) return { ok: false, error: "QUERY_EMPTY — kirim nama yang dicari" };
  const r = await getJson(`https://idn-area.up.railway.app/${k}?name=${encodeURIComponent(n)}`);
  if (!r.ok) return r;
  const list = r.data?.data || [];
  if (!list.length) return { ok: false, error: `Gak ketemu — coba nama lain` };
  return { ok: true, kind: k, list };
}

/** Klasemen: daftar liga */
export async function lokLeagues() {
  const r = await getJson("https://football-standings-api.vercel.app/leagues");
  if (!r.ok) return r;
  const list = r.data?.data || [];
  if (!list.length) return { ok: false, error: "Data liga kosong" };
  return { ok: true, list };
}

/** Klasemen: standings liga (id: eng.1, esp.1, ita.1, ger.1, dll) */
export async function lokKlasemen(leagueId) {
  const id = String(leagueId || "").trim().toLowerCase();
  if (!id) return { ok: false, error: "LIGA_EMPTY — kirim id liga, contoh: eng.1 — ketik .zklasemen list buat daftar" };
  const r = await getJson(`https://football-standings-api.vercel.app/leagues/${encodeURIComponent(id)}/standings`);
  if (!r.ok) return r;
  const d = r.data?.data;
  const rows = d?.standings || [];
  if (!rows.length) return { ok: false, error: `Liga "${id}" gak ketemu / standings kosong — ketik .zklasemen list` };
  const stat = (team, nm) => {
    const s = (team.stats || []).find((x) => x.name === nm);
    return s ? (s.displayValue ?? s.value ?? "-") : "-";
  };
  const table = rows.map((x) => ({
    tim: x.team?.displayName || "?",
    main: stat(x, "gamesPlayed"),
    m: stat(x, "wins"),
    s: stat(x, "ties") !== "-" ? stat(x, "ties") : stat(x, "draws"),
    k: stat(x, "losses"),
    gd: stat(x, "pointDifferential"),
    poin: stat(x, "points"),
  }));
  return { ok: true, liga: d.name || id, musim: d.seasonDisplay || "", table };
}

/** Katanime: quotes anime */
export async function lokKatanime(q, page = 1) {
  const s = String(q || "").trim();
  if (!s) return { ok: false, error: "QUERY_EMPTY — kirim kata/karakter/anime, contoh: .zkatanime luffy" };
  const r = await getJson(`https://katanime.vercel.app/api/carikata?kata=${encodeURIComponent(s)}&page=${num(page, 1)}`);
  if (!r.ok) return r;
  const list = r.data?.result || [];
  if (!r.data?.sukses || !list.length) return { ok: false, error: "Quote gak ketemu — coba kata/karakter lain" };
  return { ok: true, list, next: !!r.data?.next };
}

/** Puasa sunnah per tanggal (YYYY-MM-DD) */
export async function lokPuasa(dateStr) {
  let tgl = String(dateStr || "").trim();
  if (tgl) {
    const m = tgl.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (!m) return { ok: false, error: "TANGGAL_INVALID — format DD-MM-YYYY, contoh: .zpuasa 16-09-2026" };
    tgl = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  } else {
    const now = new Date(Date.now() + 7 * 3600 * 1000);
    tgl = now.toISOString().slice(0, 10);
  }
  const r = await getJson(`https://api.puasa-sunnah.granitebps.com/api/v1/fastings?tanggal=${tgl}`);
  if (!r.ok) return r;
  const list = r.data?.data || [];
  if (!list.length) return { ok: false, error: "Gak ada puasa sunnah di tanggal itu" };
  return { ok: true, tanggal: tgl, list };
}

/** Sekolah: search by nama */
export async function lokSekolah(q) {
  const s = String(q || "").trim();
  if (!s) return { ok: false, error: "QUERY_EMPTY — kirim nama sekolah, contoh: .zsekolah sma negeri 1 bandung" };
  const r = await getJson(`https://api-sekolah-indonesia.vercel.app/sekolah?search=${encodeURIComponent(s)}`);
  if (!r.ok) return r;
  if (r.data?.status !== "success") return { ok: false, error: String(r.data?.message || "API sekolah bermasalah") };
  const list = r.data?.dataSekolah || [];
  if (!list.length) return { ok: false, error: "Sekolah gak ketemu — coba nama lain" };
  return { ok: true, list };
}

/** Pesantren: daftar provinsi */
export async function lokPesantrenProv() {
  const r = await getJson("https://api-pesantren-indonesia.vercel.app/provinsi.json");
  if (!r.ok) return r;
  if (!Array.isArray(r.data) || !r.data.length) return { ok: false, error: "Data provinsi pesantren kosong" };
  return { ok: true, list: r.data };
}

/** Pesantren: kabupaten dari provinsi (id 2 digit) */
export async function lokPesantrenKab(provId, provName) {
  const pid = String(provId || "").trim();
  if (!/^\d{2}$/.test(pid)) return { ok: false, error: "PROV_INVALID — kirim kode provinsi dari .zpesantren <nama provinsi>" };
  const r = await getJson(`https://api-pesantren-indonesia.vercel.app/kabupaten/${pid}.json`);
  if (!r.ok) return r;
  if (!Array.isArray(r.data) || !r.data.length) return { ok: false, error: "Kabupaten gak ketemu" };
  return { ok: true, provinsi: provName || pid, list: r.data };
}

/** Pesantren: daftar pesantren per kabupaten (id 4 digit) */
export async function lokPesantren(kabId, kabName) {
  const kid = String(kabId || "").trim();
  if (!/^\d{4}$/.test(kid)) return { ok: false, error: "KAB_INVALID — kirim kode kabupaten dari .zpesantren <provinsi>|<kabupaten>" };
  const r = await getJson(`https://api-pesantren-indonesia.vercel.app/pesantren/${kid}.json`);
  if (!r.ok) return r;
  if (!Array.isArray(r.data) || !r.data.length) return { ok: false, error: "Pesantren gak ketemu di kabupaten itu" };
  return { ok: true, kabupaten: kabName || kid, list: r.data };
}

/** Kamus Sunda: undak usuk basa */
export async function lokBasa(q) {
  const s = String(q || "").trim();
  if (!s) return { ok: false, error: "QUERY_EMPTY — kirim kata (sunda/indonesia), contoh: .zbasa makan" };
  // endpoint path-based /undakusukbasa/{slug} — ?word= diabaikan upstream (live verified)
  const r = await getJson(`https://hibersunda.vercel.app/undakusukbasa/${encodeURIComponent(s)}`);
  if (!r.ok) return r;
  const words = Array.isArray(r.data) ? r.data : (r.data?.words || []);
  if (!words.length) return { ok: false, error: "Kata gak ketemu di kamus" };
  return { ok: true, words };
}

/** Quran: daftar surah */
export async function lokQuranList() {
  const r = await getJson("https://quran-api-id.vercel.app/surah");
  if (!r.ok) return r;
  const list = r.data?.data || [];
  if (!list.length) return { ok: false, error: "Daftar surah kosong" };
  return { ok: true, list };
}

/** Quran: info + ayat surah */
export async function lokQuran(surah, aya) {
  const sn = num(surah, 0);
  if (!(sn >= 1 && sn <= 114)) return { ok: false, error: "SURAH_INVALID — nomor surah 1-114" };
  if (aya !== undefined && aya !== null && aya !== "") {
    const an = num(aya, 0);
    if (!(an >= 1)) return { ok: false, error: "AYAT_INVALID — nomor ayat mulai 1" };
    const r = await getJson(`https://quran-api-id.vercel.app/surah/${sn}/${an}`);
    if (!r.ok) return r;
    const d = r.data?.data;
    if (!d) return { ok: false, error: "Ayat gak ketemu" };
    return { ok: true, mode: "ayah", ayah: d };
  }
  const r = await getJson(`https://quran-api-id.vercel.app/surah/${sn}`);
  if (!r.ok) return r;
  const d = r.data?.data;
  if (!d?.number) return { ok: false, error: "Surah gak ketemu" };
  return { ok: true, mode: "surah", surah: d };
}

/** MyInstants: search sound effect */
export async function lokMyinstants(q) {
  const s = String(q || "").trim();
  if (!s) return { ok: false, error: "QUERY_EMPTY — kirim nama sound, contoh: .zsound bruh" };
  const r = await getJson(`https://myinstants-api.vercel.app/search?q=${encodeURIComponent(s)}`);
  if (!r.ok) return r;
  const list = r.data?.data || [];
  if (!list.length) return { ok: false, error: "Sound gak ketemu — coba kata lain" };
  return { ok: true, list };
}
