// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "parkir",
  alias: ["kangparkir", "markir"],
  category: "rpg",
  description: "Jadi tukang parkir minimarket, waspada satpol PP!",
  usage: ".parkir",
  example: ".parkir",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 120,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);

  if (!user.rpg) user.rpg = {};
  
  const staminaCost = 12;
  user.rpg.stamina = user.rpg.stamina ?? 100;

  if (user.rpg.stamina < staminaCost) {
    return m.reply(claraWrap("Parkir", `Kaki pegel kebanyakan berdiri! 😫\n\nMarkir butuh *${staminaCost} Stamina*, sisa stamina kamu *${user.rpg.stamina}*. Istirahat dulu di pos! 🏚️`));
  }

  user.rpg.stamina -= staminaCost;
  m.reply(claraWrap("Parkir", `Priiiit! Terus, terus, bales kiri dikit! 🏁\nMulai narik duit parkir di minimarket... 💰`));
  await new Promise(r => setTimeout(r, 3000));

  const gacha = Math.random();

  if (gacha < 0.1) {
    const denda = Math.floor(Math.random() * 5000) + 1000;
    user.koin = Math.max(0, (user.koin || 0) - denda);
    return m.reply(claraWrap("Parkir", `WADUH ADA RAZIA SATPOL PP! 🚓💨\n\nKamu lari terbirit-birit dan duit recehanmu jatuh senilai *Rp ${denda.toLocaleString("id-ID")}*!\n⚡ Stamina: -${staminaCost}\n\nApes banget hari ini! 😭`));
  } else if (gacha > 0.9) {
    const jackpot = Math.floor(Math.random() * 50000) + 20000;
    user.koin = (user.koin || 0) + jackpot;
    const expGain = Math.floor(jackpot / 20);
    await addExpWithLevelCheck(sock, m, db, user, expGain);
    return m.reply(claraWrap("Parkir", `JACKPOT! ADA MOBIL SPORT SULTAN! 🏎️✨\n\nPas mau keluar, kaca mobil turun dan sultan ngasih pecahan 100k!\n💵 Pendapatan: *+Rp ${jackpot.toLocaleString("id-ID")}*\n📈 EXP: *+${expGain}*\n⚡ Stamina: -${staminaCost}\n\nAlhamdulillah rejeki anak soleh! 🙏`));
  }

  const earning = Math.floor(Math.random() * 8000) + 2000;
  user.koin = (user.koin || 0) + earning;
  const expGain = Math.floor(earning / 20);
  await addExpWithLevelCheck(sock, m, db, user, expGain);

  await m.react("✅");
  { const __navText = claraWrap("Parkir", `HASIL MARKIR HARI INI! 🅿️✨\n\n💵 Pendapatan: *+Rp ${earning.toLocaleString("id-ID")}*\n📈 EXP: *+${expGain}*\n⚡ Stamina: -${staminaCost}\n\nReceh demi receh lama-lama jadi bukit! 💪`); await m.reply(__navText); };
}

export { pluginConfig as config, handler };
