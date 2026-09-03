// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Leaderboard — Papan peringkat tiap game & kategori stat RPG

import {
  claraWrap, toSC
} from "../../src/lib/nova-menu-style.js";
import { getLeaderboard } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "leaderboard",
  alias: ["leaderboard", "lb", "papanperingkat", "topplayer"],
  category: "rpg",
  description: "Papan peringkat tiap kategori game (gold, level, survival, mancing, slot, dll)",
  usage: ".leaderboard (daftar kategori)\n.leaderboard <kategori>",
  example: ".leaderboard survival",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// Kategori → metrik yang dipakai.
// Whitelist RPG dipakai langsung ("gold", "level", dst),
// stat per-game via deep path ke rpg.<gameKey>.<field> (array dihitung length-nya).
const CATEGORIES = [
  { key: "level",        icon: "⭐", label: "Level Tertinggi",       metric: "level" },
  { key: "gold",         icon: "💰", label: "Pemain Terkaya",        metric: "gold" },
  { key: "kerja",        icon: "💼", label: "Job Level",             metric: "joblevel" },
  { key: "pvp",          icon: "⚔️", label: "PvP Rating",            metric: "pvp" },
  { key: "kills",        icon: "💀", label: "Total Kills",            metric: "kills" },
  { key: "boss",         icon: "🐉", label: "Boss Kills",            metric: "boss" },
  { key: "gems",         icon: "💎", label: "Koleksi Gems",          metric: "gems" },
  { key: "achievement",  icon: "🏅", label: "Achievement Poin",     metric: "achievement" },
  { key: "survival",     icon: "🏕️", label: "Hari Survival",        metric: "survival.daysSurvived" },
  { key: "mancing",      icon: "🎣", label: "Total Tangkapan",      metric: "mancing.totalCatch" },
  { key: "mancingv2",   icon: "🐠", label: "Tangkapan Mancing V2",  metric: "fishingv2.totalCaught" },
  { key: "berburu",     icon: "🏹", label: "Buruan Berhasil",        metric: "berburu.totalHunt" },
  { key: "mining",      icon: "⛏️", label: "Bijih Ditambang",        metric: "mining.totalMine" },
  { key: "nebang",      icon: "🪓", label: "Pohon Ditebang",         metric: "nebang.totalNebang" },
  { key: "nguli",       icon: "👷", label: "Total Kerja Kuli",      metric: "nguli.totalNguli" },
  { key: "ojek",        icon: "🏍️", label: "Total Anter Ojek",      metric: "ojekrpg.totalOjek" },
  { key: "sampah",      icon: "🗑️", label: "Total Buang Sampah",    metric: "sampah.totalSampah" },
  { key: "masak",        icon: "🍳", label: "Total Masakan",         metric: "cookingv2.cookedHistory" },
  { key: "slot",         icon: "🎰", label: "Kemenangan Slot",       metric: "slotmachine.wins" },
  { key: "gacha",        icon: "🎁", label: "Total Pull Gacha",      metric: "gachawaifu.pulls" },
];

function findCategory(input) {
  const q = String(input || "").trim().toLowerCase();
  return CATEGORIES.find(c =>
    c.key === q ||
    c.label.toLowerCase() === q ||
    c.metric === q ||
    (q === "uang" && c.key === "gold") ||
    (q === "fish" && c.key === "mancing") ||
    (q === "waifu" && c.key === "gacha")
  );
}

function myRank(m, cat) {
  const mine = String(m.sender || "").replace(/@.+/g, "");
  const all = getLeaderboard(cat.metric, 9999);
  const idx = all.findIndex(p => String(p.number || "") === mine);
  return { rank: idx + 1, total: all.length, value: idx >= 0 ? all[idx].value : 0 };
}

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const input = (m.args?.[0] || "").toLowerCase();
    const cat = input ? findCategory(input) : null;

    // ── Tanpa argumen / kategori tidak dikenal → menu kategori ──
    if (!input || !cat) {
      if (input && !cat) await m.react("🚫");

      let menu = "";
      if (input && !cat) menu += `Kategori *${input}* tidak ditemukan.\n\n`;
      menu += `Skor tiap game & stat RPG direkam otomatis ke papan peringkat.\n`;
      menu += `\n📌 Pilih kategori:\n`;
      for (const c of CATEGORIES) {
        menu += `${c.icon} *${toSC(c.key)}* — ${toSC(c.label)}\n`;
      }
      menu += `\n💡 Contoh: ${m.prefix}leaderboard survival`;

      await m.react("🐣");
      return m.reply(claraWrap("leaderboard", menu, input && !cat ? "warn" : "info"));
    }

    // ── Board kategori terpilih ──
    const board = getLeaderboard(cat.metric, 10);
    if (!board.length) {
      await m.react("🐣");
      return m.reply(claraWrap("leaderboard", `Belum ada data untuk kategori *${cat.key}*.\nMain dulu biar skormu terekam!`, "info"));
    }

    const medal = ["🥇", "🥈", "🥉"];
    let msg = "";
    msg += `${cat.icon} *${toSC(cat.label.toUpperCase())}*\n`;
    msg += `\n`;
    board.forEach((p, i) => {
      const rank = medal[i] || `${i + 1}.`;
      const name = p.name || p.number || "Unknown";
      const val = (p.value || 0).toLocaleString("id-ID");
      const lvl = p.rpg?.level ? ` | Lv.${p.rpg.level}` : "";
      msg += `${rank} *${name}*\n`;
      msg += `${toSC(cat.key)}: ${val}${toSC(lvl)}\n`;
    });
    msg += `\n`;
    const { rank, total, value } = myRank(m, cat);
    if (rank > 0) {
      msg += `📊 Posisimu: *#${rank}* dari ${total} pemain`;
      msg += value > 0 ? ` (${value.toLocaleString("id-ID")} ${toSC(cat.key)})` : "";
      msg += `\n`;
    }

    await m.react("🐣");
    return m.reply(claraWrap("leaderboard", msg, "success"));
  } catch (err) {
    await m.react("❌");
    return m.reply(claraWrap("leaderboard", "Terjadi error saat memuat papan peringkat.", "error"));
  }
}

export { pluginConfig as config, handler };
