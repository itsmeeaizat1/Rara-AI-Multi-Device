// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "unblock",
  alias: ["unblock", "unblockuser", "bukablokir", "unblokir"],
  category: "owner",
  description: "Buka blokir user",
  usage: ".unblock <@target / nomor>",
  example: ".unblock @username\n.unblock 6281234567890",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const targetRaw = m.text?.trim();

    if (!targetRaw) {
      const text =
        claraWrap("Unblock User", [
          `Penggunaan: ${prefix}unblock <@target / nomor>`,
          `Contoh: ${prefix}unblock @username`,
          `Contoh: ${prefix}unblock 6281234567890`,
        ].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      return m.reply( text, "unblock");
    }

    // Parse target — bisa @mention, reply, atau nomor langsung
    let targetJid = "";
    let targetDisplay = "";

    if (m.mentionedJid && m.mentionedJid.length > 0) {
      targetJid = m.mentionedJid[0];
      targetDisplay = "@" + targetJid.split("@")[0];
    } else if (m.quoted) {
      targetJid = m.quoted.sender;
      targetDisplay = "@" + targetJid.split("@")[0];
    } else {
      // Nomor langsung
      let num = targetRaw.replace(/[^0-9]/g, "");
      if (num.startsWith("0")) num = "62" + num.slice(1);
      if (!num.startsWith("62")) num = "62" + num;
      targetJid = num + "@s.whatsapp.net";
      targetDisplay = num;
    }

    if (!targetJid) {
      return m.reply( claraWrap("Unblock User", "Target tidak valid. Gunakan @mention, reply pesan, atau nomor."), "unblock");
    }

    // Eksekusi unblock via Baileys
    await sock.updateBlockStatus(targetJid, "unblock");

    const text =
      claraWrap("Unblock User", [
        `Target: ${targetDisplay}`,
        "Status: Berhasil di-unblock",
      ].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    return m.reply( text, "unblock");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [
        `Status: Gagal`,
        `Alasan: ${error.message}`,
      ].join("\n")) +
      "\n" +
      tipText("Coba lagi nanti atau ketik .menu");

    return m.reply( text, "unblock");
  }
}

export { pluginConfig as config, handler };
