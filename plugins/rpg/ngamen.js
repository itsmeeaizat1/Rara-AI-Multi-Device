// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ngamen",
  alias: ["nyanyi", "konser"],
  category: "rpg",
  description: "Ngamen di jalanan untuk mencari koin",
  usage: ".ngamen",
  example: ".ngamen",
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
    return m.reply(claraWrap("Ngamen", `Suara serak, tenggorokan kering! 🥵\n\nNgamen butuh *${staminaCost} Stamina*, sisa stamina kamu *${user.rpg.stamina}*. Minum es teh dulu gih! ☕`));
  }

  user.rpg.stamina -= staminaCost;


  const locations = [
    { name: "Perempatan Lampu Merah", min: 3000, max: 10000 },
    { name: "Warung Kopi", min: 5000, max: 15000 },
    { name: "Depan Minimarket", min: 4000, max: 12000 },
    { name: "Kafe Gaul", min: 8000, max: 25000 },
    { name: "Angkringan", min: 2000, max: 8000 }
  ];

  const loc = locations[Math.floor(Math.random() * locations.length)];
  const earning = Math.floor(Math.random() * (loc.max - loc.min + 1)) + loc.min;

  m.reply(claraWrap("Ngamen", `Mulai jreng-jreng gitar di *${loc.name}*... 🎶\nSemoga hari ini banyak yang ngasih receh! 💸`));
  await new Promise((resolve) => setTimeout(resolve, 3000));

  user.koin = (user.koin || 0) + earning;

  const expGain = Math.floor(earning / 20);
  await addExpWithLevelCheck(sock, m, db, user, expGain);

  await m.react("✅");

  let txt = `ALHAMDULILLAH HASIL NGAMEN! 🎸✨\n\n`;
  txt += `Lokasi: *${loc.name}*\n`;
  txt += `💵 Pendapatan: *+Rp ${earning.toLocaleString("id-ID")}*\n`;
  txt += `📈 EXP: *+${expGain}*\n`;
  txt += `⚡ Stamina: *-${staminaCost}*\n\n`;
  txt += `Lumayan buat beli nasi bungkus hari ini! 🤤`;

  await sendReplyWithNav(sock, m, txt, "ngamen");
}

export { pluginConfig as config, handler };
