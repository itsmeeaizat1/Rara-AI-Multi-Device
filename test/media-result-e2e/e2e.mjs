// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// E2E: rara-media-result.js — kartu hasil download berkelompok (3 Okt 2026).
import * as M from "../../src/lib/rara-media-result.js";
let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (n, ok, x) => { w((ok ? "  ✅" : "  ❌") + " " + n + (ok ? "" : x !== undefined ? ` — ${String(x).slice(0, 200)}` : "")); ok ? pass++ : fail++; };
const mkRes = (status, headers) => ({ ok: status >= 200 && status < 300, status, headers: { get: (k) => headers[String(k).toLowerCase()] ?? null } });

w("\n— formatter —");
check("fmtSize: 0/NaN/neg kosong", M.fmtSize(0) === "" && M.fmtSize("abc") === "" && M.fmtSize(-5) === "");
check("fmtSize: 512 B, 2048 → 2 KB, 12.4MB, 1.5GB", M.fmtSize(512) === "512 B" && M.fmtSize(2048) === "2 KB" && M.fmtSize(13002342) === "12.4 MB" && M.fmtSize(1610612736) === "1.50 GB", [M.fmtSize(2048), M.fmtSize(13002342), M.fmtSize(1610612736)]);
check("fmtDur: detik, mm:ss, hh:mm:ss, ISO", M.fmtDur(201) === "03:21" && M.fmtDur("3:21") === "03:21" && M.fmtDur("1:02:03") === "1:02:03" && M.fmtDur("PT1H2M3S") === "1:02:03" && M.fmtDur(3723) === "1:02:03");
check("fmtDur: 0/kosong/sampah → kosong", M.fmtDur(0) === "" && M.fmtDur("") === "" && M.fmtDur("abc") === "" && M.fmtDur(null) === "");
check("fmtDur: string angka '201.4' dibulatkan", M.fmtDur("201.4") === "03:21");
check("fmtDate: YYYYMMDD → 02 Okt 2026", M.fmtDate("20261002") === "02 Okt 2026", M.fmtDate("20261002"));
check("fmtDate: ISO & epoch detik & epoch ms sama hasil", M.fmtDate("2026-10-02T05:00:00Z") === "02 Okt 2026" && M.fmtDate(1790917200) === M.fmtDate(1790917200000), [M.fmtDate(1790917200), M.fmtDate(1790917200000)]);
check("fmtDate: WIB — 02 Okt 20:00 UTC = 03 Okt 03:00 WIB", M.fmtDate("2026-10-02T20:00:00Z") === "03 Okt 2026" && M.fmtDate("2026-10-02T20:00:00Z", true) === "03 Okt 2026, 03:00 WIB", M.fmtDate("2026-10-02T20:00:00Z", true));
check("fmtDate: mustahil (1970, 2099, sampah) dibuang", M.fmtDate(0) === "" && M.fmtDate("2099-01-01") === "" && M.fmtDate("bukan tanggal") === "" && M.fmtDate("") === "");
check("fmtCount: 1234567 → 1,2 jt; 45210 → 45 rb; 999 → 999; 1234 → 1.234", M.fmtCount(1234567) === "1,2 jt" && M.fmtCount(45210) === "45 rb" && M.fmtCount(999) === "999" && M.fmtCount(1234) === "1.234", [M.fmtCount(1234567), M.fmtCount(45210), M.fmtCount(1234)]);
check("fmtCount: teks pendek '1,2M' apa adanya; panjang/kosong dibuang", M.fmtCount("1,2M") === "1,2M" && M.fmtCount("teks yang sangat panjang sekali") === "" && M.fmtCount("") === "" && M.fmtCount(null) === "");

w("\n— detectFormat —");
check("mime mp4 → video MP4", JSON.stringify(M.detectFormat({ mime: "video/mp4; charset=x" })) === JSON.stringify({ type: "video", format: "MP4" }));
check("mime audio/mpeg → audio MP3", M.detectFormat({ mime: "audio/mpeg" }).format === "MP3");
check("tanpa mime → dari ekstensi/url", M.detectFormat({ url: "https://x.com/a/b.webm?x=1" }).format === "WEBM" && M.detectFormat({ ext: ".m4a" }).type === "audio");
check("tak dikenal → kosong", M.detectFormat({ mime: "application/x-aneh", url: "https://x.com/file" }).format === "");

w("\n— probeMedia (fetch tiruan, tanpa jaringan) —");
{
  const ok = await M.probeMedia("https://x/a.mp4", { fetchFn: async (u, o) => (check("probe: pakai method HEAD (tanpa unduh)", o.method === "HEAD"), mkRes(200, { "content-length": "788493", "content-type": "video/mp4", "last-modified": "Fri, 02 Oct 2026 11:13:04 GMT" })) });
  check("probe: size+mime+lastModified terisi", ok.size === 788493 && ok.mime === "video/mp4" && !!ok.lastModified, JSON.stringify(ok));
  check("probe: status 400 → {}", JSON.stringify(await M.probeMedia("https://x/a", { fetchFn: async () => mkRes(400, {}) })) === "{}");
  check("probe: fetch melempar error → {} (tidak throw)", JSON.stringify(await M.probeMedia("https://x/a", { fetchFn: async () => { throw new Error("boom"); } })) === "{}");
  check("probe: url bukan http → {} tanpa panggil fetch", JSON.stringify(await M.probeMedia("ftp://x", { fetchFn: async () => { throw new Error("harusnya tak dipanggil"); } })) === "{}" && JSON.stringify(await M.probeMedia("", {})) === "{}");
  const html = await M.probeMedia("https://x/a", { fetchFn: async () => mkRes(200, { "content-length": "169", "content-type": "text/html" }) });
  check("probe: text/html TIDAK dianggap format media (halaman error)", html.mime === undefined && html.size === 169, JSON.stringify(html));
  check("probe: content-length 0/sampah → size tak diisi", (await M.probeMedia("https://x/a", { fetchFn: async () => mkRes(200, { "content-length": "0" }) })).size === undefined && (await M.probeMedia("https://x/a", { fetchFn: async () => mkRes(200, { "content-length": "abc" }) })).size === undefined);
  const t0 = Date.now();
  const slow = await M.probeMedia("https://x/a", { timeoutMs: 80, fetchFn: (u, o) => new Promise((_, rej) => o.signal.addEventListener("abort", () => rej(new Error("aborted")))) });
  check("probe: timeout dihormati (<1 dtk) → {}", JSON.stringify(slow) === "{}" && Date.now() - t0 < 1000, Date.now() - t0);
}

w("\n— mediaResultCard —");
{
  const card = M.mediaResultCard({ header: "aio", title: "Judul video contoh yang panjang sekali untuk uji pemotongan baris rapi", platform: "TikTok", author: "Nama", authorHandle: "@nama", duration: 201, uploadDate: "20261002", views: 1234567, likes: 45210, quality: "720p", size: 13002342, mime: "video/mp4", checkedAt: new Date("2026-10-03T01:57:00Z") });
  const L = card.split("\n");
  check("header 「 ✦ AIO ✦ 」", L[0] === "「 ✦ AIO ✦ 」", L[0]);
  check("3 kelompok berjudul urut: Detail Media < Sumber < Statistik", card.indexOf("「 ✦ Detail Media ✦ 」") < card.indexOf("「 ✦ Sumber ✦ 」") && card.indexOf("「 ✦ Sumber ✦ 」") < card.indexOf("「 ✦ Statistik ✦ 」"));
  check("field detail lengkap: jenis/format/kualitas/ukuran/durasi", /• Jenis\s+: video/.test(card) && /• Format\s+: MP4/.test(card) && /• Kualitas\s+: 720p/.test(card) && /• Ukuran\s+: 12\.4 MB/.test(card) && /• Durasi\s+: 03:21/.test(card), card);
  check("sumber: platform, pembuat (nama + @handle), diunggah, dicek WIB", /• Platform\s+: TikTok/.test(card) && /• Pembuat\s+: Nama \(@nama\)/.test(card) && /• Diunggah\s+: 02 Okt 2026/.test(card) && /• Dicek\s+: 03 Okt 2026, 08:57 WIB/.test(card), card);
  check("statistik: views & likes", /• Views\s+: 1,2 jt/.test(card) && /• Likes\s+: 45 rb/.test(card));
  check("judul media ter-wrap <=30 char/baris", L.slice(1, 4).every((l) => [...l].length <= 30), L.slice(1, 4));
  check("label rata ':' dalam tiap kelompok", (() => { const g = card.split("\n\n")[1].split("\n").slice(1); return new Set(g.map((l) => l.indexOf(" : "))).size === 1; })(), card.split("\n\n")[1]);
  check("tanpa smallcaps/bold/kaomoji/୨୧", !/[*_]/.test(card) && !card.includes("୨୧") && !/[ᴀ-ᴢ]/.test(card));
}
{
  const au = M.mediaResultCard({ header: "ytmp3", title: "Lagu", bitrate: 256, duration: "3:42", mime: "audio/mpeg", size: 6400000 });
  check("audio: bitrate + durasi + jenis audio", /• Jenis\s+: audio/.test(au) && /• Bitrate\s+: 256 kbps/.test(au) && /• Durasi\s+: 03:42/.test(au), au);
  const ft = M.mediaResultCard({ header: "aio", title: "Foto", mime: "image/jpeg", size: 340000, width: 1080, height: 1350, duration: 99 });
  check("foto: dimensi tampil, DURASI disembunyikan walau diberi", /• Dimensi\s+: 1080 x 1350/.test(ft) && !/Durasi/.test(ft) && /• Jenis\s+: foto/.test(ft), ft);
  const tanpaUp = M.mediaResultCard({ header: "x", title: "T", mime: "video/mp4", lastModified: "Fri, 02 Oct 2026 11:13:04 GMT" });
  check("tanpa tanggal unggah → pakai 'Dimodifikasi' dari server (bukan dua-duanya)", /• Dimodifikasi\s+: 02 Okt 2026/.test(tanpaUp) && !/Diunggah/.test(tanpaUp), tanpaUp);
  const both = M.mediaResultCard({ header: "x", title: "T", uploadDate: "20261001", lastModified: "Fri, 02 Oct 2026 11:13:04 GMT" });
  check("ada tanggal unggah → 'Dimodifikasi' tidak dobel", /Diunggah/.test(both) && !/Dimodifikasi/.test(both), both);
  check("quality 'default' tidak ditampilkan", !/Kualitas/.test(M.mediaResultCard({ header: "x", title: "T", quality: "default", mime: "video/mp4" })));
  check("tak ada data media sama sekali → '' (bukan kartu kosong)", M.mediaResultCard({ header: "aio" }) === "" && M.mediaResultCard() === "");
  check("judul >90 char dipotong '...'", /\.\.\.$/.test(M.mediaResultCard({ header: "x", title: "a".repeat(200), mime: "video/mp4" }).split("\n\n")[0].trim()), M.mediaResultCard({ header: "x", title: "a".repeat(200), mime: "video/mp4" }).split("\n")[1]);
  check("field nol/kosong tidak jadi baris liar (views 0, size 0)", !/Views|Ukuran/.test(M.mediaResultCard({ header: "x", title: "T", mime: "video/mp4", views: 0, size: 0 })));
}

w(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
