// E2E — SEARCHAPI SUITE (.sapi .gmaps .grute .gtiket .ghotels .gshopping dll)
// Semua hasil HARUS plain text lengkap (alamat/harga/rating/jam) — prinsip owner.
import { strict as assert } from "assert";
import fs from "fs";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function check(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

const TMP = "/tmp/sapi-suite-e2e";
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.env.NOVA_DB_DIR = TMP;
const { initDatabase } = await import("../../src/lib/nova-database.js");
await initDatabase(TMP + "/db.json");

const { fromSC } = await import("../../src/lib/styler.js");
const scr = await import("../../src/scraper/searchapi.js");
const lib = await import("../../src/lib/nova-sapi-render.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

const plugins = {
  hub: await import("../../plugins/search/sapihub.js"),
  maps: await import("../../plugins/search/sapimaps.js"),
  travel: await import("../../plugins/search/sapitravel.js"),
  shop: await import("../../plugins/search/sapishop.js"),
  media: await import("../../plugins/search/sapimedia.js"),
  riset: await import("../../plugins/search/sapiriset.js"),
};

let sends = [], reacts = [], gotUrl = "", mockData = null;
const setHttp = (data) => {
  scr._setSearchApiHttpForTest(async (u) => { gotUrl = u; return { status: 200, json: async () => data }; });
};
const mk = (command, args) => ({
  command, args,
  sender: "62user@g.us", chat: "gc@g.us", pushName: "user", isOwner: false,
  react: async (r) => { reacts.push(r); },
  reply: async (t) => { sends.push(t); },
});
const run = async (plugName, command, args) => {
  sends = []; reacts = []; gotUrl = "";
  await plugins[plugName].handler(mk(command, args), { sock: {} });
  return norm(sends[0] || "");
};

// ── 1. .sapi list ──
w("\n— .sapi list —");
{
  const card = await run("hub", "sapi", ["list"]);
  check("daftar engine keluar", card.includes("searchapi hub") && card.includes("google_maps"));
  check("jumlah engine disebut", /\d+ engine/.test(card));
  check("hint command khusus", card.includes(".gtiket") && card.includes(".gmaps"));
}

// ── 2. .sapi <engine> <query> generic ──
w("\n— .sapi google_maps kafe jakarta (via hub) —");
{
  setHttp({ local_results: [{
    title: "Kafe A", address: "Jl. Sudirman No. 1, Jakarta", rating: 4.6, reviews: 1234,
    phone: "08123456789", website: "https://kafea.com",
    operating_hours: { monday: { open: "08:00", close: "22:00" } },
  }]});
  const card = await run("hub", "sapi", ["google_maps", "kafe", "jakarta"]);
  check("alamat jadi plain text", card.includes("jl. sudirman no. 1"));
  check("rating + ulasan", card.includes("4.6") && card.includes("ulasan"));
  check("telepon", card.includes("08123456789"));
  check("situs", card.includes("kafea.com"));
  check("query di judul", card.includes("kafe jakarta"));
  check("engine terpakai", gotUrl.includes("engine=google_maps") && gotUrl.includes("q=kafe+jakarta"));
}

// ── 3. .gmaps langsung ──
w("\n— .gmaps kafe jakarta —");
{
  setHttp({ local_results: [{ title: "Kafe B", address: "Jl. Thamrin No. 2", rating: 4.2, reviews: 88, open_state: "Open ⋅ Closes 10 PM" }]});
  const card = await run("maps", "gmaps", ["kafe", "jakarta"]);
  check("plain text alamat", card.includes("jl. thamrin no. 2"));
  check("status buka", card.includes("closes 10 pm"));
  check("hl=id default", gotUrl.includes("hl=id"));
}
w("\n— .gmapsreviews monas —");
{
  setHttp({ reviews: [{ user: { name: "Budi" }, rating: 5, date: "seminggu lalu", snippet: "Tempatnya bagus banget" }]});
  const card = await run("maps", "gmapsreviews", ["monas"]);
  check("ulasan plain text", card.includes("budi") && card.includes("tempatnya bagus banget"));
  check("bintang", card.includes("⭐⭐⭐⭐⭐") || card.includes("⭐"));
}

// ── 4. .grute rute ──
w("\n— .grute stasiun gambir | monas | jalan kaki —");
{
  setHttp({ directions: [{ travel_mode: "Walking", via: "Jl. Medan Merdeka Tim.", formatted_duration: "6 mnt", duration: 374, formatted_distance: "450 m", distance: 453,
    instructions: [{ details: [
      { action: "Ambil arah menuju Jl. Medan Merdeka Tim.", formatted_duration: "3 mnt", formatted_distance: "220 m" },
      { action: "Belok kiri ke arah Monas", formatted_duration: "3 mnt", formatted_distance: "230 m" },
    ] }] }] });
  const card = await run("maps", "grute", ["stasiun", "gambir", "|", "monas", "|", "jalan", "kaki"]);
  check("mode jalan kaki", card.includes("jalan kaki"));
  check("durasi + jarak formatted", card.includes("6 mnt") && card.includes("450 m"));
  check("via", card.includes("jl. medan merdeka tim."));
  check("langkah plain text", card.includes("ambil arah menuju jl. medan merdeka tim."));
  check("durasi per langkah", card.includes("(220 m, 3 mnt)"));
  check("travel_mode=walking", gotUrl.includes("travel_mode=walking"));
  check("distance_units=km", gotUrl.includes("distance_units=km"));
  check("from/to param", gotUrl.includes("from=") && gotUrl.includes("to="));
}
w("\n— .grute format salah → hint —");
{
  const card = await run("maps", "grute", ["gambir"]);
  check("hint format keluar", card.includes("grute") && card.includes("|"));
  check("react error", reacts.includes("❌"));
}

// ── 5. .gtiket flights ──
w("\n— .gtiket CGK | DPS | 20-09-2026 —");
{
  setHttp({ best_flights: [{ price: "Rp 1.500.000", total_duration: 115, type: "One-way",
    flights: [{ departure_airport: { name: "Soekarno-Hatta", id: "CGK", time: "2026-09-20 08:00" }, arrival_airport: { name: "Ngurah Rai", id: "DPS", time: "2026-09-20 10:55" }, airline: "Garuda", flight_number: "GA 420", duration: 115 }], layovers: [] }]});
  const card = await run("travel", "gtiket", ["CGK", "|", "DPS", "|", "20-09-2026"]);
  check("harga plain text", card.includes("rp 1.500.000") || card.includes("1.500.000"));
  check("rute + jam terbang", card.includes("soekarno-hatta") && card.includes("08:00") && card.includes("ngurah rai"));
  check("airline + nomor penerbangan", card.includes("garuda") && card.includes("ga 420"));
  check("durasi total", card.includes("1j 55m"));
  check("langsung (no transit)", card.includes("langsung"));
  check("param bener", gotUrl.includes("departure_id=CGK") && gotUrl.includes("arrival_id=DPS") && gotUrl.includes("outbound_date=2026-09-20"));
  check("one_way + IDR", gotUrl.includes("flight_type=one_way") && gotUrl.includes("currency=IDR"));
}
w("\n— .gtiket PP —");
{
  setHttp({ best_flights: [{ price: 2500000, total_duration: 90, flights: [], layovers: [] }]});
  const card = await run("travel", "gtiket", ["CGK", "|", "DPS", "|", "20-09-2026", "|", "PP", "27-09-2026"]);
  check("kartu PP keluar", card.includes("(pp)"));
  check("harga angka mentah → format Rp", card.includes("rp 2.500.000"));
  check("return_date terkirim", gotUrl.includes("return_date=2026-09-27"));
  check("gak ada flight_type=one_way (PP)", !gotUrl.includes("flight_type=one_way"));
}
w("\n— .gtiket kode salah → hint —");
{
  const card = await run("travel", "gtiket", ["jakarta", "|", "bali", "|", "20-09-2026"]);
  check("toleran kode bukan IATA", card.includes("iata") || card.includes("format"));
}

// ── 6. .ghotels ──
w("\n— .ghotels Bandung | 20-09-2026 | 22-09-2026 —");
{
  setHttp({ hotels: [{ title: "Hotel Savoy", price: "Rp 850.000", rating: 4.5, reviews: 2100, location: "Jl. Asia Afrika", hotel_class: "Berbintang 4", deal: "Mungkin ada diskon" }]});
  const card = await run("travel", "ghotels", ["Bandung", "|", "20-09-2026", "|", "22-09-2026"]);
  check("hotel plain text", card.includes("hotel savoy") && card.includes("rp 850.000"));
  check("rating + lokasi", card.includes("4.5") && card.includes("jl. asia afrika"));
  check("bintang", card.includes("berbintang 4"));
  check("tanggal check-in/out", gotUrl.includes("check_in_date=2026-09-20") && gotUrl.includes("check_out_date=2026-09-22"));
  check("adults default", gotUrl.includes("adults=2"));
}

// ── 7. shopping ──
w("\n— .gshopping ps5 —");
{
  setHttp({ shopping_results: [{ title: "PlayStation 5 Console", price: "Rp 7.500.000", source: "Tokopedia", rating: 4.8, reviews: 900 }]});
  const card = await run("shop", "gshopping", ["ps5"]);
  check("produk plain text", card.includes("playstation 5 console") && card.includes("rp 7.500.000"));
  check("toko + rating", card.includes("tokopedia") && card.includes("4.8"));
}
w("\n— .amz mechanical keyboard —");
{
  setHttp({ products: [{ title: "Logitech K845", price: "$59.99", rating: 4.6, reviews: 300, delivery: "FREE delivery" }]});
  const card = await run("shop", "amz", ["mechanical", "keyboard"]);
  check("amazon engine", gotUrl.includes("engine=amazon_search"));
  check("produk + ongkir", card.includes("logitech k845") && card.includes("free delivery"));
}

// ── 8. media suite ──
w("\n— .gnews teknologi —");
{
  setHttp({ news_results: [{ title: "AI Terbaru", source: "Detik", date: "2 jam lalu", snippet: "Berita tentang AI", link: "https://detik.com/x" }]});
  const card = await run("media", "gnews", ["teknologi"]);
  check("berita plain text", card.includes("ai terbaru") && card.includes("detik"));
  check("snippet + tanggal", card.includes("berita tentang ai") && card.includes("2 jam lalu"));
}
w("\n— .gjobs frontend developer —");
{
  setHttp({ jobs: [{ title: "Frontend Dev", company_name: "Tokopedia", location: "Jakarta", via: "LinkedIn", detected_extensions: { posted_at: "3 hari lalu", schedule: "Full-time" } }]});
  const card = await run("media", "gjobs", ["frontend", "developer"]);
  check("lowongan plain text", card.includes("frontend dev") && card.includes("tokopedia"));
  check("posted + tipe kerja", card.includes("3 hari lalu") && card.includes("full-time"));
}
w("\n— .gimages pemandangan —");
{
  setHttp({ images_results: [{ title: "Gunung", original: "https://img.example.com/gunung.jpg" }]});
  const card = await run("media", "gimages", ["pemandangan"]);
  check("gambar link plain", card.includes("img.example.com/gunung.jpg"));
}
w("\n— .sapiyts kucing lucu —");
{
  setHttp({ video_results: [{ title: "Kucing Lucu 2026", channel: "Kucing Channel", length: "10:15", views: "1.2M", link: "https://youtu.be/x" }]});
  const card = await run("media", "sapiyts", ["kucing", "lucu"]);
  check("video plain text", card.includes("kucing lucu 2026") && card.includes("kucing channel"));
  check("durasi + views", card.includes("10:15") && card.includes("1.2m"));
}

// ── 9. riset suite ──
w("\n— .scholar machine learning —");
{
  setHttp({ organic_results: [{ title: "Deep Learning Survey", publication_info: { authors: [{ name: "LeCun" }] }, cited_by: { value: 15000 }, snippet: "Paper tentang deep learning" }]});
  const card = await run("riset", "scholar", ["machine", "learning"]);
  check("paper plain text", card.includes("deep learning survey") && card.includes("lecun"));
  check("sitasi", card.includes("disitasi: 15000x"));
}
w("\n— .gbooks laskar pelangi —");
{
  setHttp({ book_results: [{ title: "Laskar Pelangi", volume_info: { authors: ["Andrea Hirata"], published_date: "2005", description: "Kisah 10 anak Belitung" } }]});
  const card = await run("riset", "gbooks", ["laskar", "pelangi"]);
  check("buku plain text", card.includes("laskar pelangi") && card.includes("andrea hirata"));
  check("deskripsi", card.includes("belitung"));
}
w("\n— .gfinance AAPL —");
{
  setHttp({ stock: { title: "Apple Inc.", price: "228,50 USD", regular_market_change_percent: 1.23, market_cap: "3.4T", exchange: "NASDAQ" }});
  const card = await run("riset", "gfinance", ["AAPL"]);
  check("saham plain text", card.includes("apple inc.") && card.includes("228,50 usd"));
  check("perubahan + bursa", card.includes("+1.23%") && card.includes("nasdaq"));
}
w("\n— .ytranscript URL —");
{
  setHttp({ transcript: [{ text: "Halo semuanya" }, { text: "hari ini kita bahas" }]});
  const card = await run("riset", "ytranscript", ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"]);
  check("video_id terekstrak", gotUrl.includes("video_id=dqw4w9wgxcq") || gotUrl.includes("video_id=dQw4w9WgXcQ"));
  check("transkrip utuh", card.includes("halo semuanya hari ini kita bahas"));
}
w("\n— .ytranscript ID salah → hint —");
{
  const card = await run("riset", "ytranscript", ["video palsu"]);
  check("tolak id salah", card.includes("11 karakter") || card.includes("url video"));
}

// ── 10. unknown engine → generic fallback ──
w("\n— .sapi <engine-aneh> generic fallback —");
{
  setHttp({ tips: [{ title: "Tips 1", value: "Minum air" }]});
  const card = await run("hub", "sapi", ["google_forums", "belajar", "gitar"]);
  check("engine gak dikenal tetap jalan", gotUrl.includes("engine=google_forums"));
  check("generic render keluar", card.includes("minum air"));
}

// ── 11. key kosong → error strict ──
w("\n— key kosong → error jelas, TANPA fallback —");
{
  scr._setSearchApiKeyForTest("");
  const card = await run("maps", "gmaps", ["kafe"]);
  scr._setSearchApiKeyForTest(null);
  check("error key keluar", card.includes("api key searchapi.io belum di-set"));
  check("react ❌", reacts.includes("❌"));
}

// ── 12. renderer defensif: data aneh gak nge-crash ──
w("\n— renderer defensif —");
{
  check("places data kosong → null", lib.renderPlaces({}) === null);
  check("flights data null → null", lib.renderFlights(null) === null);
  check("generic array campur aduk", norm(lib.renderGeneric({ random: [{ title: "Apel", price: "1000" }] }) || "").includes("apel"));
  check("transcript string items", norm(lib.renderTranscript({ transcript: ["A", "B"] })).includes("a b"));
}

// ── 13. registry ──
w("\n— registry engine —");
{
  const spec = lib.getEngineSpec("GOOGLE_MAPS");
  check("case-insensitive", spec.engine === "google_maps");
  const unknown = lib.getEngineSpec("engine_baru_xyz");
  check("unknown → generic", unknown.engine === "engine_baru_xyz");
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
