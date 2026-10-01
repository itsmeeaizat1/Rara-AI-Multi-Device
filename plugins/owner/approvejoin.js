// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setujugabung",
  alias: ["setujugabung"],
  category: "owner",
  description: "Setujui member yang request join grup",
  usage: ".setujugabung <nomor> <linkgrup>",
  example: ".setujugabung 628xxx https://chat.whatsapp.com/xxxxx",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function extractInviteCode(input) {
  if (!input) return null;
  const match = input.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
  if (match) return match[1];
  if (/^[A-Za-z0-9]{15,}$/.test(input)) return input;
  return null;
}

async function handler(m, { sock }) {
  let targetNumber = "";
  let groupInput = "";

  if (m.mentionedJid?.length) {
    targetNumber = m.mentionedJid[0].replace(/[^0-9]/g, "");
    groupInput = m.args?.find((a) => a.includes("chat.whatsapp.com") || a.includes("@g.us")) || "";
  } else {
    const args = m.args || [];
    targetNumber = args[0]?.replace(/[^0-9]/g, "") || "";
    groupInput = args[1] || "";
  }

  if (!targetNumber) {
    return m.reply(novaWrap(".setujugabung <nomor> <linkgrup>", "Format: *.setujugabung <nomor> <linkgrup>*\n\n" +
      "Contoh: .setujugabung 628xxx https://chat.whatsapp.com/xxxxx"));
  }

  if (targetNumber.startsWith("0")) {
    targetNumber = "62" + targetNumber.slice(1);
  }

  if (!groupInput) {
    return m.reply(novaWrap("setujugabung", "Link grup tidak ditemukan.\n\n" +
      "Format: .setujugabung <nomor> <linkgrup>\n" +
      "Contoh: .setujugabung 628xxx https://chat.whatsapp.com/xxxxx"));
  }

  let groupId = "";
  let groupName = "Grup";

  if (groupInput.includes("@g.us")) {
    groupId = groupInput;
  } else {
    const code = extractInviteCode(groupInput);
    if (!code) {
      return m.reply(novaWrap("setujugabung", "Link grup tidak valid.\n\n" +
        "Format link: https://chat.whatsapp.com/xxxxx"));
    }

    try {
      const info = await sock.groupGetInviteInfo(code);
      groupId = info.id;
      groupName = info.subject || "Grup";
    } catch (e) {
      return m.reply(novaWrap("setujugabung", "Gagal dapet nih info grup dari link.\n\n" +
        "Error: " + (e.message || "Unknown error") + "\n\n" +
        "Pastikan link grup valid dan bot masih anggota grup."));
    }
  }

  const participantJid = targetNumber + "@s.whatsapp.net";

  try {
    await sock.groupParticipantsUpdate(
      groupId,
      [participantJid],
      "approve"
    );
    if (groupName === "Grup") {
      try {
        const meta = await sock.groupMetadata(groupId);
        groupName = meta.subject || "Grup";
      } catch (e) { console.error('[approvejoin.js]:', e.message); }
    }

    return m.reply(novaWrap("setujugabung", "BERHASIL SETUJUI JOIN REQUEST\n\n" +
      "User: " + targetNumber + "\n" +
      "Grup: " + groupName + "\n" +
      "Status: Disetujui"));
  } catch (error) {
    return m.reply(novaWrap("setujugabung", "Gagal menyetujui join request.\n\n" +
      "Error: " + (error.message || "Unknown error") + "\n\n" +
      "Pastikan bot adalah admin grup dan user masih pending."));
  }
}

export { pluginConfig as config, handler };
