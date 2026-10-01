// E2E — zlokal suite + zsound (API Lokal Indonesia)
import fs from "node:fs";
fs.rmSync(new URL("./e2e-db.json", import.meta.url), { recursive: true, force: true });
const { initDatabase } = await import("../../src/lib/rara-database.js");
await initDatabase(new URL("./e2e-db.json", import.meta.url).pathname);

const la = await import("../../src/scraper/lokalapi.js");
const zl = (await import("../../plugins/search/zlokal.js")).default;
const zs = (await import("../../plugins/media/zsound.js")).default;
const { fromSC } = await import("../../src/lib/styler.js");
const sc = (s) => fromSC(String(s || "")).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => { w((ok ? "✅ " : "❌ ") + name + (ok ? "" : " — " + (extra || ""))); ok ? pass++ : fail++; };

function mkM(command, args, text, quoted) {
  const o = {
    args: (args || []).map(String), command, prefix: ".", chat: "1203630@g.us",
    text: text || "", quoted, quote: quoted, replyed: [], reacts: [],
    reply: async (s) => { o.replyed.push(s); return o; },
    react: async (e) => { o.reacts.push(e); return o; },
    key: { remoteJid: "1203630@g.us" },
    sock: { sendMessage: async () => ({ key: { id: "x" } }) },
  };
  return o;
}

// ═══ REGISTRY ═══
w("\n— registry —");
t("  zlokal: 18 alias, cd 10, e1", zl.pluginConfig.alias.length === 18 && zl.pluginConfig.cooldown === 10 && zl.pluginConfig.energi === 1);
t("  zsound: 3 alias, kategori media, cd 8", zs.pluginConfig.alias.length === 3 && zs.pluginConfig.category === "media" && zs.pluginConfig.cooldown === 8);
t("  default export utuh kedua plugin", typeof zl.handler === "function" && typeof zs.handler === "function");

// ═══ SCRAPER (mock http) ═══
w("\n— scraper —");
let lastUrl = "";
const mkHttp = (payload) => async (u) => { lastUrl = u; return { status: 200, json: async () => payload }; };

la._setLokalHttpForTest(mkHttp({ statusCode: 200, data: [{ code: 46386, village: "Danasari", district: "Purwakarta", regency: "Purwakarta", province: "Jawa Barat" }] }));
let r = await la.lokKodepos("danasari");
t("  kodepos search url + data", lastUrl.includes("kodepos.vercel.app/search/?q=danasari") && r.ok && r.list[0].code === 46386);

la._setLokalHttpForTest(mkHttp({ statusCode: 200, data: { code: 41111, village: "Citalang", district: "Purwakarta", regency: "Purwakarta", province: "Jawa Barat" } }));
r = await la.lokKodeposDetect(-6.5, 107.4);
t("  kodepos detect url + data", lastUrl.includes("latitude=-6.5&longitude=107.4") && r.ok && r.detail.code === 41111);
r = await la.lokKodeposDetect("xxx", "yyy");
t("  kodepos detect koordinat invalid", !r.ok && r.error === "KOORDINAT_INVALID");

la._setLokalHttpForTest(mkHttp({ statusCode: 200, data: [{ code: "32", name: "Jawa Barat" }] }));
r = await la.lokProvinces();
t("  provinces url + data", lastUrl.includes("idn-area.up.railway.app/provinces") && r.ok && r.list[0].name === "Jawa Barat");

la._setLokalHttpForTest(mkHttp({ statusCode: 200, data: [{ code: "32.73", name: "Kota Bandung", provinceCode: "32" }] }));
r = await la.lokArea("kota", "bandung");
t("  area: 'kota' → regencies + url", lastUrl.includes("/regencies?name=bandung") && r.ok && r.list[0].name === "Kota Bandung");
r = await la.lokArea("bogoguna", "x");
t("  area jenis invalid → JENIS_INVALID", !r.ok && /JENIS_INVALID/.test(r.error));

la._setLokalHttpForTest(mkHttp({ status: true, data: [{ id: "eng.1", name: "English Premier League" }] }));
r = await la.lokLeagues();
t("  leagues url", lastUrl.includes("football-standings-api.vercel.app/leagues") && r.ok);

la._setLokalHttpForTest(mkHttp({ status: true, data: { name: "English Premier League", seasonDisplay: "2026-2027", standings: [
  { team: { displayName: "Arsenal" }, stats: [
    { name: "gamesPlayed", displayValue: "4" }, { name: "wins", displayValue: "3" },
    { name: "ties", displayValue: "1" }, { name: "losses", displayValue: "0" },
    { name: "pointDifferential", displayValue: "+8" }, { name: "points", displayValue: "10" }] },
] } }));
r = await la.lokKlasemen("eng.1");
t("  klasemen: stats ke-map ke tabel", r.ok && r.table[0].tim === "Arsenal" && r.table[0].poin === "10" && r.table[0].gd === "+8");

la._setLokalHttpForTest(mkHttp({ sukses: true, next: false, result: [{ id: 1, english: "I'm gonna be king", indo: "Aku akan jadi raja", character: "Luffy", anime: "One Piece" }] }));
r = await la.lokKatanime("luffy");
t("  katanime url + hasil", lastUrl.includes("katanime.vercel.app/api/carikata?kata=luffy") && r.ok && r.list[0].indo.includes("raja"));

la._setLokalHttpForTest(mkHttp({ success: true, data: [{ date: "2026-09-16", human_date: "Wednesday, 16 September 2026", category: { name: "Puasa Sunnah" }, type: { name: "Puasa Rabu" } }] }));
r = await la.lokPuasa("16-09-2026");
t("  puasa: DD-MM-YYYY → YYYY-MM-DD + data", lastUrl.includes("fastings?tanggal=2026-09-16") && r.ok && r.list[0].type.name === "Puasa Rabu");
r = await la.lokPuasa("2026-9-16");
t("  puasa format salah → TANGGAL_INVALID", !r.ok && /TANGGAL_INVALID/.test(r.error));

la._setLokalHttpForTest(mkHttp({ success: true, data: [{ date: "2026-09-15", human_date: "Tuesday, 15 September 2026", category: { name: "Puasa Sunnah" }, type: { name: "Puasa Ayyamul Bidh" } }] }));
{ // scope lokal — m belum dideklarasi di section scraper (TDZ = exit-0-senyap)
  const mp = mkM("zpuasa", [], "");
  await zl.handler(mp, { sock: mp.sock });
  t("  zpuasa tanpa tanggal → default hari ini", mp.replyed.length > 0 && sc(mp.replyed[0]).includes("puasa sunnah"));
}

la._setLokalHttpForTest(mkHttp({ status: "success", dataSekolah: [{ npsn: "20219392", sekolah: "SMAN 1 BANDUNG", bentuk: "SMA", status: "N", kecamatan: "Kec. Coblong", kabupaten_kota: "Kota Bandung", alamat_jalan: "Jl. Ir. H. Juanda" }] }));
r = await la.lokSekolah("sman 1 bandung");
t("  sekolah url + data", lastUrl.includes("api-sekolah-indonesia.vercel.app/sekolah?search=") && r.ok && r.list[0].sekolah === "SMAN 1 BANDUNG");

la._setLokalHttpForTest(mkHttp([{ id: "32", nama: "Jawa Barat" }]));
r = await la.lokPesantrenProv();
t("  pesantren provinsi", r.ok && r.list[0].nama === "Jawa Barat");
la._setLokalHttpForTest(mkHttp([{ id: "3273", nama: "Kota Bandung" }]));
r = await la.lokPesantrenKab("32", "Jawa Barat");
t("  pesantren kabupaten url", lastUrl.includes("kabupaten/32.json") && r.ok && r.list[0].id === "3273");
la._setLokalHttpForTest(mkHttp([{ nama: "PPS MANARUL HUDA", nspp: "510032730112", alamat: "Jalan Ir H Djuanda", kab_kota: { nama: "Kota Bandung" }, provinsi: { nama: "Jawa Barat" } }]));
r = await la.lokPesantren("3273", "Kota Bandung");
t("  pesantren list url + nspp", lastUrl.includes("pesantren/3273.json") && r.ok && r.list[0].nspp === "510032730112");
r = await la.lokPesantren("327", "x");
t("  pesantren kode kab 3 digit → KAB_INVALID", !r.ok && /KAB_INVALID/.test(r.error));

la._setLokalHttpForTest(mkHttp([{ sorangan: "neda", batur: "tuang", loma: "dahar", bindo: "makan", english: "eat" }]));
r = await la.lokBasa("neda");
t("  basa url path-based + words", lastUrl.includes("hibersunda.vercel.app/undakusukbasa/neda") && r.ok && r.words[0].bindo === "makan");

la._setLokalHttpForTest(mkHttp({ code: 200, data: { number: 112, numberOfVerses: 4, name: { short: "الإخلاص", transliteration: { id: "Al-Ikhlas" }, translation: { id: "Ikhlas" } }, revelation: { id: "Mekah" } } }));
r = await la.lokQuran("112");
t("  quran surah url + nama", lastUrl.includes("quran-api-id.vercel.app/surah/112") && r.ok && r.surah.name.transliteration.id === "Al-Ikhlas");
la._setLokalHttpForTest(mkHttp({ code: 200, data: { number: { inSurah: 1 }, meta: { juz: 30, page: 604 }, text: { arab: "قُلْ هُوَ اللَّهُ أَحَدٌ", transliteration: { id: "qul huwa" } }, translation: { id: "Katakanlah, Dialah Allah" }, surah: { name: { transliteration: { id: "Al-Ikhlas" } } }, audio: { "01": "https://audio.islamway.com/x.mp3" } } }));
r = await la.lokQuran("112", "1");
t("  quran ayat url + arab", lastUrl.endsWith("/surah/112/1") && r.ok && r.ayah.text.arab.includes("اللَّه"));
r = await la.lokQuran("999");
t("  quran nomor salah → SURAH_INVALID", !r.ok && /SURAH_INVALID/.test(r.error));

la._setLokalHttpForTest(mkHttp({ status: "200", data: [{ id: "bruh-01", title: "bruh", url: "https://www.myinstants.com/en/instant/bruh/", mp3: "https://www.myinstants.com/media/sounds/bruh.mp3" }] }));
r = await la.lokMyinstants("bruh");
t("  myinstants url + mp3", lastUrl.includes("myinstants-api.vercel.app/search?q=bruh") && r.ok && r.list[0].mp3.includes(".mp3"));

// ═══ PLUGIN FLOW ═══
w("\n— plugin flow —");
let m = mkM("zlokal");
await zl.handler(m, { sock: m.sock });
t("  hub .zlokal → 10 fitur", sc(m.replyed[0]).includes("zkodepos") && sc(m.replyed[0]).includes("zquran") && sc(m.replyed[0]).includes("zklasemen"));

la._setLokalHttpForTest(mkHttp({ statusCode: 200, data: [{ code: 46386, village: "Danasari", district: "Purwakarta", regency: "Purwakarta", province: "Jawa Barat" }] }));
m = mkM("zkodepos", ["danasari"], "danasari");
await zl.handler(m, { sock: m.sock });
t("  zkodepos → hasil + kode", sc(m.replyed[0]).includes("46386") && sc(m.replyed[0]).includes("danasari"));

const quoted = { locationMessage: { degreesLatitude: -6.5, degreesLongitude: 107.4 } };
la._setLokalHttpForTest(mkHttp({ statusCode: 200, data: { code: 41111, village: "Citalang", district: "Purwakarta", regency: "Purwakarta", province: "Jawa Barat" } }));
m = mkM("zkodepos", [], "", quoted);
await zl.handler(m, { sock: m.sock });
t("  zkodepos reply lokasi → detect GPS", lastUrl.includes("detect") && sc(m.replyed[0]).includes("41111"));

la._setLokalHttpForTest(mkHttp({ statusCode: 200, data: [{ code: "32.73", name: "Kota Bandung", provinceCode: "32" }] }));
m = mkM("zwilayah", ["kota", "bandung"], "kota bandung");
await zl.handler(m, { sock: m.sock });
t("  zwilayah kota bandung", sc(m.replyed[0]).includes("kota bandung"));

la._setLokalHttpForTest(mkHttp({ status: true, data: { name: "English Premier League", seasonDisplay: "2026-2027", standings: [
  { team: { displayName: "Arsenal" }, stats: [{ name: "gamesPlayed", displayValue: "4" }, { name: "wins", displayValue: "3" }, { name: "ties", displayValue: "1" }, { name: "losses", displayValue: "0" }, { name: "pointDifferential", displayValue: "+8" }, { name: "points", displayValue: "10" }] },
  { team: { displayName: "Manchester City" }, stats: [{ name: "gamesPlayed", displayValue: "4" }, { name: "wins", displayValue: "2" }, { name: "ties", displayValue: "2" }, { name: "losses", displayValue: "0" }, { name: "pointDifferential", displayValue: "+5" }, { name: "points", displayValue: "8" }] },
] } }));
m = mkM("zklasemen", ["epl"], "epl");
await zl.handler(m, { sock: m.sock });
t("  zklasemen epl → alias map eng.1 + tabel", lastUrl.includes("/eng.1/standings") && sc(m.replyed[0]).includes("arsenal") && sc(m.replyed[0]).includes("10"));

la._setLokalHttpForTest(mkHttp({ status: true, data: [{ id: "eng.1", name: "English Premier League" }] }));
m = mkM("zklasemen", ["list"], "list");
await zl.handler(m, { sock: m.sock });
t("  zklasemen list → daftar liga", sc(m.replyed[0]).includes("laliga") && sc(m.replyed[0]).includes("bundesliga"));

la._setLokalHttpForTest(mkHttp({ sukses: true, next: false, result: [{ id: 1, english: "I'm gonna be king", indo: "Aku akan jadi raja", character: "Luffy", anime: "One Piece" }] }));
m = mkM("zkatanime", ["luffy"], "luffy");
await zl.handler(m, { sock: m.sock });
t("  zkatanime → quote + karakter", sc(m.replyed[0]).includes("raja") && sc(m.replyed[0]).includes("luffy"));

la._setLokalHttpForTest(mkHttp({ success: true, data: [{ date: "2026-09-16", human_date: "Wednesday, 16 September 2026", category: { name: "Puasa Sunnah" }, type: { name: "Puasa Rabu" } }] }));
m = mkM("zpuasa", ["16-09-2026"], "16-09-2026");
await zl.handler(m, { sock: m.sock });
t("  zpuasa → jadwal + tanggal", sc(m.replyed[0]).includes("2026-09-16") && sc(m.replyed[0]).includes("puasa rabu"));

la._setLokalHttpForTest(mkHttp({ status: "success", dataSekolah: [{ npsn: "20219392", sekolah: "SMAN 1 BANDUNG", bentuk: "SMA", status: "N", kecamatan: "Kec. Coblong", kabupaten_kota: "Kota Bandung", alamat_jalan: "Jl. Ir. H. Juanda" }] }));
m = mkM("zsekolah", ["sman", "1", "bandung"], "sman 1 bandung");
await zl.handler(m, { sock: m.sock });
t("  zsekolah → nama + npsn + negeri", sc(m.replyed[0]).includes("sman 1 bandung") && sc(m.replyed[0]).includes("20219392") && sc(m.replyed[0]).includes("negeri"));

la._setLokalHttpForTest((async (u) => {
  if (u.includes("provinsi.json")) return { status: 200, json: async () => [{ id: "32", nama: "Jawa Barat" }] };
  if (u.includes("kabupaten/32")) return { status: 200, json: async () => [{ id: "3273", nama: "Kota Bandung" }] };
  if (u.includes("pesantren/3273")) return { status: 200, json: async () => [{ nama: "PPS MANARUL HUDA", nspp: "510032730112", alamat: "Jalan Ir H Djuanda" }] };
  return { status: 200, json: async () => [] };
}));
m = mkM("zpesantren", ["jawa", "barat"], "jawa barat");
await zl.handler(m, { sock: m.sock });
t("  zpesantren prov → daftar kabupaten", sc(m.replyed[0]).includes("jawa barat") && sc(m.replyed[0]).includes("3273"));
m = mkM("zpesantren", [], "jawa barat | kota bandung");
await zl.handler(m, { sock: m.sock });
t("  zpesantren prov|kab → daftar pesantren + NSPP", sc(m.replyed[0]).includes("manarul huda") && sc(m.replyed[0]).includes("510032730112"));

la._setLokalHttpForTest(mkHttp([{ sorangan: "neda", batur: "tuang", loma: "dahar", bindo: "makan", english: "eat" }]));
m = mkM("zbasa", ["neda"], "neda");
await zl.handler(m, { sock: m.sock });
t("  zbasa → kamus sunda", sc(m.replyed[0]).includes("sorangan") && sc(m.replyed[0]).includes("makan"));

la._setLokalHttpForTest(mkHttp({ code: 200, data: { number: { inSurah: 1 }, meta: { juz: 30, page: 604 }, text: { arab: "قُلْ هُوَ اللَّهُ أَحَدٌ", transliteration: { id: "qul huwa" } }, translation: { id: "Katakanlah, Dialah Allah" }, surah: { name: { transliteration: { id: "Al-Ikhlas" } } }, audio: { "01": "https://audio.islamway.com/x.mp3" } } }));
m = mkM("zquran", ["112", "1"], "112 1");
await zl.handler(m, { sock: m.sock });
t("  zquran 112 1 → arab + terjemah + transliterasi", sc(m.replyed[0]).includes("al-ikhlas") && m.replyed[0].includes("اللَّه") && sc(m.replyed[0]).includes("katakanlah"));

la._setLokalHttpForTest(mkHttp({ status: "200", data: [{ id: "bruh-01", title: "bruh", url: "https://www.myinstants.com/en/instant/bruh/", mp3: "https://www.myinstants.com/media/sounds/bruh.mp3" }] }));
m = mkM("zsound", ["bruh"], "bruh");
await zs.handler(m, { sock: m.sock });
t("  zsound → kartu hasil (+VN gagal = mock, link fallback)", sc(m.replyed[0]).includes("bruh") && sc(m.replyed[0]).includes("myinstants"));

m = mkM("zsound", [], "");
await zs.handler(m, { sock: m.sock });
t("  zsound query kosong → ❌ + hint", m.reacts.includes("❌") && sc(m.replyed[0]).includes("query kosong"));

la._setLokalHttpForTest(mkHttp({ status: "404err", data: null, message: "x" }));
m = mkM("zklasemen", ["xxx"], "xxx");
await zl.handler(m, { sock: m.sock });
t("  klasemen gak ketemu → ❌ + error asli", m.reacts.includes("❌") && sc(m.replyed[0]).includes("klasemen bermasalah"));

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail > 0 ? 1 : 0);
