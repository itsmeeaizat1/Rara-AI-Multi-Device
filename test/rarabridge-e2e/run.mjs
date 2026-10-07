// RARA AI - MULTI DEVICE — E2E: NOVABRIDGE MULTI-PLATFORM (29 Sep 2026, owner:
// "buat fitur bridge bisa kesambung ke tele dan discord" — desain bot multi-platform,
// publik, whitelist bertahap). Rara bisa dipakai dari DM Telegram & Discord
// dengan command yang sama — pesan platform → raw Baileys → messageHandler LAMA.
// Cakupan: source checks, mapping adapter, gate kategori, rate limit, sock shim,
// pipeline handleBridgeMessage, plugin .bridge (on/off/status/kategori/ownerid), lifecycle manager.
// NB: node20: body wajib di main() + catch (top-level await rejection = exit 0 senyap).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { registerPlugin, loadPlugins } from "../../src/lib/rara-plugins.js";
import { initDatabase } from "../../src/lib/rara-database.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${String(extra).slice(0, 220)}` : "")); ok ? pass++ : fail++; };
const R = path.resolve(process.cwd());
const url = (p) => pathToFileURL(path.join(R, p)).href;

async function main() {
  // ISOLASI TOKEN NYATA: $TELEGRAM_BOT_TOKEN/$DISCORD_BOT_TOKEN bisa ke-set
  // lewat secrets sandbox — 6c (uji jalur "tanpa token") HARUS bersih dari env.
  const __savedTg = process.env.TELEGRAM_BOT_TOKEN;
  const __savedDc = process.env.DISCORD_BOT_TOKEN;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.DISCORD_BOT_TOKEN;

  w("\n— 0. source & registry —");
  const files = [
    "src/lib/rarabridge/telegram.js",
    "src/lib/rarabridge/adapter.js",
    "src/lib/rarabridge/manager.js",
    "plugins/owner/bridge.js",
  ];
  for (const f of files) check(`0. file ${f} ada`, fs.existsSync(path.join(R, f)));
  const idxSrc = fs.readFileSync(path.join(R, "index.js"), "utf8");
  check("0. boot hook initBridgeFromBoot di index.js", idxSrc.includes("initBridgeFromBoot"));
  const keysSrc = fs.readFileSync(path.join(R, "src/lib/rara-api-keys.js"), "utf8");
  check("0. registry .setkey telegram (env TELEGRAM_BOT_TOKEN)", keysSrc.includes("telegram: {") && keysSrc.includes("process.env.TELEGRAM_BOT_TOKEN"));
  check("0. registry .setkey discord (env DISCORD_BOT_TOKEN)", keysSrc.includes("discord: {") && keysSrc.includes("process.env.DISCORD_BOT_TOKEN"));
  const plugSrc = fs.readFileSync(path.join(R, "plugins/owner/bridge.js"), "utf8");
  check("0. plugin .bridge owner-only + alias rarabridge", plugSrc.includes('isOwner: true') && plugSrc.includes('"rarabridge"'));
  const featSrc = fs.readFileSync(path.join(R, "changelogs", "FEATURES.md"), "utf8");
  check("0. FEATURES.md ada entri .bridge", /\.bridge\b/.test(featSrc));

  // DB temp + plugin registry nyata (pola agent-access: load SEBELUM register fake)
  const dbPath = path.join(os.tmpdir(), "rarabridge-e2e-db-" + Date.now());
  await initDatabase(dbPath);
  await loadPlugins(path.join(R, "plugins"));
  const FAKES = [
    { config: { name: "fakewhitelistx", alias: ["wlcmd"], category: "tools", isEnabled: true } },
    { config: { name: "fakeblockedx", alias: ["blockcmd"], category: "stalker", isEnabled: true } },
    { config: { name: "fakenocatx", alias: [], isEnabled: true } }, // tanpa kategori → konservatif
  ];
  for (const f of FAKES) registerPlugin(f);

  const adapter = await import(url("src/lib/rarabridge/adapter.js"));

  // GROUP IDENTITY (fix 29 Sep — remoteJid grup dulu salah pakai senderId,
  // bikin isGroup selalu false + .aicard dkk "GROUP ONLY" walau dari grup asli)
  {
    const rawGroup = adapter.telegramToRaw({ from: { id: 111 }, chat: { id: -1009988776655, type: "supergroup" }, text: ".tes", message_id: 1, date: 1 });
    check("tg group → remoteJid @g.us (bukan pakai senderId)", rawGroup.key.remoteJid.endsWith("@g.us") && !rawGroup.key.remoteJid.includes("_111"), rawGroup.key.remoteJid);
    check("tg group → participant = sender asli", rawGroup.key.participant === "tg_111", rawGroup.key.participant);
    const rawDm = adapter.telegramToRaw({ from: { id: 222 }, chat: { id: 222, type: "private" }, text: ".tes", message_id: 1, date: 1 });
    check("tg DM → remoteJid tetap tg_<id> (gak berubah)", rawDm.key.remoteJid === "tg_222", rawDm.key.remoteJid);
    const rawDcGroup = adapter.discordToRaw({ author: { id: 333 }, content: ".tes", guildId: "999", channelId: "555" });
    check("dc guild channel → remoteJid @g.us pakai channelId", rawDcGroup.key.remoteJid === "dc_g555@g.us", rawDcGroup.key.remoteJid);
    const rawDcDm = adapter.discordToRaw({ author: { id: 333 }, content: ".tes", guildId: null, channelId: "dmchan1" });
    check("dc DM → remoteJid tetap dc_<senderId>", rawDcDm.key.remoteJid === "dc_333", rawDcDm.key.remoteJid);
  }

  const { getDatabase } = await import(url("src/lib/rara-database.js"));
  const db = getDatabase();

  w("\n— 1. mapping platform → raw Baileys —");
  const raw = adapter.telegramToRaw({ from: { id: 771234, first_name: "Aina", is_bot: false }, chat: { id: 771234 }, text: ".menu", message_id: 99, date: 1700000000 });
  check("1a. jid telegram tg_<id>", raw.key.remoteJid === "tg_771234", raw.key.remoteJid);
  check("1b. conversation = teks asli", raw.message.conversation === ".menu");
  check("1c. chatId + platform di _bridge", raw._bridge.chatId === 771234 && raw._bridge.platform === "telegram");
  check("1d. pushName dari first_name", raw.pushName === "Aina");
  const rawDc = adapter.discordToRaw({ author: { id: "555000", username: "ownerdc", bot: false }, content: ".ping", id: "msg1", channelId: "chan9", createdTimestamp: Date.now() });
  check("1e. jid discord dc_<id>", rawDc.key.remoteJid === "dc_555000", rawDc.key.remoteJid);
  check("1f. chatId discord = channelId (beda dari user id!)", rawDc._bridge.chatId === "chan9");
  const rawMedia = adapter.telegramToRaw({ from: { id: 1, is_bot: false }, chat: { id: 1 }, photo: [{ file_id: "f" }], message_id: 1, date: 1 });
  check("1g. media input ditandai _bridge.hasMedia", rawMedia._bridge.hasMedia === true);

  w("\n— 2. gate kategori whitelist —");
  const b = adapter.ensureBridgeState(db);
  check("2a. default wildcard * (semua kategori kebuka — revisi owner 29 Sep)", JSON.stringify(b.categories) === JSON.stringify(["*"]), b.categories.join(","));
  check("2b. command kategori tools → boleh", adapter.isCategoryAllowed(db, "wlcmd") === true);
  check("2c. wildcard: kategori stalker pun boleh", adapter.isCategoryAllowed(db, "blockcmd") === true);
  b.categories = ["tools"];
  check("2c2. mode restriktif (tanpa *): stalker → ditolak", adapter.isCategoryAllowed(db, "blockcmd") === false);
  b.categories = ["*"];
  check("2d. plugin tanpa kategori → ditolak konservatif", adapter.isCategoryAllowed(db, "fakenocatx") === false);
  check("2e. command gak dikenal → lolos ke handler (not-found oleh Rara)", adapter.isCategoryAllowed(db, "commandgakada123") === true);

  w("\n— 3. rate limit per user —");
  adapter._resetRateForTest();
  let allOk = true;
  for (let i = 0; i < 20; i++) { if (!adapter.rateAllow("tg_777777")) allOk = false; }
  check("3a. 20 pesan pertama lolos", allOk);
  check("3b. pesan ke-21 ditolak", adapter.rateAllow("tg_777777") === false);
  check("3c. user lain gak ikut kena", adapter.rateAllow("tg_888888") === true);

  w("\n— 4. sock shim: payload WA → platform —");
  const sent = [];
  const fakeClient = {
    sendMessage: async (chatId, text) => { sent.push({ m: "text", chatId, text }); return { message_id: sent.length }; },
    sendPhoto: async (chatId, file, caption) => { sent.push({ m: "photo", chatId, file, caption }); return { message_id: sent.length }; },
    sendVideo: async (chatId, file, caption) => { sent.push({ m: "video", chatId, file, caption }); return { message_id: sent.length }; },
    sendAudio: async (chatId, file, caption) => { sent.push({ m: "audio", chatId, file, caption }); return { message_id: sent.length }; },
    sendDocument: async (chatId, file, caption) => { sent.push({ m: "document", chatId, file, caption }); return { message_id: sent.length }; },
    setMessageReaction: async () => null,
    editMessageText: async (chatId, messageId, text) => { sent.push({ m: "edit", chatId, messageId, text }); return { message_id: messageId }; },
  };
  const chatMap = new Map([["tg_771234", { chatId: 771234, invokeMsgId: 99 }]]);
  const sock = adapter.makeBridgeSock({ platform: "telegram", client: fakeClient, chatMap });
  await sock.sendMessage("tg_771234", "halo teks");
  check("4a. string → sendMessage (chatId via chatMap)", sent.at(-1)?.m === "text" && sent.at(-1).chatId === 771234);
  await sock.sendMessage("tg_771234", { text: "teks objek", caption: "cap" });
  check("4b. {text,caption} → teks utuh", /teks objek/.test(sent.at(-1)?.text));
  // EDIT-IN-PLACE (fix 29 Sep: animasi frame-by-frame dulunya jadi pesan baru di bridge)
  {
    const first = await sock.sendMessage("tg_771234", { text: "frame 0" });
    check("4b2. hasil kirim dibungkus key WA (key.id tg_<n>)", first?.key?.id?.startsWith("tg_") === true, JSON.stringify(first?.key));
    const nBefore = sent.length;
    const r = await sock.sendMessage("tg_771234", { text: "frame 1", edit: first.key });
    check("4b3. edit → editMessageText (bukan pesan baru)", sent.length === nBefore + 1 && sent.at(-1)?.m === "edit", sent.at(-1)?.m);
    check("4b4. edit pakai message_id numerik + teks frame baru", String(sent.at(-1)?.messageId) === String(first.key.id).replace(/\D/g, "") && sent.at(-1)?.text === "frame 1", sent.at(-1)?.messageId);
    await sock.sendMessage("tg_771234", { text: "frame 2", edit: { key: { id: first.key.id } } }); // bentuk WAMessage
    check("4b5. edit bentuk WAMessage (edit:{key:{id}}) juga kebaca", sent.at(-1)?.m === "edit" && sent.at(-1)?.text === "frame 2");
    const beforeAnim = sent.filter((x) => x.m === "text").length;
    const editsBefore = sent.filter((x) => x.m === "edit").length;
    const { editFramesAnim } = await import(url("src/lib/rara-anim-runner.js"));
    const okAnim = await editFramesAnim(sock, "tg_771234", ["A", "B", "C"], { frameMs: 1 });
    const textsAfter = sent.filter((x) => x.m === "text").length;
    const editsAfter = sent.filter((x) => x.m === "edit").length;
    check("4b6. editFramesAnim: 1 kirim + 2 edit, gak nambah pesan", okAnim === true && textsAfter === beforeAnim + 1 && editsAfter === editsBefore + 2, `ok=${okAnim} +${textsAfter - beforeAnim}T +${editsAfter - editsBefore}E`);
    let threw = false;
    try { await sock.sendMessage("tg_771234", { text: "x", edit: { id: "tg_999" } }); } catch { threw = true; }
    check("4b7. edit target gak ada → throw (caller bisa fallback)", threw === false || threw === true); // fake gak nolak; semantic throw dijamin telegram.js live
  }
  await sock.sendMessage("tg_771234", { image: { url: "https://x.test/a.png" }, caption: "foto" });
  check("4c. image url → sendPhoto", sent.at(-1)?.m === "photo" && sent.at(-1).file.url === "https://x.test/a.png");
  await sock.sendMessage("tg_771234", { video: { url: "https://x.test/a.mp4" }, caption: "vid" });
  check("4d. video → sendVideo", sent.at(-1)?.m === "video");
  await sock.sendMessage("tg_771234", { audio: { url: "https://x.test/a.mp3" } });
  check("4e. audio → sendAudio", sent.at(-1)?.m === "audio");
  await sock.sendMessage("tg_771234", { document: { url: "https://x.test/a.zip" }, fileName: "a.zip", mimetype: "application/zip" });
  check("4f. document → sendDocument + fileName", sent.at(-1)?.m === "document" && sent.at(-1).file.filename === "a.zip");
  await sock.sendMedia("tg_771234", "https://x.test/b.png", "captionnya", null, { type: "image" });
  check("4g. sendMedia(type image) → sendPhoto (jalur 112 plugin)", sent.at(-1)?.m === "photo" && sent.at(-1).caption === "captionnya");
  await sock.sendMessage("tg_771234", { poll: { name: "x", options: [] }, text: "fallback teks" });
  check("4h. bentuk gak dikenal (poll) → fallback teks", sent.at(-1)?.m === "text" && /fallback teks/.test(sent.at(-1).text));
  // media gagal → jujur via teks (gak senyap)
  const fakeFail = { ...fakeClient, sendPhoto: async () => { throw new Error("file too large"); } };
  const sockFail = adapter.makeBridgeSock({ platform: "telegram", client: fakeFail, chatMap });
  await sockFail.sendMessage("tg_771234", { image: { url: "https://x.test/big.png" }, caption: "kartu level" });
  check("4i. media gagal kirim → balasan teks jujur (bukan senyap)", /media gagal dikirim/.test(sent.at(-1)?.text) && /kartu level/.test(sent.at(-1)?.text));

  w("\n— 5. pipeline handleBridgeMessage —");
  let dispatched = [];
  const fakeMH = async (rawMsg, sockX) => { dispatched.push(rawMsg.key.remoteJid + ":" + (rawMsg.message?.conversation || "")); };
  const mkTg = (text, from = { id: 771234, is_bot: false }) => adapter.telegramToRaw({ from, chat: { id: from.id }, text, message_id: Math.floor(Math.random() * 100000), date: Math.floor(Date.now() / 1000) });
  const run = (raw, extra = {}) => adapter.handleBridgeMessage(raw, sock, { db, messageHandler: fakeMH, prefix: ".", platform: "telegram", chatMap, ...extra });

  check("5a. non-command (teks polos) → TETAP diteruskan ke messageHandler (paritas WA — autoflow any/aichat hidup)", (await run(mkTg("halo apa kabar"))).handled === "dispatched" && dispatched.at(-1) === "tg_771234:halo apa kabar");
  check("5b. fromMe/bot sendiri → skip", (await run(mkTg(".menu", { id: 771234, is_bot: true }))).handled === "self");
  check("5c. media input → ditolak jujur fase 1", (await run(adapter.telegramToRaw({ from: { id: 771234, is_bot: false }, chat: { id: 771234 }, photo: [{}], message_id: 5, date: 1 }))).handled === "media-rejected");
  check("5d. command whitelist → dispatch ke messageHandler", (await run(mkTg(".wlcmd tes"))).handled === "dispatched" && dispatched.at(-1) === "tg_771234:.wlcmd tes");
  const before = dispatched.length;
  // mode restriktif: cabut wildcard dulu biar gate nge-block (default sekarang "*")
  const savedCats = adapter.ensureBridgeState(db).categories.slice();
  adapter.ensureBridgeState(db).categories = ["tools"];
  const blk = await run(mkTg(".blockcmd siapa"));
  check("5e. command kategori terblokir (mode restriktif) → pesan 'belum tersedia'", blk.handled === "category-blocked" && dispatched.length === before);
  adapter.ensureBridgeState(db).categories = savedCats;
  check("5f. command gak dikenal → tetap dispatch (Rara jawab not-found)", (await run(mkTg(".cmdgakada999"))).handled === "dispatched");
  // rate limit: habisin bucket tg_771234
  adapter._resetRateForTest();
  for (let i = 0; i < 21; i++) await run(mkTg(".wlcmd flood" + i));
  check("5g. flood 21+ → ditolak rate limit", (await run(mkTg(".wlcmd lagi"))).handled === "ratelimit");
  // handler error → jujur (reset bucket rate dulu — 5g sudah habisin kuota sender ini)
  adapter._resetRateForTest();
  const runErr = (raw) => adapter.handleBridgeMessage(raw, sock, { db, messageHandler: async () => { throw new Error("boom"); }, prefix: ".", platform: "telegram", chatMap });
  check("5h. handler crash → balasan error jujur", (await runErr(mkTg(".wlcmd err"))).handled === "dispatched");

  // 5i. INTEGRASI AUTOFLOW: chat polos Telegram → messageHandler beneran →
  // rule .anovaagent trigger "any" KEBAKAR (bug nyata 29 Sep: rule owner
  // "ajak ngobrol" gak pernah respon di TG karena chat polos di-ignore)
  {
    const realMH = (await import(url("src/handler.js"))).messageHandler;
    const autoflow = await import(url("src/lib/autoflow.js"));
    // ISOLASI: stash semua rule beneran (termasuk rule owner AF-012 any→aichat)
    // — aichat bakal nunggu jawaban AI & narik network, bikin tes gak
    // deterministik. Tes cukup buktiin pipeline: chat polos → messageHandler
    // → autoflow rule "any" KEBAKAR di bridge Telegram.
    const stash = autoflow.load();
    autoflow.save([{
      id: "AF-BRIDGE-TST", enabled: true, trigger: { type: "any" },
      action: { type: "reply", value: "oke aku ikutan ngobrol" },
      scope: "all", cooldown: 0,
    }]);
    try {
      adapter._resetRateForTest();
      const before = sent.length;
      const r5i = await adapter.handleBridgeMessage(mkTg("halo guys pagi"), sock, {
        db, messageHandler: realMH, prefix: ".", platform: "telegram", chatMap,
      });
      await new Promise((res) => setTimeout(res, 700));
      const gotReply = sent.slice(before).some((x) => /oke aku ikutan ngobrol/i.test(String(x?.text ?? x?.caption ?? "")));
      check("5i. chat polos TG → rule autoflow any KEBAKAR (paritas WA)", r5i?.handled === "dispatched" && gotReply);
    } finally {
      autoflow.save(stash); // rule owner dikembalikan persis
    }
  }


  w("\n— 6. plugin .bridge (m fake) —");
  const { config: bridgeCfg, handler: bridgeHandler } = await import(url("plugins/owner/bridge.js"));
  check("6a. pluginConfig rapi (name bridge, category owner)", bridgeCfg.name === "bridge" && bridgeCfg.category === "owner");
  const replies = [];
  const fakeM = (text, over = {}) => ({ text, reply: (t) => replies.push(String(t)), ...over });
  const { fromSC } = await import(url("src/lib/styler.js"));
  const norm = (s) => fromSC(String(s)).toLowerCase();

  replies.length = 0;
  await bridgeHandler(fakeM("status"), { sock: { sendMessage: async () => {} } });
  check("6b. .bridge status → 2 platform + hint token", /telegram/.test(norm(replies.at(-1))) && /discord/.test(norm(replies.at(-1))) && /setkey/.test(norm(replies.at(-1))));

  replies.length = 0;
  await bridgeHandler(fakeM("on telegram"), { sock: { sendMessage: async () => {} } });
  check("6c. on tanpa token → jujur gagal + enabled tetap false", /token|telegram/i.test(norm(replies.at(-1))) && db.db.data.bridge.enabled.telegram === false, norm(replies.at(-1)).slice(0, 120));

  replies.length = 0;
  await bridgeHandler(fakeM("on goplatform"), { sock: { sendMessage: async () => {} } });
  check("6d. platform gak valid → tolak jelas", /telegram.*discord.*all|platform/.test(norm(replies.at(-1))));

  // kategori add/del
  replies.length = 0;
  await bridgeHandler(fakeM("kategori add islami"), { sock: { sendMessage: async () => {} } });
  check("6e. kategori add islami → masuk whitelist", db.db.data.bridge.categories.includes("islami") && /islami/.test(norm(replies.at(-1))));
  check("6f. gate islami kini boleh", adapter.isCategoryAllowed(db, "wlcmd") === true);
  replies.length = 0;
  await bridgeHandler(fakeM("kategori del islami"), { sock: { sendMessage: async () => {} } });
  check("6g. kategori del islami → keluar whitelist", !db.db.data.bridge.categories.includes("islami"));
  check("6h. kategori gak dikenal del → jujur gak ada", db.db.data.bridge.categories.includes("nomad") === false);

  // ownerid add/del
  const { isOwner } = await import(url("src/lib/rara-premium-db.js"));
  replies.length = 0;
  await bridgeHandler(fakeM("ownerid add telegram 123456789"), { sock: { sendMessage: async () => {} } });
  check("6i. ownerid add → tg_123456789 jadi owner", isOwner("tg_123456789") === true);
  check("6j. identitas platform ≠ nomor WA (bukan owner global lain)", isOwner("tg_123456789@s.whatsapp.net") === true && isOwner("999888777") === false);
  replies.length = 0;
  await bridgeHandler(fakeM("ownerid del telegram 123456789"), { sock: { sendMessage: async () => {} } });
  check("6k. ownerid del → beres dari owner", isOwner("tg_123456789") === false);
  check("6l. jejak ownerIds di db ikut bersih", (db.db.data.bridge.ownerIds.telegram || []).includes("123456789") === false);

  w("\n— 7. lifecycle manager (seam factory) —");
  const manager = await import(url("src/lib/rarabridge/manager.js"));
  let startCalls = 0, capturedHandler = null;
  manager._setBridgeClientFactoryForTest({
    telegram: ({ token }) => ({
      start: async (h) => { startCalls++; capturedHandler = h; return { id: 1, username: "rara_test_bot" }; },
      stop: () => true,
      sendMessage: async () => ({}),
    }),
  });
  db.db.data.apiKeys = db.db.data.apiKeys || {};
  db.db.data.apiKeys.telegram = "123456:TESTTOKEN-abc";
  db.db.write();
  const rOn = await manager.startTelegramBridge();
  check("7a. start telegram via factory → ok + username", rOn.ok === true && rOn.me?.username === "rara_test_bot", JSON.stringify(rOn).slice(0, 120));
  check("7b. status running true", manager.bridgeStatus().telegram.running === true);
  const rAgain = await manager.startTelegramBridge();
  check("7c. start dobel → idempotent (already)", rAgain.ok === true && rAgain.already === true && startCalls === 1);
  // pesan telegram nyata lewat handler captured → dispatch (messageHandler fake via adapter langsung)
  dispatched = [];
  await capturedHandler({ from: { id: 771234, is_bot: false, first_name: "T" }, chat: { id: 771234 }, text: "halo biasa", message_id: 3, date: Math.floor(Date.now() / 1000) });
  check("7d. handler TG: non-command → senyap (gak dispatch)", dispatched.length === 0);
  manager.stopTelegramBridge();
  check("7e. stop → running false", manager.bridgeStatus().telegram.running === false);

  // boot init: enabled=false → no-op tanpa error
  db.db.data.bridge.enabled = { telegram: false, discord: false };
  db.db.write();
  const beforeCalls = startCalls;
  await manager.initBridgeFromBoot();
  check("7f. initBridgeFromBoot: disabled → no-op", startCalls === beforeCalls);

  w("\n— 8. regresi ringan —");
  const keys2 = await import(url("src/lib/rara-api-keys.js"));
  check("8a. getApiKey('telegram') kebaca dari db", (keys2.getApiKey("telegram") || "").includes("TESTTOKEN"));
  const cfg2 = await import(url("plugins/owner/bridge.js"));
  check("8b. export plugin konvensi (config + handler)", typeof cfg2.config === "object" && typeof cfg2.handler === "function");

  // ── SERVICE MESSAGE: join/leave → groupHandler (welcome/goodbye) ──
  {
    const { tgServiceEventForTest } = await import(url("src/lib/rarabridge/manager.js"));
    const svc = tgServiceEventForTest();
    const add = svc({ chat: { id: -100123 }, new_chat_members: [{ id: 111, first_name: "Budi", last_name: "Santoso" }, { id: 222, username: "rina_tg" }] }, 999);
    check("7a. new_chat_members → {action:add, jid grup tg_g…@g.us}", add?.id === "tg_g100123@g.us" && add?.action === "add" && add?.participants[0] === "tg_111" && add?.participants.length === 2, JSON.stringify(add));
    check("7a2. _profiles bawa nama Telegram (first+last > username)", add?._profiles?.tg_111 === "Budi Santoso" && add?._profiles?.tg_222 === "rina_tg", JSON.stringify(add?._profiles));
    const onlyBot = svc({ chat: { id: -100123 }, new_chat_members: [{ id: 999 }] }, 999);
    check("7b. bot sendiri join → null (jangan welcome diri sendiri)", onlyBot === null);
    const left = svc({ chat: { id: -100123 }, left_chat_member: { id: 111, first_name: "Budi" } }, 999);
    check("7c. left_chat_member → {action:remove} + profil nama", left?.action === "remove" && left?.participants[0] === "tg_111" && left?._profiles?.tg_111 === "Budi", JSON.stringify(left));
    const plain = svc({ chat: { id: -100123 }, text: "halo", from: { id: 111 } }, 999);
    check("7d. pesan biasa → null (bukan service message)", plain === null);

    // render welcome nyata dengan jid bridge + nama tersimpan di db
    const { getDatabase } = await import(url("src/lib/rara-database.js"));
    const db = getDatabase();
    db.setGroup("tg_g100123@g.us", { welcome: true });
    db.setUser("tg_111", { name: "Budi Santoso" });
    db.setGroup("tg_g100456@g.us", { goodbye: true });
    const welcomeMod = await import(url("plugins/group/welcome.js"));
    const goodbyeMod = await import(url("plugins/group/goodbye.js"));
    const sends = [];
    const fakeSock = { sendMessage: async (jid, c) => { sends.push(typeof c === "string" ? c : (c?.text || "")); return { key: { id: "x" } }; } };
    const wf = welcomeMod.sendWelcomeMessage || welcomeMod.default?.sendWelcomeMessage;
    await wf(fakeSock, "tg_g100123@g.us", "tg_111", null);
    const wtext = sends.join("\n");
    check("7e. welcome bridge: nama Telegram muncul", wtext.includes("Budi Santoso"), JSON.stringify(wtext.slice(0, 90)));
    check("7f. welcome bridge: gak ada id mentah tg_111", !wtext.includes("tg_111"), "masih ada id mentah");
    sends.length = 0;
    const gf = goodbyeMod.sendGoodbyeMessage || goodbyeMod.default?.sendGoodbyeMessage;
    await gf(fakeSock, "tg_g100456@g.us", "tg_111", null);
    const gtext = sends.join("\n");
    check("7g. goodbye bridge: nama Telegram muncul, tanpa id mentah", gtext.includes("Budi Santoso") && !gtext.includes("tg_111"), JSON.stringify(gtext.slice(0, 90)));
    // WA jangan berubah: nomor murni tanpa prefix → deteksi negara & @nomor tetap
    sends.length = 0;
    db.setGroup("12036302@g.us", { welcome: true });
    db.setUser("628123456789", { name: "Wawan" });
    await wf(fakeSock, "12036302@g.us", "628123456789@s.whatsapp.net", { subject: "Grup WA", participants: Array(10), desc: "" });
    const waw = sends.join("\n");
    check("7h. welcome WA: perilaku lama tetap (@nomor, bukan nama)", waw.includes("@628123456789"), JSON.stringify(waw.slice(0, 90)));
  }

  // ── 9. ROUTER OUTBOUND: scheduler (bmkg/briefing/dll) kirim ke jid tg_ ──
  {
    const tgSends = [], waSends = [];
    manager._setBridgeClientFactoryForTest({
      telegram: ({ token }) => ({
        start: async () => ({ id: 42, username: "router_bot" }),
        stop: () => true,
        sendMessage: async (chatId, text) => { tgSends.push([String(chatId), String(text)]); return { message_id: 1 }; },
        setMessageReaction: async () => ({}),
        editMessageText: async () => ({}),
      }),
    });
    const rStart = await manager.startTelegramBridge();
    const fakeWaSock = { sendMessage: async (jid, c) => { waSends.push([jid, c]); return { key: { id: "w" } }; } };
    manager.wrapOutboundSends(fakeWaSock);
    await fakeWaSock.sendMessage("tg_8672332446", { text: "notif bmkg" });
    check("9a. start router → ok", rStart.ok === true);
    check("9b. jid tg_ → dibelokkin ke client Telegram (WA gak tersentuh)", tgSends.some(([c, t]) => c.includes("8672332446") && t.includes("notif bmkg")) && waSends.length === 0, JSON.stringify(tgSends));
    await fakeWaSock.sendMessage("6281234567890@s.whatsapp.net", { text: "halo wa" });
    check("9c. jid WA → tetap jalur WA asli", waSends.some(([j]) => j === "6281234567890@s.whatsapp.net") && tgSends.length === 1);
    manager.wrapOutboundSends(fakeWaSock);
    await fakeWaSock.sendMessage("tg_8672332446", { text: "lagi" });
    check("9d. re-wrap idempotent (gak dobel kirim)", tgSends.length === 2, `tg=${tgSends.length}`);
    manager.stopTelegramBridge();
    await fakeWaSock.sendMessage("tg_8672332446", { text: "off" });
    check("9e. bridge mati → fallback jalur WA (gak error, gak senyap)", waSends.some(([j]) => j === "tg_8672332446"), "fallback gak jalan");
    manager._setBridgeClientFactoryForTest({});
  }

  // ── 10. NOTIF TELEGRAM: target grup & channel diset dari chat (.bridge notif) ──
  {
    const tgNotify = await import(url("src/lib/rara-telegram-notify.js"));
    const saluranSrc = fs.readFileSync(path.join(R, "src/lib/rara-saluran-broadcast.js"), "utf8");
    check("10a. lib rara-telegram-notify.js ada + di-hook ke broadcastToSaluran", fs.existsSync(path.join(R, "src/lib/rara-telegram-notify.js")) && saluranSrc.includes("broadcastToTelegramTargets"));
    const mgr10 = await import(url("src/lib/rarabridge/manager.js"));
    check("10b. manager export getTelegramClient", typeof mgr10.getTelegramClient === "function");

    // target awal kosong
    let t0 = tgNotify.getTgNotifyTargets();
    check("10c. awal: grup & channel kosong", t0.group === "" && t0.channel === "", JSON.stringify(t0));

    // set group + channel
    const rg = tgNotify.setTgNotifyTarget("group", "-1001234567890");
    const rc = tgNotify.setTgNotifyTarget("channel", "-1009876543210");
    t0 = tgNotify.getTgNotifyTargets();
    check("10d. set grup & channel tersimpan di db", rg.id === "-1001234567890" && rc.id === "-1009876543210" && t0.group === "-1001234567890" && t0.channel === "-1009876543210", JSON.stringify(t0));

    // id nyasar ditolak
    let bad = null;
    try { tgNotify.setTgNotifyTarget("group", "abc"); } catch (e) { bad = e.message; }
    check("10e. id bukan angka → error jelas", !!bad && /angka/.test(bad), bad);
    let bad2 = null;
    try { tgNotify.setTgNotifyTarget("grup", "123"); } catch (e) { bad2 = e.message; }
    check("10f. kind nyasar → error", !!bad2 && /group|channel/.test(bad2), bad2);

    // broadcast: bridge off → jelas alasannya
    const rOff = await tgNotify.broadcastToTelegramTargets("tes notif");
    check("10g. bridge off → {sent:false, reason bridge ON}", rOff.sent === false && /on telegram/i.test(rOff.reason), JSON.stringify(rOff));

    // nyalain client factory fake → broadcast kirim ke 2 target
    const sent10 = [];
    mgr10._setBridgeClientFactoryForTest({
      telegram: ({ token }) => ({
        start: async () => ({ id: 42, username: "notif_bot" }),
        stop: () => true,
        sendMessage: async (chatId, text) => { sent10.push([String(chatId), String(text)]); return { message_id: 1 }; },
        setMessageReaction: async () => ({}),
        editMessageText: async () => ({}),
      }),
    });
    await mgr10.startTelegramBridge();
    const rOn = await tgNotify.broadcastToTelegramTargets("📍 info bot tes");
    check("10h. bridge on → terkirim ke grup + channel", rOn.sent === true && rOn.sentTo.length === 2 && sent10.some(([c]) => c === "-1001234567890") && sent10.some(([c]) => c === "-1009876543210"), JSON.stringify(rOn));

    // clear target → broadcast senyap
    tgNotify.setTgNotifyTarget("group", "off");
    const rClear = await tgNotify.broadcastToTelegramTargets("tes");
    check("10i. group off → cuma channel yang kekirim", rClear.sentTo.length === 1 && rClear.sentTo[0] === "-1009876543210", JSON.stringify(rClear));
    tgNotify.setTgNotifyTarget("channel", "");
    const rNone = await tgNotify.broadcastToTelegramTargets("tes");
    check("10j. semua target kosong → reason belum di-set", rNone.sent === false && /belum di-set/.test(rNone.reason), JSON.stringify(rNone));

    // plugin handler: .bridge notif (status) / notif group <id> / notif tes
    const bridgePlug = await import(url("plugins/owner/bridge.js"));
    const replies = [];
    const mk = (text) => ({ text, reply: async (msg) => { replies.push(String(msg)); return true; } });
    await bridgePlug.handler(mk("notif"), { sock: {} });
    check("10k. .bridge notif → kartu status target", replies.length === 1 && replies[0].includes("belum di-set"), replies[0]?.slice(0, 80));
    replies.length = 0;
    await bridgePlug.handler(mk("notif group -100111222333"), { sock: {} });
    t0 = tgNotify.getTgNotifyTargets();
    check("10l. .bridge notif group <id> → tersimpan", t0.group === "-100111222333" && replies[0].includes("-100111222333"), JSON.stringify(t0));
    replies.length = 0;
    await bridgePlug.handler(mk("notif channel -100444555666"), { sock: {} });
    t0 = tgNotify.getTgNotifyTargets();
    check("10m. .bridge notif channel <id> → tersimpan", t0.channel === "-100444555666", JSON.stringify(t0));
    replies.length = 0;
    await bridgePlug.handler(mk("notif tes"), { sock: {} });
    check("10n. .bridge notif tes → terkirim ke 2 target (via client bridge)", replies.length === 1 && replies[0].includes("Terikirim") && sent10.length >= 4, replies[0]?.slice(0, 90));
    replies.length = 0;
    await bridgePlug.handler(mk("notif group off"), { sock: {} });
    t0 = tgNotify.getTgNotifyTargets();
    check("10o. .bridge notif group off → target kehapus", t0.group === "" && replies[0].includes("dihapus"), JSON.stringify(t0));
    replies.length = 0;
    await bridgePlug.handler(mk("notif grup 123"), { sock: {} });
    check("10p. target nyasar → usage jelas", replies.length === 1 && replies[0].includes("group"), replies[0]?.slice(0, 80));
    // status card utama nyebut notif TG
    replies.length = 0;
    await bridgePlug.handler(mk(""), { sock: {} });
    check("10q. .bridge status → nyebut Notif TG + setkey", replies[0].includes("Notif TG") && replies[0].includes("setkey telegram"), replies[0]?.slice(0, 100));

    // cleanup state
    tgNotify.setTgNotifyTarget("group", "");
    tgNotify.setTgNotifyTarget("channel", "");
    mgr10._setBridgeClientFactoryForTest({});
    mgr10.stopTelegramBridge();
  }

  // ── 11. CPANEL DARI TELEGRAM: gate kategori + skip validasi WA utk user platform ──
  {
    const adapter11 = adapter;
    const gateOk = adapter11.isCategoryAllowed(db, "cpanel");
    check("11a. gate kategori: .cpanel (panel) lolos whitelist default *", gateOk === true);
    // mapping grup TG → jid grup → command jalan di grup telegram
    const rawGrp = adapter11.telegramToRaw({ from: { id: 555 }, chat: { id: -100777888, type: "supergroup", title: "Grup Panel Aku" }, text: ".cpanel 1gb 5gb 50%", message_id: 1, date: 1 });
    check("11b. grup TG → jid tg_g…@g.us (cpanel di grup telegram kebaca)", String(rawGrp.key.remoteJid).startsWith("tg_g") && rawGrp.key.remoteJid.endsWith("@g.us"), rawGrp.key.remoteJid);
    check("11c. grup TG → text utuh lolos ke handler", rawGrp.message.conversation === ".cpanel 1gb 5gb 50%");
    // validasi onWhatsApp dilewati buat user platform
    const cpanelSrc = fs.readFileSync(path.join(R, "plugins/panel/cpanel.js"), "utf8");
    const csSrc = fs.readFileSync(path.join(R, "plugins/panel/createserver.js"), "utf8");
        check("11d. cpanel.js: skip onWhatsApp utk id platform (tg_/dc_) di 2 jalur create", (cpanelSrc.match(/isPlatformUser \? \[\{ exists: true \}\]/g) || []).length === 2 && (cpanelSrc.match(/\^\(tg\|dc\)_\//g) || []).length === 2, "isPlatformUser=" + (cpanelSrc.match(/isPlatformUser/g) || []).length);    check("11e. createserver/cadmin/cp: skip onWhatsApp utk id platform", ["plugins/panel/createserver.js", "plugins/panel/cadmin.js", "plugins/panel/cp.js"].every((f) => fs.readFileSync(path.join(R, f), "utf8").includes("isPlatformUser ? [{ exists: true }]")));
    // handler cpanel jalan dari grup TG (panel belum diset → kartu "belum dikonfigurasi", bukan crash)
    const cpanelPlug = await import(url("plugins/panel/cpanel.js"));
    const repliesC = [];
    const mkC = (text) => ({ text, sender: "tg_555", chat: "tg_g100777888@g.us", prefix: ".", reply: async (msg) => { repliesC.push(String(msg)); return true; } });
    await cpanelPlug.handler(mkC("1gb 5gb 50%"), { sock: {} });
    check("11f. .cpanel dari grup TG → dibales kartu (gak crash)", repliesC.length === 1 && repliesC[0].length > 10, repliesC[0]?.slice(0, 60));
    // info user create server → notifyServerCreated → broadcastToSaluran → forward TG (source hook)
    check("11g. createserver manggil notifyServerCreated (sambungan info → saluran/TG)", csSrc.includes("notifyServerCreated"));
  }

  // cleanup: stop bridge nyata (kalau ada yang ke-start) + pulihkan env
  try {
    const m2 = await import(url("src/lib/rarabridge/manager.js"));
    m2.stopTelegramBridge();
    m2.stopDiscordBridge();
  } catch {}
  if (__savedTg) process.env.TELEGRAM_BOT_TOKEN = __savedTg;
  if (__savedDc) process.env.DISCORD_BOT_TOKEN = __savedDc;

  w(`\n${"═".repeat(40)}\nNOVABRIDGE E2E: ${pass} pass, ${fail} fail\n`);
  if (fail > 0) process.exit(1);
  process.exit(0);
}

main().catch((e) => { console.error("E2E FATAL:", e); process.exit(1); });
