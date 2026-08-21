// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "secretmsg",
  alias: ["secretmsg", "whisper", "pesanrahasia"],
  category: "future",
  description: "Anonymous whisper - kirim pesan anonim ke seseorang di grup",
  usage: ".secretmsg <command>",
  example: ".secretmsg send @user kamu keren banget hari ini",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

function getConfig(db, gid) {
  const all = db.setting("secretmsg") || {};
  return all[gid] || {};
}

function saveConfig(db, gid, data) {
  const all = db.setting("secretmsg") || {};
  all[gid] = data;
  db.setting("secretmsg", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);

  if (sub === "send" || sub === "kirim" || sub === "whisper") {
    const mentioned = m.mentionedJid && m.mentionedJid.length > 0 ? m.mentionedJid[0] : null;
    if (!mentioned) {
      await m.reply(claraWrap("SecretMsg", "Format: " + prefix + "secretmsg send @target <pesan>\nContoh: " + prefix + "secretmsg send @user kamu keren hari ini"));
      return { handled: true };
    }
    if (mentioned === m.sender) {
      await m.reply(claraWrap("SecretMsg", "Tidak bisa kirim ke diri sendiri!"));
      return { handled: true };
    }
    const text = args.slice(2).join(" ").trim();
    // Remove the mentioned jid from text
    const cleanText = text.replace(/@\d+/g, "").trim();
    if (!cleanText || cleanText.length < 3) {
      await m.reply(claraWrap("SecretMsg", "Pesan minimal 3 karakter."));
      return { handled: true };
    }
    if (cleanText.length > 300) {
      await m.reply(claraWrap("SecretMsg", "Maksimal 300 karakter."));
      return { handled: true };
    }

    // Detect type
    let type = "general";
    const lower = cleanText.toLowerCase();
    if (lower.includes("suka") || lower.includes("cinta") || lower.includes("sayang") || lower.includes("crush")) {
      type = "confession";
    } else if (lower.includes("maaf") || lower.includes("sorry") || lower.includes("mintak")) {
      type = "apology";
    } else if (lower.includes("keren") || lower.includes("hebat") || lower.includes("bagus") || lower.includes("pintar") || lower.includes("cantik") || lower.includes("ganteng")) {
      type = "compliment";
    } else if (lower.includes("jelek") || lower.includes("bego") || lower.includes("goblok") || lower.includes("tolol")) {
      await m.reply(claraWrap("SecretMsg", "Pesan mengandung kata kasar. Tidak dikirim."));
      return { handled: true };
    }

    // Save message
    if (!cfg.inbox) cfg.inbox = {};
    if (!cfg.inbox[mentioned]) cfg.inbox[mentioned] = [];
    const msgId = cfg.inbox[mentioned].length + 1;
    cfg.inbox[mentioned].push({
      id: msgId,
      text: cleanText,
      type,
      from: m.sender,
      timestamp: Date.now(),
      read: false,
    });
    saveConfig(db, gid, cfg);

    // Notify sender
    await m.reply(claraWrap("SecretMsg", "Pesan anonim terkirim ke @" + mentioned.split("@")[0] + "!\nType: " + type + "\n\nPenerima bisa cek dengan: " + prefix + "secretmsg inbox"), { mentions: [mentioned] });

    // DM the recipient
    try {
      await sock.sendMessage(mentioned, { text: claraWrap("SecretMsg", [
        "Kamu dapat pesan anonim baru!",
        "Type: " + type,
        "Ketik di grup: " + prefix + "secretmsg inbox",
        "Ketik di grup: " + prefix + "secretmsg read " + msgId,
      ].join("\n")) });
    } catch (e) { console.error('[secretmsg.js]:', e.message); }
    return { handled: true };
  }

  if (sub === "inbox" || sub === "kotak") {
    if (!cfg.inbox || !cfg.inbox[m.sender] || cfg.inbox[m.sender].length === 0) {
      await m.reply(claraWrap("SecretMsg", "Inbox kosong. Belum ada pesan anonim."));
      return { handled: true };
    }
    const unread = cfg.inbox[m.sender].filter(msg => !msg.read);
    const total = cfg.inbox[m.sender].length;
    const list = cfg.inbox[m.sender].slice(-5).map(msg => "#" + msg.id + " [" + msg.type + "] " + (msg.read ? "✓" : "●") + " " + msg.text.slice(0, 50) + (msg.text.length > 50 ? "..." : "") + " (" + new Date(msg.timestamp).toLocaleDateString("id-ID") + ")").join("\n");
    await m.reply(claraWrap("SecretMsg Inbox", [
      "Total: " + total + " | Unread: " + unread.length,
      "",
      list,
      "",
      prefix + "secretmsg read <id> - baca pesan",
      prefix + "secretmsg guess <id> - tebak pengirim",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "read" || sub === "baca") {
    const id = parseInt(args[2] || "0", 10);
    if (!cfg.inbox || !cfg.inbox[m.sender]) {
      await m.reply(claraWrap("SecretMsg", "Inbox kosong."));
      return { handled: true };
    }
    const msg = cfg.inbox[m.sender].find(mm => mm.id === id);
    if (!msg) {
      await m.reply(claraWrap("SecretMsg", "Pesan tidak ditemukan."));
      return { handled: true };
    }
    msg.read = true;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("SecretMsg #" + msg.id, [
      "Type: " + msg.type,
      "Tanggal: " + new Date(msg.timestamp).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
      "",
      msg.text,
      "",
      "Pengirim: ??? (anonim)",
      prefix + "secretmsg guess " + msg.id + " @target - tebak pengirim",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "guess" || sub === "tebak") {
    const id = parseInt(args[2] || "0", 10);
    const mentioned = m.mentionedJid && m.mentionedJid.length > 0 ? m.mentionedJid[0] : null;
    if (!id || !mentioned) {
      await m.reply(claraWrap("SecretMsg", "Format: " + prefix + "secretmsg guess <id> @target"));
      return { handled: true };
    }
    if (!cfg.inbox || !cfg.inbox[m.sender]) {
      await m.reply(claraWrap("SecretMsg", "Inbox kosong."));
      return { handled: true };
    }
    const msg = cfg.inbox[m.sender].find(mm => mm.id === id);
    if (!msg) {
      await m.reply(claraWrap("SecretMsg", "Pesan tidak ditemukan."));
      return { handled: true };
    }
    if (msg.guessed) {
      await m.reply(claraWrap("SecretMsg", "Pesan ini sudah di-tebak! Pengirim: @" + msg.from.split("@")[0]), { mentions: [msg.from] });
      return { handled: true };
    }
    if (mentioned === msg.from) {
      msg.guessed = true;
      saveConfig(db, gid, cfg);
      await m.react("✅");
      await m.reply(claraWrap("SecretMsg - BENAR!", "Pengirim pesan #" + id + " adalah @" + msg.from.split("@")[0] + "!\nIdentitas terbongkar!"), { mentions: [msg.from] });
    } else {
      await m.react("❌");
      if (!msg.guessCount) msg.guessCount = 0;
      msg.guessCount++;
      saveConfig(db, gid, cfg);
      await m.reply(claraWrap("SecretMsg", "Salah! @" + mentioned.split("@")[0] + " bukan pengirimnya.\nTebakan: " + msg.guessCount + "/3"), { mentions: [mentioned] });
    }
    return { handled: true };
  }

  if (sub === "clear" || sub === "hapus") {
    if (!cfg.inbox || !cfg.inbox[m.sender]) {
      await m.reply(claraWrap("SecretMsg", "Inbox sudah kosong."));
      return { handled: true };
    }
    cfg.inbox[m.sender] = [];
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("SecretMsg", "Inbox dibersihkan."));
    return { handled: true };
  }

  if (sub === "stats" || sub === "cek" || !sub) {
    const total = cfg.inbox?.[m.sender]?.length || 0;
    const unread = cfg.inbox?.[m.sender]?.filter(msg => !msg.read).length || 0;
    await m.reply(claraWrap("SecretMsg", [
      "ANONYMOUS WHISPER",
      "",
      "Inbox: " + total + " pesan (" + unread + " unread)",
      "",
      prefix + "secretmsg send @target <pesan> - kirim anonim",
      prefix + "secretmsg inbox - lihat inbox",
      prefix + "secretmsg read <id> - baca pesan",
      prefix + "secretmsg guess <id> @target - tebak pengirim",
      prefix + "secretmsg clear - bersihkan inbox",
      "",
      "Pengirim tidak terlihat sampai ditebak!",
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(claraWrap("SecretMsg", [
    "ANONYMOUS WHISPER",
    "",
    prefix + "secretmsg send @target <pesan> - kirim anonim",
    prefix + "secretmsg inbox - lihat inbox",
    prefix + "secretmsg read <id> - baca pesan",
    prefix + "secretmsg guess <id> @target - tebak pengirim",
    prefix + "secretmsg clear - bersihkan inbox",
    "",
    "Kirim pesan tanpa identitas, penerima bisa tebak siapa kamu!",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
