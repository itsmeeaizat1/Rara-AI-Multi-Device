// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rarabridge/manager — lifecycle bridge Telegram & Discord.
// Satu otak: pesan platform → adapter → messageHandler LAMA (serialize/middleware/plugin).
// Token via .setkey telegram / .setkey discord (db apiKeys + env TELEGRAM_BOT_TOKEN/DISCORD_BOT_TOKEN).
// Boot: initBridgeFromBoot() dari index.js — idempotent, gagal-senyap-proof (bot WA tetap jalan).

import { createTelegramClient } from "./telegram.js";
import {
  makeBridgeSock,
  telegramToRaw,
  discordToRaw,
  handleBridgeMessage,
  ensureBridgeState,
} from "./adapter.js";

const state = {
  telegram: { client: null, running: false, chatMap: new Map(), lastError: null },
  discord: { client: null, running: false, chatMap: new Map(), lastError: null },
};

// Seam e2e: inject pembuatan client (biar gak butuh network/discord.js)
let _clientFactory = {};
export function _setBridgeClientFactoryForTest(f) {
  _clientFactory = f || {};
}

function getCtx(platform) {
  // lazy import biar boot gak nyangkut kalau handler.js error saat di-import di env aneh
  return (async () => {
    const { messageHandler, groupHandler } = await import("../../handler.js");
    const { getDatabase } = await import("../rara-database.js");
    const { getApiKey } = await import("../rara-api-keys.js");
    const configMod = await import("../../../config.js");
    return { messageHandler, groupHandler, db: getDatabase(), config: configMod.default, getApiKey };
  })();
}

function log(platform, msg) {
  try {
    console.log(`[rarabridge/${platform}] ${msg}`);
  } catch {}
}

// Telegram service message → event ala Baileys group-participants.update
// return null kalau bukan service message join/leave.
function tgServiceEvent(tgMsg, botTgId) {
  if (!tgMsg?.chat?.id) return null;
  const chatId = String(tgMsg.chat.id);
  // jid grup bridge = tg_g<chatId>@g.us — chatId TANPA minus (sama kayak adapter
  // telegramToRaw: replace(/^-/,"")) biar setting .welcome on yang disimpan
  // di grup kebaca (bug 29 Sep: minus nyelip → jid beda → welcome senyap)
  const groupJid = `tg_g${chatId.replace(/^-/, "")}@g.us`;
  const toJid = (u) => "tg_" + String(u?.id ?? "");
  // Nama tampilan Telegram: first + last > username > id (dipakai welcome/goodbye)
  const toName = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim() || u?.username || String(u?.id ?? "");
  if (Array.isArray(tgMsg.new_chat_members) && tgMsg.new_chat_members.length) {
    // bot sendiri join → bukan "member baru" (di WA juga digembok welcome utk diri sendiri)
    const members = tgMsg.new_chat_members.filter((u) => String(u?.id) !== String(botTgId));
    if (!members.length) return null;
    const ev = { id: groupJid, action: "add", participants: members.map(toJid) };
    ev._profiles = Object.fromEntries(members.map((u) => [toJid(u), toName(u)]));
    return ev;
  }
  if (tgMsg.left_chat_member) {
    if (String(tgMsg.left_chat_member?.id) === String(botTgId)) return null; // bot dikick/keluar
    const ev = { id: groupJid, action: "remove", participants: [toJid(tgMsg.left_chat_member)] };
    ev._profiles = { [toJid(tgMsg.left_chat_member)]: toName(tgMsg.left_chat_member) };
    return ev;
  }
  return null;
}

// ── Telegram ────────────────────────────────────────────
export async function startTelegramBridge(opts = {}) {
  if (state.telegram.running) return { ok: true, already: true };
  const { getApiKey, db, messageHandler } = await getCtx("telegram");
  const token = opts.token || getApiKey("telegram") || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "Token Telegram belum di-set — .setkey telegram <token> (bikin bot di @BotFather)" };

  ensureBridgeState(db);
  const client = _clientFactory.telegram
    ? _clientFactory.telegram({ token })
    : createTelegramClient({ token, log: (m) => log("telegram", m) });

  const sock = makeBridgeSock({ platform: "telegram", client, chatMap: state.telegram.chatMap, log: (m) => log("telegram", m) });
  state.telegram.bridgeSock = sock; // dipakai wrapOutboundSends (router scheduler → TG)
  const { config } = await getCtx("telegram");
  const prefix = (config.command?.prefix || ".");

  const me = await client.start(async (tgMsg) => {
    // ── service message join/leave → pipeline welcome/goodbye (groupHandler, sama kayak WA) ──
    // Telegram ngasih tau member join/leave lewat field di pesan biasa (bukan event terpisah).
    // new_chat_members = join (add), left_chat_member = keluar/kick (remove).
    const svc = tgServiceEvent(tgMsg, me?.id);
    if (svc) {
      try {
        // simpen nama Telegram ke database dulu — biar welcome/goodbye nampilin
        // nama asli (request owner 29 Sep), bukan ID mentah tg_<id>
        for (const [jid, name] of Object.entries(svc._profiles || {})) {
          try { db.setUser(jid, { name: String(name).slice(0, 40) }); } catch {}
        }
        const { groupHandler: gh } = await getCtx("telegram");
        await gh(svc, sock);
        log("telegram", `group update ${svc.action}: ${svc.participants?.join(", ")}`);
      } catch (e) {
        log("telegram", `group update error: ${e?.message || e}`);
      }
      return; // service message bukan command — jangan masuk messageHandler
    }
    const raw = telegramToRaw(tgMsg);
    await handleBridgeMessage(raw, sock, {
      db,
      messageHandler,
      prefix,
      platform: "telegram",
      chatMap: state.telegram.chatMap,
      log: (m) => log("telegram", m),
    });
  });

  state.telegram.client = client;
  state.telegram.running = true;
  state.telegram.lastError = null;
  log("telegram", `aktif sebagai @${me?.username || "?"}`);
  return { ok: true, me };
}

// 🔹 dipakai rara-telegram-notify: kirim notif bot ke grup/channel TG tanpa
// harus lewat adapter chat — client hidup = bridge telegram ON.
export function getTelegramClient() {
  return state.telegram.client;
}

export function stopTelegramBridge() {
  state.telegram.bridgeSock = null;

  try { state.telegram.client?.stop(); } catch {}
  state.telegram.client = null; // FIX 7 Okt: client mati dibuang — getTelegramClient() gak boleh balikin client mati
  state.telegram.running = false;
  return { ok: true };
}

// ── Discord ─────────────────────────────────────────────
export async function startDiscordBridge(opts = {}) {
  if (state.discord.running) return { ok: true, already: true };
  const { getApiKey, db, messageHandler, config } = await getCtx("discord");
  const token = opts.token || getApiKey("discord") || process.env.DISCORD_BOT_TOKEN;
  if (!token) return { ok: false, error: "Token Discord belum di-set — .setkey discord <token> (bikin app di discord.com/developers)" };

  ensureBridgeState(db);

  // discord.js = dependency OPSIONAL (lazy import, gak boleh matikan bot kalau belum diinstall)
  let botApi;
  if (_clientFactory.discord) {
    botApi = _clientFactory.discord({ token });
  } else {
    let discordJs;
    try {
      discordJs = await import("discord.js");
    } catch {
      return { ok: false, error: "discord.js belum terpasang — jalankan: npm install discord.js (di VPS)" };
    }
    const { Client, GatewayIntentBits } = discordJs;
    const dc = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent] });
    await dc.login(token);
    botApi = makeDiscordApi(dc);
    dc.on("messageCreate", async (msg) => {
      if (msg.author?.bot) return;
      // FASE 1: DM saja (guild channel menyusul)
      if (!msg.channel || typeof msg.channel.isDMBased !== "function" || !msg.channel.isDMBased()) return;
      const raw = discordToRaw(msg);
      const sock = makeBridgeSock({ platform: "discord", client: botApi, chatMap: state.discord.chatMap, log: (m) => log("discord", m) });
      await handleBridgeMessage(raw, sock, {
        db,
        messageHandler,
        prefix: config.command?.prefix || ".",
        platform: "discord",
        chatMap: state.discord.chatMap,
        log: (m) => log("discord", m),
      });
    });
  }

  state.discord.client = botApi;
  state.discord.running = true;
  state.discord.lastError = null;
  log("discord", "aktif (DM only fase 1)");
  return { ok: true };
}

export function stopDiscordBridge() {
  try { state.discord.client?.stop?.(); } catch {}
  state.discord.running = false;
  return { ok: true };
}

// botApi Discord: map ke interface client yang sama dengan Telegram client
function makeDiscordApi(dc) {
  const chan = async (chatId) => {
    const ch = await dc.channels.fetch(chatId).catch(() => null);
    if (!ch) throw new Error("Channel Discord gak ketemu/diakses");
    return ch;
  };
  return {
    async sendMessage(chatId, text) {
      const ch = await chan(chatId);
      return ch.send(String(text ?? "").slice(0, 2000));
    },
    async sendPhoto(chatId, file, caption = "") {
      const ch = await chan(chatId);
      return ch.send({ content: caption ? String(caption).slice(0, 2000) : undefined, files: [file.url ? file.url : { attachment: file.buffer, name: file.filename || "image.png" }] });
    },
    async sendVideo(chatId, file, caption = "") {
      const ch = await chan(chatId);
      return ch.send({ content: caption ? String(caption).slice(0, 2000) : undefined, files: [file.url ? file.url : { attachment: file.buffer, name: file.filename || "video.mp4" }] });
    },
    async sendAudio(chatId, file, caption = "") {
      const ch = await chan(chatId);
      return ch.send({ content: caption ? String(caption).slice(0, 2000) : undefined, files: [file.url ? file.url : { attachment: file.buffer, name: file.filename || "audio.mp3" }] });
    },
    async sendDocument(chatId, file, caption = "") {
      const ch = await chan(chatId);
      return ch.send({ content: caption ? String(caption).slice(0, 2000) : undefined, files: [file.url ? file.url : { attachment: file.buffer, name: file.filename || "file" }] });
    },
    async setMessageReaction(chatId, emoji, invokeMsgId) {
      try {
        const ch = await chan(chatId);
        const target = invokeMsgId ? await ch.messages.fetch(invokeMsgId).catch(() => null) : (await ch.messages.fetch({ limit: 1 })).first();
        await target?.react(emoji || "👍");
      } catch {}
      return null;
    },
    async editMessageText() {
      throw new Error("edit pesan belum didukung di Discord (fase 2)"); // throw → animasi fallback pesan baru
    },
    stop: () => { try { dc.destroy(); } catch {} },
  };
}

// ── Router outbound scheduler → bridge ───────────────────
// Di VPS, semua scheduler (bmkg, briefing, wxalert, anime, dll) megang sock
// WHATSAPP utama. Tanpa router, kirim ke jid "tg_..." bakal nyangkut di jalur WA
// (jid gak dikenal → notifikasi auto gak pernah nyampe ke user Telegram).
// wrapOutboundSends(sock) dibungkus sekali di koneksi utama: jid berprefix tg_
// dibelokkin ke bridge Telegram (kalau running), sisanya tetap jalur WA asli.
export function wrapOutboundSends(sock) {
  if (!sock || typeof sock.sendMessage !== "function" || sock._novaOutboundRouted) return sock;
  const orig = {
    sendMessage: sock.sendMessage.bind(sock),
    sendMedia: typeof sock.sendMedia === "function" ? sock.sendMedia.bind(sock) : null,
    sendReaction: typeof sock.sendReaction === "function" ? sock.sendReaction.bind(sock) : null,
  };
  const bridgeFor = (jid) => {
    const target = typeof jid === "string" ? jid : String(jid?.key?.remoteJid || jid?.remoteJid || jid || "");
    if (target.startsWith("tg_") && state.telegram.running && state.telegram.bridgeSock) return state.telegram.bridgeSock;
    return null;
  };
  sock.sendMessage = async (jid, content, opts) => {
    const b = bridgeFor(jid);
    if (b) { try { return await b.sendMessage(jid, content, opts); } catch (e) { log("telegram", `router send gagal: ${e?.message || e}`); } }
    return orig.sendMessage(jid, content, opts);
  };
  if (orig.sendMedia) {
    sock.sendMedia = async (jid, source, caption, quoted, options) => {
      const b = bridgeFor(jid);
      if (b) { try { return await b.sendMedia(jid, source, caption, quoted, options); } catch (e) { log("telegram", `router media gagal: ${e?.message || e}`); } }
      return orig.sendMedia(jid, source, caption, quoted, options);
    };
  }
  if (orig.sendReaction) {
    sock.sendReaction = async (jid, emoji) => {
      const b = bridgeFor(jid);
      if (b) { try { return await b.sendReaction(jid, emoji); } catch (e) { log("telegram", `router react gagal: ${e?.message || e}`); } }
      return orig.sendReaction(jid, emoji);
    };
  }
  sock._novaOutboundRouted = true;
  return sock;
}

// ── Status & boot ───────────────────────────────────────
export function tgServiceEventForTest() { return tgServiceEvent; } // seam e2e

export function bridgeStatus() {
  return {
    telegram: { running: state.telegram.running, lastError: state.telegram.lastError },
    discord: { running: state.discord.running, lastError: state.discord.lastError },
  };
}

export async function initBridgeFromBoot() {
  try {
    const { getDatabase } = await import("../rara-database.js");
    const db = getDatabase();
    const b = ensureBridgeState(db);
    if (b.enabled?.telegram) {
      const r = await startTelegramBridge();
      if (!r.ok) log("telegram", `gagal start boot: ${r.error}`);
    }
    if (b.enabled?.discord) {
      const r = await startDiscordBridge();
      if (!r.ok) log("discord", `gagal start boot: ${r.error}`);
    }
  } catch (e) {
    console.error("[rarabridge] init error:", e?.message || e);
  }
}

export { state as _bridgeState };
