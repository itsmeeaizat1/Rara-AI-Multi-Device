// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Lore — Cerita latar dunia RPG
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "lorerpg", alias: ["lorerpg", "lore"],
  category: "rpg", description: "Baca lore dunia RPG",
  usage: ".lorerpg", example: ".lorerpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
  await animGeneric(m, sock, "📜", "Reading Lore");
    return m.reply(claraWrap("lorerpg", `📖 *LORE DUNIA RPG*\n\nDi zaman kuno, 4 elemen — Api, Air, Tanah, dan Angin — bertarung merebut dunia. Perang saudara antar elemen menghancurkan benua. Sebagai petarung muda, tugasmu adalah menyatukan kembali elemen-elemen yang terpecah dan mengembalikan keseimbangan dunia.\n\nGunakan .storyquest untuk menjelajah kisahmu.`, "info"));
  } catch (e) {
    return m.reply(claraWrap("lorerpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
