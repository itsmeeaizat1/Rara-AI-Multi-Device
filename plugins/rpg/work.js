// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { ensurePlayer, addGold, addExp, useStamina, checkCooldown, setCooldown } from "../../src/lib/nova-rpg-service.js";

const jobs = [
  { name: "Berkeluh kesah", gold: [20, 50], exp: [10, 20] },
  { name: "Nongkrong di warung", gold: [15, 40], exp: [5, 15] },
  { name: "Jualan gorengan", gold: [30, 80], exp: [15, 30] },
  { name: "Kurir gojek", gold: [40, 100], exp: [20, 35] },
  { name: "Bantu tetangga", gold: [25, 60], exp: [10, 25] },
  { name: "Ngetik di warnet", gold: [20, 55], exp: [10, 20] },
  { name: "Jualan pulsa", gold: [35, 90], exp: [15, 30] },
  { name: "Ngantor santai", gold: [50, 120], exp: [20, 40] }
];

export default {
  name: "work",
  alias: ["kerja", "nkerja"],
  category: "rpg",
  description: "Kerja untuk dapat gold dan exp",
  usage: ".work",
  async handler(m, { sock }) {
    try {
      ensurePlayer(m, m.pushName || "Player");
      const cd = checkCooldown(m, "lastWork", 3600000);
      if (!cd.ready) {
        return await sendReplyWithNav(sock, m, `⏰ Kamu baru saja kerja!\nTunggu ${cd.mins}m ${cd.secs}s lagi.`, "work");
      }
      if (!useStamina(m, 10)) {
        return await sendReplyWithNav(sock, m, "😴 Stamina tidak cukup! Istirahat dulu.", "work");
      }
      const job = jobs[Math.floor(Math.random() * jobs.length)];
      const gold = Math.floor(Math.random() * (job.gold[1] - job.gold[0] + 1)) + job.gold[0];
      const exp = Math.floor(Math.random() * (job.exp[1] - job.exp[0] + 1)) + job.exp[0];
      addGold(m, gold);
      const expResult = addExp(m, exp);
      setCooldown(m, "lastWork");
      let text = `❀°˖ 𝗞𝗲𝗿𝗷𝗮 ˖°❀

┊ ➶ 𝗣𝗲𝗸𝗲𝗿𝗷𝗮𝗮𝗻: ${job.name}
┊ ➶ 𝗛𝗮𝘀𝗶𝗹: +${gold} gold, +${exp} exp
${expResult.leveledUp ? `\n🎉 𝗟𝗲𝘃𝗲𝗹 𝗨𝗽! Sekarang Level ${expResult.newLevel}!\n` : ""}
┊ ➶ Stamina berkurang 10

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      return await sendReplyWithNav(sock, m, text, "work");
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }
};
