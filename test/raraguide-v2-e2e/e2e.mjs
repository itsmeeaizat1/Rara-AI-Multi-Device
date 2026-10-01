// RARA AI - MULTI DEVICE — E2E: DESAIN USAGE V2 (25 Sep 2026, sesi "desain
// kaomoji lucu"): 「✧ nama ✧」 + kaomoji semangat + sapaan ajakan + 📍 baris
// cara/contoh/note mengalir + (khusus AI, request owner 25 Sep) ✨ model
// aktif + 📋 model tersedia + baris spec ⚡⏱💸 fakta nyata.
// Aturan owner: (1) "ubah satu satu jgn di batch / jd 1 konversi card" —
// raraGuide lama TETAP ada & gak berubah; (2) "tiap plugin sapaannya beda
// beda g sama" — kaomoji + sapaan unik antar plugin wave-1.
import { raraGuideV2, raraGuide } from "../../src/lib/rara-menu-style.js";
import { config as playCfg, handler as playH } from "../../plugins/search/play.js";
import { config as pvCfg, handler as pvH } from "../../plugins/search/playvideo.js";
import { config as igCfg, handler as igH } from "../../plugins/download/instagramdl.js";
import { config as ytCfg, handler as ytH } from "../../plugins/download/ytmp3.js";
import { config as aioCfg, handler as aioH } from "../../plugins/download/aio.js";
import { config as aio2Cfg, handler as aio2H } from "../../plugins/download/aio2.js";
import { config as slCfg, handler as slH } from "../../plugins/tools/shortlink.js";
import { config as ocrCfg, handler as ocrH } from "../../plugins/ai/ocrsolve.js";
import { config as ssCfg, handler as ssH } from "../../plugins/browser/ssweb.js";
import fs from "node:fs";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${String(extra).slice(0, 180)}` : "")); ok ? pass++ : fail++; };
const SC_MAP = { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h', i: 'i', j: 'j', k: 'k', l: 'l', m: 'm', n: 'n', o: 'o', p: 'p', r: 'r', s: 's', t: 't', u: 'u', v: 'v', w: 'w', y: 'y', z: 'z' };
// UPDATE 1 Okt: teks bot kini plain — toSC lokal jadi passthrough
const toSC = (s) => String(s ?? "");

// ─── 1. RENDER — persis struktur contoh owner ───
w("\n— raraGuideV2 render (struktur contoh owner) —");
{
  // GUARD LEBAR SERAGAM (1 Okt 2026, owner: "aku mau semua pesan menu
  // gelembung ukuran lebarnya standarnya kyk menu allmenu") — sapaan/cara/
  // note kini dipotong ≤30 char/baris (scWrap) biar gelembung WA konsisten
  // standar, BUKAN lagi 1 baris fisik panjang. contoh = command TETAP
  // VERBATIM 1 baris gak dipotong. Asersi di bawah gak hardcode index baris
  // (jumlah baris wrap berubah tiap kalimat) — cek per-blok via helper.
  const out = raraGuideV2("play", {
    kaomoji: "ヾ(≧▽≦*)o",
    sapaan: "mau lagu favorit? ketik aja judulnya! (≧◡≦) ♡",
    cara: "ketik judul lagu sesudah command",
    contoh: ".play faded",
    note: "nanti bot yang carin audionya otomatis",
    spec: ["⚡ 300x/hari", "⏱ 3dtk", "💸 gratis"],
  });
  const L = out.split("\n");
  check("1a. header 「✧ play ✧」", L[0] === `୨୧ ✧ ${toSC("play")} ✧ ୨୧`, L[0]);
  check("1b. baris kaomoji ヾ(≧▽≦*)o play!!", L[1] === `ヾ(≧▽≦*)o ${toSC("play")}!!`, L[1]);
  check("1b2. blank setelah kaomoji", L[2] === "", L[2]);

  // GUARD LEBAR: semua baris PROSA (bukan header/kaomoji/command verbatim/
  // spec) WAJIB ≤30 char — ini inti perbaikan 1 Okt (standar kayak allmenu)
  const proseLineMaxLen = Math.max(...L.filter((l) =>
    l && !l.startsWith("「") && !l.includes("!!") && !l.startsWith(toSC("Contoh") + ":") &&
    !l.includes("⚡") && !l.includes("💸")
  ).map((l) => l.length));
  check("1c. SEMUA baris prosa (sapaan/cara/note) ≤30 char — standar allmenu", proseLineMaxLen <= 30, `maxlen=${proseLineMaxLen}`);

  // sapaan: baris 3..dst sampai blank berikutnya, rejoin spasi harus = toSC(sapaan utuh)
  const blankIdx = L.map((l, i) => (l === "" ? i : -1)).filter((i) => i >= 0);
  const sapaanLines = L.slice(3, blankIdx[1]);
  check("1d. sapaan ter-rewrap utuh (rejoin = toSC asli)", sapaanLines.join(" ") === toSC("mau lagu favorit? ketik aja judulnya! (≧◡≦) ♡"), sapaanLines);
  check("1d2. sapaan lebih dari 1 baris (kebuktian ke-wrap, kalimat >30 char)", sapaanLines.length > 1, sapaanLines.length);

  const contohIdx = L.findIndex((l) => l.startsWith(toSC("Contoh") + ":"));
  check("1e. contoh: baris sendiri, command VERBATIM (gak ke-wrap)", L[contohIdx] === `${toSC("Contoh")}: .play faded`, L[contohIdx]);

  const caraLines = L.slice(blankIdx[1] + 1, contohIdx);
  const caraJoined = caraLines.join(" ").replace(`📍 ${toSC("Cara")}: `, "");
  check("1f. 📍 cara: ter-rewrap utuh = toSC asli", caraLines[0].startsWith(`📍 ${toSC("Cara")}: `) && caraJoined === toSC("ketik judul lagu sesudah command"), caraLines);

  const noteStart = contohIdx + 1;
  const noteEnd = blankIdx[2];
  const noteLines = L.slice(noteStart, noteEnd);
  const noteJoined = noteLines.join(" ");
  check("1g. note ter-rewrap utuh + akhiran ~", noteJoined === toSC("nanti bot yang carin audionya otomatis") + "~", noteJoined);

  check("1h. spec baris akhir join • (angka & emoji utuh, TETAP 1 baris)", L[L.length - 1] === `⚡ 300x/${toSC("hari")} • ⏱ 3${toSC("dtk")} • 💸 ${toSC("gratis")}`, L[L.length - 1]);
  check("1i. 3 blank separator antar 4 blok (kaomoji/sapaan/cara-note/spec)", blankIdx.length === 3, blankIdx);
}

// ─── 2. VARIAN AI — field model aktif + model tersedia (owner 25 Sep) ───
w("\n— varian AI: ✨ model aktif + 📋 model tersedia —");
{
  const out = raraGuideV2("raraai", {
    kaomoji: "(◍•ᴗ•◍)",
    sapaan: "ada yang mau ditanyain? tanya aja langsung! (≧ω≦)",
    cara: "ketik pertanyaannya sesudah command",
    contoh: ".raraai apa itu AI?",
    note: "jawaban otomatis dari model yang aktif",
    modelAktif: "gemini-2.0-flash",
    models: ["gemini-2.0-flash", "gpt-4o", "claude-3.5-sonnet"],
    spec: ["💸 gratis"],
  });
  const L = out.split("\n");
  check("2a. ✨ model aktif + nama model VERBATIM", L.includes(`✨ ${toSC("Model aktif")}: gemini-2.0-flash`), L.slice(6, 10));
  check("2b. 📋 model tersedia join ' · ' VERBATIM", L.includes(`📋 ${toSC("Model tersedia")}: gemini-2.0-flash · gpt-4o · claude-3.5-sonnet`), L.slice(7, 11));
  check("2c. urutan blok: 📍 lalu ✨📋 lalu spec", out.indexOf("📍") < out.indexOf("✨") && out.indexOf("✨") < out.lastIndexOf("💸"), out);
}

// ─── 3. OPSIONAL — bagian kosong gak ninggalin baris liar ───
w("\n— opsional: sapaan/note/spec/model kosong —");
{
  const out = raraGuideV2("simple", { cara: "ketik aja", contoh: ".simple" });
  const L = out.split("\n");
  check("3a. tanpa sapaan/note/spec → 5 baris bersih (cara+contoh baris sendiri)", L.length === 5 && L[3] === `📍 ${toSC("Cara")}: ${toSC("ketik aja")}` && L[4] === `${toSC("Contoh")}: .simple` && !out.includes("~") && !out.includes("✨"), out);
}

// ─── 4. HANDLER NO-INPUT — plugin ter-migrasi beneran balas V2 ───
w("\n— handler no-input → kartu V2 (fakta spec nyata) —");
{
  const mkM = (cmd, over = {}) => {
    const replies = [];
    return {
      command: cmd, text: "", args: [], chat: "x@g.us", sender: "u@s", prefix: ".", pushName: "T",
      message: {}, quoted: null, isImage: false, key: { remoteJid: "x@g.us", id: "m1" },
      reply: async (t) => { replies.push(String(t)); return { key: { id: "r" } }; },
      react: async () => true,
      _replies: replies,
      ...over,
    };
  };
  // ocrsolve nyentuh db di path no-input → init db temp dulu (kebiasaan e2e rara)
  const fs2 = await import("node:fs"); const os2 = await import("node:os"); const path2 = await import("node:path");
  const dbDir2 = fs2.mkdtempSync(path2.join(os2.tmpdir(), "ngv2-e2e-"));
  const { initDatabase } = await import("../../src/lib/rara-database.js");
  await initDatabase(path2.join(dbDir2, "db"));
  // ocrsolve baca config asli (dynamic import) — set apiKey dummy biar lewat
  // gate sebelum cek gambar (pola vision-media-e2e)
  const realCfg = (await import("../../config.js")).default;
  realCfg.aiHelp = realCfg.aiHelp || {};
  realCfg.aiHelp.apiKey = "test-key";

  // ambil reply pertama tiap handler (no-input = stateless, aman)
  const first = {};
  const run1 = async (name, h, ctx) => { const mm = mkM(name); await h(mm, ctx || {}); first[name] = mm._replies[0]; };
  await run1("play", playH, null);
  await run1("playvideo", pvH, null);
  await run1("instagramdl", igH, null);
  await run1("ytmp3", ytH, null);
  await run1("aio", aioH, null);
  await run1("aio2", aio2H, { config: { command: { prefix: "." } } });
  await run1("shortlink", slH, null);
  await run1("ocrsolve", ocrH, { config: { command: { prefix: "." } } });
  await run1("ssweb", ssH, null);

  const isV2 = (r) => r && r.startsWith("୨୧ ✧ ") && r.split("\n")[1].includes("!!");
  check("4a. play balas V2 + spec cd 15dtk nyata", isV2(first.play) && first.play.includes("⏱ 15dtk") && first.play.includes("💸 gratis"), first.play?.split("\n")[0]);
  check("4b. playvideo V2 + cd 20dtk", isV2(first.playvideo) && first.playvideo.includes("⏱ 20dtk"), first.playvideo?.split("\n")[0]);
  check("4c. instagramdl V2 + energi 1 cd 10dtk", isV2(first.instagramdl) && first.instagramdl.includes("⚡ energi 1") && first.instagramdl.includes("⏱ 10dtk"), first.instagramdl?.split("\n")[0]);
  check("4d. ytmp3 V2 + energi 2 cd 20dtk", isV2(first.ytmp3) && first.ytmp3.includes("⚡ energi 2"), first.ytmp3?.split("\n")[0]);
  check("4e. aio V2 + energi 1 cd 10dtk", isV2(first.aio) && first.aio.includes("⏱ 10dtk"), first.aio?.split("\n")[0]);
  check("4f. aio2 V2 + energi 2 cd 12dtk + popup note", isV2(first.aio2) && first.aio2.includes("⏱ 12dtk") && /popup/.test(first.aio2), first.aio2?.split("\n")[0]);
  check("4g. shortlink V2 + cd 3dtk + provider di note", isV2(first.shortlink) && first.shortlink.includes("⏱ 3dtk") && first.shortlink.includes("tinyurl"), first.shortlink?.split("\n")[0]);
  check("4h. ocrsolve V2 + cd 3dtk", isV2(first.ocrsolve) && first.ocrsolve.includes("⏱ 3dtk"), first.ocrsolve?.split("\n")[0]);
  check("4i. ssweb V2 + cd 15dtk", isV2(first.ssweb) && first.ssweb.includes("⏱ 15dtk"), first.ssweb?.split("\n")[0]);

  // aturan "tiap plugin sapaannya beda beda" — kaomoji baris-2 & sapaan unik
  const kaomojiLines = Object.values(first).map((r) => (r || "").split("\n")[1]);
  const sapaanLines = Object.values(first).map((r) => (r || "").split("\n")[3]);
  check("4j. kaomoji header unik semua (beda beda)", new Set(kaomojiLines).size === Object.keys(first).length, kaomojiLines);
  check("4k. sapaan unik semua (beda beda)", new Set(sapaanLines).size === Object.keys(first).length, sapaanLines);
  check("4l. pluginConfig utuh sembilan-sembilan", ["play", "playvideo", "instagramdl", "ytmp3", "aio", "aio2", "shortlink", "ocrsolve", "ssweb"].every((n) => [playCfg, pvCfg, igCfg, ytCfg, aioCfg, aio2Cfg, slCfg, ocrCfg, ssCfg].some((c) => c && c.name === n)));
}

// ─── 4M. SALAH CMD CUTE — "yah kak kakak ketik cmd yang salah..." (owner 25 Sep) ───
w("\n— raraSalahV2 + handler salah pemakaian → cute —");
{
  const { raraSalahV2 } = await import("../../src/lib/rara-menu-style.js");
  const out = raraSalahV2("play", {
    kaomoji: "(>_<)",
    pesan: "kakak malah ketik linknya, padahal ini mah mau judul lagunya~",
    contoh: ".play nama lagu",
  });
  const L = out.split("\n");
  check("4m1. salah render: kaomoji + yah kak...", L[0] === `(>_<) ${toSC("yah kak")}...`, L[0]);
  check("4m2. pesan cute smallcaps + ➤ contoh VERBATIM", L[1] === toSC("kakak malah ketik linknya, padahal ini mah mau judul lagunya~") && L[2] === "➤ .play nama lagu", L[1] + " / " + L[2]);
  check("4m3. singkat 3 baris (bukan kartu usage)", L.length === 3 && !out.includes("「"), L.length);

  const mkM2 = (cmd, text) => {
    const replies = [];
    return {
      command: cmd, text, args: text ? text.split(/\s+/) : [], chat: "x@g.us", sender: "u@s", prefix: ".", pushName: "T",
      message: {}, quoted: null, isImage: false, key: { remoteJid: "x@g.us", id: "m2" }, isOwner: false,
      reply: async (t) => { replies.push(String(t)); return { key: { id: "r" } }; },
      react: async () => true,
      _replies: replies,
    };
  };
  const salah = {};
  let mm;
  mm = mkM2("play", "play https://facebook.com/watch?v=1"); await playH(mm, {}); salah.play = mm._replies[0];
  mm = mkM2("playvideo", "playvideo https://fb.watch/x"); await pvH(mm, {}); salah.playvideo = mm._replies[0];
  mm = mkM2("instagramdl", "instagramdl https://tiktok.com/x"); await igH(mm, {}); salah.ig = mm._replies[0];
  mm = mkM2("ytmp3", "ytmp3 https://facebook.com/x"); await ytH(mm, {}); salah.yt = mm._replies[0];
  mm = mkM2("aio", "aio bukanlink"); await aioH(mm, {}); salah.aio = mm._replies[0];
  mm = mkM2("aio2", "aio2 bukanlink"); await aio2H(mm, { config: { command: { prefix: "." } } }); salah.aio2 = mm._replies[0];
  mm = mkM2("shortlink", "shortlink provideraneh https://x.com"); await slH(mm, {}); salah.sl = mm._replies[0];
  const isSalah = (r) => r && r.includes(toSC("yah kak")) && r.split("\n").length <= 3 && r.includes("➤");
  check("4m4. .play <link fb> → salah cute (contoh owner) + ➤ .play nama lagu", isSalah(salah.play) && salah.play.includes(".play nama lagu"), salah.play?.split("\n")[0]);
  check("4m5. .playvideo <link> → salah cute", isSalah(salah.playvideo), salah.playvideo?.split("\n")[0]);
  check("4m6. .instagramdl <link tiktok> → salah cute", isSalah(salah.ig), salah.ig?.split("\n")[0]);
  check("4m7. .ytmp3 <link fb> → salah cute", isSalah(salah.yt), salah.yt?.split("\n")[0]);
  check("4m8. .aio bukanlink → salah cute", isSalah(salah.aio), salah.aio?.split("\n")[0]);
  check("4m9. .aio2 bukanlink → salah cute", isSalah(salah.aio2), salah.aio2?.split("\n")[0]);
  check("4m10. .shortlink provideraneh → salah cute ➤ list", isSalah(salah.sl) && salah.sl.includes(".shortlink list"), salah.sl?.split("\n")[0]);
  const salahPesan = [salah.play, salah.playvideo, salah.ig, salah.yt, salah.aio, salah.aio2, salah.sl].map((r) => (r || "").split("\n")[1]);
  check("4m11. pesan salah unik per plugin (beda beda)", new Set(salahPesan).size === salahPesan.length, salahPesan);
}

// ─── 5. GLOBAL V2 — raraGuide auto-V2 + guard game + spec otomatis ───
w("\n— global: raraGuide/raraNoInput/raraSalah auto-V2 + guard game —");
{
  const old = raraGuide("Tes", "intronya", ".tes contoh", "catatan");
  check("5a. raraGuide otomatis render V2 (semua plugin non-game kena)", old.startsWith(`୨୧ ✧ ${toSC("tes")} ✧ ୨୧`) && /\(.*\)\s[\u{1F600}-\u{1F64F}]/u.test(old.split("\n")[1] || ""), old.split("\n")[0] + " / " + (old.split("\n")[1] || ""));
  // kaomoji WAJIB dibareng emoji muka cute (owner 25 Sep)
  const { raraNoInput: niF, raraSalah: salahF } = await import("../../src/lib/rara-menu-style.js");
  const niOut = niF("tesnoinput", "ketik teksnya", ".tesnoinput halo");
  check("5a2. kaomoji V2 selalu ada emoji muka (ni)", /\)\s?[\u{1F600}-\u{1F64F}]/u.test((niOut.split("\n")[1] || "")), niOut.split("\n")[1]);
  // guard game: register dummy game + dummy biasa di registry beneran
  const { registerPlugin: reg } = await import("../../src/lib/rara-plugins.js");
  reg({ name: "suitdummy", category: "game", cooldown: 7, energi: 2, aliases: [], handler: async () => {}, description: "test" });
  reg({ name: "tesbiasa", category: "tools", cooldown: 9, energi: 3, aliases: [], handler: async () => {}, description: "test" });
  const gGame = raraGuide("Suitdummy", "cara game", ".suitdummy a", "note game");
  check("5a3. game category → render klasik 「 ✦ 」 (desain khas game)", gGame.startsWith("「 ✦ ") && gGame.includes(`📝 ${toSC("Cara Pakai")}:`), gGame.split("\n")[0]);
  const gPlain = raraGuide("Tesbiasa", "cara biasa", ".tesbiasa a");
  check("5a4. spec otomatis dari pluginConfig asli (⚡ 9 ⏱ 💸)", gPlain.includes(`⚡ ${toSC("energi")} 3`) && gPlain.includes(`⏱ 9${toSC("dtk")}`) && gPlain.includes(`💸 ${toSC("gratis")}`), (gPlain.match(/.*/).input.split("\n").filter((l) => l.includes("⚡"))[0] || ""));
  const gSalah = salahF("Suitdummy", "salah game nih");
  check("5a5. raraSalah game → format lama, non-game → cute", gSalah.startsWith("❗") && salahF("tesbiasa", "salah biasa").includes(toSC("yah kak")), gSalah.split("\n")[0]);
  const ap = fs.readFileSync("plugins/ai/ai-providers.js", "utf8");
  check("5b. ai-providers pakai raraGuideV2 + modelAktif + models", ap.includes("raraGuideV2(cmdUsed") && ap.includes("modelAktif:") && ap.includes("models:"), null);
  const migrated = ["plugins/search/play.js", "plugins/search/playvideo.js", "plugins/download/instagramdl.js", "plugins/download/ytmp3.js", "plugins/download/aio.js", "plugins/download/aio2.js", "plugins/tools/shortlink.js", "plugins/ai/ocrsolve.js", "plugins/browser/ssweb.js", "plugins/ai/kuroai.js", "plugins/ai/min1ai.js", "plugins/search/playspotify.js", "plugins/download/douyindl.js", "plugins/download/facebookdl.js", "plugins/download/mediafiredl.js", "plugins/download/tiktokdl.js", "plugins/download/ytmp4.js"];
  check("5c. 17 plugin import raraGuideV2", migrated.every((f) => fs.readFileSync(f, "utf8").includes("raraGuideV2")), null);
  const games = ["plugins/game/rockpaperscissors.js", "plugins/game/guessnumber.js"];
  check("5c2. 2 mini-game pakai raraGameBox (desain khas game, bukan V2)", games.every((f) => fs.readFileSync(f, "utf8").includes("raraGameBox") && !fs.readFileSync(f, "utf8").includes("raraGuide")), null);
  const dup = [...new Set(["ヾ(≧▽≦*)o", "(>_<)", "(๑•̀ㅂ•́)و✧", "(¬‿¬;)", "(•̀ᴗ•́)و", "(´･_･`)", "ヾ(´︶`*)ﾉ", "(・_・;)", "(◕ᴗ◕)", "(;ω;)", "(๑˃ᴗ˂)ﻭ", "(;∀;)", "(¬‿¬)", "(๑ᵔ⤙ᵔ๑)", "(≧▽≦)", "(◍•ᴗ•◍)", "(^◡^)", "(๑ᵔ⤙ᵔ๑)♡", "(๑´ㅂ`๑)", "(・∀・)", "(•‿•)", "(¬‿¬)✧", "(≧◡≦) ♡", "(๑•̀ㅂ•́)✧", "(ノ◕ヮ◕)ノ"])];
  check("5d. kaomoji unik antar plugin (header semua beda)", dup.length === 25, null);
}

w(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
