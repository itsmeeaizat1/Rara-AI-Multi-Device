import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "yakin",
  alias: ["yakin hubungan", "yakinsayang", "nggakragu"],
  category: "rpg",
  description: "Tegaskan keyakinan ke pasangan yang sedang ragu, affection pulih",
  usage: ".yakin [pesan]",
  example: ".yakin aku nggak akan kemana-mana",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const YAKIN_LINES = [
  "{user} memeluk {partner}: 'Aku yakin sama kita. Jangan ragu ya'",
  "{user} bilang ke {partner}: 'Aku nggak akan kemana-mana, percaya aku'",
  "{user} genggam tangan {partner}: 'Kita bisa lewatin ini bersama'",
  "{user} menatap {partner}: 'Aku yakin kamu adalah orang yang tepat'",
  "{user} ke {partner}: 'Ragu itu wajar, tapi aku nggak akan nyerah'",
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
        claraWrap("Yakin", [`◦ Status: *Belum punya pasangan*`,
          `◦ Yakin sama siapa? Sama diri sendiri?`].join("\n")) + "\n" +
        tipText(`Ketik ${prefix}jadian @target untuk punya pasangan`);

      await sendReplyWithNav(sock, m, text, "yakin");
      return { handled: true };
    }

    const partner = db.getUser(partnerJid);
    const partnerName = partner?.name || partnerJid.split("@")[0];
    const userName = m.pushName || user?.name || "Player";
    const pesan = m.body?.replace(/^[!.#]\S+\s*/, "").trim();

    // Cek apakah pasangan sedang ragu
    const partnerRpg = partner?.rpg || {};
    const isPartnerRagu = partnerRpg.raguActive || partnerRpg.partnerRagu;

    if (!isPartnerRagu) {
      const text =
        claraWrap("Yakin", [`◦ Status: *Pasangan nggak sedang ragu*`,
          `◦ ${partnerName} baik-baik saja`,
          `◦ Tapi tidak apa-apa, ungkapkan perasaanmu`].join("\n")) + "\n" +
        tipText(`Kirim surat cinta: ${prefix}suratcinta`);

      await sendReplyWithNav(sock, m, text, "yakin");
      return { handled: true };
    }

    const line = YAKIN_LINES[Math.floor(Math.random() * YAKIN_LINES.length)]
      .replace(/{user}/g, userName)
      .replace(/{partner}/g, partnerName);

    // Affection recovery besar karena pasangan yakin
    const affectionGain = Math.floor(Math.random() * 10) + 20; // 20-30
    rpg.affection = (rpg.affection || 0) + affectionGain;
    rpg.yakinCount = (rpg.yakinCount || 0) + 1;
    rpg.lastConflictAt = 0; // Reset konflik
    db.setUser(m.sender, { rpg });

    partnerRpg.affection = (partnerRpg.affection || 0) + affectionGain;
    partnerRpg.raguActive = false;
    partnerRpg.partnerRagu = false;
    partnerRpg.lastConflictAt = 0;
    db.setUser(partnerJid, { rpg: partnerRpg });

    // Reset ragu status pengirim juga
    rpg.raguActive = false;
    db.setUser(m.sender, { rpg });
    db.save();

    const totalAffection = rpg.affection;
    const bondLevel = Math.floor(totalAffection / 100) + 1;

    let extraInfo = [];
    if (pesan) {
      extraInfo.push(`◦ Pesan: *"${pesan}"*`);
    }

    const text =
      claraWrap("Yakin", [`◦ ${line}`,
        `◦ Affection: *+${affectionGain}*`,
        `◦ Total Affection: *${totalAffection}*`,
        `◦ Bond Level: *${bondLevel}*`,
        `◦ Status: *Hubungan stabil kembali*`,
        ...extraInfo].join("\n")) + "\n" +
      tipText(`Rayakan: ${prefix}cuddling | ${prefix}kiss | ${prefix}kado`);

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

    await m.reply(claraWrap("yakin", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
