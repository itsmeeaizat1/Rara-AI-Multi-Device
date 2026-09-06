// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import { getDatabase } from "./nova-database.js";
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[b.length][a.length];
}

function formatAfkDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} hari ${hours % 24} jam`;
  if (hours > 0) return `${hours} jam ${minutes % 60} menit`;
  if (minutes > 0) return `${minutes} menit`;
  return `${seconds} detik`;
}

function checkPermission(m, pluginConfig) {
  const db = getDatabase();
  const user = db.getUser(m.sender) || {};
  let hasAccess = false;
  if (user.access && m.command) {
    const accessFound = user.access.find(
      (a) => a.cmd === m.command.toLowerCase(),
    );
    if (accessFound) {
      if (accessFound.expired === null || accessFound.expired > Date.now()) {
        hasAccess = true;
      } else {
        user.access = user.access.filter(
          (a) => a.cmd !== m.command.toLowerCase(),
        );
        db.setUser(m.sender, user);
      }
    }
  }

  if (pluginConfig.isOwner && !m.isOwner && !hasAccess) {
    return {
      allowed: false,
      reason: config.messages?.ownerOnly || "🚫 Owner only!",
    };
  }

  if (pluginConfig.isPartner && !m.isPartner && !m.isOwner && !hasAccess) {
    return { allowed: false, reason: "╭─「 ✦ Partner Only ✦ 」\n│ Fitur ini khusus Partner bot\n╰────  •  ────" };
  }

  if (
    pluginConfig.isPremium &&
    !m.isPremium &&
    !m.isOwner &&
    !m.isPartner &&
    !hasAccess
  ) {
    return {
      allowed: false,
      reason: config.messages?.premiumOnly || "💎 Premium only!",
    };
  }

  if (pluginConfig.isGroup && !m.isGroup) {
    return {
      allowed: false,
      reason: config.messages?.groupOnly || "👥 Group only!",
    };
  }

  if (pluginConfig.isPrivate && m.isGroup) {
    return {
      allowed: false,
      reason: config.messages?.privateOnly || "📱 Private chat only!",
    };
  }

  if (
    pluginConfig.isAdmin &&
    m.isGroup &&
    !m.isAdmin &&
    !m.isOwner &&
    !hasAccess
  ) {
    return {
      allowed: false,
      reason: config.messages?.adminOnly || "👮 Admin grup only!",
    };
  }

  if (pluginConfig.isBotAdmin && m.isGroup && !m.isBotAdmin) {
    return {
      allowed: false,
      reason:
        config.messages?.botAdminOnly || "🤖 Bot harus menjadi admin grup!",
    };
  }

  if (m.isGroup) {
    const group = db.getGroup(m.chat);
    if (group) {
      if (pluginConfig.category === "game" && group.game === false) {
        if (!m.isAdmin && !m.isOwner && !hasAccess) {
          return {
            allowed: false,
            reason: "╭─「 ✦ Game Disabled ✦ 」\n│ Fitur Game sedang dinonaktifkan\n│ di grup ini oleh Admin\n╰────  •  ────",
          };
        }
      }
      if (pluginConfig.category === "rpg" && group.rpg === false) {
        if (!m.isAdmin && !m.isOwner && !hasAccess) {
          return {
            allowed: false,
            reason: "╭─「 ✦ RPG Disabled ✦ 」\n│ Fitur RPG sedang dinonaktifkan\n│ di grup ini oleh Admin\n╰────  •  ────",
          };
        }
      }
    }
  }

  return { allowed: true, reason: "" };
}

// Normalisasi nomor buat blacklist/whitelist: strip non-digit, 08xxx → 628xxx
function normalizeAccessNumber(input) {
  let num = String(input || "").replace(/[^0-9]/g, "");
  if (num.startsWith("08")) num = "62" + num.slice(1);
  else if (num.startsWith("0")) num = "62" + num.slice(1);
  return num;
}

function matchAccessNumber(senderJid, list) {
  const sender = String(senderJid || "").replace(/@.+$/, "").replace(/[^0-9]/g, "");
  if (!sender) return false;
  return (list || []).some((n) => {
    const c = normalizeAccessNumber(n);
    if (!c) return false;
    return c === sender || c.endsWith(sender) || sender.endsWith(c);
  });
}

// Cek akses global: blacklist (banned) & mode whitelist.
// Dipakai checkMode (command) DAN handler gate (autoflow/autoAI) supaya
// nomor ke-ban / gak ter-whitelist gak bisa chat bot lewat jalur mana pun.
// Owner & fromMe SELALU lolos.
function checkAccessBlocked(m) {
  if (m.isOwner || m.fromMe || m.isNewsletter) return { blocked: false };

  const db = getDatabase();

  // Blacklist — bannedUsers (dipakai .ban/.unban). Enforce dari DB langsung
  // biar konsisten walau config in-memory belum ke-update.
  const banned = db.setting("bannedUsers") || [];
  if (matchAccessNumber(m.sender, banned)) {
    return {
      blocked: true,
      message:
        `╭─「 ✦ Aᴋsᴇs Dɪᴛᴏʟᴀᴋ ✦ 」\n` +
        `│ Nᴏᴍᴏʀ ᴋᴀᴍᴜ ᴅɪʙʟᴏᴋɪʀ ᴅᴀʀɪ ʙᴏᴛ ɪɴɪ\n` +
        `│ Hᴜʙᴜɴɢɪ ᴏᴡɴᴇʀ ᴜɴᴛᴜᴋ ɪɴꜰᴏ ʟᴇʙɪʜ ʟᴀɴᴊᴜᴛ\n` +
        `╰────  •  ────`,
    };
  }

  // Whitelist — mode bot hanya merespon nomor terdaftar
  if (db.setting("whitelistMode")) {
    const wl = db.setting("whitelist") || [];
    if (!matchAccessNumber(m.sender, wl)) {
      return {
        blocked: true,
        message:
          `╭─「 ✦ Mᴏᴅᴇ Wʜɪᴛᴇʟɪsᴛ ✦ 」\n` +
          `│ Bᴏᴛ ʜᴀɴʏᴀ ᴍᴇʀᴇsᴘᴏɴ ɴᴏᴍᴏʀ ᴛᴇʀᴅᴀꜰᴛᴀʀ\n` +
          `│ Nᴏᴍᴏʀ ᴋᴀᴍᴜ ʙᴇʟᴜᴍ ᴛᴇʀᴅᴀꜰᴛᴀʀ ᴏʟᴇʜ ᴏᴡɴᴇʀ\n` +
          `╰────  •  ────`,
      };
    }
  }

  return { blocked: false };
}

function checkMode(m, getActiveJadibots) {
  const db = getDatabase();
  const dbMode = db.setting("botMode");
  const mode = dbMode || config.mode || "public";

  const onlyGc = db.setting("onlyGc");
  const onlyPc = db.setting("onlyPc");
  const selfAdmin = db.setting("selfAdmin");
  const publicAdmin = db.setting("publicAdmin");
  const botAfk = db.setting("botAfk");

  // Blacklist & whitelist — PALING AWAL: nomor ke-ban gak dapat apa pun
  try {
    const accessResult = checkAccessBlocked(m);
    if (accessResult.blocked) {
      return {
        allowed: false,
        isModeLimited: true,
        modeLimitedMessage: accessResult.message,
      };
    }
  } catch {}

  if (botAfk && botAfk.active) {
    if (m.fromMe || m.isOwner) {
      return { allowed: true };
    }
    const duration = formatAfkDuration(Date.now() - botAfk.since);
    return {
      allowed: false,
      isAfk: true,
      afkMessage:
        `╭─「 ✦ AFK ✦ 」\n` +
        `│ Bot sedang AFK\n` +
        `│ Alasan: ${botAfk.reason || "AFK"}\n` +
        `│ Sejak: ${duration} yang lalu\n` +
        `╰────  •  ────`,
    };
  }

  // Mode PC/GC Only — blok dengan PESAN penjelasan (dulu silent 🚫 doang,
  // user nyangka bot error/fitur gak berfungsi). Owner selalu lolos.
  if (onlyGc && !m.isGroup && !m.isOwner) {
    return {
      allowed: false,
      isModeLimited: true,
      modeLimitedMessage:
        `╭─「 ✦ Mᴏᴅᴇ Gʀᴜᴘ Oɴʟʏ ✦ 」\n` +
        `│ Bᴏᴛ sᴇᴅᴀɴɢ ᴅᴀʟᴀᴍ ᴍᴏᴅᴇ ɢʀᴜᴘ sᴀᴊᴀ\n` +
        `│ Sɪʟᴀᴋᴀɴ ɢᴜɴᴀᴋᴀɴ ʙᴏᴛ ᴅɪ ᴅᴀʟᴀᴍ ɢʀᴜᴘ\n` +
        `│ Pʀɪᴠᴀᴛᴇ ᴄʜᴀᴛ ᴅɪɴᴏɴᴀᴋᴛɪꜰᴋᴀɴ sᴇᴍᴇɴᴛᴀʀᴀ\n` +
        `╰────  •  ────`,
    };
  }
  if (onlyPc && m.isGroup && !m.isOwner) {
    return {
      allowed: false,
      isModeLimited: true,
      modeLimitedMessage:
        `╭─「 ✦ Mᴏᴅᴇ Pʀɪᴠᴀᴛᴇ Oɴʟʏ ✦ 」\n` +
        `│ Bᴏᴛ sᴇᴅᴀɴɢ ᴅᴀʟᴀᴍ ᴍᴏᴅᴇ ᴘʀɪᴠᴀᴛᴇ ᴄʜᴀᴛ sᴀᴊᴀ\n` +
        `│ Sɪʟᴀᴋᴀɴ ᴄʜᴀᴛ ʙᴏᴛ ʟᴇᴡᴀᴛ ᴘᴇsᴀɴ ᴘʀɪʙᴀᴅɪ\n` +
        `│ Aᴋsᴇs ᴅɪ ɢʀᴜᴘ ᴅɪɴᴏɴᴀᴋᴛɪꜰᴋᴀɴ sᴇᴍᴇɴᴛᴀʀᴀ\n` +
        `╰────  •  ────`,
    };
  }

  const onlyThisGroup = db.setting("onlyThisGroup");
  if (onlyThisGroup && m.isGroup && !m.isOwner) {
    if (typeof onlyThisGroup === "string" && m.chat !== onlyThisGroup) {
      return { allowed: false };
    } else if (typeof onlyThisGroup === "object" && m.chat !== onlyThisGroup.jid) {
      return {
        allowed: false,
        isOnlyThisGroup: true,
        onlyThisGroupMessage:
          `╭─「 ✦ Akses Ditolak ✦ 」\n` +
          `│ Bot hanya bisa diakses di Grup Utama:\n` +
          `│ *${onlyThisGroup.name}*\n` +
          `│\n` +
          `│ 🔗 ${onlyThisGroup.link}\n` +
          `│\n` +
          `│ Setelah bergabung, bebas pakai semua fitur\n` +
          `╰────  •  ────`
      };
    }
  }

  const selfGroups = db.setting("selfGroups") || [];
  if (m.isGroup && selfGroups.includes(m.chat)) {
    if (m.fromMe) return { allowed: true };
    if (m.isOwner) return { allowed: true };
    return { allowed: false, isSelfGroup: true };
  }

  const publicGroups = db.setting("publicGroups") || [];
  if (m.isGroup && publicGroups.includes(m.chat)) {
    return { allowed: true };
  }

  if (mode === "self") {
    if (m.fromMe) return { allowed: true };
    if (m.isOwner) return { allowed: true };

    const activeJadibots = getActiveJadibots();
    if (activeJadibots.length > 0) {
      let jadibotList = "";
      activeJadibots.forEach((jb, i) => {
        jadibotList += `│ ${i + 1}. @${jb.id}\n`;
      });
      const mentions = activeJadibots.map((jb) => jb.id + "@s.whatsapp.net");
      return {
        allowed: false,
        hasJadibots: true,
        jadibotMessage:
          `╭─「 ✦ Mode Private ✦ 」\n` +
          `│ Bot utama dalam mode private\n` +
          `│ Bot turunan yang tersedia:\n` +
          `${jadibotList}` +
          `╰────  •  ────`,
        jadibotMentions: mentions,
      };
    }

    return { allowed: false };
  }

  if (mode === "public") {
    const onlyAdmin = db.setting("onlyAdmin");

    if (onlyAdmin) {
      if (m.fromMe || m.isOwner) return { allowed: true };
      if (!m.isGroup) return { allowed: true };
      if (m.isGroup && m.isAdmin) return { allowed: true };
      return { allowed: false };
    }

    if (selfAdmin) {
      if (m.fromMe || m.isOwner) return { allowed: true };
      if (m.isGroup && m.isAdmin) return { allowed: true };
      return { allowed: false };
    }

    if (publicAdmin) {
      if (m.fromMe || m.isOwner) return { allowed: true };
      if (!m.isGroup) return { allowed: true };
      if (m.isGroup && m.isAdmin) return { allowed: true };
      return { allowed: false };
    }

    return { allowed: true };
  }

  return { allowed: true };
}

export { levenshtein, formatAfkDuration, checkPermission, checkMode, checkAccessBlocked, matchAccessNumber, normalizeAccessNumber };
