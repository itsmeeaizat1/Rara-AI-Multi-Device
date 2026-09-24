// E2E — MAPSS (Google Maps screenshot + buka per nomor) — 24 Sep 2026
// Alur owner: .mapss <query> → [1] screenshot duluan [2] plain text list
// bernomor → balas nomor N → halaman place N kebuka: [1] screenshot isi
// [2] plain text isi (readmore + chat lanjutan splitChatChunks).
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

const dbDir = mkdtempSync(path.join(tmpdir(), "mapss-"));
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(path.join(dbDir, "db"));

const lib = await import(R + "/src/scraper/nova-maps-browser.js");
const plug = await import(R + "/plugins/browser/mapss.js");
const handler = plug.handler;
const answerHandler = plug.answerHandler;

const { toSC } = await import(R + "/src/lib/nova-menu-style.js");
const has = (s, x) => {
  const l = String(s).toLowerCase();
  const e = String(x).toLowerCase();
  return l.includes(e) || l.includes(toSC(e));
};

const mkM = (over = {}) => ({
  key: { remoteJid: "62xx@s.whatsapp.net" }, chat: "62xx@s.whatsapp.net",
  prefix: ".", command: "mapss", pushName: "tes", text: over.text ?? "",
  react: async (e) => { mkM._reacts.push(e); return {}; },
  reply: async (t) => { mkM._replies.push(String(t)); return {}; },
  ...over,
});
mkM._replies = []; mkM._reacts = [];

function mockSock() {
  const media = [];
  const sent = [];
  return {
    media, sent,
    sendMedia: async (chat, buf, caption, m, opts) => { media.push({ chat, buf, caption: String(caption), opts }); return {}; },
    sendMessage: async (chat, payload, opts) => { sent.push({ chat, text: payload?.text || "", loc: payload?.location || null }); return {}; },
  };
}

const PLACES = [
  { name: "Kopi Kenangan Mall", rating: "4,6", reviews: "(1.234)", meta: "Cafe · Jakarta", hours: "Buka 24 jam", url: "https://www.google.com/maps/place/kopi-kenang/data=!4m7!3m6!1s0xabc!8m2!3d-6.2244444!4d106.8411111!16s%2Fg%2F11x" },
  { name: "Cafe Sabi 21", rating: "4,2", reviews: "(98)", meta: "Coffee shop · Jakarta", hours: "Buka · Tutup pukul 22.00", url: "https://www.google.com/maps/place/cafe-sabi" },
  { name: "Tanpa Link", rating: "4,0", reviews: "(12)", meta: "Kafe · Bogor", hours: "", url: "" },
];

// ══════════════════════════════════════════════════════════════
w("\n— 1. config —");
{
  check("1a. config (name/alias/category browser)", plug.config?.name === "mapss" && (plug.config?.alias || []).includes("mapsearch") && plug.config?.category === "browser");
  check("1b. alias gmaps gak dipakai (milik sapimaps)", !(plug.config?.alias || []).includes("gmaps"));
}

// ══════════════════════════════════════════════════════════════
w("\n— 2. usage tanpa query —");
{
  mkM._replies.length = 0; mkM._reacts.length = 0;
  await handler(mkM({ text: "" }), { sock: mockSock() });
  const r = mkM._replies.at(-1) || "";
  check("2a. tanpa query → panduan format", has(r, "format") && has(r, "mapss <tempat>"), r.slice(0, 80));
  check("2b. ada petunjuk balas nomor", has(r, "balas nomor"));
}

// ══════════════════════════════════════════════════════════════
w("\n— 3. search: screenshot DULU baru plain text —");
{
  lib._setMapsBrowserForTest((query) => ({
    image: Buffer.from("img-search-" + query),
    places: PLACES,
  }));
  mkM._replies.length = 0; mkM._reacts.length = 0;
  const sock = mockSock();
  await handler(mkM({ text: "cafe di jakarta" }), { sock });
  check("3a. react 🕒 → ⚡", mkM._reacts[0] === "🕒" && mkM._reacts.at(-1) === "⚡");
  check("3b. screenshot terkirim duluan (image)", sock.media.length === 1 && sock.media[0].opts?.type === "image");
  check("3c. caption screenshot ringkas + janji list", has(sock.media[0].caption, "hasil maps") && has(sock.media[0].caption, "pesan berikutnya"), sock.media[0].caption);
  const listMsg = mkM._replies.at(-1) || "";
  check("3d. plain text list terkirim kedua (setelah screenshot)", sock.media.length === 1 && mkM._replies.length >= 1);
  check("3e. list 3 tempat bernomor", has(listMsg, "3 tempat") && has(listMsg, "1. kopi kenangan mall") && has(listMsg, "2. cafe sabi 21") && has(listMsg, "3. tanpa link"), listMsg.slice(0, 100));
  check("3f. rating + ulasan rapi (tanpa kurung dobel)", has(listMsg, "4,6 (1.234 ulasan)") && !listMsg.includes("((1.234))"));
  check("3g. ada jam buka", has(listMsg, "buka 24 jam"));
  check("3h. petunjuk balas nomor 1-2 (cuma yang ada URL)", has(listMsg, "balas nomor 1-2"), listMsg.slice(0, 200));
  // sesi terdaftar: nomor 1,2 bisa diambil; 3 (tanpa URL) gak
  check("3i. sesi: nomor 3 tanpa URL gak kedaftar (cuma 2 pickable)", lib.takeMapsChoice("62xx@s.whatsapp.net", 3) === null && lib.takeMapsChoice("62xx@s.whatsapp.net", 2)?.name === "Cafe Sabi 21");
}

// ══════════════════════════════════════════════════════════════
w("\n— 4. balas nomor 2 → buka halaman place no.2 —");
{
  lib._setMapsDetailForTest((url) => ({
    image: Buffer.from("img-detail-" + url),
    detail: {
      name: "Cafe Sabi 21", rating: "4,2", reviews: "(98)", category: "Coffee shop",
      address: "Jl. Sabana No.21", phone: "+62 21 555", website: "cafesabi.com",
      hours: "Buka · Tutup pukul 22.00",
      reviewsList: [
        { author: "Budi", stars: "4 bintang", text: "Kopinya enak, tempat adem." },
        { author: "Sari", stars: "5 bintang", text: "Pelayanan ramah banget." },
      ],
      rawText: "isi halaman mentah",
    },
  }));
  mkM._replies.length = 0; mkM._reacts.length = 0;
  const sock = mockSock();
  const handled = await answerHandler(mkM({ text: "2" }), sock);
  check("4a. answerHandler return true", handled === true);
  check("4b. react 🕒 → ⚡", mkM._reacts[0] === "🕒" && mkM._reacts.at(-1) === "⚡");
  check("4c. screenshot halaman no.2 terkirim duluan", sock.media.length === 1 && sock.media[0].buf.toString().includes("img-detail-https://www.google.com/maps/place/cafe-sabi"));
  check("4d. caption: nama tempat + janji isi", has(sock.media[0].caption, "cafe sabi 21") && has(sock.media[0].caption, "pesan berikutnya"), sock.media[0].caption);
  const txt = (sock.sent[0] || {}).text || "";
  check("4e. plain text isi terkirim (sendMessage)", sock.sent.length >= 1);
  check("4f. ringkasan: alamat/telp/web/jam", has(txt, "jl. sabana no.21") && has(txt, "+62 21 555") && has(txt, "cafesabi.com") && has(txt, "tutup pukul 22.00"), txt.slice(0, 150));
  check("4g. ada readmore invisible (U+200E×4001) buat konten panjang", txt.includes(String.fromCharCode(8206).repeat(4001)));
  check("4h. ulasan kebawa setelah readmore", has(txt, "budi") && has(txt, "kopinya enak") && has(txt, "sari"));
  check("4i. link Maps place di akhir", txt.includes("https://www.google.com/maps/place/cafe-sabi"));
}

w("\n— 4b. pin lokasi native WhatsApp —");
{
  // nomor 1: URL ada koordinat (!8m2!3d..!4d..) → pin terkirim
  mkM._replies.length = 0; mkM._reacts.length = 0;
  const sockA = mockSock();
  await answerHandler(mkM({ text: "1" }), sockA);
  const pin = sockA.sent.find((s) => s.loc);
  check("4b-a. pin lokasi terkirim (payload location)", !!pin);
  check("4b-b. koordinat bener (lat -6.2244, lng 106.8411)", pin?.loc?.degreesLatitude === -6.2244444 && pin?.loc?.degreesLongitude === 106.8411111, JSON.stringify(pin?.loc));
  check("4b-c. pin ada nama + alamat tempat (dari detail)", pin?.loc?.name === "Cafe Sabi 21" && String(pin?.loc?.address || "").includes("Jl. Sabana"), JSON.stringify(pin?.loc).slice(0, 90));

  // nomor 2: URL TANPA koordinat → gak ada pin (skip senyap)
  const sockB = mockSock();
  await answerHandler(mkM({ text: "2" }), sockB);
  check("4b-d. URL tanpa koordinat → tanpa pin (senyap)", !sockB.sent.some((s) => s.loc));

  // unit: parseMapCoords
  check("4b-e. parseMapCoords: pola !3d!4d", JSON.stringify(lib.parseMapCoords("https://www.google.com/maps/place/x/data=!8m2!3d-6.5!4d107.2")) === JSON.stringify({ lat: -6.5, lng: 107.2 }));
  check("4b-f. parseMapCoords: pola @lat,lng + q=lat,lng", lib.parseMapCoords("https://maps.google.com/@-6.1,106.9,17z")?.lat === -6.1 && lib.parseMapCoords("https://maps.google.com/?q=-6.3,107.0")?.lng === 107.0);
  check("4b-g. parseMapCoords: invalid lat/lng → null", lib.parseMapCoords("https://www.google.com/maps/place/x/data=!8m2!3d-999!4d999") === null && lib.parseMapCoords("https://example.com") === null);
}

// ══════════════════════════════════════════════════════════════
w("\n— 5. teks isi panjang → chat lanjutan (splitChatChunks) —");
{
  const longReviews = Array.from({ length: 40 }, (_, i) => ({
    author: `Reviewer ${i + 1}`, stars: "5 bintang",
    text: "Ulasan panjang sekali " + "lorem ipsum dolor sit amet consecetur adipiscing elit sed do eiusmod ".repeat(3),
  }));
  lib._setMapsDetailForTest(() => ({
    image: Buffer.from("img"),
    detail: { name: "X", rating: "4,0", reviews: "(999)", reviewsList: longReviews, rawText: "" },
  }));
  mkM._replies.length = 0;
  const sock = mockSock();
  await answerHandler(mkM({ text: "1" }), sock);
  check("5a. teks kepotong jadi >1 pesan (chat lanjutan)", sock.sent.length >= 2, `sent=${sock.sent.length}`);
  check("5b. tiap pesan gak lewat limit WA (<=6000 char, standar agent)", sock.sent.every((s) => s.text.length <= 6000));
  check("5c. konten utuh — pesan terakhir ada reviewer 40", has(sock.sent.at(-1).text, "reviewer 40") || has(sock.sent.map(s => s.text).join(" "), "reviewer 40"));
}

// ══════════════════════════════════════════════════════════════
w("\n— 6. guard sesi: nomor salah / stop / bukan angka —");
{
  mkM._replies.length = 0; mkM._reacts.length = 0;
  const sock = mockSock();
  const h1 = await answerHandler(mkM({ text: "99" }), sock);
  check("6a. nomor di luar range → ditangani (return true)", h1 === true);
  check("6b. pesan jujur nomor gak ada", has(mkM._replies.at(-1), "gak ada"));

  mkM._replies.length = 0;
  const h2 = await answerHandler(mkM({ text: "stop" }), sock);
  check("6c. 'stop' → sesi ditutup + return true", h2 === true && lib.getMapsSession("62xx@s.whatsapp.net") === null);
  check("6d. konfirmasi sesi ditutup", has(mkM._replies.at(-1), "ditutup"));

  // tanpa sesi → gak nyandera chat
  mkM._replies.length = 0;
  const h3 = await answerHandler(mkM({ text: "2" }), sock);
  check("6e. tanpa sesi → return false (chat bebas)", h3 === false && mkM._replies.length === 0);

  // sesi baru → teks bukan angka → diabaikan (return false)
  lib._setMapsBrowserForTest(() => ({ image: Buffer.from("i"), places: PLACES }));
  await handler(mkM({ text: "warteg surabaya" }), { sock: mockSock() });
  mkM._replies.length = 0;
  const h4 = await answerHandler(mkM({ text: "halo bro" }), sock);
  check("6f. teks bukan angka saat sesi aktif → return false", h4 === false && mkM._replies.length === 0);
}

// ══════════════════════════════════════════════════════════════
w("\n— 7. error detail → jujur, sesi tetap —");
{
  lib._setMapsDetailForTest(() => { throw new Error("net::ERR_TIMED_OUT"); });
  mkM._replies.length = 0; mkM._reacts.length = 0;
  const sock = mockSock();
  const handled = await answerHandler(mkM({ text: "1" }), sock);
  check("7a. return true + react ❌", handled === true && mkM._reacts.at(-1) === "❌");
  check("7b. reply error template, gak kirim media", sock.media.length === 0 && mkM._replies.length === 1);
  lib._resetMapsDetailForTest();
}

// ══════════════════════════════════════════════════════════════
w("\n— 8. anti bentrok kategori —");
{
  const dis = await import(R + "/plugins/search/sapimaps.js");
  const a = new Set(plug.config?.alias || []);
  const b = new Set(dis.config?.alias || []);
  const dupes = [...a].filter((x) => b.has(x));
  check("8a. gak ada alias dobel dgn sapimaps", dupes.length === 0, dupes.join(","));
}

// ══════════════════════════════════════════════════════════════
w("\n— 9. hook handler.js terpasang —");
{
  const src = await import("fs").then(fs => fs.readFileSync(R + "/src/handler.js", "utf8"));
  check("9a. answerHandler mapss di-hook di handler.js", src.includes('import("../plugins/browser/mapss.js")') && src.includes("mapss-answer"));
  check("9b. hook DIPASANG setelah game-answer (game prioritas)", src.indexOf("game-answer") < src.indexOf("mapss-answer"));
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
lib._resetMapsBrowserForTest();
lib._resetMapsDetailForTest();
lib._clearMapsSessionsForTest();
process.exit(fail ? 1 : 0);
