// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { ensurePlayer, setMarriage, addExp, getPlayer } from "../../src/lib/nova-rpg-service.js";

global.rpgMarriage = global.rpgMarriage || {};

export default {
  name: "terimanikah",
  alias: ["acceptnikah", "terimalamar", "acceptmarriage"],
  category: "rpg",
  description: "Terima lamaran nikah",
  usage: ".terimanikah",
  async handler(m, { sock }) {
    try {
      ensurePlayer(m, m.pushName || "Player");
      const proposerId = Object.keys(global.rpgMarriage).find(k => {
        const r = global.rpgMarriage[k];
        return r.target === m.sender && (Date.now() - r.time) < 600000;
      });
      if (!proposerId) {
        return await sendReplyWithNav(sock, m, "❌ Tidak ada lamaran yang menunggu!\nLamaran expired setelah 10 menit.", "terimanikah");
      }
      const proposerName = global.rpgMarriage[proposerId].proposerName || proposerId.split("@")[0];
      setMarriage({ sender: proposerId, key: { remoteJid: m.key?.remoteJid } }, m.sender, m.pushName || "Player");
      setMarriage(m, proposerId, proposerName);
      addExp(m, 100);
      addExp({ sender: proposerId, key: { remoteJid: m.key?.remoteJid } }, 100);
      delete global.rpgMarriage[proposerId];
      const date = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      let text = `❀°˖ 𝗣𝗲𝗿𝗻𝗶𝗸𝗮𝗵𝗮𝗻 ˖°❀

┊ ➶ ${m.pushName} & ${proposerName}
┊ ➶ Status: Menikah 💍
┊ ➶ Tanggal: ${date}
┊ ➶ Bonus: +100 exp untuk kalian berdua!

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      return await sendReplyWithNav(sock, m, text, "terimanikah");
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }
};
