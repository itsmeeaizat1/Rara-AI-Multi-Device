// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// questboard.js — Daily Quest Board (5 quest random, reward progresif)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "questboard",
  alias: ["questboard", "dailyquest", "quest", "rpgquest"],
  category: "rpg",
  description: "Daily quest board — 5 quest random dengan reward progresif",
  usage: ".questboard (cek quest)\n.questboard claim <id> (klaim reward)",
  example: ".questboard\n.questboard claim 1",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

const QUEST_POOL = [
  { id: "mine10", name: "Tambang 10x", emoji: "⛏️", desc: "Lakukan mining 10 kali", target: 10, reward: { gold: 1000, energi: 20 }, type: "mining" },
  { id: "fish5", name: "Mancing 5x", emoji: "🎣", desc: "Lakukan fishing 5 kali", target: 5, reward: { gold: 800, energi: 15 }, type: "fishing" },
  { id: "arena3", name: "Arena 3x", emoji: "⚔️", desc: "Main arena 3 kali", target: 3, reward: { gold: 1200, energi: 25 }, type: "arena" },
  { id: "hunt5", name: "Berburu 5x", emoji: "🏹", desc: "Berburu 5 kali", target: 5, reward: { gold: 600, energi: 10 }, type: "hunting" },
  { id: "craft2", name: "Craft 2x", emoji: "🔨", desc: "Craft 2 items", target: 2, reward: { gold: 500, energi: 10 }, type: "crafting" },
  { id: "pet_battle3", name: "Pet Battle 3x", emoji: "🐾", desc: "Pet battle 3 kali", target: 3, reward: { gold: 900, energi: 15 }, type: "pet_battle" },
  { id: "nebang5", name: "Tebang 5x", emoji: "🪓", desc: "Tebang pohon 5 kali", target: 5, reward: { gold: 400, energi: 10 }, type: "chop" },
  { id: "gacha1", name: "Gacha 1x", emoji: "🍀", desc: "Pull gacha 1 kali", target: 1, reward: { gold: 300, energi: 5 }, type: "gacha" },
];

function generateDailyQuests() {
  const shuffled = [...QUEST_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function getQuestData(db, sender) {
  const today = getTodayKey();
  const data = await db.getPlayerData?.(sender, "questboard") || {};
  if (data.date !== today) {
    // Reset daily
    return { date: today, quests: generateDailyQuests().map(q => ({ ...q, progress: 0, claimed: false })), claimed: [] };
  }
  return data;
}

async function saveQuestData(db, sender, data) {
  await db.setPlayerData?.(sender, "questboard", data);
}

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();
    const data = await getQuestData(db, m.sender);

    if (subCmd === "claim") {
      const questId = m.args[1];
      if (!questId) {
        return m.reply(claraWrap("questboard", `Mau klaim quest mana?\n\nContoh: ${m.prefix}questboard claim 1`, "guide"));
      }

      const questIdx = parseInt(questId) - 1;
      const quest = data.quests?.[questIdx];
      if (!quest) {
        await m.react("❌");
        return m.reply(claraWrap("questboard", "Quest tidak ditemukan.", "error"));
      }

      if (quest.claimed) {
        return m.reply(claraWrap("questboard", `Quest "${quest.name}" sudah diklaim.`, "error"));
      }

      if ((quest.progress || 0) < quest.target) {
        await m.react("❌");
        return m.reply(claraWrap("questboard", `Belum selesai! Progress: ${quest.progress || 0}/${quest.target}`, "error"));
      }

      // Claim reward
      quest.claimed = true;
      if (quest.reward.gold) try { await db.addGold?.(m.sender, quest.reward.gold); } catch {}
      if (quest.reward.energi) try { await db.addEnergi?.(m.sender, quest.reward.energi); } catch {}
      await saveQuestData(db, m.sender, data);

      await m.react("🐣");
      let msg = `╭─「 ✦ ǫᴜᴇsᴛ ᴄʟᴀɪᴍ ✦ 」\n`;
      msg += `│ ${quest.emoji} *${quest.name}*\n`;
      msg += `│\n`;
      msg += `│ Reward:\n`;
      if (quest.reward.gold) msg += `│ 💰 +${quest.reward.gold} Gold\n`;
      if (quest.reward.energi) msg += `│ ⚡ +${quest.reward.energi} Energi\n`;
      msg += `╰────  •  ────`;
      return m.reply(msg);
    }

    // LIST quests (default)
    if (!data.quests || data.quests.length === 0) {
      await saveQuestData(db, m.sender, { date: getTodayKey(), quests: generateDailyQuests().map(q => ({ ...q, progress: 0, claimed: false })), claimed: [] });
    }
    const quests = data.quests || [];

    let msg = `╭─「 ✦ ᴅᴀɪʟʏ ǫᴜᴇsᴛ ʙᴏᴀʀᴅ ✦ 」\n`;
    msg += `│ Date: *${getTodayKey()}*\n`;
    msg += `│\n`;

    let completed = 0;
    quests.forEach((q, i) => {
      const progress = q.progress || 0;
      const done = progress >= q.target;
      if (done && !q.claimed) completed++;
      const status = q.claimed ? "✅" : (done ? "🎁" : "📋");
      msg += `│ ${i + 1}. ${q.emoji} *${q.name}* ${status}\n`;
      msg += `│    ${q.desc} (${progress}/${q.target})\n`;
      if (done && !q.claimed) {
        msg += `│    → ${m.prefix}questboard claim ${i + 1}\n`;
      }
    });

    const allDone = quests.every(q => q.claimed);
    msg += `│\n`;
    msg += `│ Completed: *${quests.filter(q => q.claimed).length}/${quests.length}*\n`;
    if (allDone) msg += `│ 🎉 Semua quest selesai hari ini!\n`;
    msg += `╰────  •  ────`;
    return m.reply(msg);
  } catch (err) {
    console.error("questboard error:", err);
    await m.react("❌");
    return m.reply(claraWrap("questboard", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
