// E2E — .spotplay CARD LOKAL (field paling minim — cuma yang dikonfirmasi
// ada dari API azbry). Builder ditulis lokal di plugin, bukan lib bersama.
let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function check(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

const { buildSpotplayCard } = await import("../../plugins/search/spotplay.js");

// ── 1. Card minimal — cuma Judul/Artis/Format/Link (kondisi umum azbry) ──
w("\n— card minimal (kondisi umum, API cuma ngasih title/artist/link) —");
{
  const text = buildSpotplayCard({ title: "Grateful", artist: "NEFFEX", url: "https://open.spotify.com/" });
  const lines = text.split("\n").filter((l) => l.startsWith("*"));
  check("1a. cuma 4 field: Judul,Artis,Format,Link (Album/Genre/Durasi gak dipaksa ada)", (() => {
    const labels = lines.map((l) => l.match(/^\*(\w+):\*/)?.[1]);
    return JSON.stringify(labels) === JSON.stringify(["Judul", "Artis", "Format", "Link"]);
  })());
  check("1b. Format default 'Audio MP3' (gak ada info bitrate dari azbry)", text.includes("*Format:* Audio MP3"));
}

// ── 2. Kalau API kebetulan ngasih Album/Genre/Durasi → tetep muncul ──
w("\n— card lengkap kalau API kasih semua (defensif) —");
{
  const text = buildSpotplayCard({ title: "X", album: "Album Y", genre: "Pop", duration: "3:00", artist: "Z", url: "u" });
  check("2a. Album muncul kalau ada", text.includes("*Album:* Album Y"));
  check("2b. Genre muncul kalau ada", text.includes("*Genre:* Pop"));
  check("2c. Durasi muncul kalau ada", text.includes("*Durasi:* 3:00"));
}

// ── 3. Gak import lib bersama ──
w("\n— builder lokal, gak pakai lib bersama —");
{
  const fs = await import("fs");
  const src = fs.readFileSync(new URL("../../plugins/search/spotplay.js", import.meta.url), "utf-8");
  check("3a. gak ada import nova-spotify-play-card.js", !src.includes("nova-spotify-play-card"));
  check("3b. buildSpotplayCard didefinisikan lokal", src.includes("export function buildSpotplayCard"));
}

// ── summary ──
w("\n— summary —");
w(`PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
