// E2E — .playspotify CARD LOKAL (Judul/Album/Genre/Durasi/Artis/Format + Link, dibawah media)
// Builder ditulis lokal di plugin (bukan lib bersama) — field disesuaikan
// data ASLI yang tersedia dari spotidown.app.
import { strict as assert } from "assert";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function check(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

const { buildPlaySpotifyInfoCard } = await import("../../plugins/search/playspotify.js");

// ── 1. Card lengkap (semua field ada) ──
w("\n— card lengkap —");
{
  const text = buildPlaySpotifyInfoCard({
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
w("\n— card tanpa genre (baris diomit) —");
{
  const text = buildPlaySpotifyInfoCard({
    title: "Lagu Random Banget",
    album: "Album Random",
    genre: null,
    duration: "2:10",
    artist: "Unknown Artist",
    url: "https://open.spotify.com/",
  });
  check("2a. baris Genre DIOMIT (bukan '*Genre:* -')", !text.includes("*Genre:*"));
  check("2b. Album asli tetep keluar (bukan iTunes)", text.includes("*Album:* Album Random"));
  check("2c. Durasi tetep tampil (walau kosong pun '-', field ini gak diomit di playspotify)", text.includes("*Durasi:* 2:10"));
  check("2d. gak ada blok lirik kalau snippet kosong", !text.includes("Lirik:"));
}

// ── 3. Gak import lib bersama — builder ditulis lokal di file plugin ──
w("\n— builder lokal, gak pakai lib bersama —");
{
  const fs = await import("fs");
  const src = fs.readFileSync(new URL("../../plugins/search/playspotify.js", import.meta.url), "utf-8");
  check("3a. gak ada import nova-spotify-play-card.js (lib bersama udah dihapus)", !src.includes("nova-spotify-play-card"));
  check("3b. buildPlaySpotifyInfoCard didefinisikan lokal di file ini", src.includes("export function buildPlaySpotifyInfoCard"));
}

// ── summary ──
w("\n— summary —");
w(`PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
