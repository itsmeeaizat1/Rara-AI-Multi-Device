// E2E — nova-spotify-play-card.js: builder bersama dipakai
// .playspotify / .spotifyplay2 / .spotplay biar output chat SAMA walau
// engine beda (owner: "disamain krna beda endpoint tp untuk dichat sama")
import { strict as assert } from "assert";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function check(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

const { buildSpotifyPlayCard, enrichSpotifyMeta, _setItunesFnForTest } = await import(
  "../../src/lib/nova-spotify-play-card.js"
);

// ── 1. Struktur field IDENTIK dipanggil dengan format berbeda per engine ──
w("\n— struktur card identik lintas engine (format beda) —");
{
  const base = { title: "Faded", album: "Faded - EP", genre: "Dance", duration: "3:32", artist: "Alan Walker", url: "https://open.spotify.com/track/x" };
  const cardSpotidown = buildSpotifyPlayCard({ ...base, format: "Audio MP3" });
  const cardSpotifydown = buildSpotifyPlayCard({ ...base, format: "MP3 320kbps" });
  const cardAzbry = buildSpotifyPlayCard({ ...base, format: "Audio MP3" });

  const fieldOrder = (text) => text.split("\n").filter((l) => l.startsWith("*")).map((l) => l.match(/^\*(\w+):\*/)?.[1]);
  const expected = ["Judul", "Album", "Genre", "Durasi", "Artis", "Format", "Link"];
  check("1a. urutan field .playspotify (spotidown)", JSON.stringify(fieldOrder(cardSpotidown)) === JSON.stringify(expected));
  check("1b. urutan field .spotifyplay2 (spotifydown)", JSON.stringify(fieldOrder(cardSpotifydown)) === JSON.stringify(expected));
  check("1c. urutan field .spotplay (azbry)", JSON.stringify(fieldOrder(cardAzbry)) === JSON.stringify(expected));
  check("1d. Format beda per-engine tapi POSISI sama (baris ke-6)", (() => {
    const line = (t) => t.split("\n")[5];
    return line(cardSpotidown).startsWith("*Format:* Audio MP3") && line(cardSpotifydown) === "*Format:* MP3 320kbps";
  })());
}

// ── 2. Default format kalau gak dikasih ──
w("\n— default format 'Audio MP3' kalau gak dikasih —");
{
  const text = buildSpotifyPlayCard({ title: "X", artist: "Y", url: "u" });
  check("2a. default Audio MP3", text.includes("*Format:* Audio MP3"));
}

// ── 3. enrichSpotifyMeta — hormatin flag need*, gak minta yang gak perlu ──
w("\n— enrichSpotifyMeta hormatin flag need* —");
{
  let calledWith = null;
  _setItunesFnForTest(async (title, artist, need) => {
    calledWith = need;
    return { album: "Album X", genre: "Pop", duration: "3:00" };
  });
  const out = await enrichSpotifyMeta("Judul", "Artis", { needGenre: true });
  check("3a. hasil genre keluar", out.genre === "Pop");
  check("3b. flag needGenre keterusan ke seam", calledWith.needGenre === true && !calledWith.needAlbum);

  // gak minta apa-apa → gak panggil seam sama sekali (short-circuit)
  let called2 = false;
  _setItunesFnForTest(async () => { called2 = true; return {}; });
  const out2 = await enrichSpotifyMeta("Judul", "Artis", {});
  check("3c. gak ada flag need* → seam GAK dipanggil (short-circuit)", called2 === false && out2.album === null);

  _setItunesFnForTest(null);
}

// ── 4. Ketiga plugin Spotify konsisten pakai lib yang sama ──
w("\n— ketiga plugin import lib bersama (bukan duplikat builder) —");
{
  const fs = await import("fs");
  const files = [
    "plugins/search/playspotify.js",
    "plugins/download/spotifyplay2.js",
    "plugins/search/spotplay.js",
  ];
  for (const f of files) {
    const src = fs.readFileSync(new URL(`../../${f}`, import.meta.url), "utf-8");
    check(`4. ${f} import nova-spotify-play-card.js`, src.includes("nova-spotify-play-card.js") && src.includes("buildSpotifyPlayCard"));
  }
}

// ── 5. Field opsional kosong DIOMIT (bukan dipaksa "-") ──
// Owner 14 Sep 2026: "hrsnya g hrs lngkap, klo di api ketersediaannya sgtu
// ya gpp sgtu, biar kliatan card g polos aja" — jangan paksa lengkap.
w("\n— field opsional kosong diomit, bukan dipaksa '-' —");
{
  const textNoAlbumGenre = buildSpotifyPlayCard({ title: "X", artist: "Y", duration: "2:00", format: "Audio MP3", url: "u" });
  check("5a. Album diomit total (bukan '*Album:* -')", !textNoAlbumGenre.includes("*Album:*"));
  check("5b. Genre diomit total (bukan '*Genre:* -')", !textNoAlbumGenre.includes("*Genre:*"));
  check("5c. Durasi yang ADA tetep muncul", textNoAlbumGenre.includes("*Durasi:* 2:00"));

  const textMinimal = buildSpotifyPlayCard({ title: "X", artist: "Y", format: "Audio MP3", url: "u" });
  check("5d. minimal — cuma Judul/Artis/Format/Link, tanpa Album/Genre/Durasi", (() => {
    const labels = textMinimal.split("\n").filter((l) => l.startsWith("*")).map((l) => l.match(/^\*(\w+):\*/)?.[1]);
    return JSON.stringify(labels) === JSON.stringify(["Judul", "Artis", "Format", "Link"]);
  })());
}

// ── summary ──
w("\n— summary —");
w(`PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
