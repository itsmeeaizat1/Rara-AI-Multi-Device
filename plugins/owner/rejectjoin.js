// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "tolakgabung",
  alias: ["tolakgabung"],
  category: "owner",
  description: "Tolak member yang request join grup",
  usage: ".tolakgabung <nomor> <linkgrup>",
  example: ".tolakgabung 628xxx https://chat.whatsapp.com/xxxxx",
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
    return m.reply(raraWrap(".tolakgabung <nomor> <linkgrup>", "Format: *.tolakgabung <nomor> <linkgrup>*\n\n" +
      "Contoh: .tolakgabung 628xxx https://chat.whatsapp.com/xxxxx"));
  }

  if (targetNumber.startsWith("0")) {
    targetNumber = "62" + targetNumber.slice(1);
  }

  if (!groupInput) {
    return m.reply(raraWrap("tolakgabung", "Link grup tidak ditemukan.\n\n" +
      "Format: .tolakgabung <nomor> <linkgrup>"));
  }

  let groupId = "";
  let groupName = "Grup";

  if (groupInput.includes("@g.us")) {
    groupId = groupInput;
  } else {
    const code = extractInviteCode(groupInput);
    if (!code) {
      return m.reply(raraWrap("tolakgabung", "Link grup tidak valid.\n\n" +
        "Format link: https://chat.whatsapp.com/xxxxx"));
    }

    try {
      const info = await sock.groupGetInviteInfo(code);
      groupId = info.id;
      groupName = info.subject || "Grup";
    } catch (e) {
      return m.reply(raraWrap("tolakgabung", "Gagal dapet nih info grup dari link.\n\n" +
        "Error: " + (e.message || "Unknown error")));
    }
  }

  const participantJid = targetNumber + "@s.whatsapp.net";

  try {
    await sock.groupParticipantsUpdate(
      groupId,
      [participantJid],
      "reject"
    );
    if (groupName === "Grup") {
      try {
        const meta = await sock.groupMetadata(groupId);
        groupName = meta.subject || "Grup";
      } catch (e) { console.error('[rejectjoin.js]:', e.message); }
    }

    return m.reply(raraWrap("tolakgabung", "JOIN REQUEST DITOLAK\n\n" +
      "User: " + targetNumber + "\n" +
      "Grup: " + groupName + "\n" +
      "Status: Ditolak"));
  } catch (error) {
    return m.reply(raraWrap("tolakgabung", "Gagal menolak join request.\n\n" +
      "Error: " + (error.message || "Unknown error")));
  }
}

export { pluginConfig as config, handler };
