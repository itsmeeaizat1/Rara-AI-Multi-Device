// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {
  getParticipantJid,
  getParticipantJids,
} from "../../src/lib/nova-lid.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "tagall",
  alias: ["tagall"],
  category: "group",
  description: "Tag semua member grup",
  usage: ".tagall <pesan>",
  example: ".tagall Halo semua!",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
  isAdmin: true,
  isBotAdmin: false,
};

async function handler(m, { sock }) {
  const text = m.text || "Tag All Members";

  try {
    const groupMeta = m.groupMetadata;
    const participants = groupMeta.participants || [];

    if (participants.length === 0) {
      await m.reply(claraWrap("Tagall", `gagal\n\nTidak ada member di grup ini.`, "error"));
      return;
    }

    const targetParticipants = participants.filter((participant) => {
      return getParticipantJid(participant) !== m.sender;
    });

    if (targetParticipants.length === 0) {
      await m.reply(claraWrap("Tagall", `gagal\n\nTidak ada member lain yang bisa di-tag.`, "error"));
      return;
    }

    const mentions = getParticipantJids(targetParticipants);
    const memberList = targetParticipants
      .map((participant) => `@${getParticipantJid(participant).split("@")[0]}`)
      .join("\n")
      .trim();

    await m.reply(`*Pesan:* ${text}\n\n` +
        `\`\`\`━━━ ${targetParticipants.length} MEMBER TOTAL ━━━\`\`\`\n` +
        memberList);
  } catch (error) {
    m.reply(claraWrap("tagall", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
