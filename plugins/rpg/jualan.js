import { getDatabase } from "../../src/lib/nova-database.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "jualan",
  alias: ["dagang", "pedagang"],
  category: "rpg",
  description: "Dagang asongan keliling",
  usage: ".jualan",
  example: ".jualan",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 180,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);

  if (!user.rpg) user.rpg = {};
  
  const staminaCost = 18;
  user.rpg.stamina = user.rpg.stamina ?? 100;

  if (user.rpg.stamina < staminaCost) {
    return m.reply(claraWrap("Jualan", `Kaki lemes kebanyakan keliling! 🥵\n\nJualan butuh *${staminaCost} Stamina*, sisa stamina kamu *${user.rpg.stamina}*. Ngiyup bentar! 🏖️`));
  }

  user.rpg.stamina -= staminaCost;
  m.reply(claraWrap("Jualan", `Cangcimen cangcimen! Kacang kuaci permen! 🍬\nNawarin dagangan ke orang lewat... 🗣️`));
  await new Promise(r => setTimeout(r, 3000));

  const gacha = Math.random();

  if (gacha < 0.2) {
    const rugi = Math.floor(Math.random() * 10000) + 5000;
    user.koin = Math.max(0, (user.koin || 0) - rugi);
    return m.reply(claraWrap("Jualan", `HUJAN DERAS! DAGANGAN SEPI! 🌧️🥶\n\nNggak ada yang beli dan dagangan kerupukmu melempem semua.\nKerugian Modal: *Rp ${rugi.toLocaleString("id-ID")}*\n⚡ Stamina: -${staminaCost}\n\nBesok harus liat prakiraan cuaca nih! ☂️`));
  } else if (gacha > 0.85) {
    const lakuKeras = Math.floor(Math.random() * 80000) + 40000;
    user.koin = (user.koin || 0) + lakuKeras;
    const expGain = Math.floor(lakuKeras / 20);
    await addExpWithLevelCheck(sock, m, db, user, expGain);
    return m.reply(claraWrap("Jualan", `ADA BROMTON LEWAT DIBORONG SEMUA! 🚴‍♂️✨\n\nRombongan sepeda elit mampir dan ngeborong semua isotonik sama cangcimen!\n💵 Omzet Mendadak: *+Rp ${lakuKeras.toLocaleString("id-ID")}*\n📈 EXP: *+${expGain}*\n⚡ Stamina: -${staminaCost}\n\nBisa langsung pulang gasik ini mah! 🎉`));
  }

  const earning = Math.floor(Math.random() * 25000) + 10000;
  user.koin = (user.koin || 0) + earning;
  const expGain = Math.floor(earning / 20);
  await addExpWithLevelCheck(sock, m, db, user, expGain);

  await m.react("✅");
  { const __navText = claraWrap("Jualan", `DAGANGAN LAKU STANDAR! 🛒✨\n\n💵 Omzet: *+Rp ${earning.toLocaleString("id-ID")}*\n📈 EXP: *+${expGain}*\n⚡ Stamina: -${staminaCost}\n\nBesok kulakan lagi ah! 🛍️`); await m.reply(__navText); };
}

export { pluginConfig as config, handler };
