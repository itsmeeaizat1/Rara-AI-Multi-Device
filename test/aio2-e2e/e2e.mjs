// NOVA AI WHATSAPP BOT — E2E: .AIO2 + .AIO2DL — AIO downloader v2 dengan pemilih kualitas
// Porting fitur .aio script JPM APENBOTZ (non-grup: AI/downloader/tools).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const R = path.resolve(".");
process.on("unhandledRejection", (e) => {
  console.log("UNHANDLED-REJECTION:", e?.stack || e);
  process.exit(1);
});
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) { pass++; }
  else { fail++; console.log(`  ❌ ${name}${extra ? " → " + String(JSON.stringify(extra)).slice(0, 260) : ""}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "aio2-e2e-"));
// asersi reply WAJIB smallcaps-aware (guard auto toSC semua reply)
const fromSC = (s) => String(s || "").toLowerCase();
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(path.join(dbDir, "db"));

const scraper = await import(R + "/src/scraper/nexray-dl.js");
const session = await import(R + "/src/lib/nova-aio2-session.js");
const aio2 = await import(R + "/plugins/download/aio2.js");
const aio2dl = await import(R + "/plugins/download/aio2dl.js");
const cfg = { command: { prefix: "." } };

// ─── mock http (axios shape) ───
let httpCalls = [];
let nextResponses = {};
scraper._setNexrayDlHttpForTest({
  get: async (url, opts) => {
    httpCalls.push({ url, params: opts?.params });
    for (const [prefix, resp] of Object.entries(nextResponses)) {
      if (url.startsWith(prefix)) return resp;
    }
    throw new Error("network mati (mock)");
  },
});
function setResp(prefix, data) { nextResponses[prefix] = { data }; }

// ─── fixture data ala API nexray ───
const YT_FIXTURE = {
  status: true, result: {
    url: "https://youtube.com/watch?v=x", source: "youtube",
    title: "Despacito Official Video", author: "Luis Fonsi", duration: 282,
    medias: [
      { url: "https://cdn/1080p.mp4", quality: "1080p", ext: "mp4", type: "video", height: 1080, width: 1920, bitrate: 4335000, is_audio: true, mimeType: 'video/mp4; codecs="avc1"' },
      { url: "https://cdn/360p-noaudio.mp4", quality: "360p", ext: "mp4", type: "video", height: 360, width: 640, bitrate: 666000, is_audio: false, mimeType: "video/mp4" },
      { url: "https://cdn/720p.mp4", quality: "720p", ext: "mp4", type: "video", height: 720, width: 1280, bitrate: 2317000, is_audio: true, mimeType: "video/mp4" },
      { url: "https://cdn/audio128.m4a", label: "audio 128kbps", ext: "m4a", type: "audio", bitrate: 128000, audioSampleRate: "44100", mimeType: "audio/mp4" },
      { url: "https://cdn/audio320.m4a", label: "audio 320kbps", ext: "m4a", type: "audio", bitrate: 320000, mimeType: "audio/mp4" },
    ],
  },
};
const TT_SLIDES_FIXTURE = {
  status: true, result: {
    url: "https://tiktok.com/x", source: "tiktok", author: "@seseorang",
    title: "foto lucu", duration: 0,
    statistics: { play_count: 12000, digg_count: 300, comment_count: 45 },
    medias: [
      { url: "https://cdn/tt1.jpg", type: "image", extension: "jpg", width: 1080, height: 1920 },
      { url: "https://cdn/tt2.jpg", type: "image", extension: "jpg", width: 1080, height: 1920 },
      { url: "https://cdn/ttaudio.mp3", type: "audio", extension: "mp3" },
    ],
  },
};
const TB_FIXTURE = {
  status: true, result: {
    folder: "/Video Liburan", total_file: 2,
    file: [
      { filename: "liburan1.mp4", quality: "1080p", size_formatted: "120 MB", duration: "03:12", download_url: "https://tb/dl1.mp4" },
      { filename: "liburan2.mp4", quality: "720p", size_formatted: "80 MB", download_url: "https://tb/dl2.mp4" },
    ],
  },
};

// ─── mock sock + m ───
const sent = [];
const mkSock = () => ({
  sendMessage: async (jid, payload, opts) => { sent.push({ jid, payload }); return { key: { id: "X" } }; },
  relayMessage: async (jid, msg) => { sent.push({ jid, payload: { relay: msg } }); return true; },
});
const mkM = (over = {}) => ({
  text: "", chat: "62812abc@s.whatsapp.net", sender: "62812abc@s.whatsapp.net",
  prefix: ".", isGroup: false,
  reply: async (x) => { sent.push({ jid: "reply", payload: { text: x } }); },
  react: async () => true,
  ...over,
});

console.log("— section 1: scraper aioDl/teraboxDl —");
{
  httpCalls = [];
  setResp("https://api.nexray.web.id/downloader/aio", YT_FIXTURE);
  const r = await scraper.aioDl("https://youtube.com/watch?v=x");
  t("1a. aioDl parse medias", r.medias.length === 5 && r.source === "youtube", r);
  t("1b. request GET benar (params url)", httpCalls[0]?.params?.url === "https://youtube.com/watch?v=x", httpCalls[0]);

  setResp("https://api.nexray.web.id/downloader/terabox", TB_FIXTURE);
  const tb = await scraper.teraboxDl("https://terabox.com/s/xxx");
  t("1c. teraboxDl parse files", tb.files.length === 2 && tb.total === 2, tb);

  setResp("https://api.nexray.web.id/downloader/aio", { status: true, result: { medias: [] } });
  let threw = "";
  try { await scraper.aioDl("https://kosong"); } catch (e) { threw = e.message; }
  t("1d. medias kosong → throw jujur", /gak nemu media/i.test(threw), threw);

  setResp("https://api.nexray.web.id/downloader/aio", { status: false, error: "API down" });
  threw = "";
  try { await scraper.aioDl("https://mati"); } catch (e) { threw = e.message; }
  t("1e. status false → throw error API", /API down/i.test(threw), threw);
}

console.log("— section 2: buildPickerSections —");
{
  const { sections, statsText } = aio2.buildPickerSections(YT_FIXTURE.result.medias, { source: "youtube", statistics: null });
  const videoRows = sections.find((s) => s.title === "Video")?.rows || [];
  t("2a. video section ada 3 row", videoRows.length === 3, videoRows.length);
  t("2b. video is_audio duluan lalu resolusi turun", videoRows[0]?.description?.includes("1920x1080") && videoRows[1]?.description?.includes("1280x720"), videoRows.map((r) => r.description));
  t("2c. row no-audio ditandai", videoRows.some((r) => (r.title || "").includes("no audio")), videoRows.map((r) => r.title));
  const audioRows = sections.find((s) => s.title === "Audio")?.rows || [];
  t("2d. audio sort bitrate tertinggi duluan", audioRows[0]?.title === "audio 320kbps", audioRows.map((r) => r.title));
  t("2e. id row format .aio2dl ext|mime|url", videoRows[0]?.id?.startsWith(".aio2dl mp4|video/mp4|https://"), videoRows[0]?.id);

  const slides = aio2.buildPickerSections(TT_SLIDES_FIXTURE.result.medias, { source: "tiktok", statistics: TT_SLIDES_FIXTURE.result.statistics });
  t("2f. slides → section Foto 2 rows", slides.sections.some((s) => /foto/i.test(s.title) && s.rows.length === 2), slides.sections.map((s) => s.title));
  t("2g. stats dibaca", slides.statsText?.play_count === 12000, slides.statsText);
}

console.log("— section 3: handler .aio2 popup —");
{
  sent.length = 0;
  setResp("https://api.nexray.web.id/downloader/aio", YT_FIXTURE);
  const sock = mkSock();
  await aio2.handler(mkM({ text: "https://youtube.com/watch?v=x" }), { sock, db: getDatabase(), config: cfg });
  await wait(50);
  const popup = sent.find((s) => s.payload?.interactiveMessage);
  t("3a. popup interactiveMessage terkirim", !!popup, sent.map((s) => Object.keys(s.payload || {})));
  const btns = popup?.payload?.interactiveMessage?.nativeFlowMessage?.buttons || [];
  const selBtn = btns.find((b) => b.name === "single_select" && JSON.parse(b.buttonParamsJson).sections);
  t("3b. tombol single_select bawa sections", !!selBtn, btns.map((b) => b.name));
  const params = selBtn ? JSON.parse(selBtn.buttonParamsJson) : {};
  const allRows = (params.sections || []).flatMap((s) => s.rows);
  t("3c. semua 5 pilihan masuk popup", allRows.length === 5, allRows.length);
  t("3d. body nyebut judul video", (popup.payload.interactiveMessage.body?.text || "").includes("Despacito"), popup.payload.interactiveMessage.body?.text?.slice(0, 80));
  // sesi URL kecatat buat receiver
  t("3e. URL terdaftar di sesi", session.isChoiceAllowed("62812abc@s.whatsapp.net", "https://cdn/1080p.mp4") === true, "sesi");
}

console.log("— section 4: handler .aio2 terabox + slides + guard —");
{
  // terabox
  sent.length = 0;
  setResp("https://api.nexray.web.id/downloader/terabox", TB_FIXTURE);
  const sock = mkSock();
  await aio2.handler(mkM({ text: "https://terabox.com/s/xxx" }), { sock, db: getDatabase(), config: cfg });
  await wait(50);
  const tbPopup = sent.find((s) => s.payload?.interactiveMessage);
  t("4a. terabox → popup file list", !!tbPopup, sent.length);
  const tbRows = JSON.parse(tbPopup.payload.interactiveMessage.nativeFlowMessage.buttons.find((b) => b.name === "single_select" && JSON.parse(b.buttonParamsJson).sections).buttonParamsJson).sections[0].rows;
  t("4b. 2 file terabox jadi rows", tbRows.length === 2, tbRows.length);
  t("4c. id row terabox bawa download_url", (tbRows[0].id || "").includes("https://tb/dl1.mp4"), tbRows[0]);

  // slides tiktok + stats di body
  sent.length = 0;
  setResp("https://api.nexray.web.id/downloader/aio", TT_SLIDES_FIXTURE);
  await aio2.handler(mkM({ text: "https://tiktok.com/x" }), { sock, db: getDatabase(), config: cfg });
  await wait(50);
  const slidesPopup = sent.find((s) => s.payload?.interactiveMessage);
  t("4d. slides → popup + stats di body", /12\.?000|12.000/i.test(slidesPopup?.payload?.interactiveMessage?.body?.text || ""), slidesPopup?.payload?.interactiveMessage?.body?.text?.slice(0, 120));

  // guard input
  sent.length = 0;
    await aio2.handler(mkM({ text: "" }), { sock, db: getDatabase(), config: cfg });
    t("4e. tanpa link → panduan", /ʟɪɴᴋ/.test(sent[0]?.payload?.text || "") || /cara pakai/i.test(fromSC(sent[0]?.payload?.text)), sent[0]?.payload?.text?.slice(0, 60));
  sent.length = 0;
    await aio2.handler(mkM({ text: "bukanlink" }), { sock, db: getDatabase(), config: cfg });
    t("4f. bukan URL → tolak", /ɢᴀᴋ ᴠᴀʟɪᴅ/.test(sent[0]?.payload?.text || ""), sent[0]?.payload?.text?.slice(0, 60));

  // API mati → pesan gagal + fallback saran
  sent.length = 0;
  nextResponses = {};
    await aio2.handler(mkM({ text: "https://youtube.com/watch?v=mati" }), { sock, db: getDatabase(), config: cfg });
    t("4g. API mati → gagal + saran downloader lain", /ᴄᴏʙᴀ ʟɪɴᴋ ʟᴀɪɴ/.test(sent[0]?.payload?.text || ""), sent[0]?.payload?.text?.slice(0, 90));
}

console.log("— section 5: receiver .aio2dl —");
{
  session._clearAio2SessionForTest();
  const sock = mkSock();
  sent.length = 0;
  // 5a URL gak terdaftar → ditolak
  await aio2dl.handler(mkM({ text: "mp4|video/mp4|https://cdn/hack.mp4" }), { sock, db: getDatabase(), config: cfg });
  t("5a. URL gak terdaftar → ditolak anti-abuse", /ᴋᴇᴅᴀʟᴜᴡᴀʀꜱᴀ/.test(sent[0]?.payload?.text || ""), sent[0]?.payload?.text?.slice(0, 80));
  // 5b URL terdaftar → unduh + document terkirim
  session._clearAio2SessionForTest();
  setResp("https://api.nexray.web.id/downloader/aio", YT_FIXTURE);
  await aio2.handler(mkM({ text: "https://youtube.com/watch?v=x" }), { sock, db: getDatabase(), config: cfg });
  await wait(50);
  sent.length = 0;
  nextResponses = { "https://cdn/": { data: Buffer.from("FAKEVIDEOBYTES").buffer } };
  await aio2dl.handler(mkM({ text: "mp4|video/mp4|https://cdn/1080p.mp4" }), { sock, db: getDatabase(), config: cfg });
  const doc = sent.find((s) => s.payload?.document);
  t("5b. document terkirim beneran", !!doc, sent.map((s) => Object.keys(s.payload || {})));
  t("5c. mimetype + filename bener", doc?.payload?.mimetype === "video/mp4" && /\.mp4$/.test(doc?.payload?.fileName || ""), doc?.payload);
  t("5d. isi file = hasil unduhan", Buffer.from(doc?.payload?.document?.data || doc?.payload?.document || []).toString?.().includes?.("FAKEVIDEOBYTES") || JSON.stringify(doc?.payload?.document || "").includes("FAKEVIDEOBYTES"), true);
  // 5c format rusak
  sent.length = 0;
  await aio2dl.handler(mkM({ text: "formatrusak" }), { sock, db: getDatabase(), config: cfg });
  t("5e. format rusak → ditolak jelas", /ɢᴀᴋ ᴠᴀʟɪᴅ/.test(sent[0]?.payload?.text || ""), sent[0]?.payload?.text?.slice(0, 60));
}

console.log("— section 6: single media → langsung kirim tanpa popup —");
{
  const SINGLE = {
    status: true, result: {
      source: "tiktok", title: "satu video", author: "@x", duration: 15,
      medias: [{ url: "https://cdn/one.mp4", quality: "hd_no_watermark", extension: "mp4", type: "video" }],
    },
  };
  setResp("https://api.nexray.web.id/downloader/aio", SINGLE);
  session._clearAio2SessionForTest();
  sent.length = 0;
  const sock = mkSock();
  await aio2.handler(mkM({ text: "https://tiktok.com/one" }), { sock, db: getDatabase(), config: cfg });
  await wait(50);
  const doc = sent.find((s) => s.payload?.document);
  t("6a. 1 media → langsung document (tanpa popup)", !!doc && !sent.some((s) => s.payload?.interactiveMessage), sent.map((s) => Object.keys(s.payload || {})));
  t("6b. filename dari judul (slug)", /satu-video/i.test(doc?.payload?.fileName || ""), doc?.payload?.fileName);
}

console.log("— section 7: metadata & sesi TTL —");
{
  t("7a. .aio2 visible di menu (gak hidden)", aio2.config.isHidden !== true);
  t("7b. .aio2dl hidden dari menu", aio2dl.config.isHidden === true, aio2dl.config.isHidden);
  t("7c. alias aiov2/dl2 kebaca", (aio2.config.alias || []).includes("aiov2") && (aio2.config.alias || []).includes("dl2"));
  t("7d. sesi chat lain gak boleh pakai URL chat ini", session.isChoiceAllowed("lain@s.whatsapp.net", "https://cdn/one.mp4") === false, "cross-chat");
  // register lama ke-swep
  session._clearAio2SessionForTest();
  const realDateNow = Date.now;
  Date.now = () => 1; // register di masa lampau
  session.registerChoice("old@s.whatsapp.net", ["https://lama/x.mp4"]);
  Date.now = realDateNow;
  t("7e. sesi kedaluwarsa di-swep (TTL 20 mnt)", session.isChoiceAllowed("old@s.whatsapp.net", "https://lama/x.mp4") === false, "TTL");
}

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
fs.rmSync(dbDir, { recursive: true, force: true });
process.exit(fail > 0 ? 1 : 0);
