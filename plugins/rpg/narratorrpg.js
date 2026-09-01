// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Narrator — Pesan narator
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "narratorrpg", alias: ["narratorrpg"], aliases: ["narratorrpg", "narrator"],
  category: "rpg", description: "Dengarkan bisikan narator",
  usage: ".narratorrpg", example: ".narratorrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 0, isEnabled: true,
};

const NARRATIONS = [
  "Langkahmu baru saja dimulai. Dunia menantimu. Gunakan .storyquest untuk menjelajah kisahmu.",
  "Angin malam berbisik... sesuatu di kegelatan sedang menunggu. Bersiaplah.",
  "Kuil kuno memanggil namamu. Mungkin ini waktu yang tepat untuk .questmap.",
  "Bayangan bergerak di antara pohon. Hati-hati dengan apa yang menanti di .hutan.",
  "Bintang jatuh malam ini. Keberuntungan mungkin datang kepada yang bertekun.",
];

async function handler(m, { sock }) {
  try {
    const msg = NARRATIONS[Math.floor(Math.random() * NARRATIONS.length)];
    return m.reply(claraWrap("narratorrpg", `🎙️ *Narator Berbisik...*\n\n"${msg}"`, "info"));
  } catch (e) {
    return m.reply(claraWrap("narratorrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
