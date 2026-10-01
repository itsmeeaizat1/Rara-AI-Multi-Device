// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Narrator — Pesan narator
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "narrator", alias: ["narrator", "narratorrpg"],
  category: "rpg", description: "Dengarkan bisikan narator",
  usage: ".narrator", example: ".narrator",
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
  await animGeneric(m, sock, "🎙️", "Narrator");
    return m.reply(raraRpgBox("narratorrpg", `🎙️ *Narator Berbisik...*\n\n"${msg}"`, "info"));
  } catch (e) {
    return m.reply(raraRpgBox("narratorrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
