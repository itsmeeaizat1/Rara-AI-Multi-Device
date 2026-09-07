// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Riddle — Tebak-tebakan harian
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "riddlerpg", alias: ["riddlerpg", "riddle", "tebak"],
  category: "rpg", description: "Teka-teki RPG harian",
  usage: ".riddlerpg", example: ".riddlerpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

const RIDDLES = [
  "Aku punya kaki tapi tak bisa jalan. Siapa aku? (Jawaban: Meja)",
  "Semakin kamu ambil, semakin besar jejakku. Apa aku? (Jawaban: Lubang)",
  "Aku hidup tanpa tubuh, berbicara tanpa suara. Apa aku? (Jawaban: Gema)",
  "Aku selalu datang tapi tidak pernah sampai. Apa aku? (Jawaban: Besok)",
  "Makin lama makin tajam, tapi makin sering dipakai makin tumpul. Apa aku? (Jawaban: Pensil)",
];

async function handler(m, { sock }) {
  try {
    const riddle = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
  await animGeneric(m, sock, "🧩", "Riddle");
    return m.reply(novaRpgBox("riddlerpg", `❓ *TEKA-TEKI RPG*\n\n${riddle}`, "info"));
  } catch (e) {
    return m.reply(novaRpgBox("riddlerpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
