import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "marry",
  alias: ["wedding", "nikah", "menikah", "kawin", "pasanganv2", "couplev2", "lovev2"],
  category: "game",
  description: "Nikahi player lain di grup",
  usage: ".marry @member",
  example: ".marry @628xxxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

const PROPOSAL_TIMEOUT = 5 * 60 * 1000; // 5 menit
const pendingProposals = new Map();

function cleanExpired() {
  const now = Date.now();
  for (const [key, data] of pendingProposals) {
    if (now - data.timestamp > PROPOSAL_TIMEOUT) {
      pendingProposals.delete(key);
    }
  }
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const target = m.mentionedJid?.[0];

    if (!target) {
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}marry @member*`,
          `◦ Contoh: *${prefix}marry @628xxxx*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);
      await sendReplyWithNav(sock, m, text, "marry");
      return { handled: true };
    }

    if (target === m.sender) {
      await m.reply(claraWrap("Marry", "Tidak bisa menikahi diri sendiri!"));
      return { handled: true };
    }

    const db = getDatabase();
    const proposerUser = db.getUser(m.sender);
    const targetUser = db.getUser(target);

    if (proposerUser?.rpg?.spouse) {
      await m.reply(claraWrap("Sudah Menikah", "Kamu sudah menikah! Ketik .divorce untuk cerai dulu."));
      return { handled: true };
    }

    if (targetUser?.rpg?.spouse) {
      const tName = targetUser?.name || target.split("@")[0];
      await m.reply(claraWrap("Maaf", `${tName} sudah menikah dengan orang lain!`));
      return { handled: true };
    }

    cleanExpired();

    // Cek jika target sudah punya proposal pending
    if (pendingProposals.has(target)) {
      await m.reply(claraWrap("Menunggu", "Target masih punya lamaran yang menunggu jawaban."));
      return { handled: true };
    }

    // Cek jika proposer sudah melamar orang lain
    for (const [key, data] of pendingProposals) {
      if (data.proposer === m.sender) {
        pendingProposals.delete(key);
      }
    }

    const proposerName = proposerUser?.name || m.pushName || m.sender.split("@")[0];
    const targetName = targetUser?.name || target.split("@")[0];

    pendingProposals.set(target, {
      proposer: m.sender,
      proposerName,
      targetName,
      groupId: m.chat,
      timestamp: Date.now(),
    });

    // Auto-delete setelah timeout
    setTimeout(() => {
      if (pendingProposals.get(target)?.proposer === m.sender) {
        pendingProposals.delete(target);
      }
    }, PROPOSAL_TIMEOUT);

    let text = "";
    text += "💍 *LAMARAN NIKAH* 💍\n\n";
    text += `@${m.sender.split("@")[0]} melamar @${target.split("@")[0]}!\n\n`;
    text += `Ketik *${prefix}terima* untuk menerima\n`;
    text += `Ketik *${prefix}tolak* untuk menolak\n\n`;
    text += `⏰ Lamaran expired dalam 5 menit`;

    await sock.sendMessage(m.chat, {
      text: claraWrap("Marry", text),
      mentions: [m.sender, target],
    });

  } catch (error) {
    await m.reply(claraWrap("Gagal", `◦ ${error.message}`));
  }
  return { handled: true };
}

export { pluginConfig as config, handler, pendingProposals, cleanExpired };
