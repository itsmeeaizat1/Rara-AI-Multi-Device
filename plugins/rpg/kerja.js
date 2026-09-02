// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Kerja — Work for gold, scaling with job level (animated)

import {
  ensureRpg, addExp, addGold, addJobExp, useEnergy,
  checkCooldown, setCooldown, formatTime, JOB_DB
} from "../../src/lib/nova-rpg-service.js";
import { animKerja } from "../../src/lib/nova-rpg-anim.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "kerja",
  alias: ["kerja", "work"],
  category: "rpg",
  description: "Bekerja untuk mendapatkan gold dan EXP — pilih jenis kerjaan dulu",
  usage: ".kerja <jenis>",
  example: ".kerja pemula",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const WORK_ENERGY = 15;
const WORK_COOLDOWN = 5 * 60 * 1000;

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

// Pilihan jenis kerjaan yang diterima — key JOB_DB + nama Indonesia-nya
const JOB_CHOICES = {
  pemula: "novice", novice: "novice",
  petarung: "warrior", warrior: "warrior",
  penyihir: "mage", mage: "mage",
  pemanah: "archer", archer: "archer",
  pembunuh: "assassin", assassin: "assassin",
  tank: "tank",
  tabib: "healer", healer: "healer",
  berserker: "berserker",
};

// Menu pilihan kerjaan — muncul kalau .kerja dipanggil tanpa/karena arg salah.
// Sebelumnya .kerja langsung eksekusi random padahal user belum milih jenis.
function kerjaMenu(prefix, rpg, invalid = false) {
  const scMap = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
  const sc = (s) => String(s).replace(/[a-zA-Z]/g, c => scMap[c.toLowerCase()] || c);

  const jobList = Object.keys(JOB_DB)
    .map((k) => `│ • ${prefix}kerja ${JOB_DB[k].name.toLowerCase()}`)
    .join("\n");

  let msg = `╭─「 ✦ ${sc("Menu Kerja")} ✦ 」\n│\n`;
  if (invalid) {
    msg += `│ ❗ ${sc("Jenis kerjaan tidak dikenal")}\n│\n`;
  }
  msg += `│ ${sc("Mau kerja sebagai apa? Pilih dulu")}:\n│\n`;
  msg += `${jobList}\n│\n`;
  msg += `│ 💡 ${sc("Contoh")}: ${prefix}kerja pemula\n`;
  msg += `│ 📌 ${sc("Job kamu")}: ${JOB_DB[rpg.job]?.name || "Pemula"} (Lv.${rpg.jobLevel || 1})\n`;
  msg += `│ 📌 ${sc("Reward naik seiring job level")}\n`;
  msg += `╰──── • ────`;
  return msg;
}

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("kerja", "RPG belum siap. Ketik .daftar dulu.", "error"));

    // Pilih jenis kerjaan dulu — jangan langsung eksekusi random
    const arg = (m.args[0] || "").toLowerCase();
    if (!arg) {
      await m.react("🐣");
      return m.reply(kerjaMenu(m.prefix, rpg));
    }
    const chosenJob = JOB_CHOICES[arg];
    if (!chosenJob) {
      await m.react("❗");
      return m.reply(kerjaMenu(m.prefix, rpg, true));
    }

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

    const jobName = JOB_DB[chosenJob]?.name || "Pemula";
    const jobLv = rpg.jobLevel || 1;
    const baseGold = 30 + (jobLv * 15) + (rpg.level * 5);
    const goldGain = Math.floor(baseGold * (0.8 + Math.random() * 0.4));
    const expGain = Math.floor(40 + (jobLv * 10) + (rpg.level * 3));
    const jobExpGain = Math.floor(20 + jobLv * 5);

    const flavors = JOB_FLAVOR[chosenJob] || JOB_FLAVOR.novice;
    const activity = flavors[Math.floor(Math.random() * flavors.length)];

    // Animation: progressive work steps
    await animKerja(m, sock, jobName, activity);

    addExp(m, expGain);
    addGold(m, goldGain);
    addJobExp(m, jobExpGain);
    setCooldown(m, "lastWork", WORK_COOLDOWN);

    await m.react("🐣");
    let msg = `╭─「 ✦ ʜᴀsɪʟ ᴋᴇʀᴊᴀ ✦ 」\n`;
    msg += `│ 👔 Pekerjaan: *${jobName}* (Lv.${jobLv})\n`;
    msg += `│ 📋 Aktivitas: ${activity}\n`;
    msg += `│\n`;
    msg += `│ ✦ EXP    : *+${expGain}*\n`;
    msg += `│ 💰 Gold   : *+${goldGain}*\n`;
    msg += `│ 📖 Job EXP: *+${jobExpGain}*\n`;
    msg += `│\n`;
    msg += `│ ⚡ Energy: *${rpg.energy}/${rpg.maxEnergy}*\n`;
    msg += `╰──── • ────`;
    return m.reply(msg);
  } catch (err) {
    console.error("kerja error:", err);
    await m.react("❌");
    return m.reply(claraWrap("kerja", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
