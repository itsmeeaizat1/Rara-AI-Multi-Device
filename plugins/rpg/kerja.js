// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Kerja — Work for gold, scaling with job level (animated)

import {
  ensureRpg, addExp, addGold, addJobExp, useEnergy,
  checkCooldown, setCooldown, formatTime, JOB_DB,
  addCash, spendCash, formatRp
} from "../../src/lib/nova-rpg-service.js";
import { animProfesi, PROFESI_ANIMATIONS, gajianCash } from "../../src/lib/nova-rpg-profesi.js";
import { reactCooldown } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA, novaRpgBox } from "../../src/lib/nova-games.js";
// GUARD FORMAT: pesan berkotak wajib boxLeft() (src/lib/styler.js),
// dilarang nulis "│ " manual — kalimat bebas panjang, wrapText yang motong.
import { boxMessage } from "../../src/lib/styler.js";
import te from "../../src/lib/nova-error.js";

/** Bar progress Job EXP standar ▰▱ (14 Sep — bar untuk semua progress level) */
function jobBar(cur, next) {
  const c = Math.max(0, cur || 0), mx = Math.max(0, next || 0);
  const filled = mx > 0 ? Math.min(10, Math.round((c / mx) * 10)) : 0;
  return "▰".repeat(filled) + "▱".repeat(10 - filled) + ` ${c}/${mx}`;
}

const pluginConfig = {
  name: "working",
  alias: ["kerja", "work"],
  category: "rpg",
  description: "Bekerja untuk mendapatkan gold dan EXP — animasi unik per profesi (penebang, petani, dokter, pilot, dll)",
  usage: ".kerja <jenis/profesi>",
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
// + 11 PROFESI BARU (8 Sep 2026, animasi unik per profesi ala owner)
const JOB_CHOICES = {
  // Job RPG
  pemula: "novice", novice: "novice",
  petarung: "warrior", warrior: "warrior",
  penyihir: "mage", mage: "mage",
  pemanah: "archer", archer: "archer",
  pembunuh: "assassin", assassin: "assassin",
  tank: "tank",
  tabib: "healer", healer: "healer",
  berserker: "berserker",
  // Profesi (animasi per-profesi)
  penebang: "penebang", nebang: "penebang",
  petani: "petani", tani: "petani", farmer: "petani",
  penambang: "penambang", tambang: "penambang", miner: "penambang",
  nelayan: "nelayan", fisherman: "nelayan",
  kantor: "kantor", office: "kantor", karyawan: "kantor",
  dokter: "dokter", doctor: "dokter",
  guru: "guru", teacher: "guru",
  polisi: "polisi", police: "polisi",
  pilot: "pilot",
  chef: "chef", koki: "chef", kring: "chef",
  programmer: "programmer", coder: "programmer", dev: "programmer",
};

// Key profesi (animasi + flavor per-profesi) — sisanya job RPG
const PROFESI_SET = new Set([
  "penebang", "petani", "penambang", "nelayan", "kantor",
  "dokter", "guru", "polisi", "pilot", "chef", "programmer",
]);

// Menu pilihan kerjaan — muncul kalau .kerja dipanggil tanpa/karena arg salah.
// Sebelumnya .kerja langsung eksekusi random padahal user belum milih jenis.
function kerjaMenu(prefix, rpg, invalid = false) {
  const scMap = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
  const sc = (s) => String(s).replace(/[a-zA-Z]/g, c => scMap[c.toLowerCase()] || c);

  // teks polos — prefix "│ " & pemotongan baris dijamin boxLeft()
  const jobList = Object.keys(JOB_DB)
    .map((k) => `${prefix}kerja ${JOB_DB[k].name.toLowerCase()}`)
    .join("\n");
  const profesiList = [...PROFESI_SET]
    .map((k) => `${prefix}kerja ${k}`)
    .join("\n");

  const lines = [];
  if (invalid) lines.push(`❗ ${sc("Jenis kerjaan tidak dikenal")}`);
  lines.push(`${sc("Job RPG")}:`, jobList);
  lines.push(``, `${sc("Profesi — animasi unik per profesi")}:`, profesiList);
  lines.push(`💡 ${sc("Contoh")}: ${prefix}kerja pemula | ${prefix}kerja dokter`);
  lines.push(`📌 ${sc("Job kamu")}: ${JOB_DB[rpg.job]?.name || "Pemula"} (Lv.${rpg.jobLevel || 1})`);
  lines.push(`📌 ${sc("Reward naik seiring job level")}`);
  return boxMessage("◆ MENU KERJA ◆", lines.join("\n"));
}

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("kerja", "RPG belum siap. Ketik .daftar dulu.", "error"));

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
      await reactCooldown(m);
      return m.reply(novaRpgBox("kerja", `Cooldown kerja tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < WORK_ENERGY) {
      await m.react("🚫");
      return m.reply(novaRpgBox("kerja", `Energi kurang! Butuh *${WORK_ENERGY} energy*. Energy kamu: *${rpg.energy}/${rpg.maxEnergy}*\nGunakan .heal untuk recover.`, "warn"));
    }

    useEnergy(m, WORK_ENERGY, sock);

    const isProfesi = PROFESI_SET.has(chosenJob);
    const jobName = isProfesi ? (PROFESI_ANIMATIONS[chosenJob]?.status || chosenJob) : (JOB_DB[chosenJob]?.name || "Pemula");
    const prof = PROFESI_ANIMATIONS[chosenJob] || PROFESI_ANIMATIONS.novice;
    const jobLv = rpg.jobLevel || 1;
    const baseGold = 30 + (jobLv * 15) + (rpg.level * 5);
    const goldGain = Math.floor(baseGold * (0.8 + Math.random() * 0.4));
    const expGain = Math.floor(40 + (jobLv * 10) + (rpg.level * 3));
    const jobExpGain = Math.floor(20 + jobLv * 5);

    // Aktivitas dinamis hanya untuk job RPG (frame profesi sudah spesifik)
    const flavors = JOB_FLAVOR[chosenJob] || JOB_FLAVOR.novice;
    const activity = isProfesi ? "" : flavors[Math.floor(Math.random() * flavors.length)];

    // Animation: frame unik per profesi/job (morphing message)
    await animProfesi(m, sock, chosenJob, { activity });

    addExp(m, expGain);
    addGold(m, goldGain);
    // GAJIAN UANG ASLI — Rp dari flavor gajian profesi dibayar jadi cash
    // (mata uang RPG terpisah: gold = batang emas, EXP = pengalaman)
    const cashGain = gajianCash(chosenJob);
    // 🔧 ALAT PROFESI (.tokorpg beli <profesi>) → gajian +30% permanen
    const hasTool = !!(rpg.jobTools && rpg.jobTools[chosenJob]);
    const toolBonus = hasTool ? Math.floor(cashGain * 0.3) : 0;
    if (cashGain > 0) addCash(m, cashGain + toolBonus);
    const { leveledUp } = addJobExp(m, jobExpGain);
    setCooldown(m, "lastWork", WORK_COOLDOWN);

    // Bonus item flavor ala contoh owner (narasi — reward asli tetap EXP/Gold/JobEXP)
    const bonusFlavor = (prof.gajian[2] || "").replace(/^📦 Bonus:\s*/i, "");

    await m.react("🐣");
    const body = [
      `👔 Pekerjaan : ${jobName} (Lv.${jobLv})`,
      ...(isProfesi ? [] : [`📋 Aktivitas : ${activity}`]),
      "",
      ...prof.hasil,
      "",
      `✨ EXP : +${expGain}`,
      `💰 Gold : +${goldGain}`,
      ...(cashGain > 0 ? [`💵 Uang : ${formatRp(cashGain + toolBonus)}`] : []),
      ...(hasTool ? [`🔧 Alat : +30% gajian (${formatRp(toolBonus)})`] : []),
      `📖 Job EXP : +${jobExpGain}`,
      `   ${jobBar(rpg.jobExp || 0, rpg.jobExpNext || 50)}`,
      ...(bonusFlavor ? [`📦 Bonus : ${bonusFlavor}`] : []),
      ...(leveledUp ? ["", ...prof.naikLevel] : []),
      "",
      `⚡ Energy : ${rpg.energy}/${rpg.maxEnergy}`,
    ].join("\n");
    return m.reply(novaGameBox({
      title: "kerja", icon: "💼",
      flavor: prof.gajian[0] || "💼 *GAJIAN!*",
      body,
      cta: gameCTA("kerja"),
    }));
  } catch (err) {
    console.error("kerja error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("kerja", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
