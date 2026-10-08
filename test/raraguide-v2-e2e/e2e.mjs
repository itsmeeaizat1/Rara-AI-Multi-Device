// RARA AI - MULTI DEVICE — E2E: KARTU USAGE DESAIN LAMA (revisi owner 3 Okt 2026).
// Owner: "kembali ke desain lama yg tiap fitur field lengkap, tanpa ala kaomoji".
// Layout: 『 *Nama* 』 + 📝 Cara Pakai + 💡 Contoh + 📍 catatan + baris spec ⚡⏱💸 (fakta nyata
// dari pluginConfig). Guard lebar: prosa <=30 char/baris, contoh VERBATIM. Game tetap desain khas.
import { raraGuide } from "../../src/lib/rara-menu-style.js";
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

// ─── 1. RENDER — desain lama ───
w("\n— raraGuide render (desain lama) —");
{
  const out = raraGuide("play", {
    kaomoji: "ヾ(≧▽≦*)o",
    sapaan: "mau lagu favorit? ketik aja judulnya! (≧◡≦) ♡",
    cara: "ketik judul lagu sesudah command",
    contoh: ".play faded",
    note: "nanti bot yang carin audionya otomatis",
    spec: ["⚡ 300x/hari", "⏱ 3dtk", "💸 gratis"],
  });
  const L = out.split("\n");
  check("1a. header 『 *Play* 』", L[0] === `『 *Play* 』`, L[0]);
  check("1b. opsi kaomoji/sapaan DITERIMA tapi TIDAK ditampilkan", !out.includes("ヾ(") && !out.includes("!!") && !out.includes("୨୧"), L.slice(0, 3));
  check("1b2. baris 2 = 📝 Cara Pakai", L[1] === `📝 ${toSC("Cara Pakai")}:`, L[1]);
  const proseLineMaxLen = Math.max(...L.filter((l) =>
    l && !l.startsWith("「") && !l.startsWith("💡") && !l.includes(".play faded") && !l.includes("⚡") && !l.includes("💸")
  ).map((l) => [...l].length));
  // (emoji 📍 dihitung 1 karakter oleh [...l]; awalan "📍 " = 2 char, sudah dipotong lebar-3 di sumbernya)
  check("1c. SEMUA baris prosa (cara/note) <=30 char — standar allmenu", proseLineMaxLen <= 30, `maxlen=${proseLineMaxLen}`);
  const iCara = L.indexOf(`📝 ${toSC("Cara Pakai")}:`);
  const iContoh = L.indexOf(`💡 ${toSC("Contoh")}:`);
  check("1d. cara ter-rewrap utuh (rejoin = teks asli)", L.slice(iCara + 1, iContoh).filter((l) => l.trim()).join(" ") === toSC("ketik judul lagu sesudah command"), L.slice(iCara + 1, iContoh));
  check("1e. contoh: label + command VERBATIM baris sendiri", L[iContoh + 1] === ".play faded", L[iContoh + 1]);
  const iNote = L.findIndex((l) => l.startsWith("📍"));
  const iSpec = L.findIndex((l) => l.includes("⚡"));
  const noteJoined = L.slice(iNote, iSpec).filter((l) => l.trim()).join(" ").replace(/^📍\s*/, "");
  check("1f. 📍 catatan ter-rewrap utuh, tanpa akhiran ~", noteJoined === toSC("nanti bot yang carin audionya otomatis") && !out.includes("~"), noteJoined);
  check("1h. spec baris akhir join • (angka & emoji utuh, TETAP 1 baris)", L[L.length - 1] === `⚡ 300x/${toSC("hari")} • ⏱ 3${toSC("dtk")} • 💸 ${toSC("gratis")}`, L[L.length - 1]);
  check("1i. urutan blok: Cara Pakai < Contoh < 📍 < spec", iCara < iContoh && iContoh < iNote && iNote < iSpec, [iCara, iContoh, iNote, iSpec]);
}

// ─── 2. VARIAN AI — field model aktif + model tersedia ───
w("\n— varian AI: ✨ model aktif + 📋 model tersedia —");
{
  const out = raraGuide("raraai", {
    sapaan: "ada yang mau ditanyain? tanya aja langsung!",
    cara: "ketik pertanyaannya sesudah command",
    contoh: ".raraai apa itu AI?",
    note: "jawaban otomatis dari model yang aktif",
    modelAktif: "gemini-2.0-flash",
    models: ["gemini-2.0-flash", "gpt-4o", "claude-3.5-sonnet"],
    spec: ["💸 gratis"],
  });
  const L = out.split("\n");
  check("2a. ✨ model aktif + nama model VERBATIM", L.includes(`✨ ${toSC("Model aktif")}: gemini-2.0-flash`), L.slice(6, 12));
  check("2b. 📋 model tersedia join ' · ' VERBATIM", L.includes(`📋 ${toSC("Model tersedia")}: gemini-2.0-flash · gpt-4o · claude-3.5-sonnet`), L.slice(7, 13));
  check("2c. urutan blok: 📍 lalu ✨📋 lalu spec", out.indexOf("📍") < out.indexOf("✨") && out.indexOf("✨") < out.lastIndexOf("💸"), out);
}

// ─── 3. OPSIONAL — bagian kosong gak ninggalin baris liar ───
w("\n— opsional: sapaan/note/spec/model kosong —");
{
  const out = raraGuide("simple", { cara: "ketik aja", contoh: ".simple" });
  const L = out.split("\n");
  check("3a. tanpa note/spec/model → bersih: header + Cara Pakai + Contoh saja", L[0] === `『 *Simple* 』` && L[1] === `📝 ${toSC("Cara Pakai")}:` && L[2] === toSC("ketik aja") && L.includes(`💡 ${toSC("Contoh")}:`) && L[L.length - 1] === ".simple" && !out.includes("📍"), JSON.stringify(L));
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

  const isV2 = (r) => r && r.startsWith("『 *") && r.split("\n")[1] === `📝 ${toSC("Cara Pakai")}:` && !r.includes("୨୧") && !r.includes("!!");
  check("4a. play balas V2 + spec cd 15dtk nyata", isV2(first.play) && first.play.includes("⏱ 15dtk") && first.play.includes("💸 gratis"), first.play?.split("\n")[0]);
  check("4b. playvideo V2 + cd 20dtk", isV2(first.playvideo) && first.playvideo.includes("⏱ 20dtk"), first.playvideo?.split("\n")[0]);
  check("4c. instagramdl V2 + energi 1 cd 10dtk", isV2(first.instagramdl) && first.instagramdl.includes("⚡ energi 1") && first.instagramdl.includes("⏱ 10dtk"), first.instagramdl?.split("\n")[0]);
  check("4d. ytmp3 V2 + energi 2 cd 20dtk", isV2(first.ytmp3) && first.ytmp3.includes("⚡ energi 2"), first.ytmp3?.split("\n")[0]);
  check("4e. aio V2 + energi 1 cd 10dtk", isV2(first.aio) && first.aio.includes("⏱ 10dtk"), first.aio?.split("\n")[0]);
  check("4f. aio2 V2 + energi 2 cd 12dtk + popup note", isV2(first.aio2) && first.aio2.includes("⏱ 12dtk") && /popup/.test(first.aio2), first.aio2?.split("\n")[0]);
  check("4g. shortlink V2 + cd 3dtk + provider di note", isV2(first.shortlink) && first.shortlink.includes("⏱ 3dtk") && first.shortlink.includes("tinyurl"), first.shortlink?.split("\n")[0]);
  check("4h. ocrsolve V2 + cd 3dtk", isV2(first.ocrsolve) && first.ocrsolve.includes("⏱ 3dtk"), first.ocrsolve?.split("\n")[0]);
  check("4i. ssweb V2 + cd 15dtk", isV2(first.ssweb) && first.ssweb.includes("⏱ 15dtk"), first.ssweb?.split("\n")[0]);

  // 3 Okt: konsep kaomoji/sapaan unik per plugin DIBUANG bersama desain kaomoji — diganti cek header unik per plugin
  const headers = Object.values(first).map((r) => (r || "").split("\n")[0]);
  check("4j. header tiap plugin = namanya sendiri (unik)", new Set(headers).size === Object.keys(first).length, headers);
  const semuaRapi = Object.values(first).every((r) => (r || "").split("\n").filter((l) => l && !l.startsWith("「") && !l.startsWith("💡") && !/^\.|⚡|⏱|💸|https?:/.test(l)).every((l) => [...l].length <= 30));
  check("4k. prosa semua kartu plugin <=30 char/baris (guard lebar)", semuaRapi, Object.values(first).map((r) => Math.max(...(r || "").split("\n").filter((l) => !/^\.|⚡|⏱|💸|https?:|^「|^💡/.test(l)).map((l) => [...l].length))));
  check("4l. pluginConfig utuh sembilan-sembilan", ["play", "playvideo", "instagramdl", "ytmp3", "aio", "aio2", "shortlink", "ocrsolve", "ssweb"].every((n) => [playCfg, pvCfg, igCfg, ytCfg, aioCfg, aio2Cfg, slCfg, ocrCfg, ssCfg].some((c) => c && c.name === n)));
}

// ─── 4M. SALAH CMD CUTE — "yah kak kakak ketik cmd yang salah..." (owner 25 Sep) ───
w("\n— raraSalah + handler salah pemakaian → cute —");
{
  const { raraSalah } = await import("../../src/lib/rara-menu-style.js");
  const out = raraSalah("play", {
    kaomoji: "(>_<)",
    pesan: "kakak malah ketik linknya, padahal ini mah mau judul lagunya~",
    contoh: ".play nama lagu",
  });
  const L = out.split("\n");
  check("4m1. salah render: ❗ Cara pemakaian salah — pesan (kaomoji diabaikan)", L[0] === `❗ ${toSC("Cara pemakaian salah")} — ${toSC("kakak malah ketik linknya, padahal ini mah mau judul lagunya~")}` && !out.includes("(>_<)") && !out.includes("yah kak"), L[0]);
  check("4m2. contoh VERBATIM di baris sendiri", L[1] === "Contoh: .play nama lagu", L[1]);
  check("4m3. singkat 2 baris (bukan kartu usage)", L.length === 2 && !out.includes("「"), L.length);

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
  mm = mkM2("playvideo", "https://fb.watch/x"); await pvH(mm, {}); salah.playvideo = mm._replies[0];
  mm = mkM2("instagramdl", "instagramdl https://tiktok.com/x"); await igH(mm, {}); salah.ig = mm._replies[0];
  mm = mkM2("ytmp3", "ytmp3 https://facebook.com/x"); await ytH(mm, {}); salah.yt = mm._replies[0];
  mm = mkM2("aio", "aio bukanlink"); await aioH(mm, {}); salah.aio = mm._replies[0];
  mm = mkM2("aio2", "aio2 bukanlink"); await aio2H(mm, { config: { command: { prefix: "." } } }); salah.aio2 = mm._replies[0];
  mm = mkM2("shortlink", "shortlink provideraneh https://x.com"); await slH(mm, {}); salah.sl = mm._replies[0];
  const isSalah = (r) => r && r.startsWith(`❗ ${toSC("Cara pemakaian salah")}`) && r.split("\n").length <= 3 && !r.includes("yah kak") && !r.includes("(>_<)");
  check("4m4. .play <link fb> → salah cute (contoh owner) + ➤ .play nama lagu", isSalah(salah.play) && salah.play.includes(".play nama lagu"), salah.play?.split("\n")[0]);
  check("4m5. .playvideo <link> → salah desain lama", isSalah(salah.playvideo), salah.playvideo?.split("\n")[0]);
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
  check("5a. raraGuide positional render desain lama (non-game)", old.startsWith(`『 *Tes* 』`) && old.includes(`📝 ${toSC("Cara Pakai")}:`) && !old.includes("୨୧"), old.split("\n")[0]);
  const { raraNoInput: niF, raraSalah: salahF } = await import("../../src/lib/rara-menu-style.js");
  const niOut = niF("tesnoinput", "ketik teksnya", ".tesnoinput halo");
  check("5a2. raraNoInput desain lama: ⚠ + Cara Pakai + Contoh, tanpa kaomoji", niOut.startsWith(`『 *Tesnoinput* 』`) && (niOut.split("\n")[1] || "").startsWith("⚠ ") && niOut.includes(`💡 ${toSC("Contoh")}:`) && !/!!/.test(niOut), niOut.split("\n").slice(0, 3).join(" | "));
  // guard game: register dummy game + dummy biasa di registry beneran
  const { registerPlugin: reg } = await import("../../src/lib/rara-plugins.js");
  reg({ name: "suitdummy", category: "game", cooldown: 7, energi: 2, aliases: [], handler: async () => {}, description: "test" });
  reg({ name: "tesbiasa", category: "tools", config: { name: "tesbiasa", category: "tools", cooldown: 9, energi: 3, description: "Fitur contoh untuk pengujian kartu" }, cooldown: 9, energi: 3, aliases: [], handler: async () => {}, description: "test" });
  const gGame = raraGuide("Suitdummy", "cara game", ".suitdummy a", "note game");
  check("5a3. game category → render 『 *Title* 』 (desain baru 8 Okt)", gGame.startsWith("『 *") && gGame.includes(`📝 ${toSC("Cara Pakai")}:`), gGame.split("\n")[0]);
  const gPlain = raraGuide("Tesbiasa", "cara biasa", ".tesbiasa a");
  check("5a4. info otomatis dari pluginConfig asli (flat spec: kategori/akses/energi 3/cooldown 9)", /kategori\s*: tools/.test(gPlain) && /akses\s+: semua user · gratis/.test(gPlain) && /energi\s+: 3/.test(gPlain) && /cooldown\s+: 9 dtk/.test(gPlain), gPlain.split("\n").slice(-9).join(" | "));
  const gSalah = salahF("Suitdummy", "salah game nih");
  check("5a5. raraSalah game & non-game → sama-sama format lama ❗ (tanpa yah kak)", gSalah.startsWith("❗") && salahF("tesbiasa", "salah biasa").startsWith("❗") && !salahF("tesbiasa", "salah biasa").includes("yah kak"), gSalah.split("\n")[0]);
  const ap = fs.readFileSync("plugins/ai/ai-providers.js", "utf8");
  check("5b. ai-providers pakai raraGuide + modelAktif + models", ap.includes("raraGuide(cmdUsed") && ap.includes("modelAktif:") && ap.includes("models:"), null);
  const migrated = ["plugins/search/play.js", "plugins/search/playvideo.js", "plugins/download/instagramdl.js", "plugins/download/ytmp3.js", "plugins/download/aio.js", "plugins/download/aio2.js", "plugins/tools/shortlink.js", "plugins/ai/ocrsolve.js", "plugins/browser/ssweb.js", "plugins/ai/kuroai.js", "plugins/ai/min1ai.js", "plugins/search/playspotify.js", "plugins/download/douyindl.js", "plugins/download/facebookdl.js", "plugins/download/mediafiredl.js", "plugins/download/tiktokdl.js", "plugins/download/ytmp4.js"];
  check("5c. 17 plugin import raraGuide", migrated.every((f) => fs.readFileSync(f, "utf8").includes("raraGuide")), null);
  const games = ["plugins/game/rockpaperscissors.js", "plugins/game/guessnumber.js"];
  check("5c2. 2 mini-game pakai raraGameBox (desain khas game, bukan V2)", games.every((f) => fs.readFileSync(f, "utf8").includes("raraGameBox") && !fs.readFileSync(f, "utf8").includes("raraGuide")), null);
}

w(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
