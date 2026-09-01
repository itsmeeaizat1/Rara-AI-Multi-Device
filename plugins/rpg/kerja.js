// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Kerja — Work for gold, scaling with job level

import {
  ensureRpg, addExp, addGold, addJobExp, useEnergy,
  checkCooldown, setCooldown, formatTime, JOB_DB
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "kerja",
  alias: ["kerja", "work"],
  category: "rpg",
  description: "Bekerja untuk mendapatkan gold dan EXP",
  usage: ".kerja",
  example: ".kerja",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const WORK_ENERGY = 15;
const WORK_COOLDOWN = 5 * 60 * 1000; // 5 menit

const JOB_FLAVOR = {
  novice: ["membersihkan halaman", "membantu warga", "mengantar barang"],
  warrior: ["menjaga keamanan desa", "berpatroli", "melatih rekrutan"],
  mage: ["meneliti mantra baru", "mengajar sihir", "meramal nasib"],
  archer: ["berburu hama", "menjaga perbatasan", "melatih tembak"],
  assassin: ["misi penyamaran", "mengumpulkan intel", "misi senyap"],
  tank: ["menjaga gerbang", "mengangkut batu", "melindungi pedagang"],
  healer: ["mengobati penduduk", "meracun ramuan", "merawat luka"],
  berserker: ["menebang pohon", "memecah batu", "bertarung arena"],
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("kerja", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const cd = checkCooldown(m, "lastWork");
    if (cd) {
      await m.react("🚫");
      return m.reply(claraWrap("kerja", `Cooldown kerja tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < WORK_ENERGY) {
      await m.react("🚫");
      return m.reply(claraWrap("kerja", `Energi kurang! Butuh *${WORK_ENERGY} energy*. Energy kamu: *${rpg.energy}/${rpg.maxEnergy}*\nGunakan .heal untuk recover.`, "warn"));
    }

    useEnergy(m, WORK_ENERGY, sock);

    // Gold scaling dengan job level
    const jobName = JOB_DB[rpg.job]?.name || "Pemula";
    const jobLv = rpg.jobLevel || 1;
    const baseGold = 30 + (jobLv * 15) + (rpg.level * 5);
    const goldGain = Math.floor(baseGold * (0.8 + Math.random() * 0.4));
    const expGain = Math.floor(40 + (jobLv * 10) + (rpg.level * 3));
    const jobExpGain = Math.floor(20 + jobLv * 5);

    addExp(m, expGain);
    addGold(m, goldGain);
    addJobExp(m, jobExpGain);

    setCooldown(m, "lastWork", WORK_COOLDOWN);

    const flavors = JOB_FLAVOR[rpg.job] || JOB_FLAVOR.novice;
    const activity = flavors[Math.floor(Math.random() * flavors.length)];

    await m.react("🐣");
    let msg = `╭─「 ✦ ᴋᴇʀᴊᴀ ✦ 」\n`;
    msg += `│ 👔 Pekerjaan: *${jobName}* (Lv.${jobLv})\n`;
    msg += `│ 📋 Aktivitas: ${activity}\n`;
    msg += `│\n`;
    msg += `│ 📦 *ʜᴀsɪʟ ᴋᴇʀᴊᴀ*\n`;
    msg += `│ ✦ EXP: *+${expGain}*\n`;
    msg += `│ 💰 Gold: *+${goldGain}*\n`;
    msg += `│ 📖 Job EXP: *+${jobExpGain}*\n`;
    msg += `│\n`;
    msg += `│ ⚡ Energy: *${rpg.energy - WORK_ENERGY}/${rpg.maxEnergy}*\n`;
    msg += `╰────  •  ────`;

    return m.reply(msg);
  } catch (err) {
    console.error("kerja error:", err);
    await m.react("❌");
    return m.reply(claraWrap("kerja", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
