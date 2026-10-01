// E2E — .spotifyplay2 CARD LOKAL (Judul/Album/Genre/Durasi/Artis/Format + Link)
// Builder ditulis lokal di plugin (bukan lib bersama) — field disesuaikan
// data ASLI yang tersedia dari api.spotifydown.org.
let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function check(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

const { buildSpotifyPlay2Card } = await import("../../plugins/download/spotifyplay2.js");

// ── 1. Card lengkap ──
w("\n— card lengkap —");
{
  const text = buildSpotifyPlay2Card({
    title: "Faded", album: "Faded - EP", genre: "Dance", duration: "3:32",
    artist: "Alan Walker", url: "https://open.spotify.com/track/abc",
  });
  const lines = text.split("\n");
  check("1a. urutan field: Judul,Album,Genre,Durasi,Artis,Format", (() => {
    const idx = (label) => lines.findIndex((l) => l.startsWith(`*${label}:*`));
    const order = ["Judul", "Album", "Genre", "Durasi", "Artis", "Format"].map(idx);
    return order.every((v) => v >= 0) && order.every((v, i) => i === 0 || v > order[i - 1]);
  })());
  check("1b. Format PERSIS 'MP3 320kbps' (spesifik engine ini, valid — bukan ngarang)", text.includes("*Format:* MP3 320kbps"));
  check("1c. baris kosong sebelum Link", (() => {
    const iLink = lines.findIndex((l) => l.startsWith("*Link:*"));
    return lines[iLink - 1] === "";
  })());
}

// ── 2. Card tanpa Album/Genre/Durasi (API gak ngasih) → semua DIOMIT ──
w("\n— card minimal (Album/Genre/Durasi gak ada) —");
{
  const text = buildSpotifyPlay2Card({ title: "X", album: null, genre: null, duration: null, artist: "Y", url: "u" });
  check("2a. Album diomit", !text.includes("*Album:*"));
  check("2b. Genre diomit", !text.includes("*Genre:*"));
  check("2c. Durasi diomit (beda dari .playspotify — disini opsional)", !text.includes("*Durasi:*"));
  check("2d. Judul/Artis/Format/Link tetap ada", text.includes("*Judul:*") && text.includes("*Artis:*") && text.includes("*Format:* MP3 320kbps") && text.includes("*Link:*"));
}

// ── 3. Gak import lib bersama ──
w("\n— builder lokal, gak pakai lib bersama —");
{
  const fs = await import("fs");
  const src = fs.readFileSync(new URL("../../plugins/download/spotifyplay2.js", import.meta.url), "utf-8");
  check("3a. gak ada import rara-spotify-play-card.js", !src.includes("rara-spotify-play-card"));
  check("3b. buildSpotifyPlay2Card didefinisikan lokal", src.includes("export function buildSpotifyPlay2Card"));
}

// ── summary ──
w("\n— summary —");
w(`PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
