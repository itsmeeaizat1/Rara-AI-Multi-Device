// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "babymoon",
  alias: ["babymoontrip", "bmoon", "liburanbaby"],
  category: "rpg",
  description: "Liburan khusus pasangan nikah lama (30+ hari), bond level naik",
  usage: ".babymoon",
  example: ".babymoon",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const BABYMOON_SPOTS = [
  "Pulau Bali Nusa Dua",
  "Pantai Kuta Lombok",
  "Gunung Rinjani",
  "Toba Lake Samosir",
  "Pulau Padar Flores",
  "Karimunjawa Islands",
  "Wakatobi Sulawesi",
  "Pulau Weh Aceh",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = db.getUser(m.sender);
    const rpg = user?.rpg || {};
    const now = Date.now();

    if (!rpg.spouse) {
      const text =
        claraWrap("Babymoon", [`  ┊  ➶ Status: *Belum menikah*`,
          `  ┊  ➶ Babymoon khusus pasangan yang udah nikah lama!`].join("\n")) + "\n" +
        tipText(`Ketik ${prefix}marry @target untuk menikah dulu`);

      await sendReplyWithNav(sock, m, text, "babymoon");
      return { handled: true };
    }

    // Cek durasi nikah — minimal 30 hari
    const marriedDuration = now - (rpg.marriedAt || 0);
    const minDuration = 30 * 86400000;

    if (marriedDuration < minDuration) {
      const daysLeft = Math.ceil((minDuration - marriedDuration) / 86400000);
      const text =
        claraWrap("Babymoon", [`  ┊  ➶ Status: *Baru menikah*`,
          `  ┊  ➶ Babymoon butuh nikah minimal 30 hari`,
          `  ┊  ➶ Tunggu: *${daysLeft} hari lagi*`].join("\n")) + "\n" +
        tipText(`Sambil nunggu: ${prefix}honeymoon, ${prefix}valentine`);

      await sendReplyWithNav(sock, m, text, "babymoon");
      return { handled: true };
    }

    // Cooldown 14 hari
    const lastBabymoon = rpg.lastBabymoon || 0;
    const cooldown = 14 * 86400000;

    if (lastBabymoon > 0 && (now - lastBabymoon) < cooldown) {
      const daysLeft = Math.ceil((cooldown - (now - lastBabymoon)) / 86400000);
      const text =
        claraWrap("Babymoon", [`  ┊  ➶ Status: *Sudah babymoon*`,
          `  ┊  ➶ Tunggu: *${daysLeft} hari lagi*`,
          `  ┊  ➶ Babymoon 2 minggu sekali!`].join("\n")) + "\n" +
        tipText(`Sambil nunggu: ${prefix}cuddling, ${prefix}kiss`);

      await sendReplyWithNav(sock, m, text, "babymoon");
      return { handled: true };
    }

    const partner = db.getUser(rpg.spouse);
    const partnerName = partner?.name || rpg.spouse.split("@")[0];
    const userName = m.pushName || user?.name || "Player";
    const spot = BABYMOON_SPOTS[Math.floor(Math.random() * BABYMOON_SPOTS.length)];

    // Bond level naik besar
    const affectionGain = Math.floor(Math.random() * 40) + 60;
    const expBonus = Math.floor(Math.random() * 80) + 120;
    const goldBonus = Math.floor(Math.random() * 150) + 300;

    rpg.affection = (rpg.affection || 0) + affectionGain;
    rpg.exp = (rpg.exp || 0) + expBonus;
    rpg.koin = (rpg.koin || 0) + goldBonus;
    rpg.lastBabymoon = now;
    rpg.babymoonCount = (rpg.babymoonCount || 0) + 1;
    db.setUser(m.sender, { rpg });

    const partnerRpg = partner?.rpg || {};
    partnerRpg.affection = (partnerRpg.affection || 0) + affectionGain;
    partnerRpg.exp = (partnerRpg.exp || 0) + expBonus;
    partnerRpg.koin = (partnerRpg.koin || 0) + goldBonus;
    partnerRpg.lastBabymoon = now;
    db.setUser(rpg.spouse, { rpg: partnerRpg });
    db.save();

    const totalAffection = rpg.affection;
    const bondLevel = Math.floor(totalAffection / 100) + 1;
    const marriedDays = Math.floor(marriedDuration / 86400000);

    const text =
      claraWrap("Babymoon", [`  ┊  ➶ ${userName} & ${partnerName} pergi babymoon!`,
        `  ┊  ➶ Lokasi: *${spot}*`,
        `  ┊  ➶ Udah nikah: *${marriedDays} hari*`,
        `  ┊  ➶ Affection: *+${affectionGain}* (MEGA BONUS)`,
        `  ┊  ➶ EXP: *+${expBonus}* (berdua)`,
        `  ┊  ➶ Gold: *+${goldBonus}* (berdua)`,
        `  ┊  ➶ Total Affection: *${totalAffection}*`,
        `  ┊  ➶ Bond Level: *${bondLevel}*`,
        `  ┊  ➶ Total Babymoon: *${rpg.babymoonCount}*`].join("\n")) + "\n" +
      tipText(`Babymoon lagi 2 minggu ${prefix}babymoon`);

    await sock.sendMessage(m.chat, {
      text,
      mentions: [m.sender, rpg.spouse],
    });

    return { handled: true };
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) + "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("babymoon", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
