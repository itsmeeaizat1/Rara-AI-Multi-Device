// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// heist.js — Heist system (rob targets, risk vs reward)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "heist",
  alias: ["heist", "rob", "rampok", "merampok"],
  category: "rpg",
  description: "Heist — rampok toko/bank/museum, high risk high reward",
  usage: ".heist (list target)\n.heist <target>",
  example: ".heist bank",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 60, energi: 5, isEnabled: true,
};

const TARGETS = [
  { name: "Toko Sembako", emoji: "🏪", successRate: 0.5, reward: [200, 500], energiCost: 3, fine: 100, difficulty: "Easy" },
  { name: "Minimarket", emoji: "🏬", successRate: 0.4, reward: [500, 1500], energiCost: 5, fine: 300, difficulty: "Medium" },
  { name: "Bank", emoji: "🏦", successRate: 0.25, reward: [2000, 5000], energiCost: 10, fine: 1000, difficulty: "Hard" },
  { name: "Museum", emoji: "🏛️", successRate: 0.15, reward: [5000, 15000], energiCost: 15, fine: 3000, difficulty: "Deadly" },
];

const NARRATIVES = {
  success: [
    "Berhasil masuk diam-diam! Satpam tidur, kamu ambil semua loot dan kabur!",
    "Alarm mati, pintu terbuka. Kamu bawa tas penuh emas!",
    "Sistem keamanan bocor, kamu tau kodenya. Lancar!",
    "Berjalan tenang, ambil barang, keluar. Perfect crime.",
  ],
  fail: [
    "Alarm berbunyi! Kamu kabur tapi ditangkap polisi. Denda!",
    "CCTV merekam! Kamu ditangkap dan harus bayar denda.",
    "Satpam bangun! Kamu ditangkap sebelum kabur.",
    "Pintu terkunci, kamu panik dan ketahuan. Denda!",
  ],
};

async function handler(m, { sock }) {
  try {
    const targetName = m.args.join(" ").trim().toLowerCase();
    const db = await getDatabase();

    if (!targetName) {
      let msg = `╭──「 *ʜᴇɪsᴛ ᴛᴀʀɢᴇᴛs* 」\n`;
      TARGETS.forEach(t => {
        msg += `│ ${t.emoji} ${t.name} [${t.difficulty}]\n`;
        msg += `│   Success: ${Math.round(t.successRate*100)}% | Reward: ${t.reward[0]}-${t.reward[1]}g\n`;
        msg += `│   Energi: ${t.energiCost} | Denda: ${t.fine}g\n`;
      });
      msg += `│\n`;
      msg += `│ ${m.prefix}heist <target>\n`;
      msg += `╰──────────`;
      return m.reply(msg);
    }

    const target = TARGETS.find(t => t.name.toLowerCase().includes(targetName));
    if (!target) {
      await m.react("❌");
      return m.reply(claraWrap("heist", `Target tidak ditemukan. Lihat: ${m.prefix}heist`, "error"));
    }

    // Cek energi
    try {
      const energi = await db.getEnergi?.(m.sender) || 100;
      if (energi < target.energiCost) {
        await m.react("❌");
        return m.reply(claraWrap("heist", `Energi kurang! Butuh ${target.energiCost} energi.`, "error"));
      }
      await db.minEnergi?.(m.sender, target.energiCost);
    } catch {}

    await m.react("🕒");
    await m.reply(`${target.emoji} Memasuki ${target.name}...`);
    await new Promise(r => setTimeout(r, 2000));

    const success = Math.random() < target.successRate;
    const narrative = success
      ? NARRATIVES.success[Math.floor(Math.random() * NARRATIVES.success.length)]
      : NARRATIVES.fail[Math.floor(Math.random() * NARRATIVES.fail.length)];

    let goldChange;
    if (success) {
      goldChange = target.reward[0] + Math.floor(Math.random() * (target.reward[1] - target.reward[0]));
      try { await db.addGold?.(m.sender, goldChange); } catch {}
    } else {
      goldChange = -target.fine;
      try { await db.minGold?.(m.sender, target.fine); } catch {}
    }

    await m.react("🐣");
    let msg = `╭──「 *ʜᴇɪsᴛ ʀᴇsᴜʟᴛ* 」\n`;
    msg += `│ Target: ${target.emoji} *${target.name}*\n`;
    msg += `│\n`;
    msg += `│ ${narrative}\n`;
    msg += `│\n`;
    if (success) {
      msg += `│ 🏆 *BERHASIL!*\n`;
      msg += `│ Reward: *+${goldChange} gold*\n`;
    } else {
      msg += `│ 💀 *TERTANGKAP!*\n`;
      msg += `│ Denda: *-${target.fine} gold*\n`;
    }
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("heist error:", err);
    await m.react("❌");
    return m.reply(claraWrap("heist", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
