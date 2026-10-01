// RARA AI - MULTI DEVICE — E2E: ONEPUNYA API (31 endpoint, 8 plugin, 34 command)
// Cover: lib dasar (auth error, struktur respon, seam http), resolve command
// via loader, handler happy/sad path tiap plugin, deteksi platform onedl,
// format teks smallcaps-aware (raraWrap output).
// Jalankan dari repo root: node test/onepunya-e2e/e2e.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const R = path.resolve(".");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) pass++;
  else { fail++; console.log(`  ❌ ${name}${extra ? " → " + String(extra).slice(0, 260) : ""}`); }
};
process.on("unhandledRejection", (e) => { console.log("UNHANDLED:", e?.stack || e); process.exit(1); });

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "onepunya-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(dbDir, "db"));

const { setApiKey, getApiKey, hasApiKey, API_KEYS } = await import(R + "/src/lib/rara-api-keys.js");
const lib = await import(R + "/src/lib/rara-onepunya.js");
const { fromSC } = await import(R + "/src/lib/styler.js");

// ─── harness pesan ───
const sent = [];
const mkSock = () => ({
  sendMessage: async (jid, payload, opts) => { sent.push({ jid, payload, opts }); return { key: { id: "m1", remoteJid: jid } }; },
});
const mkM = (over = {}) => ({
  text: "", args: [], command: "onepixiv", prefix: ".", chat: "62812user@s.whatsapp.net",
  sender: "62812user@s.whatsapp.net", isGroup: false, isOwner: false,
  reply: async (x) => { sent.push({ jid: "reply", payload: { text: x } }); },
  ...over,
});
const lastReply = () => { const r = [...sent].reverse().find(s => s.jid === "reply"); return r ? String(r.payload.text || "") : ""; };
const lastMsg = () => { return [...sent].reverse().find(s => s.jid !== "reply"); };
const resetSent = () => sent.length = 0;

// ─── seam: ganti transport http dengan fake ───
const calls = [];
const fakeResults = new Map(); // path → result
const fakeHttp = async (method, pathName, { query, body }) => {
  calls.push({ method, path: pathName, query, body });
  if (pathName === "/api/search/pixiv") {
    return [{ pid: 111, p: 0, uid: 1, title: "Frieren", author: "tea", r18: false, width: 800, height: 1200, tags: ["frieren"], ext: "png", urls: { regular: "https://i.pixiv.re/x.jpg" } }];
  }
  if (pathName === "/api/search/youtube") {
    return [{ title: "Monolog", id: "EZzZU2JNgJ8", url: "https://youtube.com/watch?v=EZzZU2JNgJ8", duration: "3:22", views: 100, author: "Pamungkas", thumbnail: "" }];
  }
  if (pathName === "/api/search/ytmusic_play") {
    return { title: "Monolog - Pamungkas", author: "Pamungkas", duration: "3:22", audioUrl: "https://example.com/song.mp3", quality: "128kbps" };
  }
  if (pathName === "/api/download/youtube") {
    return { title: "Monolog", url: "https://example.com/monolog.mp3", filename: "Monolog.mp3", quality: "128kbps", format: "mp3" };
  }
  if (pathName === "/api/hololive/live") {
    return [{ id: "vid1", title: "PEKO LIVE", viewers: 12345, channel: { name: "Usada Pekora", org: "Hololive" } }];
  }
  if (pathName === "/api/hololive/video") {
    return [{ id: "vid2", title: "Koi Pond", status: "upcoming", channel: { name: "Shinri", org: "Holostars" } }];
  }
  if (pathName === "/api/hentai/search") {
    return { total: 1, data: [{ id: 177013, title: "Sample", pages: 10 }] };
  }
  if (pathName === "/api/ai-chat/generation") {
    return { response: "Jawaban AI test." };
  }
  if (pathName === "/api/ai-chat/multimodal") {
    return { response: "Ini gambar matahari terbenam." };
  }
  if (pathName === "/api/ai-voice/tts-generation") {
    return { url: "https://example.com/tts.mp3", voice: body?.voice, text: body?.text };
  }
  if (pathName === "/api/ai-voice/anime_speech") {
    return { url: "https://example.com/anime.wav", speaker: body?.speaker_id };
  }
  if (pathName === "/api/ai-audio/vits-tts-generate") {
    return { url: "https://example.com/vits.wav" };
  }
  if (pathName === "/api/ai-voice/tts-voice") {
    return [{ shortName: "id-ID-ArdiNeural", gender: "Male", locale: "id-ID" }, { shortName: "en-US-JennyNeural", gender: "Female", locale: "en-US" }];
  }
  if (pathName === "/api/ai-audio/vits-tts-languages") {
    return { total: 53, languages: ["Indonesian", "English"] };
  }
  if (pathName === "/api/ai-audio/vits-tts-models") {
    return { language: "Indonesian", default_model: { choices: [["model-a", "model-a"], ["model-b", "model-b"]] } };
  }
  if (pathName === "/api/ai-voice/anime_get_sid") {
    return [{ speakerId: 2, name: "Aqua", styles: [{ id: 2, type: "talk" }] }, { speakerId: 100, name: "Megumin", styles: [] }];
  }
  if (pathName === "/api/ai-images/generation") {
    return { url: "https://example.com/img.png" };
  }
  if (pathName === "/api/ai-image/upscale") {
    return { url: "https://example.com/up.png", model: body?.model, rescale: body?.rescale };
  }
  if (pathName === "/api/ai-image/removebg") {
    return { url: "https://example.com/nobg.png", message: "Background berhasil dihapus" };
  }
  if (pathName === "/api/download/tiktok") {
    return { title: "TT", video: { url: "https://example.com/tt.mp4" } };
  }
  if (pathName === "/api/download/facebook") {
    return { media: "https://example.com/fb.mp4", filename: "fb.mp4", quality: "720p", format: "mp4" };
  }
  if (pathName === "/api/download/insta") {
    return { url: "https://example.com/ig.mp4" };
  }
  if (pathName === "/api/download/snackvideo") {
    return { video: "https://example.com/snack.mp4" };
  }
  if (pathName === "/api/download/douyin") {
    return { data: [{ url: "https://example.com/dy.mp4" }] };
  }
  if (pathName === "/api/hentai/episode") {
    return [{ title: "Ep1", pages: "10" }];
  }
  if (pathName === "/api/hentai/download") {
    return [{ title: "Ep1", url: "https://example.com/dl.mp4" }];
  }
  if (pathName === "/api/hololive/video_by_id") {
    return { title: "Detail Video", id: "vid2", duration: 100, status: "past", channel: { name: "Shinri", org: "Holostars" } };
  }
  if (pathName === "/api/hololive/channel") {
    return [{ id: "UC1", name: "Pekora Ch", english_name: "Usada Pekora", org: "Hololive", subscriber_count: 2000000, video_count: 500 }];
  }
  if (pathName === "/api/hololive/channel_by_id") {
    return { id: "UC1", name: "Pekora Ch", org: "Hololive", subscriber_count: 2000000, video_count: 500, youtube_url: "https://youtube.com/c/pekora" };
  }
  if (pathName === "/api/hololive/search") {
    return [{ id: "UC1", name: "Pekora Ch", english_name: "Usada Pekora", org: "Hololive", subscriber_count: 2000000 }];
  }
  if (pathName === "/api/search/pixiv18") {
    return [{ pid: 999, title: "R18 Sample", author: "anon", r18: true, width: 100, height: 200, urls: { regular: "https://i.pixiv.re/r18.jpg" } }];
  }
  return {};
};
lib._setOnepunyaHttpForTest(fakeHttp);

const KEY = "onepunya-test-key";
setApiKey("onepunya", KEY);

console.log("— section 1: lib dasar —");
{
  t("1a. key onepunya terdaftar di API_KEYS", !!API_KEYS.onepunya, "entry hilang dari rara-api-keys.js");
  t("1b. setApiKey/getApiKey runtime", getApiKey("onepunya") === KEY, getApiKey("onepunya"));
  t("1c. hasApiKey true", hasApiKey("onepunya") === true);

  resetSent();
  const pix = await lib.pixivSearch(KEY, "frieren");
  t("1d. pixivSearch balikin array + field", Array.isArray(pix) && pix[0].pid === 111 && pix[0].urls?.regular?.includes("pixiv.re"), pix);

  const yt = await lib.youtubeSearch(KEY, "monolog");
  t("1e. youtubeSearch field lengkap", yt[0].id === "EZzZU2JNgJ8" && yt[0].duration === "3:22", yt);

  const song = await lib.ytmusicPlay(KEY, "monolog");
  t("1f. ytmusicPlay audioUrl", song.audioUrl?.endsWith(".mp3"), song);

  // tanpa key → error jelas
  let err = "";
  try { await lib.pixivSearch("", "x"); } catch (e) { err = e.message; }
  t("1g. tanpa key → API_KEY_REQUIRED", /API_KEY_REQUIRED|setkey onepunya/i.test(err), err);

  // status false dari server → throw message
  lib._setOnepunyaHttpForTest(async () => { throw new Error("TIKWM_ERROR"); });
  let err2 = "";
  try { await lib.tiktokDownload(KEY, "https://vt.tiktok.com/x"); } catch (e) { err2 = e.message; }
  t("1h. message error server diteruskan", err2 === "TIKWM_ERROR", err2);
  lib._setOnepunyaHttpForTest(fakeHttp);

  // method + path ke seam
  calls.length = 0;
  await lib.vitsTtsGenerate(KEY, { text: "tes", sid: 7, speed: 2 });
  const c = calls[0];
  t("1i. vitsTtsGenerate body benar", c.method === "POST" && c.path === "/api/ai-audio/vits-tts-generate" && c.body.text === "tes" && c.body.sid === 7 && c.body.speed === 2, c);

  calls.length = 0;
  await lib.holoLive(KEY, { org: "Hololive", limit: 5 });
  t("1j. holoLive GET + query org/limit", calls[0].method === "GET" && calls[0].query.org === "Hololive" && calls[0].query.limit === 5, calls[0]);
}

console.log("— section 2: resolve command via loader —");
{
  // NOTE: loadPlugins di-child process — di sandbox ini ada plugin lama
  // (anime-gen dkk) yang import undici gak kompatibel sama versi Node dan
  // crash-nya SENYAP async; child process ngelindarin suite utama.
  const { execFileSync } = await import("node:child_process");
  const childCode = `
    const path = await import("node:path");
    const { pathToFileURL } = await import("node:url");
    const { initDatabase } = await import(pathToFileURL(process.env.R + "/src/lib/rara-database.js").href);
    await initDatabase("/tmp/onepunya-e2e-loader-db/rara.json");
    const { loadPlugins, getPlugin } = await import(pathToFileURL(process.env.R + "/src/lib/rara-plugins.js").href);
    await loadPlugins(path.join(process.env.R, "plugins"));
    const cmds = ["onepixiv","onepixiv18","oneyts","oneytmusic","oneplay","hololive","holovideos","holovid","holochannels","holochid","holosearch","onedl","onepunyadl","oneimg","oneimage","oneupscale","onenobg","onechat","oneai","onepunyaai","onettts","onettvoices","onevits","onevitslang","onevitsmodel","oneanime","oneanimesid","oneanimetts","hentaisearch","hentaiep","hentaidl","onehentaisearch"];
    let ok = 0; const bad = [];
    for (const c of cmds) { if (getPlugin(c)) ok++; else bad.push(c); }
    const cats = {
      onepixiv: getPlugin("onepixiv")?.config?.category,
      onedl: getPlugin("onedl")?.config?.category,
      onechat: getPlugin("onechat")?.config?.category,
      hentaisearch: getPlugin("hentaisearch")?.config?.category,
    };
    console.log(JSON.stringify({ ok, bad, cats }));
    process.exit(bad.length ? 1 : 0);
  `.replace("const path = await import", "const path = await import");
  let out = "";
  try {
    out = execFileSync(process.execPath, ["-e", childCode], { env: { ...process.env, R }, timeout: 120000 }).toString();
  } catch (e) {
    out = (e.stdout || "").toString();
  }
  let parsed = null;
  try { parsed = JSON.parse(out.split("\n").filter(Boolean).pop() || "null"); } catch {}
  t("2a. semua command ke-resolve", !!parsed && parsed.bad.length === 0, (parsed?.bad || []).join(","));
  t("2b. jumlah ≥ 32", !!parsed && parsed.ok >= 32, parsed?.ok);
  t("2c. onepixiv kategori search", parsed?.cats?.onepixiv === "search", parsed?.cats);
  t("2d. onedl kategori download", parsed?.cats?.onedl === "download", parsed?.cats);
  t("2e. onechat kategori ai", parsed?.cats?.onechat === "ai", parsed?.cats);
  t("2f. onehentai kategori nsfw", parsed?.cats?.hentaisearch === "nsfw", parsed?.cats);
}

console.log("— section 3: handler onepixiv / oneyoutube —");
{
  const plugPix = await import(R + "/plugins/search/onepixiv.js");
  resetSent();
  await plugPix.handler(mkM({ command: "onepixiv", args: ["frieren"] }), { sock: mkSock() });
  const r = lastReply();
  t("3a. .onepixiv list hasil", /frieren/i.test(fromSC(r)), r.slice(0, 120));
  const img = lastMsg();
  t("3b. .onepixiv kirim artwork pertama", img && img.payload?.image?.url?.includes("pixiv.re"), img?.payload);

  resetSent();
  await plugPix.handler(mkM({ command: "onepixiv18", args: ["genshin"] }), { sock: mkSock() });
  t("3c. .onepixiv18 tandai R-18", /r-18/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 120));

  resetSent();
  await plugPix.handler(mkM({ command: "onepixiv", args: [] }), { sock: mkSock() });
  t("3d. .onepixiv tanpa query → pesan masukin kueri", /kata kunci/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 100));

  const plugYt = await import(R + "/plugins/search/oneyoutube.js");
  resetSent();
  await plugYt.handler(mkM({ command: "oneyts", args: ["monolog"] }), { sock: mkSock() });
  t("3e. .oneyts list video", /monolog/i.test(fromSC(lastReply())) && /ezzzu2jngj8/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 120));

  resetSent();
  await plugYt.handler(mkM({ command: "oneytmusic", args: ["monolog", "pamungkas"] }), { sock: mkSock() });
  const m1 = lastMsg();
  t("3f. .oneytmusic kirim audio mp3", m1 && ((m1.payload?.audio && m1.payload?.mimetype === "audio/mpeg") || m1.payload?.document?.url?.includes("song.mp3")), m1?.payload);
}

console.log("— section 4: handler hololive —");
{
  const plug = await import(R + "/plugins/search/hololive.js");
  resetSent();
  await plug.handler(mkM({ command: "hololive", args: [] }), { sock: mkSock() });
  t("4a. .hololive list live", /peko live/i.test(fromSC(lastReply())) && /usada peko/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 150));

  resetSent();
  await plug.handler(mkM({ command: "holovideos", args: [] }), { sock: mkSock() });
  t("4b. .holovideos list video", /koi pond/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 120));

  resetSent();
  await plug.handler(mkM({ command: "holovid", args: ["vid2"] }), { sock: mkSock() });
  t("4c. .holovid detail", /detail video/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 120));

  resetSent();
  await plug.handler(mkM({ command: "holochannels", args: [] }), { sock: mkSock() });
  t("4d. .holochannels list channel", /pekora ch/i.test(fromSC(lastReply())) && /subscriber|2\.000\.000|2,000,000/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 150));

  resetSent();
  await plug.handler(mkM({ command: "holochid", args: ["UC1"] }), { sock: mkSock() });
  t("4e. .holochid detail + subscriber", /subscriber/.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 150));

  resetSent();
  await plug.handler(mkM({ command: "holosearch", args: ["pekora"] }), { sock: mkSock() });
  t("4f. .holosearch default target vtuber", /pekora ch/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 120));

  resetSent();
  await plug.handler(mkM({ command: "holosearch", args: ["video", "koi"] }), { sock: mkSock() });
  t("4g. .holosearch target video diargumen", /video/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 120));

  resetSent();
  await plug.handler(mkM({ command: "holovid", args: [] }), { sock: mkSock() });
  t("4h. .holovid tanpa id → panduan", /video id/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 100));
}

console.log("— section 5: handler onedl (6 platform) —");
{
  const plug = await import(R + "/plugins/download/onedl.js");
  const cases = [
    ["https://youtube.com/watch?v=x", "youtube"],
    ["https://youtu.be/x", "youtube"],
    ["https://www.facebook.com/watch?v=1", "facebook"],
    ["https://fb.watch/x", "facebook"],
    ["https://www.instagram.com/reel/C1/", "instagram"],
    ["https://www.tiktok.com/@a/video/1", "tiktok"],
    ["https://vt.tiktok.com/x", "tiktok"],
    ["https://s.snackvideo.com/p/x", "snackvideo"],
    ["https://www.douyin.com/video/1", "douyin"],
  ];
  for (const [u, expected] of cases) {
    resetSent();
    await plug.handler(mkM({ command: "onedl", args: [u] }), { sock: mkSock() });
    const c = calls[calls.length - 1];
    t(`5x. ${expected}: ${u.slice(0, 40)} → endpoint bener`, c && c.path.includes(expected === "snackvideo" ? "snackvideo" : expected === "youtube" ? "youtube" : expected === "instagram" ? "insta" : expected), c?.path);
  }

  resetSent();
  await plug.handler(mkM({ command: "onedl", args: ["https://example.com/x"] }), { sock: mkSock() });
  t("5y. platform gak dikenal → pesan gak didukung", /gak dikenal/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 100));

  resetSent();
  await plug.handler(mkM({ command: "onedl", args: [] }), { sock: mkSock() });
  t("5z. tanpa url → panduan format", /link yang valid|Contoh/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 100));
}

console.log("— section 6: handler oneimage / onephoto / oneai —");
{
  const plugImg = await import(R + "/plugins/ai/oneimage.js");
  resetSent();
  await plugImg.handler(mkM({ command: "oneimg", args: ["kucing", "oren"] }), { sock: mkSock() });
  const im = lastMsg();
  t("6a. .oneimg kirim gambar", im && im.payload?.image, im?.payload?.image);

  resetSent();
  await plugImg.handler(mkM({ command: "oneimg", args: [] }), { sock: mkSock() });
  t("6b. .oneimg tanpa prompt → panduan", /deskripsi gambar/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 100));

  const plugAi = await import(R + "/plugins/ai/oneai.js");
  resetSent();
  await plugAi.handler(mkM({ command: "onechat", args: ["jelaskan", "kuantum"] }), { sock: mkSock() });
  t("6c. .onechat default model chatgpt + jawaban", /jawaban ai test/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 120));
  const c = calls[calls.length - 1];
  t("6d. .onechat body model CHATGPT", c.body.model === "CHATGPT", c.body);

  resetSent();
  await plugAi.handler(mkM({ command: "onechat", args: ["gemini", "hai"] }), { sock: mkSock() });
  const c2 = calls[calls.length - 1];
  t("6e. .onechat model gemini diteruskan", c2.body.model === "GEMINI", c2.body);

  resetSent();
  await plugAi.handler(mkM({ command: "onechat", args: [] }), { sock: mkSock() });
  t("6f. .onechat tanpa teks → panduan", /pertanyaan/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 100));

  const plugPhoto = await import(R + "/plugins/tools/onephoto.js");
  resetSent();
  await plugPhoto.handler(mkM({ command: "oneupscale", args: [] }), { sock: mkSock() });
  t("6g. .oneupscale tanpa reply foto → panduan", /reply|kutip/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 100));
}

console.log("— section 7: handler onettts —");
{
  const plug = await import(R + "/plugins/tools/onettts.js");
  resetSent();
  await plug.handler(mkM({ command: "onettts", args: ["id-ID-ArdiNeural|selamat", "pagi"] }), { sock: mkSock() });
  const au = lastMsg();
  t("7a. .onettts kirim audio ptt", au && ((au.payload?.audio && au.payload?.ptt === true) || au.payload?.document?.url?.includes("tts.mp3")), au?.payload);

  resetSent();
  await plug.handler(mkM({ command: "onettvoices", args: [] }), { sock: mkSock() });
  t("7b. .onettvoices daftar voice", /ardineural/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 120));

  resetSent();
  await plug.handler(mkM({ command: "onettvoices", args: ["id-"] }), { sock: mkSock() });
  t("7c. .onettvoices filter keyword id-", /ardineural/i.test(fromSC(lastReply())) && !/jennyneural/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 120));

  resetSent();
  await plug.handler(mkM({ command: "onettts", args: [] }), { sock: mkSock() });
  t("7d. .onettts tanpa format → panduan voice|teks", /voice\|teks|Format/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 100));

  resetSent();
  await plug.handler(mkM({ command: "onevits", args: ["halo"] }), { sock: mkSock() });
  t("7e. .onevits kirim wav", lastMsg()?.payload?.audio || lastMsg()?.payload?.document?.url?.includes("vits.wav"), lastMsg()?.payload);

  resetSent();
  await plug.handler(mkM({ command: "onevitslang", args: [] }), { sock: mkSock() });
  t("7f. .onevitslang daftar bahasa", /indonesian/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 120));

  resetSent();
  await plug.handler(mkM({ command: "onevitsmodel", args: ["Indonesian"] }), { sock: mkSock() });
  t("7g. .onevitsmodel model per bahasa", /model-a/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 120));

  resetSent();
  await plug.handler(mkM({ command: "oneanime", args: ["100|ohayou"] }), { sock: mkSock() });
  const c = calls[calls.length - 1];
  t("7h. .oneanime speaker id diteruskan", c.body?.speaker_id === 100 && c.body?.text === "ohayou", c.body);
  t("7i. .oneanime kirim wav", lastMsg()?.payload?.audio || lastMsg()?.payload?.document?.url?.includes("anime.wav"), lastMsg()?.payload);

  resetSent();
  await plug.handler(mkM({ command: "oneanimesid", args: [] }), { sock: mkSock() });
  t("7j. .oneanimesid daftar speaker", /id 100|megumin/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 120));

  resetSent();
  await plug.handler(mkM({ command: "oneanime", args: ["abc|tes"] }), { sock: mkSock() });
  t("7k. .oneanime sid bukan angka → error jelas", /angka/.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 120));
}

console.log("— section 8: handler onehentai —");
{
  const plug = await import(R + "/plugins/nsfw/onehentai.js");
  resetSent();
  await plug.handler(mkM({ command: "hentaisearch", args: ["tes"] }), { sock: mkSock() });
  t("8a. .hentaisearch hasil + total", /nhentai search/i.test(fromSC(lastReply())) && /177013/.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 150));

  resetSent();
  await plug.handler(mkM({ command: "hentaisearch", args: [] }), { sock: mkSock() });
  t("8b. .hentaisearch tanpa query → panduan", /kata kunci/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 100));

  resetSent();
  await plug.handler(mkM({ command: "hentaiep", args: ["https://nhentai.net/g/177013/"] }), { sock: mkSock() });
  t("8c. .hentaiep detail episode", /ep1|halaman|pages/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 120));

  resetSent();
  await plug.handler(mkM({ command: "hentaiep", args: ["bukan-url"] }), { sock: mkSock() });
  t("8d. .hentaiep url gak valid → panduan", /url nhentai/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 100));

  resetSent();
  await plug.handler(mkM({ command: "hentaidl", args: ["https://nhentai.net/g/177013/"] }), { sock: mkSock() });
  t("8e. .hentaidl link download", /example.com\/dl.mp4/.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 150));
}

console.log("— section 9: key belum di-set → pesan panduan .setkey —");
{
  setApiKey("onepunya", ""); // hapus key
  const plugPix = await import(R + "/plugins/search/onepixiv.js");
  resetSent();
  await plugPix.handler(mkM({ command: "onepixiv", args: ["frieren"] }), { sock: mkSock() });
  t("9a. tanpa key → handler balas panduan setkey", /setkey onepunya/i.test(fromSC(lastReply())), fromSC(lastReply()).slice(0, 150));
  setApiKey("onepunya", KEY); // restore
}

lib._resetOnepunyaHttpForTest();
console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
