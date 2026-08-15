// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "honeymoon",
  alias: ["bulamadu", "hm", "honeymoontrip"],
  category: "rpg",
  description: "Bulan madu bareng pasangan (khusus nikah), sekali sebulan",
  usage: ".honeymoon",
  example: ".honeymoon",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const HONEYMOON_SPOTS = [
  "Pantai Kuta Bali",
  "Gunung Bromo",
  "Danau Toba",
  "Raja Ampat Papua",
  "Pulau Lombok",
  "Taman Mini Indonesia",
  "Bukittinggi Sumatra",
  "Pantai Parangtritis",
  "Pulau Derawan",
  "Dieng Plateau",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = db.getUser(m.sender);
    const rpg = user?.rpg || {};
    const now = Date.now();

    // Harus married
    if (!rpg.spouse) {
      const text =
        claraWrap("Honeymoon", [`◦ Status: *Belum menikah*`,
          `◦ Bulan madu cuma buat yang udah nikah!`].join("\n")) + "\n" +
        tipText(`Ketik ${prefix}marry @target untuk menikah dulu`);

      await sendReplyWithNav(sock, m, text, "honeymoon");
      return { handled: true };
    }

    // Cooldown 30 hari
    const lastHoneymoon = rpg.lastHoneymoon || 0;
    const oneMonth = 30 * 86400000;
    const elapsed = now - lastHoneymoon;

    if (lastHoneymoon > 0 && elapsed < oneMonth) {
      const remaining = oneMonth - elapsed;
      const daysLeft = Math.ceil(remaining / 86400000);
      const text =
        claraWrap("Honeymoon", [`◦ Status: *Sudah bulan madu bulan ini*`,
          `◦ Tunggu: *${daysLeft} hari lagi*`,
          `◦ Bulan madu cuma sekali sebulan!`].join("\n")) + "\n" +
        tipText(`Sambil nunggu, tingkatkan affection: ${prefix}cuddling, ${prefix}kiss`);

      await sendReplyWithNav(sock, m, text, "honeymoon");
      return { handled: true };
    }

    const partner = db.getUser(rpg.spouse);
    const partnerName = partner?.name || rpg.spouse.split("@")[0];
    const userName = m.pushName || user?.name || "Player";
    const spot = HONEYMOON_SPOTS[Math.floor(Math.random() * HONEYMOON_SPOTS.length)];

    // Bonus exp & gold berdua
    const expBonus = Math.floor(Math.random() * 50) + 100;
    const goldBonus = Math.floor(Math.random() * 100) + 200;
    const affectionBonus = Math.floor(Math.random() * 20) + 30;

    // Update pengirim
    rpg.exp = (rpg.exp || 0) + expBonus;
    rpg.koin = (rpg.koin || 0) + goldBonus;
    rpg.affection = (rpg.affection || 0) + affectionBonus;
    rpg.lastHoneymoon = now;
    rpg.honeymoonCount = (rpg.honeymoonCount || 0) + 1;
    db.setUser(m.sender, { rpg });

    // Update pasangan
    const partnerRpg = partner?.rpg || {};
    partnerRpg.exp = (partnerRpg.exp || 0) + expBonus;
    partnerRpg.koin = (partnerRpg.koin || 0) + goldBonus;
    partnerRpg.affection = (partnerRpg.affection || 0) + affectionBonus;
    partnerRpg.lastHoneymoon = now;
    db.setUser(rpg.spouse, { rpg: partnerRpg });
    db.save();

    const totalAffection = rpg.affection;
    const bondLevel = Math.floor(totalAffection / 100) + 1;

    const text =
      claraWrap("Honeymoon", [`◦ ${userName} & ${partnerName} pergi bulan madu!`,
        `◦ Lokasi: *${spot}*`,
        `◦ EXP: *+${expBonus}* (berdua)`,
        `◦ Gold: *+${goldBonus}* (berdua)`,
        `◦ Affection: *+${affectionBonus}*`,
        `◦ Total Affection: *${totalAffection}*`,
        `◦ Bond Level: *${bondLevel}*`,
        `◦ Total Honeymoon: *${rpg.honeymoonCount}*`].join("\n")) + "\n" +
      tipText(`Bulan madu lagi bulan depan ${prefix}honeymoon`);

    await sock.sendMessage(m.chat, {
      text,
      mentions: [m.sender, rpg.spouse],
    });

    return { handled: true };
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) + "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("honeymoon", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
