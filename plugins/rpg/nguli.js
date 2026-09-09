// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Nguli — simulasi kerja keras (upgrade ala script owner 9 Sep 2026)
// 16 pekerjaan bergaji dengan syarat level • toko 10 alat (bonus gaji/energi)
// bank tabung/ambil • animasi morphing • istirahat • leaderboard kuli terkaya
// Uang terintegrasi saldo Rp RPG (rpg.cash) — gaji nguli muter di ekonomi bot.

import {
  ensureRpg, saveRpg, addExp, addCash, spendCash, getCash, formatRp,
  useEnergy, checkCooldown, setCooldown,
} from "../../src/lib/nova-rpg-service.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
import { rpgScene } from "../../src/lib/nova-rpg-anim.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { reactCooldown } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "nguli",
  alias: ["nguli", "buruh", "kuli"],
  category: "rpg",
  description: "Simulasi kerja keras — 16 pekerjaan bergaji, alat bonus, bank, leaderboard kuli terkaya",
  usage: ".nguli — status & menu\n.nguli kerja — mulai kerja\n.nguli kerja <pekerjaan> — ganti pekerjaan\n.nguli istirahat — pulihkan energi\n.nguli beli [alat] — beli alat bonus\n.nguli tabung <jumlah> — simpan ke bank\n.nguli ambil <jumlah> — ambil dari bank\n.nguli tools — alat kamu\n.nguli top — kuli terkaya\n.nguli help — bantuan",
  example: ".nguli kerja\n.nguli kerja montir\n.nguli beli laptop\n.nguli tabung 50000",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const NGULI_COOLDOWN = 30 * 1000; // 30 dtk antar kerja (ala script)
const NGULI_ANIM_MS = Number(process.env.NGULI_ANIM_MS) || 1000; // jeda frame animasi (knob env)

// ─── DATA PEKERJAAN (verbatim script) ───
const JOBS = {
  pengangguran: { name: "Pengangguran", income: 0, exp: 0, energyCost: 0, icon: "😴" },
  kuli_pasar: { name: "Kuli Pasar", income: 5000, exp: 10, energyCost: 15, icon: "🛒", levelReq: 1 },
  buruh_bangunan: { name: "Buruh Bangunan", income: 8000, exp: 15, energyCost: 20, icon: "🔨", levelReq: 2 },
  tukang_sapu: { name: "Tukang Sapu", income: 6000, exp: 12, energyCost: 12, icon: "🧹", levelReq: 1 },
  ojek_pangkalan: { name: "Ojek Pangkalan", income: 10000, exp: 18, energyCost: 18, icon: "🏍️", levelReq: 3 },
  pedagang_kaki_lima: { name: "Pedagang Kaki Lima", income: 12000, exp: 20, energyCost: 20, icon: "🍜", levelReq: 3 },
  tukang_jahit: { name: "Tukang Jahit", income: 15000, exp: 22, energyCost: 18, icon: "🧵", levelReq: 4 },
  montir: { name: "Montir", income: 18000, exp: 25, energyCost: 22, icon: "🔧", levelReq: 5 },
  satpam: { name: "Satpam", income: 20000, exp: 20, energyCost: 15, icon: "🛡️", levelReq: 4 },
  guru_ngaji: { name: "Guru Ngaji", income: 25000, exp: 30, energyCost: 20, icon: "📖", levelReq: 6 },
  sopir: { name: "Sopir", income: 30000, exp: 28, energyCost: 25, icon: "🚗", levelReq: 7 },
  kuli_kantor: { name: "Kuli Kantor", income: 35000, exp: 30, energyCost: 20, icon: "💼", levelReq: 8 },
  supervisor: { name: "Supervisor", income: 50000, exp: 35, energyCost: 25, icon: "👔", levelReq: 10 },
  manager: { name: "Manager", income: 75000, exp: 40, energyCost: 30, icon: "💼", levelReq: 13 },
  pengusaha: { name: "Pengusaha", income: 100000, exp: 50, energyCost: 35, icon: "🏢", levelReq: 16 },
  konglomerat: { name: "Konglomerat", income: 150000, exp: 60, energyCost: 40, icon: "👑", levelReq: 20 },
};

// ─── DATA ALAT (verbatim script) ───
const TOOLS = {
  "Topi Kuli": { cost: 5000, bonus: "Energy +5", energyBonus: 5 },
  "Sarung Tangan": { cost: 8000, bonus: "Energy +8", energyBonus: 8 },
  "Sepatu Boot": { cost: 12000, bonus: "Energy +10", energyBonus: 10 },
  "Kacamata Safety": { cost: 15000, bonus: "Energy +12", energyBonus: 12 },
  "Jam Tangan": { cost: 20000, bonus: "Energy +15", energyBonus: 15 },
  "Mesin Jahit": { cost: 50000, bonus: "Gaji +10%", incomeBonus: 10 },
  "Motor Bekas": { cost: 100000, bonus: "Gaji +20%", incomeBonus: 20 },
  "Laptop": { cost: 200000, bonus: "Gaji +30%", incomeBonus: 30 },
  "Mobil": { cost: 500000, bonus: "Gaji +50%", incomeBonus: 50 },
  "Rumah Kontrakan": { cost: 1000000, bonus: "Gaji +100%", incomeBonus: 100 },
};

// lookup pekerjaan toleran: "kuli pasar" / "kulipasar" / "kuli_pasar"
const JOB_LOOKUP = {};
for (const [key, job] of Object.entries(JOBS)) {
  JOB_LOOKUP[key] = key;
  JOB_LOOKUP[key.replace(/_/g, "")] = key;
  JOB_LOOKUP[job.name.toLowerCase()] = key;
  JOB_LOOKUP[job.name.toLowerCase().replace(/\s+/g, "")] = key;
}

const getToolBonus = (tools = []) =>
  tools.reduce((sum, t) => sum + (TOOLS[t]?.incomeBonus || 0), 0);

const getJob = (rpg) => JOBS[rpg?.nguliJob || "pengangguran"] || JOBS.pengangguran;

// ─── KERJA ───
async function doWork(m, sock) {
  const rpg = ensureRpg(m, m.pushName);
  const job = getJob(rpg);

  if (!job || job.income === 0) {
    return m.reply(novaRpgBox("nguli",
      `😴 Kamu masih *${job.name}*! Cari kerja dulu\n💡 .nguli kerja <pekerjaan> — lihat daftar: .nguli help`, "warn"));
  }

  const cd = checkCooldown(m, "lastNguli");
  if (cd) {
    await reactCooldown(m);
    return m.reply(novaRpgBox("nguli",
      `⏳ Sabar kuli! Tunggu *${cd} detik* lagi.\n💡 ${job.name} butuh istirahat sebentar.`, "warn"));
  }

  if (rpg.energy < job.energyCost) {
    return m.reply(novaRpgBox("nguli",
      `😰 Energi kurang! Butuh *${job.energyCost}* energi\n⚡ Energy: *${rpg.energy}/${rpg.maxEnergy}*\n💡 Ketik .nguli istirahat`, "warn"));
  }

  // ── animasi morphing (frame verbatim script) ──
  const name = m.pushName || "Kuli";
  const pct1 = Math.floor(Math.random() * 50) + 20;
  const pct2 = Math.floor(Math.random() * 30) + 70;
  await rpgScene(m, sock, [
    `🔨 ${name} mulai bekerja sebagai ${job.icon} ${job.name}...`,
    `💪 ${name} bekerja keras!`,
    `⏳ Proses... ${pct1}%`,
    `⏳ Proses... ${pct2}%`,
    `🎉 Selesai!`,
  ], NGULI_ANIM_MS, "nguli");

  // ── hitung hasil ──
  const toolBonus = getToolBonus(rpg.nguliTools);
  const income = Math.floor(job.income * (1 + toolBonus / 100));
  const expGain = job.exp + Math.floor(Math.random() * 5);

  useEnergy(m, job.energyCost);
  addCash(m, income);
  const expRes = addExp(m, expGain);
  setCooldown(m, "lastNguli", NGULI_COOLDOWN);

  // counter kerja — RE-READ dulu (stale-ref saveRpg)
  const fresh = ensureRpg(m);
  fresh.nguliWorkCount = (fresh.nguliWorkCount || 0) + 1;
  saveRpg(m, { nguliWorkCount: fresh.nguliWorkCount });

  // ── hasil (baca state terbaru) ──
  const fin = ensureRpg(m);
  let body =
    `✅ ${job.icon} HASIL KERJA\n\n` +
    `👤 ${name}\n` +
    `💼 ${job.name}\n` +
    `💵 Gaji : ${formatRp(income)}\n` +
    `⭐ EXP : +${expGain}\n` +
    `⚡ Energy : ${fin.energy}/${fin.maxEnergy}\n\n` +
    `📊 Total Uang : ${formatRp(fin.cash || 0)}`;
  if (toolBonus > 0) body += `\n🎯 Bonus Alat : +${toolBonus}%`;
  if (expRes?.leveledUp) {
    body += `\n\n⬆️ LEVEL UP! Level ${fin.level - (expRes.levels || 1)} → ${fin.level}\n⚡ Max Energy & HP naik!`;
  }
  return m.reply(novaRpgBox("nguli", body, "success"));
}

// ─── ISTIRAHAT ───
async function doRest(m, sock) {
  const rpg = ensureRpg(m, m.pushName);
  const restAmount = Math.min(50, rpg.maxEnergy - rpg.energy);

  if (restAmount <= 0) {
    return m.reply(novaRpgBox("nguli",
      `⚡ Energi penuh! *${rpg.energy}/${rpg.maxEnergy}*\n💡 Ayo kerja! .nguli kerja`, "warn"));
  }

  const name = m.pushName || "Kuli";
  await rpgScene(m, sock, [
    `😴 ${name} istirahat...`,
    `💤 Zzz... ${Math.floor(Math.random() * 20) + 10}%`,
    `💤 Zzz... ${Math.floor(Math.random() * 30) + 60}%`,
    `😊 Segar lagi!`,
  ], NGULI_ANIM_MS, "nguli");

  const fresh = ensureRpg(m);
  fresh.energy = Math.min(fresh.energy + 50, fresh.maxEnergy);
  saveRpg(m, { energy: fresh.energy });

  const fin = ensureRpg(m);
  return m.reply(novaRpgBox("nguli",
    `✅ ISTIRAHAT SELESAI\n\n⚡ Energy : ${fin.energy}/${fin.maxEnergy}\n💡 Sekarang siap kerja!`, "success"));
}

// ─── HANDLER ───
async function handler(m, { sock, args }) {
  try {
    await m.react("🕒");
    const sub = (args?.[0] || "").toLowerCase();
    const sub2 = (args?.[1] || "").toLowerCase();

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("nguli", "RPG belum siap. Ketik .daftar dulu.", "error"));
    const name = m.pushName || "Kuli";
    const job = getJob(rpg);

    // KERJA (mulai / ganti pekerjaan)
    if (sub === "kerja") {
      // nama pekerjaan bisa multi-kata: "kuli pasar", "pedagang kaki lima"
      const jobRaw = (args?.slice(1) || []).join(" ").trim();
      if (jobRaw) {
        const jobInput = jobRaw.toLowerCase();
        const key = JOB_LOOKUP[jobInput.replace(/[_\s]+/g, "")] || JOB_LOOKUP[jobInput];
        const newJob = key ? JOBS[key] : null;

        if (!newJob) {
          const available = Object.entries(JOBS).filter(([, j]) => !j.levelReq || j.levelReq <= rpg.level);
          let msg = `⚠️ Pekerjaan "*${jobRaw}*" tidak ditemukan!\n\n📋 PEKERJAAN TERSEDIA (Level ${rpg.level}):\n`;
          available.forEach(([, j]) => {
            msg += `${j.icon} ${j.name}${j.levelReq ? ` (Level ${j.levelReq})` : ""}\n`;
          });
          return m.reply(novaRpgBox("nguli", msg, "warn"));
        }
        if (newJob.levelReq && rpg.level < newJob.levelReq) {
          return m.reply(novaRpgBox("nguli",
            `⚠️ Butuh *Level ${newJob.levelReq}* untuk menjadi ${newJob.name}!\nLevel kamu: *${rpg.level}*`, "warn"));
        }
        if ((rpg.nguliJob || "pengangguran") === key) {
          return m.reply(novaRpgBox("nguli",
            `ℹ️ Kamu sudah ${newJob.icon} *${newJob.name}*!\n💡 Langsung kerja: .nguli kerja`, "warn"));
        }
        saveRpg(m, { nguliJob: key });
        return m.reply(novaRpgBox("nguli",
          `✅ BERGANTI PEKERJAAN!\n\n${newJob.icon} ${newJob.name}\n💵 Gaji : ${formatRp(newJob.income)}\n⭐ EXP : ${newJob.exp}\n⚡ Energy Cost : ${newJob.energyCost}\n\n💡 Ketik .nguli kerja untuk mulai!`, "success"));
      }
      return doWork(m, sock);
    }

    // ISTIRAHAT
    if (sub === "istirahat" || sub === "rest" || sub === "tidur") return doRest(m, sock);

    // BELI ALAT
    if (sub === "beli" || sub === "shop") {
      const raw = (args?.slice(1) || []).join(" ").trim();
      const toolName = TOOLS[raw] ? raw : Object.keys(TOOLS).find((t) => t.toLowerCase() === raw.toLowerCase());
      if (!toolName) {
        let msg = `🛒 DAFTAR ALAT YANG BISA DIBELI\n\n`;
        for (const [t, d] of Object.entries(TOOLS)) {
          msg += `• ${t} — ${formatRp(d.cost)}\n  💡 ${d.bonus}\n`;
        }
        msg += `\n💵 Uang kamu: ${formatRp(getCash(m))}\n💡 Ketik .nguli beli [nama alat]`;
        return m.reply(novaRpgBox("nguli", msg));
      }
      const tool = TOOLS[toolName];
      const tools = ensureRpg(m).nguliTools || [];
      if (tools.includes(toolName)) {
        return m.reply(novaRpgBox("nguli", `ℹ️ Kamu sudah punya *${toolName}*!`, "warn"));
      }
      if (!spendCash(m, tool.cost)) {
        return m.reply(novaRpgBox("nguli",
          `💵 Uang tidak cukup! Butuh *${formatRp(tool.cost)}*\nUang kamu: ${formatRp(getCash(m))}`, "warn"));
      }
      const fresh = ensureRpg(m);
      const newTools = [...(fresh.nguliTools || []), toolName];
      const patch = { nguliTools: newTools };
      if (tool.energyBonus) {
        fresh.maxEnergy = (fresh.maxEnergy || 100) + tool.energyBonus;
        patch.maxEnergy = fresh.maxEnergy;
      }
      saveRpg(m, patch);
      const fin = ensureRpg(m);
      return m.reply(novaRpgBox("nguli",
        `✅ BELI ALAT BERHASIL!\n\n🛒 ${toolName}\n💡 ${tool.bonus}\n💵 Sisa Uang : ${formatRp(fin.cash || 0)}${tool.energyBonus ? `\n⚡ Max Energy : ${fin.maxEnergy}` : ""}`, "success"));
    }

    // TABUNG
    if (sub === "tabung" || sub === "deposit") {
      const amount = parseInt(sub2, 10);
      if (isNaN(amount) || amount <= 0) {
        return m.reply(novaRpgBox("nguli", `⚠️ Masukkan jumlah yang valid!\nContoh: .nguli tabung 50000`, "warn"));
      }
      if (!spendCash(m, amount)) {
        return m.reply(novaRpgBox("nguli", `💵 Uang tidak cukup! Uang: ${formatRp(getCash(m))}`, "warn"));
      }
      const fresh = ensureRpg(m);
      fresh.nguliBank = (fresh.nguliBank || 0) + amount;
      saveRpg(m, { nguliBank: fresh.nguliBank });
      const fin = ensureRpg(m);
      return m.reply(novaRpgBox("nguli",
        `🏦 TABUNG UANG\n\n💵 Uang : ${formatRp(fin.cash || 0)}\n🏦 Bank : ${formatRp(fin.nguliBank || 0)}`, "success"));
    }

    // AMBIL
    if (sub === "ambil" || sub === "withdraw") {
      const amount = parseInt(sub2, 10);
      if (isNaN(amount) || amount <= 0) {
        return m.reply(novaRpgBox("nguli", `⚠️ Masukkan jumlah yang valid!\nContoh: .nguli ambil 50000`, "warn"));
      }
      const fresh = ensureRpg(m);
      if ((fresh.nguliBank || 0) < amount) {
        return m.reply(novaRpgBox("nguli", `🏦 Saldo bank tidak cukup! Bank: ${formatRp(fresh.nguliBank || 0)}`, "warn"));
      }
      fresh.nguliBank = (fresh.nguliBank || 0) - amount;
      saveRpg(m, { nguliBank: fresh.nguliBank });
      addCash(m, amount);
      const fin = ensureRpg(m);
      return m.reply(novaRpgBox("nguli",
        `🏦 AMBIL UANG\n\n💵 Uang : ${formatRp(fin.cash || 0)}\n🏦 Bank : ${formatRp(fin.nguliBank || 0)}`, "success"));
    }

    // ALAT MILIK
    if (sub === "tools" || sub === "inventory" || sub === "alat") {
      const tools = rpg.nguliTools || [];
      if (!tools.length) {
        return m.reply(novaRpgBox("nguli", `🛠️ Belum punya alat!\n💡 Beli dengan .nguli beli [alat]`, "warn"));
      }
      let msg = `🛠️ ALAT ${name}\n\n`;
      tools.forEach((t, i) => {
        msg += `${i + 1}. ${t} — ${TOOLS[t]?.bonus || "??"}\n`;
      });
      msg += `\n🎯 Total Bonus Gaji: +${getToolBonus(tools)}%`;
      return m.reply(novaRpgBox("nguli", msg));
    }

    // LEADERBOARD KULI TERKAYA
    if (sub === "top" || sub === "leaderboard") {
      let list = [];
      try {
        const all = getDatabase().getAllUsers() || {};
        list = Object.entries(all)
          .map(([jid, u]) => {
            const r = u.rpg || {};
            return { jid, name: u.name || r.name || jid.split("@")[0], total: (r.cash || 0) + (r.nguliBank || 0), level: r.level || 1, job: (JOBS[r.nguliJob]?.name) || "Pengangguran" };
          })
          .filter((p) => p.total > 0)
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);
      } catch {}
      if (!list.length) return m.reply(novaRpgBox("nguli", "📊 Belum ada kuli kaya!", "warn"));
      let msg = `🏆 LEADERBOARD KULI TERKAYA\n\n`;
      list.forEach((p, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        msg += `${medal} ${p.name} — ${formatRp(p.total)}\n   Level ${p.level} | ${p.job}\n`;
      });
      return m.reply(novaRpgBox("nguli", msg));
    }

    // HELP
    if (sub === "help" || sub === "bantuan") {
      return m.reply(novaRpgBox("nguli",
        `👷 BANTUAN NGULI\n\n` +
        `📌 PERINTAH:\n` +
        `.nguli — status & menu\n` +
        `.nguli kerja — mulai kerja\n` +
        `.nguli kerja <pekerjaan> — ganti kerja\n` +
        `.nguli istirahat — pulihkan energi\n` +
        `.nguli beli [alat] — beli alat bonus\n` +
        `.nguli tabung <jumlah> — simpan ke bank\n` +
        `.nguli ambil <jumlah> — ambil dari bank\n` +
        `.nguli tools — lihat alat\n` +
        `.nguli top — leaderboard\n\n` +
        `🔥 TIPS:\n` +
        `• Kerja terus untuk naik level\n` +
        `• Beli alat untuk bonus gaji\n` +
        `• Tabung uang di bank biar aman\n` +
        `• Naik level buka kerja lebih bergaji!`));
    }

    // DEFAULT: STATUS & MENU
    const menu =
      `👷 NGULI — SIMULASI KERJA KERAS\n\n` +
      `👤 ${name} | Level ${rpg.level}\n` +
      `💼 ${job.icon} ${job.name}\n` +
      `💵 Uang : ${formatRp(rpg.cash || 0)}\n` +
      `🏦 Bank : ${formatRp(rpg.nguliBank || 0)}\n` +
      `⚡ Energy : ${rpg.energy}/${rpg.maxEnergy}\n` +
      `⭐ EXP : ${rpg.exp}/${rpg.expNext}\n` +
      `📊 Total Kerja : ${rpg.nguliWorkCount || 0}\n` +
      `🛠️ Alat : ${(rpg.nguliTools || []).length} (bonus gaji +${getToolBonus(rpg.nguliTools)}%)\n\n` +
      `📌 PERINTAH:\n` +
      `.nguli kerja — mulai kerja\n` +
      `.nguli istirahat — pulihkan energi\n` +
      `.nguli kerja <pekerjaan> — ganti kerja\n` +
      `.nguli beli [alat] — beli alat\n` +
      `.nguli tabung/ambil <jumlah> — bank\n` +
      `.nguli top — kuli terkaya\n` +
      `.nguli help — bantuan lengkap`;
    return m.reply(novaRpgBox("nguli", menu));
  } catch (e) {
    console.error("[nguli] handler error:", e.message);
    return m.reply(novaRpgBox("nguli", "⚠️ Ada yang error, coba lagi.", "error"));
  }
}

export { pluginConfig as config, handler };
export default { config: pluginConfig, handler };
