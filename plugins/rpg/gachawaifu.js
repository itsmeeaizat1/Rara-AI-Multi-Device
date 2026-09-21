// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// gachawaifu.js — Gacha Waifu System (rarity + marry + collection)
import { getDatabase } from "../../src/lib/nova-database.js";
import { animGacha } from "../../src/lib/nova-rpg-anim.js";
import { editFramesAnim } from "../../src/lib/nova-anim-runner.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "gachawaifu",
  alias: ["gachawaifu", "gwaifu", "pullwaifu", "gachaw"],
  category: "rpg",
  description: "Gacha waifu — pull karakter anime + rarity + marry system",
  usage: ".gachawaifu (pull)\n.gachawaifu list (cek koleksi)\n.gachawaifu marry <nama> (kawin waifu)\n.gachawaifu divorce <nama> (cerai)",
  example: ".gachawaifu\n.gachawaifu list\n.gachawaifu marry Rem",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 3, isEnabled: true,
};

const PULL_COST = 100;

const WAIFU_POOL = [
  // UR (0.5%)
  { name: "Rem", anime: "Re:Zero", rarity: "UR", stars: 5, emoji: "💙" },
  { name: "Ram", anime: "Re:Zero", rarity: "UR", stars: 5, emoji: "💗" },
  { name: "Emilia", anime: "Re:Zero", rarity: "UR", stars: 5, emoji: "🤍" },
  { name: "Miku Nakano", anime: "Quintessential", rarity: "UR", stars: 5, emoji: "🎧" },
  // SSR (3%)
  { name: "Zero Two", anime: "Darling in the Franxx", rarity: "SSR", stars: 4, emoji: "" },
  { name: "Marin Kitagawa", anime: "My Dress-Up Darling", rarity: "SSR", stars: 4, emoji: "👗" },
  { name: "Ai Hoshino", anime: "Oshi no Ko", rarity: "SSR", stars: 4, emoji: "⭐" },
  { name: "Yor Forger", anime: "Spy x Family", rarity: "SSR", stars: 4, emoji: "🗡️" },
  { name: "Makima", anime: "Chainsaw Man", rarity: "SSR", stars: 4, emoji: "😈" },
  { name: "Power", anime: "Chainsaw Man", rarity: "SSR", stars: 4, emoji: "🩸" },
  // SR (12%)
  { name: "Nezuko", anime: "Demon Slayer", rarity: "SR", stars: 3, emoji: "🎋" },
  { name: "Shinobu Kocho", anime: "Demon Slayer", rarity: "SR", stars: 3, emoji: "🦋" },
  { name: "Nobara Kugisaki", anime: "Jujutsu Kaisen", rarity: "SR", stars: 3, emoji: "🔨" },
  { name: "Maki Zenin", anime: "Jujutsu Kaisen", rarity: "SR", stars: 3, emoji: "👓" },
  { name: "Anya Forger", anime: "Spy x Family", rarity: "SR", stars: 3, emoji: "🥜" },
  { name: "Fubuki", anime: "One Punch Man", rarity: "SR", stars: 3, emoji: "💚" },
  { name: "Lucy", anime: "Cyberpunk Edgerunners", rarity: "SR", stars: 3, emoji: "💜" },
  { name: "Reze", anime: "Chainsaw Man", rarity: "SR", stars: 3, emoji: "💣" },
  // R (34%)
  { name: "Misty", anime: "Pokemon", rarity: "R", stars: 2, emoji: "💧" },
  { name: "Sakura", anime: "Naruto", rarity: "R", stars: 2, emoji: "" },
  { name: "Ino", anime: "Naruto", rarity: "R", stars: 2, emoji: "💐" },
  { name: "Orihime", anime: "Bleach", rarity: "R", stars: 2, emoji: "🔮" },
  { name: "Rukia", anime: "Bleach", rarity: "R", stars: 2, emoji: "❄️" },
  { name: "Winry", anime: "FMA", rarity: "R", stars: 2, emoji: "🔧" },
  { name: "Konata", anime: "Lucky Star", rarity: "R", stars: 2, emoji: "🎮" },
  // N (50.5%)
  { name: "Side Character A", anime: "Random Anime", rarity: "N", stars: 1, emoji: "📋" },
  { name: "Villager-chan", anime: "Isekai #47", rarity: "N", stars: 1, emoji: "🏠" },
  { name: "Classmate-san", anime: "Slice of Life", rarity: "N", stars: 1, emoji: "📚" },
  { name: "Kohai-chan", anime: "RomCom", rarity: "N", stars: 1, emoji: "🍵" },
];

const RARITY_WEIGHTS = { UR: 0.5, SSR: 3, SR: 12, R: 34, N: 50.5 };
const RARITY_EMOJI = { UR: "🔴", SSR: "🟡", SR: "🟣", R: "🔵", N: "⚪" };

function weightedPull() {
  const roll = Math.random() * 100;
  let cumulative = 0;
  let selectedRarity = "N";
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    cumulative += weight;
    if (roll <= cumulative) { selectedRarity = rarity; break; }
  }
  const pool = WAIFU_POOL.filter(w => w.rarity === selectedRarity);
  return pool[Math.floor(Math.random() * pool.length)] || WAIFU_POOL[0];
}

async function getWaifuData(db, sender) {
  try {
    const data = await db.getPlayerData?.(sender, "gachawaifu");
    if (data) return data;
  } catch {}
  return { collection: [], married: [], pulls: 0 };
}

async function saveWaifuData(db, sender, data) {
  try { await db.setPlayerData?.(sender, "gachawaifu", data); } catch (e) { console.error("save waifu:", e); }
}

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();

    // LIST collection
    if (subCmd === "list" || subCmd === "koleksi") {
      const data = await getWaifuData(db, m.sender);
      if (!data.collection || data.collection.length === 0) {
        return m.reply(novaRpgBox("gachawaifu", `Koleksi waifu kamu kosong!\n\nPull dengan: ${m.prefix}gachawaifu`, "guide"));
      }

      // Group by rarity
      const grouped = {};
      data.collection.forEach(w => {
        if (!grouped[w.rarity]) grouped[w.rarity] = [];
        grouped[w.rarity].push(w);
      });

      let msg = "";
      msg += `Total: *${data.collection.length}* waifu\n`;
      msg += `Pulls: *${data.pulls || 0}*\n`;
      msg += `
`;
      for (const rarity of ["UR", "SSR", "SR", "R", "N"]) {
        if (grouped[rarity]) {
          msg += `${RARITY_EMOJI[rarity]} ${rarity} (${grouped[rarity].length}):\n`;
          grouped[rarity].forEach(w => {
            msg += `${w.emoji} ${w.name} [${w.anime}]\n`;
          });
        }
      }
            return m.reply(msg);
    }

    // MARRY waifu
    if (subCmd === "marry" || subCmd === "kawin") {
      const targetName = m.args.slice(1).join(" ").trim();
      if (!targetName) {
        return m.reply(novaRpgBox("gachawaifu", `Mau kawin dengan siapa?\n\nContoh: ${m.prefix}gachawaifu marry Rem`, "guide"));
      }

      const data = await getWaifuData(db, m.sender);
      const waifu = data.collection.find(w => w.name.toLowerCase() === targetName.toLowerCase());
      if (!waifu) {
        await m.react("❌");
        return m.reply(novaRpgBox("gachawaifu", `Waifu "${targetName}" tidak ada di koleksi kamu.`, "error"));
      }

      if (data.married?.some(w => w.name.toLowerCase() === waifu.name.toLowerCase())) {
        return m.reply(novaRpgBox("gachawaifu", `Kamu sudah married dengan ${waifu.name}!`, "error"));
      }

      if (!data.married) data.married = [];
      data.married.push(waifu);

      // Remove from collection ( transferred to married)
      data.collection = data.collection.filter(w => w.name !== waifu.name);
      await saveWaifuData(db, m.sender, data);

      await m.react("🐣");
      let msg = "";
      msg += `${waifu.emoji} *${waifu.name}*\n`;
      msg += `Anime: ${waifu.anime}\n`;
      msg += `Rarity: ${RARITY_EMOJI[waifu.rarity]} ${waifu.rarity}\n`;
      msg += `Stars: ${"⭐".repeat(waifu.stars)}\n`;
      msg += `
`;
      msg += `💍 Selamat! Kamu dan ${waifu.name} sekarang married!\n`;
            return m.reply(msg);
    }

    // DIVORCE
    if (subCmd === "divorce" || subCmd === "cerai") {
      const targetName = m.args.slice(1).join(" ").trim();
      if (!targetName) {
        return m.reply(novaRpgBox("gachawaifu", `Mau cerai dengan siapa?\n\nContoh: ${m.prefix}gachawaifu divorce Rem`, "guide"));
      }

      const data = await getWaifuData(db, m.sender);
      const waifu = data.married?.find(w => w.name.toLowerCase() === targetName.toLowerCase());
      if (!waifu) {
        await m.react("❌");
        return m.reply(novaRpgBox("gachawaifu", `Kamu tidak married dengan "${targetName}".`, "error"));
      }

      data.married = data.married.filter(w => w.name !== waifu.name);
      data.collection.push(waifu); // kembali ke collection
      await saveWaifuData(db, m.sender, data);

      await m.react("🐣");
      return m.reply(novaRpgBox("gachawaifu", `💔 Kamu dan ${waifu.name} sekarang divorced. Waifu dikembalikan ke koleksi.`));
    }

    // MARRIED list
    if (subCmd === "married" || subCmd === "istri") {
      const data = await getWaifuData(db, m.sender);
      if (!data.married || data.married.length === 0) {
        return m.reply(novaRpgBox("gachawaifu", `Kamu belum married dengan waifu manapun.`, "guide"));
      }
      let msg = "";
      msg += `Total: *${data.married.length}* waifu\n`;
      msg += `
`;
      data.married.forEach((w, i) => {
        msg += `${i + 1}. ${w.emoji} ${w.name} [${w.anime}]\n`;
        msg += `${RARITY_EMOJI[w.rarity]} ${w.rarity} ${"⭐".repeat(w.stars)}\n`;
      });
            return m.reply(msg);
    }

    // PULL (default action)
    await m.react("🕒");

    // Cek energi/gold
    try {
      const energi = await db.getEnergi?.(m.sender);
      if (energi !== undefined && energi < PULL_COST) {
        await m.react("❌");
        return m.reply(novaRpgBox("gachawaifu", `Energi tidak cukup! Butuh ${PULL_COST} energi.`, "error"));
      }
      await db.minEnergi?.(m.sender, PULL_COST);
    } catch {}

    // Gacha animation
    // 🎬 animasi khas KAPSUL WAIFU (fallback: suspense reveal bila edit gak didukung)
    const kapsulOk = await editFramesAnim(sock, m.chat, [
      "```\n🥚🥚🥚🥚🥚\n mesin kapsul bergetar…\n```",
      "```\n🥚🥚🥚🥚🥚\n      ↓\n🥚 kapsul JATUH!\n```",
      "```\n     🥚\n  gemetar… gemetar…\n```",
      "```\n    🥚✨\n cahaya merembes dari celah…\n```",
      "```\n   💥✨💥\n KAPSUL TERBUKA!\n```",
      "```\n    💞\n REVEAL! Waifu menyusul…\n```",
    ], {});
    if (!kapsulOk) await animGacha(m, sock);

    const waifu = weightedPull();
    const data = await getWaifuData(db, m.sender);
    if (!data.collection) data.collection = [];
    if (!data.married) data.married = [];
    if (!data.pulls) data.pulls = 0;
    data.pulls++;
    data.collection.push(waifu);
    await saveWaifuData(db, m.sender, data);

    await m.react("🐣");

    // Animasi pull
    const isRare = waifu.rarity === "SSR" || waifu.rarity === "UR";
    let msg = "";
    msg += `${isRare ? " PULL BERHASIL! " : "Pull selesai!"}\n`;
    msg += `
`;
    msg += `${waifu.emoji} *${waifu.name}*\n`;
    msg += `Anime: ${waifu.anime}\n`;
    msg += `Rarity: ${RARITY_EMOJI[waifu.rarity]} *${waifu.rarity}*\n`;
    msg += `${"⭐".repeat(waifu.stars)}\n`;
    msg += `
`;
    msg += `Total koleksi: *${data.collection.length}*\n`;
    msg += `Total pulls: *${data.pulls}*\n`;
    if (waifu.rarity === "UR") msg += `🎉 ULTRA RARE! (0.5% chance)\n`;
    
    return m.reply(msg);
  } catch (err) {
    console.error("gachawaifu error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("gachawaifu", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
