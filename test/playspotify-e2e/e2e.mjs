// E2E — .playspotify CARD (Judul/Album/Genre/Durasi/Artis/Format + Link, dibawah media)
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

// ── 2. Card tanpa Genre (iTunes gak nemu) → fallback "-" ──
w("\n— card tanpa genre (fallback -) —");
{
  const text = buildPlaySpotifyInfoCard({
    title: "Lagu Random Banget",
    album: "Album Random",
    genre: null,
    duration: "2:10",
    artist: "Unknown Artist",
    url: "https://open.spotify.com/",
  });
  check("2a. Genre fallback -", text.includes("*Genre:* -"));
  check("2b. Album asli tetep keluar (bukan iTunes)", text.includes("*Album:* Album Random"));
  check("2c. gak ada blok lirik kalau snippet kosong", !text.includes("Lirik:"));
}

// ── summary ──
w("\n— summary —");
w(`PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
