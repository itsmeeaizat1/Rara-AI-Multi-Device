// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA

import { raraError, raraEmpty, raraGuide, raraNoInput,   separator,
  tipText,  raraWrap } from "../../src/lib/rara-menu-style.js";

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
    raraWrap("Group Memory Book", [`Grup: *${groupName || "Grup ini"}*`,
      `Vibe: *${vibe}*`,
      `Momen: *${highlight}*`].join("\n")) +
    "\n" +
    raraWrap("Top Member", topMembers) +
    "\n\n" +
    
    tipText("Catatan: ini versi statis simulasi dulu") +
    "\n" +
    tipText(`Ketik ${prefix}groupmemory untuk update lain waktu`) +
    "\n" +
    tipText(`Ketik ${prefix}menu untuk kembali`)
  );
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {

    const text = buildMemoryBook(prefix, m.chatName || m.subject || "Grup ini");

    await m.reply(raraWrap("groupmemory", text));
  } catch (error) {
    const text =
    await m.reply(raraError("GroupMemory", "Gagal nih, coba lagi ya"));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
