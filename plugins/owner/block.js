// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { notifyUserBlocked } from "../../src/lib/nova-saluran-broadcast.js";

const pluginConfig = {
  name: "blockuser",
  alias: ["blockuser", "block"],
  category: "owner",
  description: "Blokir user dari WhatsApp bot",
  usage: ".block <@target / nomor>",
  example: ".block @username\n.block 6281234567890",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const targetRaw = m.text?.trim();

    if (!targetRaw) {
      const text =
        claraWrap("Block User", [
          `Penggunaan: ${prefix}block <@target / nomor>`,
          `Contoh: ${prefix}block @username`,
          `Contoh: ${prefix}block 6281234567890`,
        ].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      return m.reply( text, "block");
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
      return m.reply( claraWrap("Block User", "Target tidak valid. Gunakan @mention, reply pesan, atau nomor."), "block");
    }

    // Eksekusi block via Baileys
    await sock.updateBlockStatus(targetJid, "block");

    // Kirim notifikasi ke saluran
    await notifyUserBlocked(sock, {
      phoneNumber: targetJid.split("@")[0],
      reason: "Blocked by owner",
      totalBlocked: "-",
    }).catch((e) => { console.error('[block.js]:', e.message); });

    const text =
      claraWrap("Block User", [
        `Target: ${targetDisplay}`,
        "Status: Berhasil diblokir",
      ].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}unblock <target> untuk membuka blokir`);

    return m.reply( text, "block");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("Owner", "Gagal nih, coba lagi ya");

    return m.reply( text, "block");
  }
}

export { pluginConfig as config, handler };
