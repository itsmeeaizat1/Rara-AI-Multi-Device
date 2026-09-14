// E2E — .playspotify CARD (Judul/Album/Genre/Durasi/Artis/Format + Link, dibawah media)
import { strict as assert } from "assert";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function check(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

const { buildSpotifyPlayCard: buildPlaySpotifyInfoCard } = await import("../../src/lib/nova-spotify-play-card.js");

// ── 1. Card lengkap (semua field ada) ──
w("\n— card lengkap —");
{
  const text = buildPlaySpotifyInfoCard({
    format: "Audio MP3",
    title: "Faded",
    album: "Faded - EP",
    genre: "Dance",
    duration: "3:32",
    artist: "Alan Walker",
    url: "https://open.spotify.com/",
    lyricsSnippet: "You were the shadow to my light...",
    lyricsCommand: ".lirikspotify Faded",
  });
  const lines = text.split("\n");

  check("1a. urutan field: Judul,Album,Genre,Durasi,Artis,Format", (() => {
    const idx = (label) => lines.findIndex((l) => l.startsWith(`*${label}:*`));
    const order = ["Judul", "Album", "Genre", "Durasi", "Artis", "Format"].map(idx);
    return order.every((v) => v >= 0) && order.every((v, i) => i === 0 || v > order[i - 1]);
  })());
  check("1b. Format persis 'Audio MP3' (tanpa kbps ngarang)", text.includes("*Format:* Audio MP3") && !/Audio MP3 \d/.test(text));
  check("1c. Format ada TEPAT setelah Artis (baris berikutnya)", (() => {
    const iArtis = lines.findIndex((l) => l.startsWith("*Artis:*"));
    return lines[iArtis + 1]?.startsWith("*Format:*");
  })());
  check("1d. baris kosong sebelum Link", (() => {
    const iLink = lines.findIndex((l) => l.startsWith("*Link:*"));
    return lines[iLink - 1] === "";
  })());
  check("1e. semua value keluar", text.includes("Faded - EP") && text.includes("Dance") && text.includes("3:32") && text.includes("Alan Walker"));
  check("1f. lirik nyusul di bawah Link", text.indexOf("Lirik:") > text.indexOf("Link:"));
}

// ── 2. Card tanpa Genre (iTunes gak nemu) → baris DIOMIT, bukan "-" ──
// Owner 14 Sep 2026: "gak harus lengkap, ketersediaan API segitu ya
// gapapa segitu, biar card gak polos" — field opsional kosong = diomit.
w("\n— card tanpa genre (baris diomit) —");
{
  const text = buildPlaySpotifyInfoCard({
    format: "Audio MP3",
    title: "Lagu Random Banget",
    album: "Album Random",
    genre: null,
    duration: "2:10",
    artist: "Unknown Artist",
    url: "https://open.spotify.com/",
  });
  check("2a. baris Genre DIOMIT (bukan '*Genre:* -')", !text.includes("*Genre:*"));
  check("2b. Album asli tetep keluar (bukan iTunes)", text.includes("*Album:* Album Random"));
  check("2c. gak ada blok lirik kalau snippet kosong", !text.includes("Lirik:"));
}

// ── 3. Card minimal — cuma Judul/Artis/Format/Link (semua opsional kosong) ──
w("\n— card minimal, cuma field wajib —");
{
  const text = buildPlaySpotifyInfoCard({ format: "Audio MP3", title: "X", artist: "Y", url: "u" });
  check("3a. Judul/Artis/Format/Link tetap ada", text.includes("*Judul:*") && text.includes("*Artis:*") && text.includes("*Format:*") && text.includes("*Link:*"));
  check("3b. Album/Genre/Durasi gak nongol sama sekali", !text.includes("*Album:*") && !text.includes("*Genre:*") && !text.includes("*Durasi:*"));
  check("3c. card tetep gak polos (ada >=4 baris berisi info)", text.split("\n").filter((l) => l.startsWith("*")).length >= 4);
}

// ── summary ──
w("\n— summary —");
w(`PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
