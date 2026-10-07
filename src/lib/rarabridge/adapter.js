// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rarabridge/adapter — jantung bridge multi-platform:
//  1. Ubah pesan Telegram/Discord jadi RAW message bentuk Baileys (key + message.conversation)
//     → masuk ke messageHandler LAMA → serialize/middleware/plugin jalan apa adanya.
//  2. Sock shim: plugin nge-call sock.sendMessage(jid, payload) seperti di WhatsApp —
//     payload WA di-map ke API platform (teks/foto/video/audio/dokumen/react).
//  3. Gate kategori whitelist (publik, bertahap) + rate-limit per user + identitas per-platform.
//
// Identitas: sender = tg_<id> / dc_<id> → RPG/limit/memori share database dengan WA,
// gak bentrok dengan nomor WhatsApp (isOwner matchJid endsWith tetep jalan buat owner terdaftar).

import { getPlugin } from "../rara-plugins.js";

// Kategori whitelist bridge. Default "*" = SEMUA kategori kebuka (keputusan owner
// 29 Sep: lagi masa testing sendiri, gate per-command isOwner/isGroup/isPremium
// TETEP jalan normal, jadi owner-only/group-only gak kebocoran). Mau membatasi?
// .bridge kategori del * lalu .bridge kategori add <kategori> per kategori.
export const DEFAULT_BRIDGE_CATEGORIES = ["*"];

export const BRIDGE_PLATFORMS = ["telegram", "discord"];

// ── State persisten (db.data.bridge) ────────────────────
export function ensureBridgeState(db) {
  if (!db.db.data.bridge) db.db.data.bridge = {};
  const b = db.db.data.bridge;
  if (!Array.isArray(b.categories)) b.categories = [...DEFAULT_BRIDGE_CATEGORIES];
  // Migrasi state lama: whitelist fase-1 (9 kategori) → "*" semua kebuka
  else if (JSON.stringify(b.categories) === JSON.stringify(["main","ai","tools","download","search","game","rpg","anime","fun"])) {
    b.categories = [...DEFAULT_BRIDGE_CATEGORIES];
  }
  if (!b.enabled || typeof b.enabled !== "object") b.enabled = { telegram: false, discord: false };
  if (!b.ownerIds || typeof b.ownerIds !== "object") b.ownerIds = { telegram: [], discord: [] };
  if (!b.lastRun) b.lastRun = {};
  return b;
}

export function isCategoryAllowed(db, cmd) {
  const b = ensureBridgeState(db);
  if (!cmd) return false;
  const p = getPlugin(cmd);
  if (!p) return true; // command gak dikenal → biarkan handler jawab "not found" (gak bocorin kategori)
  const cat = (p.config?.category || p.category || "").toLowerCase();
  if (!cat) return false; // plugin tanpa kategori → konservatif, tolak
  if (b.categories.includes("*")) return true; // wildcard: semua kategori kebuka
  return b.categories.includes(cat.toLowerCase());
}

// ── Rate limit sederhana per sender (default 20 pesan/menit) ──
const rateBuckets = new Map();
export function rateAllow(sender, limitPerMin = 20) {
  const now = Date.now();
  let b = rateBuckets.get(sender);
  if (!b || now - b.start > 60_000) {
    b = { start: now, count: 0 };
    rateBuckets.set(sender, b);
  }
  b.count++;
  if (b.count > limitPerMin) return false;
  // sweeper kecil biar map gak bengkak
  if (rateBuckets.size > 5000) rateBuckets.clear();
  return true;
}
export function _resetRateForTest() {
  rateBuckets.clear();
}

// ── Pesan platform → RAW message bentuk Baileys ─────────
export function telegramToRaw(tgMsg) {
  const from = tgMsg?.from || {};
  const chat = tgMsg?.chat || {};
  const text = tgMsg?.text || tgMsg?.caption || "";
  const senderId = String(from.id ?? chat.id ?? "0");
  // BUG FIX (29 Sep): remoteJid dulu SELALU pakai senderId — di grup, tiap member
  // beda jadi "chat" beda (harusnya satu chat dipakai bareng), dan isGroup di
  // serialize.js (`m.chat.endsWith("@g.us")`) gak pernah true → .aicard/plugin
  // isGroup:true SELALU nolak "GROUP ONLY" walau dikirim dari grup asli.
  // Fix: remoteJid ikut chat.type — grup pakai chat.id + suffix @g.us,
  // DM tetap tg_<id> (chat.id === from.id di private, jadi gak ada perubahan perilaku DM).
  const isGroupChat = chat.type === "group" || chat.type === "supergroup";
  const chatIdStr = String(chat.id ?? senderId).replace(/^-/, "");
  // SALURAN (channel, 29 Sep): bot admin saluran nerima channel_post — jid
  // khusus tg_c<id>@newsletter biar .jasher bisa bedain saluran vs grup
  // (suffix sama kayak WA newsletter, prefix tg_ = Telegram).
  const isChannelChat = chat.type === "channel";
  const remoteJid = isChannelChat ? `tg_c${chatIdStr}@newsletter` : (isGroupChat ? `tg_g${chatIdStr}@g.us` : `tg_${senderId}`);
  const participant = isGroupChat ? `tg_${senderId}` : remoteJid;
  return {
    key: {
      remoteJid,
      fromMe: !!from.is_bot,
      id: `tg_${tgMsg?.message_id ?? Date.now()}`,
      participant,
    },
    message: {
      conversation: text,
      // Tanda media hadir (fase 1: input media ditolak jujur oleh handler bridge)
      ...(tgMsg?.photo || tgMsg?.video || tgMsg?.document || tgMsg?.audio || tgMsg?.voice
        ? { _bridgeMedia: true }
        : {}),
    },
    messageTimestamp: tgMsg?.date || Math.floor(Date.now() / 1000),
    pushName: from.first_name || from.username || "Telegram User",
    _bridge: { platform: "telegram", chatId: chat.id, invokeMsgId: tgMsg?.message_id, isBot: !!from.is_bot, hasMedia: !!(tgMsg && (tgMsg.photo || tgMsg.video || tgMsg.document || tgMsg.audio || tgMsg.voice)), isGroup: isGroupChat, isChannel: isChannelChat,
      // judul grup (registry .jasher — broadcast promosi lintas platform, 29 Sep)
      groupTitle: (isGroupChat || isChannelChat) ? (chat.title || null) : null,
      // USERNAME TELEGRAM ASLI (7 Okt: owner minta mention "@username" bukan
      // "@tg_<id>" di notif level-up dll) — null kalau user gak punya username
      // (banyak akun Telegram cuma pakai nama, gak set username).
      username: from.username || null },
  };
}

export function discordToRaw(dcMsg) {
  const author = dcMsg?.author || {};
  const text = dcMsg?.content || "";
  const senderId = String(author.id ?? "0");
  // Sama seperti telegramToRaw: guildId ada → channel di server (grup), guildId
  // null → DM. remoteJid grup pakai channelId (shared, bukan per-sender) + @g.us.
  const isGroupChat = !!dcMsg?.guildId;
  const channelId = String(dcMsg?.channelId ?? senderId);
  const remoteJid = isGroupChat ? `dc_g${channelId}@g.us` : `dc_${senderId}`;
  const participant = isGroupChat ? `dc_${senderId}` : remoteJid;
  return {
    key: {
      remoteJid,
      fromMe: !!author.bot,
      id: `dc_${dcMsg?.id ?? Date.now()}`,
      participant,
    },
    message: { conversation: text },
    messageTimestamp: Math.floor((dcMsg?.createdTimestamp || Date.now()) / 1000),
    pushName: author.username || "Discord User",
    _bridge: { platform: "discord", chatId: dcMsg?.channelId || author.id, invokeMsgId: dcMsg?.id, isBot: !!author.bot, hasMedia: !!(dcMsg && dcMsg.attachments && dcMsg.attachments.size), isGroup: isGroupChat,
      // simetri sama telegram — discord author.username EMANG handle asli dia
      username: author.username || null },
  };
}

// ── Mention display (7 Okt: owner "bisa ga bukan id tapi nama usernya aja klo
// ke bridge telegramnya") ─────────────────────────────────────────────────
// Bridge jid (tg_<id>, dc_<id>) gak punya "@" domain → "@" + m.sender.split("@")[0]
// (dipakai di banyak notif, mis. level-up) ngasilin "@tg_8672332446" mentah, bukan
// mention beneran (bridge kirim teks plain, bukan protokol WA asli). Fix: kalau
// m punya _bridge.username (akun Telegram YANG PUNYA username), tampilin itu;
// fallback ke pushName (nama tampilan) kalau gak punya username; fallback akhir
// ke ID mentah (perilaku lama, dipakai juga buat WA non-bridge).
export function bridgeMentionText(m) {
  const bridge = m?._bridge;
  if (bridge?.platform === "telegram" && bridge.username) return "@" + bridge.username;
  if (bridge?.platform === "discord" && bridge.username) return "@" + bridge.username;
  if (bridge && m?.pushName && m.pushName !== "Telegram User" && m.pushName !== "Discord User") {
    return "@" + m.pushName;
  }
  return "@" + String(m?.sender || "").split("@")[0];
}

// ── Sock shim ───────────────────────────────────────────
// client = objek platform client dengan metode:
//   telegram: sendMessage(chatId, text) · sendPhoto/Video/Audio/Document(chatId, file, caption) · setMessageReaction(chatId, emoji)
//   discord: send(channelOrId, { text }) · sendFile(channelOrId, { buffer|url, filename, mimetype }, caption) · react(emoji)
function extractContent(jid, content) {
  // Bentuk payload WA → { kind, data, caption, filename, mimetype }
  const c = typeof content === "string" ? { text: content } : content || {};
  const caption = c.caption ?? c.text ?? "";
  const mk = (kind, data, extra = {}) => ({ kind, data, caption, ...extra });
  if (c.image) {
    const d = c.image.url || c.image;
    return mk("image", typeof d === "string" ? d : { buffer: d }, { filename: c.fileName || "image.jpg" });
  }
  if (c.video) {
    const d = c.video.url || c.video;
    return mk("video", typeof d === "string" ? d : { buffer: d }, { filename: c.fileName || "video.mp4" });
  }
  if (c.audio) {
    const d = c.audio.url || c.audio;
    return mk("audio", typeof d === "string" ? d : { buffer: d }, { filename: c.fileName || "audio.mp3", mimetype: c.mimetype || "audio/mpeg" });
  }
  if (c.document) {
    const d = c.document.url || c.document;
    return mk("document", typeof d === "string" ? d : { buffer: d }, {
      filename: c.fileName || c.document?.fileName || "file",
      mimetype: c.mimetype || "application/octet-stream",
    });
  }
  if (c.react) return mk("react", c.react.text || c.react, {});
  if (c.sticker) return mk("image", c.sticker.url || c.sticker, { filename: "sticker.png", _sticker: true });
  return mk("text", c.text || "", {});
}

async function toFilePayload(data, fetcher) {
  // data: string URL/file_id | { buffer }
  if (typeof data === "string") return { url: data };
  if (data && data.buffer) return { buffer: data.buffer, filename: data.filename || "file" };
  throw new Error("Media bridge tidak dikenali");
}

export function makeBridgeSock({ platform, client, chatMap = null, log = () => {} }) {
  const lastBotMsg = new Map(); // chatId → { id } (react/edit)

  // jid ("tg_123"/"dc_123") → id chat asli platform (channel DM Discord ≠ id user!)
  const resolve = (jid) => (chatMap && chatMap.get(String(jid)) && chatMap.get(String(jid)).chatId) || jid;
  const invokeMsgId = (jid) => (chatMap && chatMap.get(String(jid)) && chatMap.get(String(jid)).invokeMsgId) || null;

  const sock = {};
  const pfx = platform === "telegram" ? "tg" : "dc";

  // Normalisasi hasil kirim jadi bentuk WA (key.id) — WA caller (animasi
  // editFramesAnim dkk) ngecek `sentMsg.key` buat lanjut edit-in-place.
  // Tanpa ini animasi game gak jalan di bridge: key gak ada → tiap frame
  // dikirim sebagai PESAN BARU (bug report owner 29 Sep).
  const wrap = (jid, r) => {
    const pid = r?.message_id ?? r?.id;
    return {
      key: { remoteJid: String(jid), fromMe: true, id: `${pfx}_${pid != null ? pid : Date.now()}` },
      message_id: pid,
      _platform: r,
    };
  };

  // WA: sendMessage(jid, content, opts)
  sock.sendMessage = async (jid, content, opts = {}) => {
    const chatId = resolve(jid);
    let c = typeof content === "string" ? { text: content } : content || {};
    // quoted/mention contextInfo → suffix teks aja
    const quotedText = opts?.quoted?.text;
    const extra = quotedText ? `\n\n> ${String(quotedText).slice(0, 200)}` : "";
    const x = extractContent(chatId, c);

    // WA edit-in-place: { text, edit: <key pesan> } → editMessageText platform.
    // Ini yang dipakai editFramesAnim/animasiRunner (frame demi frame 1 pesan).
    // Key bisa bentuk key utuh ({id}) atau WAMessage ({key:{id}}).
    const editKeyId = c.edit?.key?.id ?? c.edit?.id;
    if (editKeyId) {
      const targetMsgId = String(editKeyId).replace(/\D/g, "");
      const newText = c.text ?? x.caption ?? "";
      if (!targetMsgId || !newText) return null;
      const r = await client.editMessageText(chatId, targetMsgId, newText); // throw → caller fallback
      return wrap(jid, r ?? { message_id: targetMsgId });
    }

    try {
      if (x.kind === "react") {
        return await client.setMessageReaction(chatId, String(x.data || "👍"), invokeMsgId(chatId));
      }
      if (x.kind === "text" || (!x.data && x.caption)) {
        const r = await client.sendMessage(chatId, (c.text ?? x.caption ?? "") + extra);
        lastBotMsg.set(String(chatId), r);
        return wrap(jid, r);
      }
      if (x.kind === "image") {
        const file = await toFilePayload(x.data);
        const r = await client.sendPhoto(chatId, file, x.caption + extra);
        lastBotMsg.set(String(chatId), r);
        return wrap(jid, r);
      }
      if (x.kind === "video") {
        const file = await toFilePayload(x.data);
        const r = await client.sendVideo(chatId, file, x.caption + extra);
        lastBotMsg.set(String(chatId), r);
        return wrap(jid, r);
      }
      if (x.kind === "audio") {
        const file = await toFilePayload(x.data);
        const r = await client.sendAudio(chatId, file, x.caption + extra);
        lastBotMsg.set(String(chatId), r);
        return wrap(jid, r);
      }
      if (x.kind === "document") {
        const file = await toFilePayload(x.data);
        const r = await client.sendDocument(chatId, { ...file, mimetype: x.mimetype, filename: x.filename }, x.caption + extra);
        lastBotMsg.set(String(chatId), r);
        return wrap(jid, r);
      }
    } catch (e) {
      // Media gagal (mis. >50MB di TG) → jujur via teks, jangan senyap
      log(`bridge send ${x.kind} gagal: ${e?.message || e}`);
      if (x.caption) return wrap(jid, await client.sendMessage(chatId, `${x.caption}\n\n[media gagal dikirim di ${platform}: ${String(e?.message || e).slice(0, 120)}]`));
      throw e;
    }
    // Bentuk gak dikenal (poll/button/location/dll) → fallback teks apa adanya
    const fallback = c.text || c.caption || (typeof content === "string" ? content : "");
    if (fallback) return wrap(jid, await client.sendMessage(chatId, fallback));
    log(`bridge sendMessage: bentuk konten gak dikenal di ${platform} → diabaikan senyap`);
    return null;
  };

  // WA: sendMedia(jid, source, caption, quoted, options) — dipakai 112 plugin
  sock.sendMedia = async (jid, source, caption = "", _quoted, options = {}) => {
    if (source && typeof source === "object" && !Buffer.isBuffer(source) && typeof source.url === "string") {
      source = { url: source.url };
    }
    const mediaType = options.type || options.mediaType || "document";
    let payload;
    if (mediaType === "image") payload = { image: source, caption };
    else if (mediaType === "video") payload = { video: source, caption };
    else if (mediaType === "audio") payload = { audio: source, mimetype: options.mimetype || "audio/mpeg" };
    else
      payload = {
        document: source,
        mimetype: options.mimetype || "application/octet-stream",
        fileName: options.fileName || "file",
        caption,
      };
    return sock.sendMessage(jid, payload, options);
  };

  // Loading react: plugin react 🧠/🐣 — TG: reaction di pesan bot terakhir; Discord: react
  sock.sendReaction = async (jid, emoji) => {
    try { return await client.setMessageReaction(resolve(jid), emoji, invokeMsgId(jid)); } catch { return null; }
  };

  sock.editMessage = async (jid, msgId, text) => {
    try { return await client.editMessageText(resolve(jid), msgId, text); } catch { return null; }
  };

  // Stubs WA-only — gak relevan di platform lain, senyap-proof (pola makeLangAwareSock)
  sock.readMessages = async () => true;
  sock.sendPresenceUpdate = async () => true;
  sock.groupMetadata = async () => null;
  sock.groupFetchAllParticipating = async () => ({});
  sock.groupParticipantsUpdate = async () => [];
  sock.groupLeave = async () => true;
  sock.profilePictureUrl = async () => null;
  sock.onWhatsApp = async () => [];
  sock.downloadMediaMessage = async () => {
    throw new Error("Input media belum didukung di Telegram/Discord (fase 1 — kirim teks perintahnya saja)");
  };
  // m.reply default Rara = relayMessage(interactiveMessage) — unwrap WA interactive
  // (viewOnce/ephemeral nested) → teks + tombol jadi teks, biar tetep kebaca di platform lain.
  sock.relayMessage = async (jid, content) => {
    let node = content || {};
    for (const k of ["viewOnceMessage", "viewOnceMessageV2", "viewOnceMessageV2Extension", "ephemeralMessage"]) {
      // dua bentuk: {viewOnceMessage:{message:{...}}} (relay msg.message)
      // atau {message:{viewOnceMessage:{...}}} (relay WAMessage utuh)
      if (node?.[k]?.message) node = node[k];
      else if (node?.message?.[k]) node = { message: node.message[k] };
    }
    let im = node?.message?.interactiveMessage || node?.interactiveMessage;
    if (im) {
      const parts = [];
      if (im.body?.text) parts.push(im.body.text);
      const btns = im.nativeFlowMessage?.buttons || [];
      const labels = btns.map((b) => b?.name?.buttonParamsJson ? "" : "").filter(Boolean);
      void labels;
      if (btns.length) parts.push("[" + btns.length + " tombol WhatsApp — lihat di WA]");
      if (im.header?.hasMediaAttachment) parts.push("[lampiran media]");
      return sock.sendMessage(jid, parts.join("\n\n"));
    }
    if (node?.message?.conversation) return sock.sendMessage(jid, node.message.conversation);
    if (node?.conversation) return sock.sendMessage(jid, node.conversation);
    return sock.sendMessage(jid, node);
  };
  sock.sendButton = async (jid, source, text, quoted, options = {}) => {
    // Button WA gak ada di TG/Discord — jadi media+caption polos
    const payload = {};
    const t = options.type || "image";
    if (source) payload[t === "image" ? "image" : "document"] = typeof source === "string" ? { url: source } : source;
    if (text) payload.caption = text;
    if (!payload.image && !payload.document && !payload.caption) return null;
    if (!payload.image && !payload.document) return sock.sendMessage(jid, payload.caption);
    return sock.sendMessage(jid, payload);
  };
  sock.sendImageAsSticker = sock.sendVideoAsSticker = async (jid, source) =>
    sock.sendMessage(jid, { image: typeof source === "string" ? { url: source } : source, caption: "sticker" });

  sock.user = { id: "rara-bridge", jid: "rarabridge@bridge" }; // dipakai generateWAMessageFromContent (userJid)
  sock.store = { messages: new Map(), chats: new Map(), contacts: new Map() };
  sock._bridgePlatform = platform;
  sock._lastBotMsg = lastBotMsg;
  return sock;
}

// ── Pipeline: teks platform → handler Rara ─────────────
// ctx: { db, messageHandler, getConfig, prefix, log }
export async function handleBridgeMessage(rawMsg, sock, ctx = {}) {
  const { db, messageHandler, prefix = ".", log = () => {}, platform, chatMap = null } = ctx;
  if (!rawMsg?.key) return null;
  if (chatMap && rawMsg._bridge) chatMap.set(String(rawMsg.key.remoteJid), { chatId: rawMsg._bridge.chatId, invokeMsgId: rawMsg._bridge.invokeMsgId });
  // ── REGISTRY GRUP (.jasher, 29 Sep) — catat setiap grup yang ngirim pesan:
  // jid → {name, platform}. WA bisa enumerasi via groupFetchAllParticipating,
  // tapi Bot API Telegram GAK BISA enumerasi grup → registry ini cara .jasher
  // nemuin grup TG yang bot join (persist di DB, tahan restart).
  try {
    // grup (@g.us) DAN saluran (@newsletter) — dua-duanya dicatat buat .jasher
    if ((rawMsg._bridge?.isGroup || rawMsg._bridge?.isChannel) && (String(rawMsg.key.remoteJid).endsWith("@g.us") || String(rawMsg.key.remoteJid).endsWith("@newsletter")) && !rawMsg.key.fromMe && !rawMsg._bridge?.isBot) {
      const jid = String(rawMsg.key.remoteJid);
      const title = rawMsg._bridge?.groupTitle || null;
      const data = db?.db?.data;
      if (data) {
        data.jasher ??= { groups: {} };
        data.jasher.groups ??= {};
        const cur = data.jasher.groups[jid];
        if (!cur || (title && cur.name !== title)) {
          data.jasher.groups[jid] = { name: title || cur?.name || jid.split("@")[0], platform: rawMsg._bridge?.platform || "telegram", updated: Date.now() };
          try { db.save?.(); } catch {}
        }
      }
    }
  } catch {}
  const body = rawMsg.message?.conversation || "";
  if (rawMsg._bridge?.hasMedia) {
    // fase 1: input media ditolak jujur
    try { await sock.sendMessage(rawMsg.key.remoteJid, "Input media/gambar belum didukung di platform ini (fase 1) — kirim teks perintahnya ya."); } catch {}
    return { handled: "media-rejected" };
  }
  if (rawMsg.key.fromMe || rawMsg._bridge?.isBot) return { handled: "self" };
  const text = String(body).trim();
  if (!text) return { handled: "ignored" };

  // Chat polos (tanpa prefix) TETAP diteruskan ke messageHandler — paritas
  // WhatsApp: autoflow trigger "any"/aichat, autoAI, autoRole, XP RPG dll
  // hidup dari pesan ngobrol biasa, bukan cuma command. Dulu fase 1 chat
  // polos di-"ignore" → rule .anovaagent "ajak ngobrol" GAK PERNAH jalan
  // di Telegram (report owner 29 Sep).
  // Catatan: rate limit 20/mnt + gate kategori CUMA buat command — chat polos
  // gak makan bucket rate limit biar grup ramai gak ngeblok command user.
  const isCommand = text.startsWith(prefix);
  let cmd = null;
  if (isCommand) {
    cmd = text.slice(prefix.length).split(/\s+/)[0].toLowerCase();

    if (!rateAllow(rawMsg.key.remoteJid)) {
      try { await sock.sendMessage(rawMsg.key.remoteJid, `Sabar ya — maksimal 20 pesan/menit per user di ${platform || "platform ini"}.`); } catch {}
      return { handled: "ratelimit" };
    }

    if (!isCategoryAllowed(db, cmd)) {
      const p = getPlugin(cmd);
      if (p) {
        // command dikenal tapi kategorinya di luar whitelist
        const cat = p.config?.category || p.category || "?";
        try { await sock.sendMessage(rawMsg.key.remoteJid, `Perintah .${cmd} (kategori ${cat}) belum tersedia di platform ini.`); } catch {}
        return { handled: "category-blocked" };
      }
      // command gak dikenal → biarkan messageHandler jawab sendiri
    }
  }

  try {
    await messageHandler(rawMsg, sock, {});
  } catch (e) {
    log(`bridge handler error (${platform}): ${e?.message || e}`);
    if (isCommand) {
      try { await sock.sendMessage(rawMsg.key.remoteJid, "Terjadi error saat menjalankan perintah — coba lagi."); } catch {}
    }
    // error di chat polos → senyap (anti-spam loop), gak perlu error card
  }
  return { handled: "dispatched", cmd };
}
