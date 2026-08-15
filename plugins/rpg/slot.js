// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendRpgPreview } from "../../src/lib/nova-context.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "slotv2",
  alias: ["slots", "judislot", "slotgame"],
  category: "rpg",
  description: "Main slot machine gambling",
  usage: ".slot <bet>",
  example: ".slot 5000",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);

  const args = m.args || [];
  let bet = parseInt(args[0]);

  if (!bet || bet < 1000) {
    return sendReplyWithNav(sock, m, `Taruhan minimal buat narik tuas slot ini *Rp 1.000* bro! 🎰\nContoh: \`.slot 5000\``, "slot");
  }

  if ((user.koin || 0) < bet) {
    { const __navText = claraWrap("Slot", `Koin lu kering kerontang! 💸\nUang lu: *Rp ${(user.koin || 0).toLocaleString("id-ID")}*\nButuh: *Rp ${bet.toLocaleString("id-ID")}*`); return await m.reply(__navText); };
  }

  user.koin -= bet;

  const symbols = ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣"];
  const weights = [30, 25, 20, 15, 7, 3];

  function spin() {
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (let i = 0; i < symbols.length; i++) {
      cumulative += weights[i];
      if (rand <= cumulative) return symbols[i];
    }
    return symbols[0];
  }

  const result = [spin(), spin(), spin()];

  await sendRpgPreview(sock, m.chat, `🎰 *TREK TREK TREK...* Tuas ditarik! Mesin slot berputar cepat...`, "🎰 MESIN SLOT", "Spin!", {
    quoted: m,
  });
  await new Promise((r) => setTimeout(r, 2500));

  let multiplier = 0;
  let winText = "";

  if (result[0] === result[1] && result[1] === result[2]) {
    if (result[0] === "7️⃣") {
      multiplier = 10;
      winText = "GILA!! JACKPOT 777!! 🎉💸 (10x Lipat)";
    } else if (result[0] === "💎") {
      multiplier = 5;
      winText = "MANTAP! SUPER DIAMOND!! 💎✨ (5x Lipat)";
    } else {
      multiplier = 3;
      winText = "ASIK! TRIPLE COMBO!! 🍒🎰 (3x Lipat)";
    }
  } else if (result[0] === result[1] || result[1] === result[2] || result[0] === result[2]) {
    multiplier = 1.5;
    winText = "LUMAYAN LAH! DOUBLE!! 👍 (1.5x Lipat)";
  }

  const winnings = Math.floor(bet * multiplier);
  user.koin = (user.koin || 0) + winnings;

  let txt = `🎰 *HASIL MESIN SLOT* 🎰\n\n`;
  txt += `[ ${result[0]} | ${result[1]} | ${result[2]} ]\n\n`;

  if (multiplier > 0) {
    txt += `${winText}\n`;
    txt += `💰 Uang Cair: *+Rp ${winnings.toLocaleString("id-ID")}*\n`;
  } else {
    txt += `ZONK!! Duit lu ditelan mesin slot! 😭💸\n`;
    txt += `💸 Uang Hangus: *-Rp ${bet.toLocaleString("id-ID")}*\n`;
  }

  db.save();
  await sendRpgPreview(sock, m.chat, txt, "🎰 RESULT", "Selesai", { quoted: m });
}

export { pluginConfig as config, handler };
