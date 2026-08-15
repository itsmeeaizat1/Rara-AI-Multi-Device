// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "nulisv2",
  alias: ["nulisv2", "nulisrpg", "tulisrpg"],
  category: "rpg",
  description: "Nulis cerpen atau artikel untuk dapet royalti",
  usage: ".nulis",
  example: ".nulis",
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
  
  const staminaCost = 10;
  user.rpg.stamina = user.rpg.stamina ?? 100;

  if (user.rpg.stamina < staminaCost) {
    return m.reply(claraWrap("Nulis", `Ide buntu, writer block menyerang! 😵‍💫\n\nNulis butuh *${staminaCost} Stamina*, sisa stamina kamu *${user.rpg.stamina}*. Cari inspirasi dulu! 💡`));
  }

  user.rpg.stamina -= staminaCost;
  m.reply(claraWrap("Nulis", `Merangkai kata demi kata penuh makna... ✍️\nSemoga ada penerbit yang ngelirik! 📚`));
  await new Promise(r => setTimeout(r, 3000));

  const gacha = Math.random();

  if (gacha < 0.15) {
    return m.reply(claraWrap("Nulis", `NASKAH DITOLAK PENERBIT! 🚮🥺\n\nAlasannya: "Ceritanya terlalu klise dan pasaran."\n💵 Royalti: 0\n⚡ Stamina: -${staminaCost}\n\nJangan menyerah, besok nulis lagi! 💪`));
  } else if (gacha > 0.9) {
    const viralRoyalti = Math.floor(Math.random() * 60000) + 30000;
    user.koin = (user.koin || 0) + viralRoyalti;
    const expGain = Math.floor(viralRoyalti / 20);
    await addExpWithLevelCheck(sock, m, db, user, expGain);
    
    return m.reply(claraWrap("Nulis", `CERITAMU VIRAL DAN JADI BEST SELLER! 🌟📘\n\nBanyak yang nangis bombay baca karya kamu, royalti ngalir deres!\n💵 Royalti: *+Rp ${viralRoyalti.toLocaleString("id-ID")}*\n📈 EXP: *+${expGain}*\n⚡ Stamina: -${staminaCost}\n\nOtw dilirik sutradara buat difilmin! 🎬`));
  }

  const earning = Math.floor(Math.random() * 15000) + 5000;
  user.koin = (user.koin || 0) + earning;
  const expGain = Math.floor(earning / 20);
  await addExpWithLevelCheck(sock, m, db, user, expGain);

  await m.react("✅");
  { const __navText = claraWrap("Nulis", `ROYALTI HASIL NULIS CAIR! 📝✨\n\n💵 Pendapatan: *+Rp ${earning.toLocaleString("id-ID")}*\n📈 EXP: *+${expGain}*\n⚡ Stamina: -${staminaCost}\n\nSemangat berkarya para pujangga! 🎓`); await m.reply(__navText); };
}

export { pluginConfig as config, handler };
