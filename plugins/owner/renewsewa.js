// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import * as timeHelper from "../../src/lib/nova-time.js";
import fs from "fs";
import te from "../../src/lib/nova-error.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { notifySewaBot } from "../../src/lib/nova-saluran-broadcast.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "renewsewa",
  alias: ["renewsewa"],
  category: "owner",
  description: "Perpanjang durasi sewa grup",
  usage: ".renewsewa <link/id grup> <durasi>",
  example: ".renewsewa https://chat.whatsapp.com/xxx 30d",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function parseDurationMs(str) {
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
  return multiplier[unit] ? value * multiplier[unit] : null;
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
      if (!metadata?.id) return null;
      return { id: metadata.id, name: metadata.subject || "Unknown" };
    } catch {
      return null;
    }
  }
  const groupId = input.includes("@g.us") ? input : input + "@g.us";
  return { id: groupId, name: null };
}

async function handler(m, { sock }) {
  const db = getDatabase();
  if (!db.db.data.sewa) {
    db.db.data.sewa = { enabled: false, groups: {} };
    db.db.write();
  }

  const args = m.args;
  if (args.length < 2) {
    return m.reply(claraWrap("renewsewa", `📝 *PERPANJANG SEWA*\n\n` +
        `Format: *${m.prefix}renewsewa <link/id> <durasi>*\n\n` +
        `*FORMAT DURASI:*\n` +
        `30i = 30 menit\n` +
        `12h = 12 jam\n` +
        `7d = 7 hari\n` +
        `1m = 1 bulan\n` +
        `1y = 1 tahun\n` +
        `lifetime = Permanent\n\n` +
        `*CONTOH:*\n` +
        `${m.prefix}renewsewa https://chat.whatsapp.com/xxx 30d\n` +
        `${m.prefix}renewsewa 120363xxx 1m\n\n` +
        `💡 Durasi ditambahkan ke sisa waktu yang ada, bukan di-reset`));
  }

  const input = args[0];
  const durationStr = args[1];
  const durationMs = parseDurationMs(durationStr);

  if (!durationMs)
    return m.reply(claraWrap("Renewsewa", `❌ Format durasi tidak valid\n💡 *Contoh:* 7d, 1m, 1y, lifetime`));

  await m.react("🕒");

  try {
    const result = await resolveGroupId(sock, input);
    if (!result) {
      return m.reply(claraWrap("renewsewa", `❌ Grup tidak ditemukan`));
    }

    const { id: groupId } = result;
    const existing = db.db.data.sewa.groups[groupId];

    if (!existing) {
      return m.reply(
        `❌ Grup tidak terdaftar\nGunakan *${m.prefix}addsewa* untuk menambahkan`,
      );
    }

    if (durationMs === Infinity) {
      existing.expiredAt = 0;
      existing.isLifetime = true;
    } else {
      if (existing.isLifetime) {
        return m.reply(claraWrap("Renewsewa", `❌ Grup ini sudah Permanent, tidak perlu diperpanjang`));
      }
      const baseTime =
        existing.expiredAt > Date.now() ? existing.expiredAt : Date.now();
      existing.expiredAt = baseTime + durationMs;
      existing.isLifetime = false;
    }

    existing.renewedAt = Date.now();
    existing.renewedBy = m.sender;
    if (existing.status) delete existing.status;
    // Reset warning flags
    delete existing._warned3d;
    delete existing._warned24h;
    delete existing._warned1h;
    db.db.write();

    const groupName = existing.name || groupId.split("@")[0];
    const expiredStr = existing.isLifetime
      ? "Permanent"
      : timeHelper.fromTimestamp(existing.expiredAt, "D MMMM YYYY HH:mm");

    // Broadcast ke saluran WA - sewa bot diperpanjang
    await notifySewaBot(sock, {
      name: m.pushName || "Owner",
      phoneNumber: m.sender.split("@")[0],
      groupName,
      duration: "Perpanjang " + formatDuration(durationStr),
      price: "N/A (Renew)",
      expiredStr,
      isLifetime: existing.isLifetime,
      totalGroups: Object.keys(db.db.data.sewa.groups).length,
    }).catch((e) => { console.error('[renewsewa.js]:', e.message); });

    await m.react("🐣");

    let text = `✅ *SEWA DIPERPANJANG*\n\n`;
    text += `Grup: *${groupName}*\n`;
    text += `Tambahan: *${formatDuration(durationStr)}*\n`;
    text += `Expired baru: *${expiredStr}*`;

    try {
      await sock.sendText(
        groupId,
        `📢 Sewa bot telah diperpanjang!\n\nTambahan: *${formatDuration(durationStr)}*\nExpired baru: *${expiredStr}*`,
        null,
        {
          contextInfo: saluranCtx(),
        },
      );
    } catch (e) { console.error('[renewsewa.js]:', e.message); }

    return m.reply(claraWrap("renewsewa", text));
  } catch (error) {
    await m.reply(claraWrap("renewsewa", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
