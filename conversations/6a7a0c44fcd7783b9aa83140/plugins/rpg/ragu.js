import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "ragu",
  alias: ["ragu hubungan", "doubt", "ragu sama kamu"],
  category: "rpg",
  description: "Ekspresikan keraguan tentang hubungan, pasangan bisa respons",
  usage: ".ragu [alasan]",
  example: ".ragu aku nggak yakin kita cocok",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const RAGU_LINES = [
  "{user} merasa ragu tentang hubungannya dengan {partner}...",
  "{user} ngomong: 'Aku nggak yakin kita bisa bertahan lama'",
  "{user} bilang ke {partner}: 'Apakah kita masih sama seperti dulu?'",
  "{user} merasa jaraknya makin jauh dengan {partner}",
  "{user} ragu, tapi masih sayang sama {partner}",
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
        claraWrap("Ragu", [`◦ Status: *Belum punya pasangan*`,
          `◦ Ragu tentang apa? Hubungan yang nggak ada?`].join("\n")) + "\n" +
        tipText(`Ketik ${prefix}jadian @target untuk mulai hubungan`);

      await sendReplyWithNav(sock, m, text, "ragu");
      return { handled: true };
    }

    const partner = db.getUser(partnerJid);
    const partnerName = partner?.name || partnerJid.split("@")[0];
    const userName = m.pushName || user?.name || "Player";
    const alasan = m.body?.replace(/^[!.#]\S+\s*/, "").trim() || "tanpa alasan";

    // Cooldown 1 jam — ragu itu berat
    const cd = db.checkCooldown(m.sender, "ragu", 3600);
    if (cd) {
      const mins = Math.floor(cd / 60);
      const text =
        claraWrap("Ragu", [`◦ Status: *Masih cooldown*`,
          `◦ Tunggu: *${mins} menit lagi*`,
          `◦ Jangan ragu terus, nanti pasangan lelah`].join("\n")) + "\n" +
        tipText(`Bicara baik-baik dengan pasangan`);

      await sendReplyWithNav(sock, m, text, "ragu");
      return { handled: true };
    }

    const line = RAGU_LINES[Math.floor(Math.random() * RAGU_LINES.length)]
      .replace(/{user}/g, userName)
      .replace(/{partner}/g, partnerName);

    // Affection turun cukup banyak karena ragu = trust issue
    const affectionLoss = Math.floor(Math.random() * 8) + 10; // 10-18
    rpg.affection = Math.max(0, (rpg.affection || 0) - affectionLoss);
    rpg.raguCount = (rpg.raguCount || 0) + 1;
    rpg.lastConflictAt = Date.now(); // Tandai konflik aktif
    rpg.raguActive = true; // Tandai ragu aktif, pasangan bisa respons dengan .yakin
    db.setUser(m.sender, { rpg });

    const partnerRpg = partner?.rpg || {};
    partnerRpg.affection = Math.max(0, (partnerRpg.affection || 0) - affectionLoss);
    partnerRpg.lastConflictAt = Date.now();
    partnerRpg.partnerRagu = true; // Tandai pasangan sedang ragu
    db.setUser(partnerJid, { rpg: partnerRpg });

    db.setCooldown(m.sender, "ragu", 3600);

    const totalAffection = rpg.affection;
    const bondLevel = Math.floor(totalAffection / 100) + 1;

    const text =
      claraWrap("Ragu", [`◦ ${line}`,
        `◦ Alasan: *${alasan}*`,
        `◦ Pasangan: *${partnerName}*`,
        `◦ Affection: *-${affectionLoss}*`,
        `◦ Total Affection: *${totalAffection}*`,
        `◦ Bond Level: *${bondLevel}*`,
        `◦ Status: *Hubungan goyah*`].join("\n")) + "\n" +
      tipText(`Pasangan bisa respons: ${prefix}yakin | Minta maaf: ${prefix}maaf`);

    await sock.sendMessage(m.chat, {
      text,
      mentions: [m.sender, partnerJid],
    });

    return { handled: true };
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) + "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("ragu", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
