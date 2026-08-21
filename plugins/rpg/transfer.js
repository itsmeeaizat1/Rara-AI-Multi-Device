// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, addGold, ensurePlayer } from "../../src/lib/nova-rpg-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "transfer",
  alias: ["tf", "kirim", "transfer", "sendgold"],
  category: "economy",
  description: "Kirim gold ke player lain",
  usage: ".transfer <jumlah> @member",
  example: ".transfer 100 @628xxxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function normalizeJid(target) {
  if (!target) return null;
  return String(target).replace(/@.+$/, "");
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = (m.text || "").trim().split(/[ \n]+/);
    const target = m.mentionedJid?.[0];

    if (!target) {
      const text =
        claraWrap("Transfer", [`  ┊  ➶ Penggunaan: *${prefix}transfer <jumlah> @member*`,
          `  ┊  ➶ Contoh: *${prefix}transfer 100 @628xxxx*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "transfer");
      return { handled: true };
    }

    const amount = parseInt(args[0], 10);
    if (!amount || amount <= 0) {
      const text =
        claraWrap("Gagal", ["  ┊  ➶ Status: *Jumlah tidak valid*",
          `  ┊  ➶ Contoh: *${prefix}transfer 100 @member*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "transfer");
      return { handled: true };
    }

    const sender = ensurePlayer(m, m.pushName || "Player");
    const senderJid = normalizeJid(m.sender);
    const receiverJid = normalizeJid(target);
    const receiver = ensurePlayer({ sender: receiverJid, pushName: "Penerima" }, "Penerima");

    if (senderJid === receiverJid) {
      const text =
        claraWrap("Gagal", ["  ┊  ➶ Status: *Tidak bisa transfer ke diri sendiri*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "transfer");
      return { handled: true };
    }

    const senderGold = sender?.gold || 0;

    if (senderGold < amount) {
      const text =
        claraWrap("Gagal", [`  ┊  ➶ Saldo: *${senderGold} Gold*`,
          `  ┊  ➶ Jumlah: *${amount} Gold*`,
          "  ┊  ➶ Status: *Gold tidak cukup*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}daily untuk klaim gold harian`) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "transfer");
      return { handled: true };
    }

    addGold(m, -amount);
    addGold({ sender: receiverJid }, amount);

    const updatedSender = getPlayer(m);

    const text =
      claraWrap("Transfer", [`  ┊  ➶ Kirim: *${amount} Gold*`,
        `  ┊  ➶ Ke: *${receiver?.name || "Penerima"}*`,
        `  ┊  ➶ Sisa Gold: *${updatedSender?.gold || 0}*`,
        "  ┊  ➶ Status: *Berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "transfer");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("transfer", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
