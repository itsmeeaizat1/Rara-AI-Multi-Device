import { getDatabase } from "../../src/lib/nova-database.js";
import { sendRpgPreview } from "../../src/lib/nova-context.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "coinflip",
  alias: ["coinflip", "flipcoin", "cf2"],
  category: "rpg",
  description: "Gambling coin flip",
  usage: ".coinflip <heads/tails> <bet>",
  example: ".coinflip heads 5000",
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
  const choice = args[0]?.toLowerCase();
  const bet = parseInt(args[1]);

  if (!choice || (choice !== "heads" && choice !== "tails" && choice !== "h" && choice !== "t")) {
    return sendReplyWithNav(sock, m, `🪙 *Tebak Koin Bandar* 🪙\n\n` +
        `Pilih gambar Garuda (Heads) atau Angka (Tails)!\n\n` +
        `*Cara Main:*\n` +
        `👉 \`.coinflip heads <taruhan>\`\n` +
        `👉 \`.coinflip tails <taruhan>\``, "coinflip");
  }

  if (!bet || bet < 1000) {
    return m.reply(claraWrap("Coinflip", `Taruhan receh ditolak! Minimal *Rp 1.000* ya bos! 🪙`));
  }

  if ((user.koin || 0) < bet) {
    { const __navText = claraWrap("Coinflip", `Mana koin lu? Di kantong sisa *Rp ${(user.koin || 0).toLocaleString("id-ID")}* doang, sok mau taruhan *Rp ${bet.toLocaleString("id-ID")}*! 😜`); return await m.reply(__navText); };
  }

  user.koin -= bet;

  const userChoice = choice === "heads" || choice === "h" ? "heads" : "tails";
  const result = Math.random() < 0.5 ? "heads" : "tails";
  const emoji = result === "heads" ? "🦅" : "🪙";

  await sendRpgPreview(sock, m.chat, `*CLING!* Koin emas dilempar tinggi ke udara... berputar-putar... 🪙✨`, "🪙 COINFLIP", "Flipping!", { quoted: m });
  await new Promise((r) => setTimeout(r, 2500));

  const isWin = userChoice === result;

  let txt = `*PLAK!* Bandar menutup koin di tangannya! 👋\n\n`;
  txt += `Tebakan Lu: *${userChoice.toUpperCase()}*\n`;
  txt += `Koin Menunjukkan: *${result.toUpperCase()}* ${emoji}\n\n`;

  if (isWin) {
    const winnings = bet * 2;
    user.koin = (user.koin || 0) + winnings;
    txt += `🎉 *MANTAP! TEBAKAN LU BENER!*\n`;
    txt += `💰 Cuan: *+Rp ${winnings.toLocaleString("id-ID")}*`;
  } else {
    txt += `🤣 *HAHAHA! LU SALAH TEBAK!*\n`;
    txt += `💸 Koin ditarik bandar: *-Rp ${bet.toLocaleString("id-ID")}*`;
  }

  db.save();
  await sendRpgPreview(sock, m.chat, txt, "🪙 COINFLIP", "Result!", {
    quoted: m,
  });
}

export { pluginConfig as config, handler };
