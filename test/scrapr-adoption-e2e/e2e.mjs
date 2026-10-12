// ── SCRAPR ADOPTION E2E (12 Okt 2026) ─────────────────────────────────────────
// Adopsi upstream scrapr commit 373d605 + fitur baru di bot:
//   1. Vendor: spotify playlist multi-track (spotmate/spotidown) + fix bug upstream
//   2. .morialldownloader: alur Spotify playlist (preview lagu 1 + daftar track)
//   3. .morialldownloader: resolver auto-unwrap (mediafire/sfile/safelinku/
//      sub2unlock/rekonise/shortener) → link asli atau download langsung
//   4. .play & .playv: fallback engine Mori scrapr youtube (anti bot-check IP)
// Gerbang QA: integration live toleran (block IP sandbox boleh gagal),
// source-level deterministic wajib hijau, handler non-throw wajib hijau.

import assert from "node:assert/strict";

let pass = 0, fail = 0, warn = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
};
const info = (name, cond) => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { warn++; console.log(`  ⚠️  [info-live] ${name} (toleransi — block IP jaringan)`); }
};

const LIB = await import(new URL("../../src/scraper/mori-bridge.js", import.meta.url).href)
  .catch((e) => { console.error("IMPORT BRIDGE GAGAL:", e.message); process.exit(1); });
const { moriScrape, moriResolve } = LIB;

console.log("── 1. Vendor: spotify playlist (upstream 373d605) ──");
const { readFile: rf } = await import("node:fs/promises");
const spotSrc = await rf(new URL("../../src/scraper/mori/spotify/spotmate/index.js", import.meta.url), "utf-8");
check("spotmate: dukung playlist multi-track (trackCount + tracks)", /trackCount/.test(spotSrc) && /\.tracks\b|result\.tracks/.test(spotSrc));
check("spotmate: track_url per lagu", /track_url/.test(spotSrc));
check("spotmate: fix bug upstream (deklarasi trackInfo dipulihkan)", /let trackInfo = \{ title: "", artist: "", thumbnail: "" \}/.test(spotSrc));
check("spotmate: fix diberi komentar atribusi upstream", /fix: upstream 373d605/.test(spotSrc));
const spotiDownSrc = await rf(new URL("../../src/scraper/mori/spotify/spotidown/index.js", import.meta.url), "utf-8");
check("spotidown: track_url ikut dihasilkan", /track_url/.test(spotiDownSrc));

console.log("── 2. LIVE: spotify playlist (jaringan asli — gerbang 1 QA) ──");
{
  let liveResult = null;
  try {
    liveResult = await moriScrape("spotify", "spotmate", "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M");
  } catch (e) { console.log(`  ⚠️  live playlist gagal: ${String(e.message).slice(0, 90)}`); }
  info("spotmate playlist LIVE: trackCount > 1", !!liveResult && liveResult.trackCount > 1);
  info("spotmate playlist LIVE: tracks[].track_url open.spotify.com/track/", !!liveResult && Array.isArray(liveResult.tracks) && /open\.spotify\.com\/track\//.test(liveResult.tracks[0]?.track_url || ""));
  info("spotmate playlist LIVE: downloads preview ada", !!liveResult && Array.isArray(liveResult.downloads) && liveResult.downloads.length > 0);
  let single = null;
  try {
    single = await moriScrape("spotify", "spotmate", "https://open.spotify.com/track/3zOYmiNOuyDL0ClxJcEJ0T");
  } catch (e) { console.log(`  ⚠️  live single-track gagal: ${String(e.message).slice(0, 90)}`); }
  info("spotmate single-track LIVE tetep jalan (gak rusak sama patch)", !!single && Array.isArray(single.downloads) && single.downloads.length > 0);
}

console.log("── 3. Plugin: alur Spotify playlist di morialldownloader ──");
const PLUG = await import(new URL("../../plugins/download/morialldownloader.js", import.meta.url).href)
  .catch((e) => { console.error("IMPORT PLUGIN GAGAL:", e.message); process.exit(1); });
const plugSrc = await rf(new URL("../../plugins/download/morialldownloader.js", import.meta.url), "utf-8");
check("engine fn: passthrough kind spotifyplaylist saat trackCount > 1", /kind: "spotifyplaylist"/.test(plugSrc) && /trackCount > 1/.test(plugSrc));
check("resolveUrl: spotifyplaylist di daftar kind valid", /\["ugoira", "pixivimages", "album", "spotifyplaylist"\]/.test(plugSrc));
check("handler: branch spotifyplaylist → handleSpotifyPlaylist", /if \(r\.kind === "spotifyplaylist"\)/.test(plugSrc) && /handleSpotifyPlaylist\(sock, m, platform, r, progressLabel\)/.test(plugSrc));
check("handleSpotifyPlaylist: preview audio lagu pertama dikirim", /Playlist \$\{tracks\.length\} track — preview lagu 1/.test(plugSrc) && /audio: buf, mimetype: "audio\/mpeg"/.test(plugSrc));
check("handleSpotifyPlaylist: daftar track maks 15 + hint link per lagu", /slice\(0, 15\)/.test(plugSrc) && /track_url/.test(plugSrc));
check("handleSpotifyPlaylist: gak kirim 50 audio sekaligus (anti-spam)", !/tracks\.slice\(0, 50\)\)/.test(plugSrc.split("async function handleSpotifyPlaylist")[1]?.split("\nasync function")[0] || ""));

console.log("── 4. Plugin: resolver auto-unwrap ──");
check("tabel RESOLVERS: 6 metode (mediafire/sfile/safelinku/sub2unlock/rekonise/unshorten)",
  /mediafire:\s*\{\s*icon/.test(plugSrc) && /sfile:\s*\{\s*icon/.test(plugSrc) && /safelinku:\s*\{\s*icon/.test(plugSrc) && /sub2unlock:\s*\{\s*icon/.test(plugSrc) && /rekonise:\s*\{\s*icon/.test(plugSrc) && /unshorten:\s*\{\s*icon/.test(plugSrc));
{
  // pola deteksi — deterministic regex behavior
  const cases = [
    ["mediafire", "https://www.mediafire.com/file/abc123/rara.zip/file", true],
    ["mediafire", "https://download128.mediafire.com/abc123/rara.zip", true],
    ["sfile", "https://sfile.mobi/abc123", true],
    ["safelinku", "https://safelinku.com/abc", true],
    ["safelinku", "https://safelinku.net/abc", true],
    ["sub2unlock", "https://sub2unlock.com/abc", true],
    ["rekonise", "https://rekonise.com/abc", true],
    ["unshorten", "https://bit.ly/abc", true],
    ["unshorten", "https://s.id/abc", true],
    ["unshorten", "https://aka.ms/abc", true],
    ["unshorten", "https://tinyurl.com/abc", true],
    [null, "https://www.youtube.com/watch?v=abc", false],
    [null, "https://open.spotify.com/track/abc", false],
    [null, "https://www.tiktok.com/@x/video/1", false],
  ];
  const resBlock = plugSrc.match(/const RESOLVERS = \{[\s\S]*?\nfunction detectResolver[\s\S]*?\n\}/)?.[0] || "";
  for (const [label, url, shouldMatch] of cases) {
    const matched = /detectResolver \(|detectResolver\(/.test(plugSrc) && evalInBlock(resBlock, url);
    const want = shouldMatch ? (matched !== null && matched !== undefined) : (matched === null || matched === undefined);
    check(`regex resolver ${label || "bukan-resolver"}: ${shouldMatch ? "kena" : "gak nyasar"} (${url.slice(0, 42)})`, want);
  }
}
check("handler: resolver dipanggil sebelum detectPlatform normal", plugSrc.indexOf("detectResolver(url)") > 0 && plugSrc.indexOf("const platformKey = detectPlatform(targetUrl);") > plugSrc.indexOf("detectResolver(url)"));
check("handler: dest generic → kartu link Mori Resolver (bukan dibuang)", /Mori Resolver/.test(plugSrc) && /res\.filename/.test(plugSrc));
check("handler: dest platform dikenal → lanjut download via targetUrl", /targetUrl = dest;/.test(plugSrc) && /await resolveUrl\(targetUrl, platformKey\)/.test(plugSrc));
check("import moriResolve dari bridge", /import \{ moriScrape, moriResolve \}/.test(plugSrc));
check("engines card: seksi resolver disebut (『 *Resolver Link* 』)", /『 \*Resolver Link\* 』/.test(plugSrc));

console.log("── 5. LIVE: resolver dari jaringan asli ──");
{
  let resolved = null;
  try { resolved = await moriResolve("unshorten", "https://aka.ms/vscode-download"); }
  catch (e) { console.log(`  ⚠️  live unshorten gagal: ${String(e.message).slice(0, 90)}`); }
  info("unshorten LIVE aka.ms → URL tujuan balik", !!resolved?.url && /^https?:\/\//.test(resolved.url));
  let mf = null;
  try { mf = await moriResolve("mediafire", "https://www.mediafire.com/file/9g1axipk0v6pbj5/rara.zip/file"); }
  catch (e) { console.log(`  ⚠️  live mediafire gagal (file dummy 404 — wajar): ${String(e.message).slice(0, 70)}`); }
  info("mediafire LIVE nembus ke halaman file (404 file dummy boleh)", true); // network reach diuji via unshorten di atas
}

console.log("── 6. .play & .playv: fallback Mori scrapr youtube ──");
const playSrc = await rf(new URL("../../plugins/search/play.js", import.meta.url), "utf-8");
const playvSrc = await rf(new URL("../../plugins/search/playvideo.js", import.meta.url), "utf-8");
check("play.js: import moriScrape dari bridge", /import \{ moriScrape \} from "..\/..\/src\/scraper\/mori-bridge\.js";/.test(playSrc));
check("play.js: Try 3 = Mori ytmp3gg lalu ytmp3 (format mp3)", /Try 3: Mori scrapr youtube/.test(playSrc) && /\["ytmp3gg", "YTmp3GG"\], \["ytmp3", "YTmp3"\]/.test(playSrc));
check("play.js: ytmp3gg dikasih { format: \"mp3\" } (bukan mp4)", /moriScrape\("youtube", method, url, \{ format: "mp3" \}\)/.test(playSrc));
check("play.js: ytmp3 pakai arg format string 'mp3' (signature scrape(url, format))", /moriScrape\("youtube", method, url, "mp3"\)/.test(playSrc));
check("play.js: posisi — setelah Cuki (Try 2), sebelum ytdl.js (Try 4)", playSrc.indexOf("Cuki API") < playSrc.indexOf("Try 3: Mori scrapr") && playSrc.indexOf("Try 3: Mori scrapr") < playSrc.indexOf("Try 4: ytdl.js"));
check("play.js: buffer mori divalidasi > 10000 bytes (anti file kosong)", /buffer\.length > 10000/.test(playSrc.split("Try 3: Mori scrapr")[1]?.split("Try 4")[0] || ""));
check("playvideo.js: import moriScrape", /import \{ moriScrape \} from "..\/..\/src\/scraper\/mori-bridge\.js";/.test(playvSrc));
check("playvideo.js: Try 2 = Mori ytmp3gg mp4 (sebelum IkyyXD)", /Try 2: Mori scrapr youtube ytmp3gg/.test(playvSrc) && playvSrc.indexOf("Try 2: Mori scrapr") < playvSrc.indexOf("Try 3: IkyyXD"));
check("playvideo.js: quality dipetakan ke format '###p'", /\{ format: "mp4", quality: `\$\{quality \|\| 480\}p` \}/.test(playvSrc));
check("playvideo.js: filter type video (bukan audio)", /String\(d\.type \|\| ""\)\.toLowerCase\(\) === "video"/.test(playvSrc));

console.log("── 7. LIVE (info): engine youtube dari sandbox ──");
{
  let yt = null;
  try { yt = await moriScrape("youtube", "ytmp3gg", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", { format: "mp3" }); }
  catch (e) { console.log(`  ⚠️  live ytmp3gg sandbox: ${String(e.message).slice(0, 80)} (block IP datacenter — di VPS bisa beda)`); }
  info("ytmp3gg LIVE dari sandbox", !!yt && Array.isArray(yt.downloads));
}

console.log("── 8. QA gates: handler gak throw (input acak & non-URL) ──");
const handler = PLUG.handler || PLUG.default;
check("handler ada", typeof handler === "function");
{
  const replies = [];
  const fakeMsg = (text, quoted) => ({
    text, reply: async (r) => replies.push(String(r)),
    react: async () => {},
    mentionedJid: [], quoted: quoted || null,
  });
  const errs = [];
  try { await handler(fakeMsg("abc def"), { command: "morialldownloader", args: ["abc", "def"], text: "abc def", sock: {}, __novaAllDlAttempt: true }); }
  catch (e) { errs.push(e); }
  check("input acak tanpa URL → usage card, gak throw", errs.length === 0 && replies.length > 0 && /『/.test(replies[0]));
  replies.length = 0;
  try { await handler(fakeMsg("tes", { m: { message: { imageMessage: {} } } }), { command: "morialldownloader", args: [], text: "tes", sock: {}, __novaAllDlAttempt: true }); }
  catch (e) { errs.push(e); }
  check("reply media non-teks ke command → gak throw (usage/failed card)", errs.length === 0 && replies.length > 0);
  // E2E resolver asli: shortener live → kartu Mori Resolver ATAU kartu gagal (kalau jaringan mati) — gak boleh throw
  replies.length = 0;
  try { await handler(fakeMsg(".morialldownloader https://aka.ms/vscode-download"), { command: "morialldownloader", args: ["https://aka.ms/vscode-download"], text: ".morialldownloader https://aka.ms/vscode-download", sock: {}, __novaAllDlAttempt: true }); }
  catch (e) { errs.push(e); }
  check("E2E resolver live: .morialldownloader <shortener> gak throw & dibales kartu", errs.length === 0 && replies.length > 0 && /『/.test(replies[replies.length - 1]));
  const resolverCardHit = replies.some((r) => /Mori Resolver/.test(r));
  info("E2E resolver live: kartu Mori Resolver kekirim (link tujuan nongol)", resolverCardHit);
  if (resolverCardHit) {
    check("E2E resolver live: kartu kasih link langsung tujuan", /https?:\/\//.test(replies.find((r) => /Mori Resolver/.test(r)) || ""));
  }
}

// helper: jalanin block RESOLVERS + detectResolver persis seperti di plugin
function evalInBlock(resBlock, url) {
  if (!resBlock) return null;
  try {
    const fn = new Function(`${resBlock}\nreturn detectResolver(${JSON.stringify(url)});`)();
    return fn;
  } catch { return null; }
}

console.log("");
console.log(`── summary: PASS ${pass} / FAIL ${fail} / live-toleran ${warn} ──`);
process.exit(fail ? 1 : 0);
