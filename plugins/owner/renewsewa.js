// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import * as timeHelper from "../../src/lib/nova-time.js";
import fs from "fs";
import te from "../../src/lib/nova-error.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { notifySewaBot } from "../../src/lib/nova-saluran-broadcast.js";
import { grantSewaPremium } from "../../src/lib/nova-sewa-premium.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
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
      return { id: metadata.id, name: metadata.subject || "Unknown", inviteCode };
    } catch {
      return null;
    }
  }
  const groupId = input.includes("@g.us") ? input : input + "@g.us";
  return { id: groupId, name: null, inviteCode: null };
}

/**
 * Cek apakah bot masih anggota grup — kalau sudah keluar
 * (auto-out expired), coba join lagi via inviteCode.
 * @returns {{ isMember: boolean, rejoined: boolean }}
 */
async function ensureBotInGroup(sock, groupId, inviteCode) {
  try {
    const botJid = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
    const metadata = await sock.groupMetadata(groupId).catch(() => null);
    const isMember = metadata?.participants?.some((p) => {
      const pJid = p.id?.split(":")[0] + "@s.whatsapp.net";
      return pJid === botJid || p.id === botJid;
    });
    if (isMember) return { isMember: true, rejoined: false };
    if (inviteCode) {
      await sock.groupAcceptInvite(inviteCode);
      return { isMember: true, rejoined: true };
    }
    return { isMember: false, rejoined: false };
  } catch {
    return { isMember: false, rejoined: false };
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
  try {
    const result = await resolveGroupId(sock, input);
    if (!result) {
      return m.reply(claraWrap("renewsewa", `❌ Grup tidak ditemukan`));
    }

    const { id: groupId, inviteCode } = result;
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

    // Auto-extend Premium untuk NOMOR PENYEWA ASLI (addedBy) — bukan yang menjalankan renew (owner)
    // Kebijakan owner 26 Sep 2026: premium cuma untuk nomor yang menyewa
    const premiumGrant = grantSewaPremium(existing.addedBy, durationStr);

    // Sinkron dengan sistem join/out otomatis: kalau bot sudah keluar
    // (sewa expired → auto-out), coba join lagi via link undangan
    const presence = await ensureBotInGroup(sock, groupId, inviteCode);
    if (!presence.isMember && !presence.rejoined) {
      console.error(
        "[renewsewa] bot tidak ada di grup & tidak punya invite link untuk rejoin:",
        groupId,
      );
    }

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
    let text = `✅ *sewa diperpanjang*\n\n`;
    text += `Grup: *${groupName}*\n`;
    text += `Tambahan: *${formatDuration(durationStr)}*\n`;
    text += `Expired baru: *${expiredStr}*\n`;
    text += `Premium: ${premiumGrant.ok
      ? `✅ ${premiumGrant.extended ? "diperpanjang" : "gratis"} ${premiumGrant.days} hari utk ${existing.addedBy?.split("@")[0]}`
      : "❌ gagal (grant error, cek manual)"}\n`;
    if (presence.rejoined) {
      text += `\n✅ Bot sudah keluar sebelumnya — otomatis join ulang ke grup`;
    } else if (!presence.isMember) {
      text += `\n⚠️ Bot belum ada di grup — ulangi pakai LINK undangan biar bot bisa join lagi`;
    }

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
