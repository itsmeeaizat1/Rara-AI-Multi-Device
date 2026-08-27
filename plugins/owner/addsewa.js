// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import * as timeHelper from "../../src/lib/nova-time.js";
import fs from "fs";
import te from "../../src/lib/nova-error.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { notifySewaBot } from "../../src/lib/nova-saluran-broadcast.js";
import { calculateSewaPrice } from "../../src/lib/nova-sewa-price.js";
const pluginConfig = {
  name: "addsewa",
  alias: ["addsewa"],
  category: "owner",
  description: "Tambah grup ke whitelist sewa + auto join",
  usage: ".addsewa <link/id grup> <durasi>",
  example: ".addsewa https://chat.whatsapp.com/xxx 30d",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function parseDuration(str) {
  if (
    ["lifetime", "permanent", "forever", "unlimited"].includes(
      str.toLowerCase(),
    )
  )
    return Infinity;
  const match = str.match(/^(\d+)([iIdDmMyYhH])$/);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = {
    i: 60000,
    h: 3600000,
    d: 86400000,
    m: 2592000000,
    y: 31536000000,
  };
  return multiplier[unit] ? Date.now() + value * multiplier[unit] : null;
}

function formatDuration(str) {
  if (
    ["lifetime", "permanent", "forever", "unlimited"].includes(
      str.toLowerCase(),
    )
  )
    return "Permanent";
  const match = str.match(/^(\d+)([iIdDmMyYhH])$/);
  if (!match) return str;
  const units = { i: "menit", h: "jam", d: "hari", m: "bulan", y: "tahun" };
  return `${match[1]} ${units[match[2].toLowerCase()] || match[2]}`;
}

async function resolveGroupId(sock, input) {
  if (input.includes("chat.whatsapp.com/")) {
    const inviteCode = input.split("chat.whatsapp.com/")[1]?.split(/[\s?]/)[0];
    if (!inviteCode) return null;
    try {
      const metadata = await sock.groupGetInviteInfo(inviteCode);
      console.log(metadata);
      if (!metadata?.id) return null;
      return {
        id: metadata.id,
        name: metadata.subject || "Unknown",
        inviteCode,
      };
    } catch {
      return null;
    }
  }
  const groupId = input.includes("@g.us") ? input : input + "@g.us";
  try {
    const metadata = await sock.groupMetadata(groupId);
    return {
      id: groupId,
      name: metadata?.subject || "Unknown",
      inviteCode: null,
    };
  } catch {
    return { id: groupId, name: "Unknown", inviteCode: null };
  }
}

async function tryJoinGroup(sock, inviteCode, groupId) {
  if (!inviteCode)
    return {
      joined: false,
      reason: "Tidak ada invite code, tambahkan bot secara manual",
    };
  try {
    const botJid = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
    const metadata = await sock.groupMetadata(groupId).catch(() => null);
    if (metadata) {
      const isMember = metadata.participants?.some((p) => {
        const pJid = p.id?.split(":")[0] + "@s.whatsapp.net";
        return pJid === botJid || p.id === botJid;
      });
      if (isMember) return { joined: true, reason: "Bot sudah ada di grup" };
    }
    await sock.groupAcceptInvite(inviteCode);
    return { joined: true, reason: "Bot berhasil join grup" };
  } catch (e) {
    return { joined: false, reason: e.message || "Gagal join grup" };
  }
}

async function handler(m, { sock }) {
  const db = getDatabase();
  if (!db.db.data.sewa) {
    db.db.data.sewa = { enabled: false, groups: {} };
    db.db.write();
  }

  const args = m.args;
  if (args.length < 2) {
    return m.reply(
      `📝 *TAMBAH SEWA*\n\n` +
        `Format: *${m.prefix}addsewa <link/id> <durasi> [harga]*\n\n` +
        `*ꜰᴏʀᴍᴀᴛ ᴅᴜʀᴀꜱɪ:*\n` +
        `30i = 30 menit\n` +
        `12h = 12 jam\n` +
        `7d = 7 hari\n` +
        `1m = 1 bulan (30 hari)\n` +
        `1y = 1 tahun\n` +
        `lifetime = Permanent\n\n` +
        `*ɪɴᴘᴜᴛ ɢʀᴜᴘ:*\n` +
        `Link: https://chat.whatsapp.com/xxx\n` +
        `ID: 120363xxx@g.us\n\n` +
        `*ᴄᴏɴᴛᴏʜ:*\n` +
        `${m.prefix}addsewa https://chat.whatsapp.com/xxx 30d
  ${m.prefix}addsewa https://chat.whatsapp.com/xxx 7d "Rp 20.000"\n` +
        `${m.prefix}addsewa 120363xxx 1m\n\n` +
        `💡 Jika pakai link, bot akan otomatis join ke grup tersebut!`,
    );
  }

  const input = args[0];
  const durationStr = args[1];
  const customPrice = args[2]; // Optional: owner set harga manual
  const expiredAt = parseDuration(durationStr);

  if (!expiredAt)
    return m.reply(
      `❌ Format durasi tidak valid\n\n💡 *Contoh:* 7d, 1m, 1y, lifetime`,
    );

  await m.react("🕒");

  try {
    const result = await resolveGroupId(sock, input);
    if (!result) {
      return m.reply(claraWrap("addsewa", `❌ Grup tidak ditemukan atau link tidak valid`));
    }

    const { id: groupId, name: groupName, inviteCode } = result;
    const isLifetime = expiredAt === Infinity;

    db.db.data.sewa.groups[groupId] = {
      name: groupName,
      addedAt: Date.now(),
      expiredAt: isLifetime ? 0 : expiredAt,
      isLifetime,
      addedBy: m.sender,
    };
    db.db.write();

    const expiredStr = isLifetime
      ? "Permanent"
      : timeHelper.fromTimestamp(expiredAt, "D MMMM YYYY HH:mm");


    // Broadcast ke saluran WA - user baru sewa bot
    await notifySewaBot(sock, {
      name: m.pushName || "Owner",
      phoneNumber: m.sender.split("@")[0],
      groupName,
      duration: formatDuration(durationStr),
      price: customPrice || calculateSewaPrice(durationStr),
      expiredStr,
      isLifetime,
      totalGroups: Object.keys(db.db.data.sewa.groups).length,
    }).catch((e) => { console.error('[addsewa.js]:', e.message); });
    let text = `✅ *SEWA BERHASIL DITAMBAHKAN*\n\n`;
    text += `Grup: *${groupName}*\n`;
    text += `ID: ${groupId.split("@")[0]}\n`;
    text += `Durasi: *${formatDuration(durationStr)}*\n`;
    text += `Expired: *${expiredStr}*\n\n`;

    const joinResult = await tryJoinGroup(sock, inviteCode, groupId);

    if (joinResult.joined) {
      text += `✅ ${joinResult.reason}`;
      try {
        await new Promise((r) => setTimeout(r, 2000));
        await sock.sendText(
          groupId,
          `👋 *Halo Semuanya!*, perkenalkan, aku ${config.bot?.name}\n\n- Masa sewa: *${formatDuration(durationStr)}*\n- Aku akan keluar pada: *${expiredStr}*\n\nKetik *${m.prefix}menu* untuk melihat fitur dari bot ini.`,
          null,
          {
            contextInfo: saluranCtx(),
          },
        );
      } catch (e) { console.error('[addsewa.js]:', e.message); }
    } else {
      text += `⚠️ Auto-join gagal: ${joinResult.reason}\nTambahkan bot ke grup secara manual.`;
    }

    await m.react("🐣");
    return await m.reply( text, "addsewa");
  } catch (error) {
    await m.reply(claraWrap("addsewa", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
