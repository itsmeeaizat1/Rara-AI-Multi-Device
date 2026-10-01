// E2E: SCOPE LOKASI 3 TINGKAT (kota / pulau / negara) — request owner 2026-09.
// "klo lokasinya indonesia berarti negara jd yg kepantau semua bencana yg ada
//  di indonesia, klo jepang berarti semua bencana yg ada di jepang, klo lokasi
//  cuma tokyo brarti cuma tokyo yg dipantau"
// Uji: klasifikasi scope, bbox containment, geocode live (Nominatim), dan
// dispatch EWS untuk subscriber scope negara/pulau vs kota (radius).
const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
const t = (label, ok, extra) => { if (ok) { pass++; out("✅ " + label); } else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); } };

const R = process.cwd();
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase("/tmp/bencana-scope-e2e/rara.json");
const db = getDatabase();
const L = await import(R + "/src/lib/rara-bencana.js");

out("\n— 1. classifyGeoScope (dari addresstype Nominatim) —");
t("1a. country → negara", L.classifyGeoScope({ addresstype: "country" }) === "negara");
t("1b. island → pulau", L.classifyGeoScope({ addresstype: "island" }) === "pulau");
t("1c. state (provinsi) → daerah", L.classifyGeoScope({ addresstype: "state" }) === "daerah");
t("1d. town/city → kota", L.classifyGeoScope({ addresstype: "town" }) === "kota" && L.classifyGeoScope({ addresstype: "city" }) === "kota");
t("1e. fallback tanpa info → kota", L.classifyGeoScope({}) === "kota");

out("\n— 2. inBbox (titik di dalam wilayah) —");
const ID = { south: -11.2, north: 6.27, west: 94.77, east: 141.02 };
t("2a. Bandung di dalam bbox Indonesia", L.inBbox(-6.9, 107.6, ID) === true);
t("2b. Osaka di luar bbox Indonesia", L.inBbox(34.7, 135.5, ID) === false);
t("2c. bbox null → false (aman)", L.inBbox(-6.9, 107.6, null) === false);

out("\n— 3. isAreaScope —");
t("3a. negara + bbox → true", L.isAreaScope({ scope: "negara", bbox: ID }) === true);
t("3b. kota + bbox → false (kota tetap radius)", L.isAreaScope({ scope: "kota", bbox: ID }) === false);
t("3c. tanpa bbox → false", L.isAreaScope({ scope: "negara" }) === false);

out("\n— 4. geocodeLocation: deteksi scope otomatis (LIVE Nominatim) —");
const gID = await L.geocodeLocation("Indonesia");
t("4a. Indonesia → scope negara + ada bbox", gID.scope === "negara" && !!gID.bbox, JSON.stringify({ scope: gID.scope, bbox: !!gID.bbox }));
const gJP = await L.geocodeLocation("Jepang");
t("4b. Jepang → scope negara", gJP.scope === "negara", gJP.scope);
const gJawa = await L.geocodeLocation("Jawa");
t("4c. Jawa → scope pulau + bbox", gJawa.scope === "pulau" && !!gJawa.bbox, JSON.stringify({ scope: gJawa.scope, bbox: !!gJawa.bbox }));
const gAnyer = await L.geocodeLocation("Anyer");
t("4d. Anyer → scope kota (radius, tanpa bbox)", gAnyer.scope === "kota" && !gAnyer.bbox, JSON.stringify({ scope: gAnyer.scope, bbox: !!gAnyer.bbox }));

out("\n— 5. dispatch EWS per scope —");
const sock = { sendMessage: async (jid, msg) => { sock.sent.push(msg.text); return {}; }, sent: [], groupFetchAllParticipating: async () => ({}) };
L._setBencanaSockForTest(sock);
const evBandung = { key: "b1", provider: "BMKG", sumber: "BMKG", mag: 4.6, depth: "10 km", wilayah: "Bandung", tsunami: "Tidak", lat: -6.9, lon: 107.6, waktu: "now" };
const evOsaka = { key: "o1", provider: "USGS", sumber: "USGS", mag: 4.6, depth: "10 km", wilayah: "Osaka", tsunami: "Tidak", lat: 34.7, lon: 135.5, waktu: "now" };
const CHAT = "628111@s.whatsapp.net";
async function run(loc, ev) {
  const c = await L.geocodeLocation(loc);
  db.setting("bencanaWatch", { [CHAT]: { since: new Date().toISOString(), mode: "otomatis", ews: true, ...c } });
  db.save?.();
  sock.sent.length = 0;
  const r = await L.dispatchEwsEvent(ev, null, sock);
  return r.sent;
}
t("5a. scope NEGARA Indonesia + gempa Bandung → KIRIM", (await run("Indonesia", evBandung)) === 1);
t("5b. scope NEGARA Indonesia + gempa Osaka → DIAM", (await run("Indonesia", evOsaka)) === 0);
t("5c. scope PULAU Jawa + gempa Bandung → KIRIM", (await run("Jawa", evBandung)) === 1);
t("5d. scope PULAU Jawa + gempa Osaka → DIAM", (await run("Jawa", evOsaka)) === 0);
t("5e. scope KOTA Anyer + gempa Bandung (~120 km) → KIRIM (radius 300)", (await run("Anyer", evBandung)) === 1);
t("5f. scope KOTA Anyer + gempa Osaka → DIAM", (await run("Anyer", evOsaka)) === 0);

out("\n— 6. format notif scope area (bukan 'lokasi belum di-set') —");
await run("Indonesia", evBandung);
const body = sock.sent[0] || "";
t("6a. sebut mode SELURUH NEGARA", /SELURUH NEGARA/i.test(body), body.slice(0, 120));
t("6b. TIDAK bilang 'lokasi pantau belum di-set'", !/belum di-set/.test(body));

out(`\n${fail === 0 ? "🎉 SEMUA PASS" : "💥 ADA FAILURE"} — ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
