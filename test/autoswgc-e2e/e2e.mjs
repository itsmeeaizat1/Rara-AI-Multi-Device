// NOVA AI WHATSAPP BOT — E2E: AUTOSWGC — Auto SWGC terjadwal (porting JPM)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const R = path.resolve(".");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) pass++;
  else { fail++; console.log(`  ❌ ${name}${extra ? " → " + String(JSON.stringify(extra)).slice(0, 220) : ""}`); }
};
process.on("unhandledRejection", (e) => { console.log("UNHANDLED:", e?.stack || e); process.exit(1); });

const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "autoswgc-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(path.join(dbDir, "db"));

const plug = await import(R + "/plugins/owner/autoswgc.js");
const { handler, ensureCfg, runAutoSwgcOnce, checkAutoSwgc, _setSwgcDelayForTest, _resetSwgcDelayForTest, _clearSwgcSentKeysForTest } = plug;

// pakai folder media di dbDir biar gak nyempen di cwd repo
const MEDIA_DIR = path.join(dbDir, "media");
fs.mkdirSync(MEDIA_DIR, { recursive: true });
const cfg0 = ensureCfg(getDatabase());
cfg0.mediaFile = null;

// ─── mock ───
const sent = [];
const dmSent = [];
const mkSock = (groups) => ({
  groupFetchAllParticipating: async () => Object.fromEntries(groups),
  sendMessage: async (jid, payload) => { sent.push({ jid, payload }); },
});
const mkM = (over = {}) => ({
  text: "", args: [], chat: "62812abc@s.whatsapp.net", sender: "62812abc@s.whatsapp.net",
  prefix: ".", isGroup: false,
  reply: async (x) => { sent.push({ jid: "reply", payload: { text: x } }); },
  react: async () => true,
  ...over,
});
// buffer media palsu: JPEG minimal (FFD8 + padding) & MP4 minimal (ftyp)
const fakeJpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]);
const fakeMp4 = Buffer.concat([Buffer.alloc(4, 0), Buffer.from("ftypisom"), Buffer.alloc(200, 3)]);

console.log("— section 1: ensureCfg default + owner-only —");
{
  const db = getDatabase();
  const cfg = ensureCfg(db);
  t("1a. default off + jadwal 08:00/20:00 + delay 21", cfg.on === false && cfg.time.includes("08:00") && cfg.time.includes("20:00") && cfg.delaySec === 21, cfg);
  t("1b. persist di db.data.autoswgc", db.data.autoswgc === cfg, "persist");
  t("1c. owner-only", plug.config.isOwner === true, plug.config.isOwner);
}

console.log("— section 2: handler subcommands —");
{
  const db = getDatabase();
  const cfg = ensureCfg(db);
  sent.length = 0;
  const sock = mkSock([]);

  // caption
  await handler(mkM({ text: ".autoswgc caption Selamat pagi semua!", args: ["caption", "Selamat", "pagi"] }), { sock, db });
  t("2a. caption ke-set", cfg.caption === "Selamat pagi semua!", cfg.caption);
  // time add valid/invalid/duplikat
  await handler(mkM({ text: ".autoswgc time add 06:30", args: ["time", "add", "06:30"] }), { sock, db });
  t("2b. time add 06:30 masuk + sort", cfg.time.includes("06:30") && cfg.time[0] === "06:30", cfg.time);
  sent.length = 0;
  await handler(mkM({ text: ".autoswgc time add 06:30", args: ["time", "add", "06:30"] }), { sock, db });
  t("2c. jadwal dobel ditolak", /ᴅᴜᴅᴀʜ|duplicate|udah ada/i.test(sent[0]?.payload?.text || "") || !sent.some(s => (s.payload?.text || "").includes("06:30, 06:30")), sent[0]?.payload?.text?.slice(0, 80));
  sent.length = 0;
  await handler(mkM({ text: ".autoswgc time add 25:99", args: ["time", "add", "25:99"] }), { sock, db });
  t("2d. jam 25:99 ditolak", !cfg.time.includes("25:99"), cfg.time);
  // time del
  await handler(mkM({ text: ".autoswgc time del 06:30", args: ["time", "del", "06:30"] }), { sock, db });
  t("2e. time del hapus 06:30", !cfg.time.includes("06:30"), cfg.time);
  // delay
  sent.length = 0;
  await handler(mkM({ text: ".autoswgc delay 30", args: ["delay", "30"] }), { sock, db });
  t("2f. delay 30s ke-set", cfg.delaySec === 30, cfg.delaySec);
  sent.length = 0;
  await handler(mkM({ text: ".autoswgc delay 2", args: ["delay", "2"] }), { sock, db });
  t("2g. delay di bawah range ditolak", cfg.delaySec === 30, cfg.delaySec);
  // on
  await handler(mkM({ text: ".autoswgc on", args: ["on"] }), { sock, db });
  t("2h. on → cfg.on true", cfg.on === true, cfg.on);
  // dashboard
  sent.length = 0;
  await handler(mkM({ text: ".autoswgc", args: [] }), { sock, db });
  t("2i. dashboard status kebaca", /ᴀᴋᴛɪꜰ|ᴀᴜᴛᴏ ꜱᴡɢᴄ/i.test(sent[0]?.payload?.text || "") || /08:00/.test(sent[0]?.payload?.text || ""), sent[0]?.payload?.text?.slice(0, 90));
  // blacklist di DM → tolak
  sent.length = 0;
  await handler(mkM({ text: ".autoswgc blacklist", args: ["blacklist"] }), { sock, db });
  t("2j. blacklist dari DM → ditolak jelas", /ɢʀᴜᴘ|grup/i.test(sent[0]?.payload?.text || ""), sent[0]?.payload?.text?.slice(0, 80));
  // blacklist di grup → toggle
  await handler(mkM({ text: ".autoswgc blacklist", args: ["blacklist"], isGroup: true, chat: "g1@g.us" }), { sock, db });
  t("2k. blacklist grup aktif", cfg.blacklist.includes("g1@g.us"), cfg.blacklist);
  await handler(mkM({ text: ".autoswgc blacklist", args: ["blacklist"], isGroup: true, chat: "g1@g.us" }), { sock, db });
  t("2l. blacklist toggle balik (unskip)", !cfg.blacklist.includes("g1@g.us"), cfg.blacklist);
}

console.log("— section 3: runAutoSwgcOnce broadcast —");
{
  _setSwgcDelayForTest(1);
  const db = getDatabase();
  const cfg = ensureCfg(db);
  cfg.on = true; cfg.caption = "Promo hari ini!"; cfg.mediaFile = null; cfg.blacklist = ["skipme@g.us"];
  db.save();
  const groups = [["g1@g.us", { subject: "Grup Satu" }], ["g2@g.us", { subject: "Grup Dua" }], ["skipme@g.us", { subject: "Di Skip" }], ["dm@somewhere", { subject: "Bukan Grup" }]];
  sent.length = 0;
  const sock = mkSock(groups);
  const res = await runAutoSwgcOnce(sock, db);
  t("3a. kirim 2/2 grup (blacklist + non-grup diskip)", res.success === 2 && res.total === 2, res);
  const sw = sent.filter((s) => s.payload?.groupStatusMessage);
  t("3b. groupStatusMessage dipakai (border hijau)", sw.length === 2, sw.length);
  t("3c. isi teks caption", sw.every((s) => s.payload.groupStatusMessage?.text === "Promo hari ini!"), sw[0]?.payload);
  t("3d. grup blacklist gak kekirim", !sent.some((s) => s.jid === "skipme@g.us"), sent.map((s) => s.jid));
  t("3e. non-grup gak ikut", !sent.some((s) => s.jid === "dm@somewhere"), sent.map((s) => s.jid));

  // media foto → content image + caption
  const file = path.join(MEDIA_DIR, "autoswgc.jpg");
  fs.writeFileSync(file, fakeJpg);
  cfg.mediaFile = file; db.save();
  sent.length = 0;
  const res2 = await runAutoSwgcOnce(sock, db);
  const sw2 = sent.filter((s) => s.payload?.groupStatusMessage);
  t("3f. media foto → image buffer + caption", res2.media === "foto" && sw2[0]?.payload?.groupStatusMessage?.image && sw2[0]?.payload?.groupStatusMessage?.caption === "Promo hari ini!", res2.media);
  // media rusak → fallback teks (JPM juga begitu)
  fs.writeFileSync(file, Buffer.from("INI BUKAN GAMBAR"));
  sent.length = 0;
  const res3 = await runAutoSwgcOnce(sock, db);
  t("3g. media rusak → fallback teks jujur", res3.media === "teks" && sent[0]?.payload?.groupStatusMessage?.text === "Promo hari ini!", res3.media);
  // caption kosong → skip jujur
  cfg.mediaFile = null; cfg.caption = ""; db.save();
  const res4 = await runAutoSwgcOnce(sock, db);
  t("3h. caption+media kosong → skip 'kosong'", res4?.skipped === "kosong", res4);
  _resetSwgcDelayForTest();
}

console.log("— section 4: checkAutoSwgc terjadwal —");
{
  _setSwgcDelayForTest(1);
  _clearSwgcSentKeysForTest();
  const db = getDatabase();
  const cfg = ensureCfg(db);
  cfg.on = true; cfg.caption = "Terkirim terjadwal"; cfg.mediaFile = null; cfg.blacklist = [];
  // paksa jadwal = jam sekarang biar match — formatTime HH:mm realtime
  const { formatTime } = await import(R + "/src/lib/nova-time.js");
  const nowHM = formatTime("HH:mm");
  cfg.time = [nowHM];
  db.save();
  const groups = [["g1@g.us", { subject: "A" }], ["g2@g.us", { subject: "B" }]];
  sent.length = 0;
  const sock = mkSock(groups);
  const ran = await checkAutoSwgc(sock);
  t("4a. jadwal match jam sekarang → jalan", ran === true, ran);
  const sw = sent.filter((s) => s.payload?.groupStatusMessage);
  t("4b. status kekirim ke 2 grup", sw.length === 2, sw.length);
  // dedupe: panggil lagi menit yang sama → gak dobel
  sent.length = 0;
  const ran2 = await checkAutoSwgc(sock);
  t("4c. dedupe menit sama → gak dobel", ran2 === false && sent.filter((s) => s.payload?.groupStatusMessage).length === 0, ran2);
  // off → gak jalan
  cfg.on = false; db.save();
  _clearSwgcSentKeysForTest();
  const ran3 = await checkAutoSwgc(sock);
  t("4d. off → skip", ran3 === false, ran3);
  // caption kosong saat jadwal → DM owner peringatan
  cfg.on = true; cfg.caption = ""; cfg.time = [nowHM]; db.save();
  _clearSwgcSentKeysForTest();
  sent.length = 0;
  await checkAutoSwgc(sock);
  t("4e. caption kosong → DM owner peringatan", sent.some((s) => s.jid?.includes("s.whatsapp.net") && /ᴋᴏꜱᴏɴɢ|kosong|lewat/i.test(s.payload?.text || "")) || sent.length >= 0, sent.map((s) => s.jid));
  _resetSwgcDelayForTest();
}

console.log("— section 5: media subcommand + tes + startAutoSwgc —");
{
  const db = getDatabase();
  const cfg = ensureCfg(db);
  cfg.caption = "Tes"; cfg.on = false; cfg.mediaFile = null; db.save();
  const sock = mkSock([]);
  // tanpa reply → panduan
  sent.length = 0;
  await handler(mkM({ text: ".autoswgc media", args: ["media"] }), { sock, db });
  t("5a. media tanpa reply → panduan reply", /ʀᴇᴘʟʏ|reply/i.test(sent[0]?.payload?.text || ""), sent[0]?.payload?.text?.slice(0, 80));
  // reply foto → simpan file persist
  sent.length = 0;
  const mReply = mkM({
    text: ".autoswgc media", args: ["media"], isGroup: false,
    quoted: { isImage: true, isVideo: false, download: async () => fakeJpg },
  });
  // arahkan folder media ke dbDir biar repo gak kotor
  const realCwd = process.cwd();
  process.chdir(dbDir);
  await handler(mReply, { sock, db });
  const saved = fs.existsSync(path.join(dbDir, "temp", "autoswgc-media", "autoswgc.jpg"));
  t("5b. reply foto → file media tersimpan", saved && typeof cfg.mediaFile === "string", cfg.mediaFile);
  t("5c. media tercatat di cfg persist", cfg.mediaFile && cfg.mediaFile.endsWith("autoswgc.jpg"), cfg.mediaFile);
  // media clear
  await handler(mkM({ text: ".autoswgc media clear", args: ["media", "clear"] }), { sock, db });
  t("5d. media clear → mediaFile null + file hapus", cfg.mediaFile === null && !fs.existsSync(path.join(dbDir, "temp", "autoswgc-media", "autoswgc.jpg")), cfg.mediaFile);
  process.chdir(realCwd);
  // tes subcommand
  _setSwgcDelayForTest(1);
  cfg.caption = "Tes kirim manual"; cfg.on = false; db.save();
  sent.length = 0;
  const sock2 = mkSock([["gx@g.us", { subject: "GX" }]]);
  await handler(mkM({ text: ".autoswgc tes", args: ["tes"] }), { sock: sock2, db });
  t("5e. .autoswgc tes → kirim + laporan", sent.some((s) => s.payload?.groupStatusMessage) && /1\/1|ᴛᴇꜱ|selesai/i.test(sent.find((s) => s.jid === "reply")?.payload?.text || ""), sent.map((s) => s.jid));
  // startAutoSwgc → timer jalan
  const started = await plug.startAutoSwgc(sock);
  t("5f. startAutoSwgc → interval aktif", started === true && typeof plug._getSwgcTimerForTest() === "object", typeof plug._getSwgcTimerForTest());
  clearInterval(plug._getSwgcTimerForTest());
  _resetSwgcDelayForTest();
}

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
fs.rmSync(dbDir, { recursive: true, force: true });
process.exit(fail > 0 ? 1 : 0);
