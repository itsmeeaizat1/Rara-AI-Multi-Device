// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { ensurePlayer, getPlayerInfo } from "../../src/lib/nova-rpg-service.js";

export default {
  name: "profile",
  alias: ["prof", "myprofile", "rpgprofile"],
  category: "rpg",
  description: "Lihat profil RPG kamu",
  usage: ".profile",
  async handler(m, { sock }) {
    try {
      ensurePlayer(m, m.pushName || "Player");
      const text = getPlayerInfo(m);
      return await sendReplyWithNav(sock, m, text, "profile");
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }
};
