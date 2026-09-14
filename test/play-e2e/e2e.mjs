// E2E — .play CARD (Judul/Album/Genre/Durasi/Artis/Format + Link, dibawah media)
import { strict as assert } from "assert";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function check(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}

const { buildPlayInfoCard } = await import("../../plugins/search/play.js");

// ── 1. Card lengkap (semua field ada) ──
w("\n— card lengkap —");
{
  const text = buildPlayInfoCard({
    title: "Faded",
    album: "Faded - EP",
    genre: "Dance",
    duration: "3:32",
    artist: "Alan Walker",
    kbps: "256",
    url: "https://youtube.com/watch?v=abc",
    lyricsSnippet: "You were the shadow to my light...",
    lyricsCommand: ".lirik Faded",
  });
  const lines = text.split("\n");

  check("1a. urutan field: Judul,Album,Genre,Durasi,Artis,Format", (() => {
    const idx = (label) => lines.findIndex((l) => l.startsWith(`*${label}:*`));
    const order = ["Judul", "Album", "Genre", "Durasi", "Artis", "Format"].map(idx);
    return order.every((v) => v >= 0) && order.every((v, i) => i === 0 || v > order[i - 1]);
  })());
  check("1b. Format persis 'Audio MP3 256Kbps'", text.includes("*Format:* Audio MP3 256Kbps"));
  check("1c. Format ada TEPAT setelah Artis (baris berikutnya)", (() => {
    const iArtis = lines.findIndex((l) => l.startsWith("*Artis:*"));
    return lines[iArtis + 1]?.startsWith("*Format:*");
  })());
  check("1d. baris kosong sebelum Link", (() => {
    const iLink = lines.findIndex((l) => l.startsWith("*Link:*"));
    return lines[iLink - 1] === "";
  })());
  check("1e. Link keluar bener", text.includes("*Link:* https://youtube.com/watch?v=abc"));
  check("1f. semua value keluar", text.includes("Faded - EP") && text.includes("Dance") && text.includes("3:32") && text.includes("Alan Walker"));
  check("1g. lirik nyusul di bawah Link", text.indexOf("Lirik:") > text.indexOf("Link:"));
}

// ── 2. Card tanpa Album/Genre (iTunes gak nemu) → fallback "-" ──
w("\n— card tanpa album/genre (fallback -) —");
{
  const text = buildPlayInfoCard({
    title: "Lagu Random Banget",
    album: null,
    genre: null,
    duration: "2:10",
    artist: "Unknown Channel",
    kbps: "320",
    url: "https://youtube.com/watch?v=xyz",
  });
  check("2a. Album fallback -", text.includes("*Album:* -"));
  check("2b. Genre fallback -", text.includes("*Genre:* -"));
  check("2c. Format ikut kbps 320", text.includes("*Format:* Audio MP3 320Kbps"));
  check("2d. gak ada blok lirik kalau snippet kosong", !text.includes("Lirik:"));
}

// ── 3. Bitrate lain (128, 320) ke Format bener ──
w("\n— Format ikut bitrate yang dipilih —");
{
  for (const kbps of ["128", "192", "320"]) {
    const text = buildPlayInfoCard({ title: "X", artist: "Y", kbps, url: "u" });
    check(`3.${kbps} Format = Audio MP3 ${kbps}Kbps`, text.includes(`*Format:* Audio MP3 ${kbps}Kbps`));
  }
}

// ── summary ──
w("\n— summary —");
w(`PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
