// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "cemburu",
  alias: ["jealous", "cemburu sama siapa"],
  category: "rpg",
  description: "Tandain seseorang yang bikin cemburu, pasangan dapet notifikasi",
  usage: ".cemburu @target [alasan]",
  example: ".cemburu @628xxx kok mesra banget sih",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const CEMBURU_LINES = [
  "{user} merasa cemburu banget sama {target}!",
  "{user} ngeliat {target} bikin hatinya nggak tenang...",
  "{user} cemburu buta sama {target}!",
  "{user} nggak suka {target} terlalu deket sama pasangannya!",
  "{user} merasa tersaingi oleh {target}!",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = db.getUser(m.sender);
    const rpg = user?.rpg || {};
    const partnerJid = rpg.spouse || rpg.dating;
    const target = m.mentionedJid?.[0];

    if (!partnerJid) {
      const text =
        claraWrap("Cemburu", [`╎❏ Status: *Belum punya pasangan*`,
          `╎❏ Jomblo nggak bisa cemburu, mau cemburu ke siapa?`].join("\n")) + "\n" +
        tipText(`Ketik ${prefix}jadian @target untuk punya pasangan`);

      await sendReplyWithNav(sock, m, text, "cemburu");
      return { handled: true };
    }

    if (!target) {
      const text =
        claraWrap("Cemburu", [`╎❏ Cara pakai: *${prefix}cemburu @target [alasan]*`,
          `╎❏ Contoh: *${prefix}cemburu @628xxx kok mesra banget*`,
          `╎❏ Pasanganmu akan dapet notifikasi cemburu`,
          `╎❏ Affection turun sedikit tapi drama naik!`].join("\n")) + "\n" +
        tipText(`Tag seseorang yang bikin kamu cemburu`);

      await sendReplyWithNav(sock, m, text, "cemburu");
      return { handled: true };
    }

    if (target === m.sender) {
      const text =
        claraWrap("Cemburu", [`╎❏ Status: *Cemburu ke diri sendiri?*`,
          `╎❏ Itu namanya insecure, bukan cemburu`].join("\n")) + "\n" +
        tipText(`Tag orang lain, bukan diri sendiri`);

      await sendReplyWithNav(sock, m, text, "cemburu");
      return { handled: true };
    }

    if (target === partnerJid) {
      const text =
        claraWrap("Cemburu", [`╎❏ Status: *Cemburu ke pasangan sendiri?*`,
          `╎❏ Itu namanya posesif, bukan cemburu`].join("\n")) + "\n" +
        tipText(`Tag orang lain selain pasanganmu`);

      await sendReplyWithNav(sock, m, text, "cemburu");
      return { handled: true };
    }

    const partner = db.getUser(partnerJid);
    const partnerName = partner?.name || partnerJid.split("@")[0];
    const userName = m.pushName || user?.name || "Player";
    const targetName = db.getUser(target)?.name || target.split("@")[0];
    const alasan = m.body?.replace(/^[!.#]\S+\s+@\S+\s*/, "").trim() || "tanpa alasan yang jelas";

    const line = CEMBURU_LINES[Math.floor(Math.random() * CEMBURU_LINES.length)]
      .replace(/{user}/g, userName)
      .replace(/{target}/g, targetName);

    // Affection turun sedikit karena drama
    const affectionLoss = Math.floor(Math.random() * 5) + 3; // 3-8
    rpg.affection = Math.max(0, (rpg.affection || 0) - affectionLoss);
    rpg.cemburuCount = (rpg.cemburuCount || 0) + 1;
    db.setUser(m.sender, { rpg });

    const partnerRpg = partner?.rpg || {};
    partnerRpg.affection = Math.max(0, (partnerRpg.affection || 0) - Math.floor(affectionLoss / 2));
    db.setUser(partnerJid, { rpg: partnerRpg });
    db.save();

    // Kirim notifikasi ke pasangan
    const notifText =
      claraWrap("Notifikasi Cemburu", [`╎❏ Dari: *${userName}*`,
        `╎❏ Target: *${targetName}*`,
        `╎❏ Alasan: *${alasan}*`,
        `╎❏ Affection: *-${affectionLoss}*`,
        `╎❏ Pesan: *${line}*`].join("\n")) + "\n" +
      tipText(`Tenangkan pasanganmu: ${prefix}maaf`);

    const text =
      claraWrap("Cemburu", [`╎❏ ${line}`,
        `╎❏ Target: *${targetName}*`,
        `╎❏ Alasan: *${alasan}*`,
        `╎❏ Pasangan: *${partnerName}*`,
        `╎❏ Affection: *-${affectionLoss}*`,
        `╎❏ Total Cemburu: *${rpg.cemburuCount}*`].join("\n")) + "\n" +
      tipText(`Minta maaf ke pasangan: ${prefix}maaf`);

    await sock.sendMessage(m.chat, {
      text,
      mentions: [m.sender, partnerJid, target],
    });

    // Kirim notifikasi langsung ke pasangan
    try {
      await sock.sendMessage(partnerJid, {
        text: notifText,
        mentions: [partnerJid],
      });
    } catch (e) { console.error('[cemburu.js]:', e.message); }

    return { handled: true };
  } catch (error) {
    const text =
      claraWrap("Gagal", [`╎❏ Status: *Gagal*`,
        `╎❏ Alasan: *${error.message}*`].join("\n")) + "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("cemburu", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
