// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import * as timeHelper from "../../src/lib/nova-time.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { notifySewaApproved, notifySewaBot } from "../../src/lib/nova-saluran-broadcast.js";
import { calculateSewaPrice } from "../../src/lib/nova-sewa-price.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "approvesewa",
  alias: ["sewaapprove", "accsewa"],
  category: "owner",
  description: "Approve pendaftaran sewa dari user",
  usage: ".approvesewa <nomor>",
  example: ".approvesewa 628xxx",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function parseDuration(str) {
  if (["lifetime", "permanent", "forever", "unlimited"].includes(str.toLowerCase()))
    return Infinity;
  const match = str.match(/^(\d+)([iIdDmMyYhH])$/);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = {
    i: 60000, h: 3600000, d: 86400000, m: 2592000000, y: 31536000000,
  };
  return multiplier[unit] ? Date.now() + value * multiplier[unit] : null;
}

function formatDuration(str) {
  const units = { i: "menit", h: "jam", d: "hari", m: "bulan", y: "tahun" };
  if (str.toLowerCase() === "lifetime") return "Permanent";
  const match = str.match(/^(\d+)([iIdDmMyYhH])$/);
  if (!match) return str;
  return match[1] + " " + (units[match[2].toLowerCase()] || match[2]);
}

async function tryJoinGroup(sock, inviteCode, groupId) {
  if (!inviteCode)
    return { joined: false, reason: "Tidak ada invite code" };
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
    db.db.data.sewa = { enabled: false, groups: {}, registrations: {} };
    db.db.write();
  }
  if (!db.db.data.sewa.registrations) {
    db.db.data.sewa.registrations = {};
    db.db.write();
  }

  const input = m.text?.trim();
  if (!input) {
    // Show pending registrations
    const pending = Object.entries(db.db.data.sewa.registrations).filter(
      ([, r]) => r.status === "pending"
    );
    if (pending.length === 0) {
      return m.reply(
        "Tidak ada pendaftaran sewa yang menunggu approve.\n\n" +
        "User bisa daftar dengan: .daftarsewa <link> <durasi>"
      );
    }

    let text = "DAFTAR SEWA MENUNGGU APPROVE\n\n";
    pending.forEach(([sender, r], i) => {
      text += (i + 1) + ". " + r.phoneNumber + "\n";
      text += "   Grup: " + r.groupName + "\n";
      text += "   Durasi: " + formatDuration(r.duration) + "\n";
      text += "   Harga: " + (r.price || "N/A") + "\n";
      text += "   Approve: .approvesewa " + r.phoneNumber + "\n\n";
    });
    return await sendReplyWithNav(sock, m, text, "approvesewa");
  }

  // Parse input: .approvesewa <nomor> [harga]
  const inputParts = input.split(/\s+/);
  const phoneNum = inputParts[0].replace(/\D/g, "");
  const customPrice = inputParts.slice(1).join(" ") || ""; // Optional: owner set harga manual
  if (!phoneNum) {
    return m.reply(claraWrap("Approvesewa", "Format: *.approvesewa <nomor> [harga]*\n\nContoh:\n.approvesewa 628xxx\n.approvesewa 628xxx \"Rp 25.000\""));
  }

  // Find registration by phone number
  let regKey = null;
  let regData = null;
  for (const [key, val] of Object.entries(db.db.data.sewa.registrations)) {
    if (val.phoneNumber === phoneNum && val.status === "pending") {
      regKey = key;
      regData = val;
      break;
    }
  }

  if (!regData) {
    return m.reply(
      "Tidak ada pendaftaran pending dari nomor " + phoneNum + "\n\n" +
      "Ketik *.approvesewa* untuk lihat semua pendaftaran pending."
    );
  }


  try {
    const expiredAt = parseDuration(regData.duration);
    const isLifetime = expiredAt === Infinity;

    // Add to sewa groups
    db.db.data.sewa.groups[regData.groupId] = {
      name: regData.groupName,
      addedAt: Date.now(),
      expiredAt: isLifetime ? 0 : expiredAt,
      isLifetime,
      addedBy: regData.sender,
    };

    // Update registration status
    db.db.data.sewa.registrations[regKey].status = "approved";
    db.db.data.sewa.registrations[regKey].approvedAt = Date.now();
    db.db.data.sewa.registrations[regKey].approvedBy = m.sender;
    db.db.write();

    // Try to join group
    const joinResult = await tryJoinGroup(sock, regData.inviteCode, regData.groupId);

    const expiredStr = isLifetime
      ? "Permanent"
      : timeHelper.fromTimestamp(expiredAt, "D MMMM YYYY HH:mm");

    let ownerText = "SEWA DIAPPROVE\n\n";
    ownerText += "Grup: *" + regData.groupName + "*\n";
    ownerText += "Nomor: " + regData.phoneNumber + "\n";
    ownerText += "Durasi: *" + formatDuration(regData.duration) + "*\n";
    ownerText += "Expired: *" + expiredStr + "*\n";

    if (joinResult.joined) {
      ownerText += "\nBot: " + joinResult.reason;
      // Send welcome to group
      try {
        await new Promise((r) => setTimeout(r, 2000));
        const cfg = (await import("../../config.js")).default;
        await sock.sendText(
          regData.groupId,
          "Halo semuanya! Aku " + (cfg.bot?.name || "Bot") + "\n\n" +
          "Sewa: *" + formatDuration(regData.duration) + "*\n" +
          "Expired: *" + expiredStr + "*\n" +
          "Disewa oleh: " + regData.phoneNumber + "\n\n" +
          "Ketik *.menu* untuk lihat fitur bot.",
          null,
          { contextInfo: saluranCtx() },
        );
      } catch {}
    } else {
      ownerText += "\nBot join gagal: " + joinResult.reason + "\n";
      ownerText += "Tambahkan bot manual ke grup.";
    }

    // Notify registrant
    try {
      await sock.sendMessage(regData.sender, {
        text:
          "SEWA DIAPPROVE!\n\n" +
          "Grup: *" + regData.groupName + "*\n" +
          "Durasi: *" + formatDuration(regData.duration) + "*\n" +
          "Expired: *" + expiredStr + "*\n\n" +
          (joinResult.joined
            ? "Bot sudah join ke grup kamu. Ketik .menu di grup untuk lihat fitur."
            : "Bot gagal join otomatis. Tambahkan bot manual ke grup."),
      });
    } catch {}

    // Broadcast ke saluran WA - sewa approved
    await notifySewaApproved(sock, {
      name: regData.name,
      groupName: regData.groupName,
      phoneNumber: regData.phoneNumber,
      duration: formatDuration(regData.duration),
      expiredStr,
      totalGroups: Object.keys(db.db.data.sewa.groups).length,
    }).catch(() => {});

    // Broadcast ke saluran WA - user baru sewa bot (rincian lengkap)
    await notifySewaBot(sock, {
      name: regData.name || "-",
      phoneNumber: regData.phoneNumber,
      groupName: regData.groupName,
      duration: formatDuration(regData.duration),
      price: customPrice || regData.price || calculateSewaPrice(regData.duration),
      expiredStr,
      isLifetime: regData.duration === "lifetime",
      totalGroups: Object.keys(db.db.data.sewa.groups).length,
    }).catch(() => {});

    return m.reply(ownerText);
  } catch (error) {
    return m.reply("Gagal approve sewa: " + (error.message || "Unknown error"));
  }
}

export { pluginConfig as config, handler };
