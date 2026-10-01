// E2E: format lirik seragam (request owner 19 Sep — judul/artis/album/durasi
// dibawahnya lirik) — rara-lyrics-format.js satu pintu + 4 plugin lirik.
// Jalankan dari repo root: node test/lyrics-format-e2e/e2e.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "node:fs";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) pass++;
  else { fail++; out("FAIL: " + label + " " + (extra || "")); }
}

const REPO = path.resolve(".");
const { fmtDuration, lyricsCaption, enrichLyricsMeta, _setLyricsMetaHttpForTest } =
  await import(pathToFileURL(path.join(REPO, "src/lib/rara-lyrics-format.js")).href);

// ── fmtDuration ──
t("fmtDuration: 160 dtk → '2:40'", fmtDuration(160) === "2:40");
t("fmtDuration: 61 dtk → '1:01'", fmtDuration(61) === "1:01");
t("fmtDuration: string '2:40' dipakai apa adanya", fmtDuration("2:40") === "2:40");
t("fmtDuration: 0/kosong → '' (baris dilewati)", fmtDuration(0) === "" && fmtDuration(null) === "");

// ── lyricsCaption: format owner persis ──
{
  const cap = lyricsCaption({
    title: "Too Little Too Late",
    artist: "Jordana Bryant",
    album: "Too Little Too Late",
    duration: 160,
    lyrics: "We had fireworks on the first date\nSeeing sparks in the air",
  });
  const expect =
`🎵 *Too Little Too Late*

👤 *Artis:* Jordana Bryant
💿 *Album:* Too Little Too Late
⏱️ *Durasi:* 2:40

🎼 *Lirik:*

We had fireworks on the first date
Seeing sparks in the air`;
  t("caption: format contoh owner PERSIS (judul→artis→album→durasi→lirik)", cap === expect, JSON.stringify(cap));
}

// ── lyricsCaption: field hilang → baris dilewati, urutan tetap ──
{
  const cap = lyricsCaption({ title: "Sempurna", artist: "Gita Gutawa", lyrics: "Line1\nLine2" });
  t("caption: tanpa album/durasi → baris itu hilang", !cap.includes("Album") && !cap.includes("Durasi"), cap);
  t("caption: urutan tetap judul→artis→lirik", cap.startsWith("🎵 *Sempurna*\n\n👤 *Artis:* Gita Gutawa\n\n🎼 *Lirik:*\n\nLine1"));
  const capAll = lyricsCaption({ title: "X", lyrics: "L" });
  t("caption: cuma judul+lirik tetap valid", capAll === "🎵 *X*\n\n🎼 *Lirik:*\n\nL", JSON.stringify(capAll));
}

// ── enrichLyricsMeta: seam + gagal senyap ──
{
  _setLyricsMetaHttpForTest(async (url, cfg) => ({
    data: { albumName: "Too Little Too Late", duration: 160, trackName: cfg.params.track_name },
  }));
  const meta = await enrichLyricsMeta("Too Little Too Late", "Jordana Bryant");
  t("enrich: album + durasi keisi dari LRCLIB", meta?.album === "Too Little Too Late" && meta?.duration === 160);
  _setLyricsMetaHttpForTest(null); // DISABLED
  const meta2 = await enrichLyricsMeta("Sempurna", "Gita Gutawa");
  t("enrich: gagal → null senyap (gak ngelempar)", meta2 === null);
  _setLyricsMetaHttpForTest(undefined); // asli kembali
  const meta3 = await enrichLyricsMeta("", "");
  t("enrich: judul kosong → null tanpa http call", meta3 === null);
}

// ── smoke import 4 plugin ──
for (const p of ["plugins/search/lyrics.js", "plugins/search/lyrics2.js", "plugins/search/lyricsv2.js", "plugins/search/lyricsspotify.js"]) {
  try {
    await import(pathToFileURL(path.join(REPO, p)).href);
    t("import " + p + " OK (tanpa error)", true);
  } catch (e) {
    t("import " + p + " OK (tanpa error)", false, e.message);
  }
}

// ── handler .lirik2 — genius scrape via seam + enrich via seam ──
{
  const { _setGeniusHttpForTest } = await import(pathToFileURL(path.join(REPO, "src/scraper/genius-lyrics.js")).href);
  const { config, handler } = await import(pathToFileURL(path.join(REPO, "plugins/search/lyrics2.js")).href);

  const LYRICS_HTML = `<html><body><div data-lyrics-container="true">We had fireworks on the first date<br>Seeing sparks in the air</div></body></html>`;
  _setGeniusHttpForTest(async (url) => {
    if (String(url).includes("/api/search/multi")) {
      return { data: { response: { sections: [{ type: "song", hits: [{ result: {
        id: 1, title: "Too Little Too Late", full_title: "Too Little Too Late",
        artist_names: "Jordana Bryant", release_date_for_display: "2024",
        url: "https://genius.com/Jordana-bryant-too-little-too-late-lyrics",
        song_art_image_thumbnail_url: "",
      } }] }] } } };
    }
    return { data: LYRICS_HTML };
  });
  _setLyricsMetaHttpForTest(async () => ({ data: { albumName: "Too Little Too Late", duration: 160 } }));

  const replies = [];
  const m = {
    text: ".lirik2 too little too late jordana", prefix: ".",
    chat: "x@s.whatsapp.net", sender: "y@s.whatsapp.net",
    react: async () => {}, reply: async (txt) => replies.push(String(txt)),
  };
  await handler(m, { sock: { sendMessage: async () => { throw new Error("skip image"); } } });
  const cap = replies[0] || "";
  t(".lirik2: format owner — 🎵 judul → 👤 Artis → 💿 Album → ⏱️ Durasi → 🎼 Lirik",
    cap.startsWith("🎵 *Too Little Too Late*\n\n👤 *Artis:* Jordana Bryant\n💿 *Album:* Too Little Too Late\n⏱️ *Durasi:* 2:40\n\n🎼 *Lirik:*"), JSON.stringify(cap.slice(0, 200)));
  t(".lirik2: album+durasi keisi dari enrich LRCLIB", cap.includes("💿 *Album:* Too Little Too Late") && cap.includes("⏱️ *Durasi:* 2:40"));
  t(".lirik2: lirik utuh di bawah 🎼", cap.includes("🎼 *Lirik:*\n\nWe had fireworks on the first date"));
  t(".lirik2: source Genius tetap di akhir", /Source: Genius\s*$/.test(cap.trim()));

  // enrich gagal → baris album/durasi hilang, gak error
  _setLyricsMetaHttpForTest(null);
  replies.length = 0;
  await handler(m, { sock: { sendMessage: async () => { throw new Error("skip image"); } } });
  const cap2 = replies[0] || "";
  t(".lirik2: enrich mati → tanpa baris Album/Durasi, tetap terkirim", !cap2.includes("Album:") && !cap2.includes("Durasi:") && cap2.includes("🎼 *Lirik:*"));

  _setGeniusHttpForTest(undefined);
  _setLyricsMetaHttpForTest(undefined);
}

// ── handler .lirikspotify — lrclib via seam (data lengkap) ──
{
  const { _setLrclibHttpForTest } = await import(pathToFileURL(path.join(REPO, "src/scraper/spotify-lyrics.js")).href);
  const { config, handler } = await import(pathToFileURL(path.join(REPO, "plugins/search/lyricsspotify.js")).href);

  _setLrclibHttpForTest(async (url) => ({
    data: {
      trackName: "Too Little Too Late", artistName: "Jordana Bryant",
      albumName: "Too Little Too Late", duration: 160,
      plainLyrics: "We had fireworks on the first date\nSeeing sparks in the air",
      syncedLyrics: "",
    },
  }));

  const replies = [];
  const m = {
    text: ".lirikspotify too little too late", prefix: ".", args: ["too", "little", "too", "late"],
    chat: "x@s.whatsapp.net", sender: "y@s.whatsapp.net",
    react: async () => {}, reply: async (txt) => replies.push(String(txt)),
  };
  await handler(m, { sock: {} });
  const cap = replies[0] || "";
  t(".lirikspotify: format owner persis + sumber LRCLIB di akhir",
    cap.startsWith("🎵 *Too Little Too Late*\n\n👤 *Artis:* Jordana Bryant\n💿 *Album:* Too Little Too Late\n⏱️ *Durasi:* 2:40\n\n🎼 *Lirik:*\n\nWe had fireworks") && /Sumber: LRCLIB\s*$/.test(cap.trim()), JSON.stringify(cap.slice(0, 200)));

  _setLrclibHttpForTest(undefined);
}

out(`\n${pass}/${pass + fail} pass`);
process.exit(fail ? 1 : 0);
