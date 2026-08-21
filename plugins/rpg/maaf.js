// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "maaf",
  alias: ["maafpasangan", "sorry", "mintamaaf"],
  category: "rpg",
  description: "Minta maaf ke pasangan setelah konflik, affection naik lagi",
  usage: ".maaf [pesan]",
  example: ".maaf maaf ya kemarin aku salah",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const MAAF_LINES = [
  "{user} meminta maaf tulus ke {partner}: 'Maaf ya, aku nggak sempurna'",
  "{user} berlutut di depan {partner}: 'Aku minta maaf, jangan marah lagi ya'",
  "{user} ngomong ke {partner}: 'Maafin aku, aku nggak mau kehilangan kamu'",
  "{user} kirim pesan maaf ke {partner} dengan tulus hati",
  "{user} minta maaf ke {partner} sambil turun hati, harap dimaklumi",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = db.getUser(m.sender);
    const rpg = user?.rpg || {};
    const partnerJid = rpg.spouse || rpg.dating;

    if (!partnerJid) {
      const text =
        claraWrap("Maaf", [`  ┊  ➶ Status: *Belum punya pasangan*`,
          `  ┊  ➶ Minta maaf ke siapa? Ke Tuhan?`].join("\n")) + "\n" +
        tipText(`Ketik ${prefix}jadian @target untuk punya pasangan`);

      await sendReplyWithNav(sock, m, text, "maaf");
      return { handled: true };
    }

    const partner = db.getUser(partnerJid);
    const partnerName = partner?.name || partnerJid.split("@")[0];
    const userName = m.pushName || user?.name || "Player";
    const pesan = m.body?.replace(/^[!.#]\S+\s*/, "").trim();

    // Cooldown 30 menit
    const cd = db.checkCooldown(m.sender, "maaf", 1800);
    if (cd) {
      const mins = Math.floor(cd / 60);
      const text =
        claraWrap("Maaf", [`  ┊  ➶ Status: *Masih cooldown*`,
          `  ┊  ➶ Tunggu: *${mins} menit lagi*`,
          `  ┊  ➶ Jangan minta maaf terus-terusan, nggak tulus`].join("\n")) + "\n" +
        tipText(`Tunggu sebentar ya`);

      await sendReplyWithNav(sock, m, text, "maaf");
      return { handled: true };
    }

    const line = MAAF_LINES[Math.floor(Math.random() * MAAF_LINES.length)]
      .replace(/{user}/g, userName)
      .replace(/{partner}/g, partnerName);

    // Cek apakah ada konflik aktif (cemburu/konflik terakhir < 1 jam)
    const lastConflict = rpg.lastConflictAt || 0;
    const hasRecentConflict = (Date.now() - lastConflict) < 3600000;

    // Affection recovery
    let affectionGain;
    if (hasRecentConflict) {
      affectionGain = Math.floor(Math.random() * 10) + 15; // 15-25 (lebih besar karena ada konflik)
    } else {
      affectionGain = Math.floor(Math.random() * 5) + 5; // 5-10 (normal)
    }

    rpg.affection = (rpg.affection || 0) + affectionGain;
    rpg.maafCount = (rpg.maafCount || 0) + 1;
    rpg.lastConflictAt = 0; // Reset konflik
    db.setUser(m.sender, { rpg });

    const partnerRpg = partner?.rpg || {};
    partnerRpg.affection = (partnerRpg.affection || 0) + affectionGain;
    partnerRpg.lastConflictAt = 0;
    db.setUser(partnerJid, { rpg: partnerRpg });
    db.save();

    db.setCooldown(m.sender, "maaf", 1800);

    const totalAffection = rpg.affection;
    const bondLevel = Math.floor(totalAffection / 100) + 1;

    let extraInfo = [];
    if (pesan) {
      extraInfo.push(`  ┊  ➶ Pesan: *"${pesan}"*`);
    }
    if (hasRecentConflict) {
      extraInfo.push(`  ┊  ➶ Bonus: *Konflik selesai!* (+${affectionGain - 5} extra)`);
    }

    const text =
      claraWrap("Maaf", [`  ┊  ➶ ${line}`,
        `  ┊  ➶ Affection: *+${affectionGain}*`,
        `  ┊  ➶ Total Affection: *${totalAffection}*`,
        `  ┊  ➶ Bond Level: *${bondLevel}*`,
        `  ┊  ➶ Total Minta Maaf: *${rpg.maafCount}*`,
        ...extraInfo].join("\n")) + "\n" +
      tipText(`Beri peluk: ${prefix}cuddling | Kasih kado: ${prefix}kado`);

    await sock.sendMessage(m.chat, {
      text,
      mentions: [m.sender, partnerJid],
    });

    return { handled: true };
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) + "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("maaf", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
