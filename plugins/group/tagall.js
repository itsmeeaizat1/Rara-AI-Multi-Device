// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import {
  getParticipantJid,
  getParticipantJids,
} from "../../src/lib/rara-lid.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
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
      await m.reply(raraWrap("Tagall", `gagal\n\nTidak ada member di grup ini.`, "error"));
      return;
    }

    const targetParticipants = participants.filter((participant) => {
      return getParticipantJid(participant) !== m.sender;
    });

    if (targetParticipants.length === 0) {
      await m.reply(raraWrap("Tagall", `gagal\n\nTidak ada member lain yang bisa di-tag.`, "error"));
      return;
    }

    const mentions = getParticipantJids(targetParticipants);
    const memberList = targetParticipants
      .map((participant) => `@${getParticipantJid(participant).split("@")[0]}`)
      .join("\n")
      .trim();

    await m.reply(`Pesan: ${text}\n\n` +
        `Total: ${targetParticipants.length} member\n\n` +
        memberList);
  } catch (error) {
    m.reply(raraWrap("tagall", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
