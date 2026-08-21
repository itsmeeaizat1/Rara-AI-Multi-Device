// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader,
  separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "suratcinta",
  alias: ["suratcinta", "suratcinta2"],
  category: "rpg",
  description: "Kirim surat cinta anonim atau langsung ke pasangan",
  usage: ".suratcinta <pesan> | .suratcinta anonim <pesan>",
  example: ".suratcinta kamu adalah bintang di hatiku",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const LETTER_DECOR_TOP = ["*~ Surat Cinta ~*", "*~ Love Letter ~*", "*~ Untukmu ~*"];

const LETTER_DECOR_BOT = [
  "Dengan penuh cinta",
  "Hanya untukmu",
  "Selalu untukmu",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = db.getUser(m.sender);
    const rpg = user?.rpg || {};
    const partnerJid = rpg.spouse || rpg.dating;
    const rawBody = m.body?.replace(/^[!.#]\S+\s*/, "").trim();

    if (!rawBody) {
      const text =
        claraWrap("Surat Cinta", [`  ┊  ➶ Cara pakai: *${prefix}suratcinta <pesan>*`,
          `  ┊  ➶ Anonim: *${prefix}suratcinta anonim <pesan>*`,
          `  ┊  ➶ Contoh: *${prefix}suratcinta kamu adalah bintangku*`,
          `  ┊  ➶ Kirim ke pasangan atau seseorang di grup`].join("\n")) + "\n" +
        tipText(`Tulis pesan cintamu sekarang`);

      await sendReplyWithNav(sock, m, text, "suratcinta");
      return { handled: true };
    }

    // Cek mode anonim
    let isAnonim = false;
    let pesan = rawBody;
    if (rawBody.toLowerCase().startsWith("anonim ")) {
      isAnonim = true;
      pesan = rawBody.substring(7).trim();
    } else if (rawBody.toLowerCase() === "anonim") {
      const text =
        claraWrap("Surat Cinta", [`  ┊  ➶ Mode: *Anonim*`,
          `  ┊  ➶ Tapi pesannya kosong!`,
          `  ┊  ➶ Contoh: *${prefix}suratcinta anonim aku suka kamu*`].join("\n")) + "\n" +
        tipText(`Tulis pesan setelah kata 'anonim'`);

      await sendReplyWithNav(sock, m, text, "suratcinta");
      return { handled: true };
    }

    if (!pesan) {
      const text =
        claraWrap("Surat Cinta", [`  ┊  ➶ Status: *Pesan kosong*`,
          `  ┊  ➶ Tulis pesan cintamu dulu ya`].join("\n")) + "\n" +
        tipText(`Contoh: ${prefix}suratcinta kamu adalah duniaku`);

      await sendReplyWithNav(sock, m, text, "suratcinta");
      return { handled: true };
    }

    // Limit pesan 500 karakter
    if (pesan.length > 500) {
      pesan = pesan.substring(0, 500) + "...";
    }

    const userName = m.pushName || user?.name || "Player";
    const senderDisplay = isAnonim ? "Seseorang yang peduli" : userName;
    const decorTop = LETTER_DECOR_TOP[Math.floor(Math.random() * LETTER_DECOR_TOP.length)];
    const decorBot = LETTER_DECOR_BOT[Math.floor(Math.random() * LETTER_DECOR_BOT.length)];

    // Jika punya pasangan, kirim ke pasangan
    let recipientJid = partnerJid;
    let recipientName = "Pasangan";

    if (partnerJid) {
      const partner = db.getUser(partnerJid);
      recipientName = partner?.name || partnerJid.split("@")[0];
    } else {
      // Kalau nggak punya pasangan, kirim ke grup (publik)
      recipientName = "Grup";
      recipientJid = null;
    }

    // Buat surat
    const letterText =
      claraWrap("Surat Cinta", "💌") + "\n\n" +
      decorTop + "\n\n" +
      "Untuk: *" + recipientName + "*\n" +
      "Dari: *" + senderDisplay + "*\n\n" +
      separator("━", 30) + "\n\n" +
      '"' + pesan + '"\n\n' +
      separator("━", 30) + "\n\n" +
      "-" + decorBot + "\n\n" +
      tipText(isAnonim
        ? "Psst... ini surat anonim loh"
        : `Balas dengan: ${prefix}suratcinta`);

    // Kirim ke chat
    if (recipientJid) {
      // Kirim ke grup dengan mention pasangan
      await sock.sendMessage(m.chat, {
        text: letterText,
        mentions: isAnonim ? [] : [m.sender, partnerJid],
      });

      // Juga kirim DM ke pasangan
      try {
        await sock.sendMessage(partnerJid, {
          text: letterText,
          mentions: isAnonim ? [] : [partnerJid],
        });
      } catch (e) { console.error('[suratcinta.js]:', e.message); }
    } else {
      // Kirim ke grup (publik)
      await sock.sendMessage(m.chat, {
        text: letterText,
        mentions: isAnonim ? [] : [m.sender],
      });
    }

    // Affection bonus untuk surat cinta
    if (partnerJid) {
      const affectionGain = Math.floor(Math.random() * 8) + 7; // 7-15
      rpg.affection = (rpg.affection || 0) + affectionGain;
      rpg.letterCount = (rpg.letterCount || 0) + 1;
      db.setUser(m.sender, { rpg });

      const partner = db.getUser(partnerJid);
      const partnerRpg = partner?.rpg || {};
      partnerRpg.affection = (partnerRpg.affection || 0) + affectionGain;
      db.setUser(partnerJid, { rpg: partnerRpg });
      db.save();

      // Kirim info affection (terpisah, biar suratnya tetap bersih)
      const infoText =
        claraWrap("Surat Terkirim", [`  ┊  ➶ Ke: *${recipientName}*`,
          `  ┊  ➶ Mode: *${isAnonim ? "Anonim" : "Langsung"}*`,
          `  ┊  ➶ Affection: *+${affectionGain}*`,
          `  ┊  ➶ Total Surat: *${rpg.letterCount}*`].join("\n")) + "\n" +
        tipText(`Kirim surat lagi: ${prefix}suratcinta`);

      await sock.sendMessage(m.chat, { text: infoText });
    } else {
      const infoText =
        claraWrap("Surat Terkirim", [`  ┊  ➶ Mode: *${isAnonim ? "Anonim" : "Publik"}*`,
          `  ┊  ➶ Status: *Terkirim ke grup*`].join("\n")) + "\n" +
        tipText(`Punya pasangan? ${prefix}jadian @target`);

      await sock.sendMessage(m.chat, { text: infoText });
    }

    return { handled: true };
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) + "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("suratcinta", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
