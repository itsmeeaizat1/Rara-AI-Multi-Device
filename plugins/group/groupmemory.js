// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import {   separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "groupmemory",
  alias: ["groupmemory"],
  category: "group",
  description: "Ringkasan momen grup: top member, vibe, highlight",
  usage: ".groupmemory",
  example: ".groupmemory",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const TOP_LABELS = ["Top 1", "Top 2", "Top 3"];
const VIBES = ["Chill", "Hype", "Drama", "Ngibul", "Kesurupan", "War"];
const HIGHLIGHT_TEMPLATES = [
  "Ada yang nge-spam stiker sampai grup gempar",
  "Ada debat panjang soal makanan favored",
  "Ada momen someone nyasar topik nobody",
  "Ada jeda 2 jam karena nobody nyambung",
  "Ada yang accidentally ngirim voice note keras",
  "Ada sesi roast member yang nggak masuk",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTopMembers() {
  const base = ["A", "B", "C", "D", "E", "F", "G", "H"];
  return TOP_LABELS.map((label, idx) => `${label}: *Member ${base[idx]}*`);
}

function buildMemoryBook(prefix, groupName) {
  const vibe = pick(VIBES);
  const highlight = pick(HIGHLIGHT_TEMPLATES);
  const topMembers = randomTopMembers();

  return (
    claraWrap("Group Memory Book", [`│ Grup: *${groupName || "Grup ini"}*`,
      `│ Vibe: *${vibe}*`,
      `│ Momen: *${highlight}*`].join("\n")) +
    "\n" +
    claraWrap("Top Member", topMembers) +
    "\n\n" +
    separator("━", 22) +
    "\n" +
    tipText("Catatan: ini versi statis simulasi dulu") +
    "\n" +
    tipText(`Ketik ${prefix}groupmemory untuk update lain waktu`) +
    "\n" +
    tipText(`Ketik ${prefix}menu untuk kembali`)
  );
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    const text = buildMemoryBook(prefix, m.chatName || m.subject || "Grup ini");

    await m.reply(claraWrap("groupmemory", text));
  } catch (error) {
    const text =
      claraWrap("Gagal", [`│ Status: *ɢᴀɢᴀʟ*`,
        `│ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "groupmemory");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
