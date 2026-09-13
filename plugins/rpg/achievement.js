// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// achievement.js — Achievement System (unlock badges & rewards)
import { getDatabase } from "../../src/lib/nova-database.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "achievement",
  alias: ["achievement", "achievements", "trophies", "achievementrpg"],
  category: "rpg",
  description: "Achievement system — unlock badges & rewards",
  usage: ".achievement (cek progress)\n.achievement claim <id> (klaim reward)",
  example: ".achievement",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

const ACHIEVEMENTS = [
  { id: "first_blood", name: "First Blood", emoji: "🩸", desc: "Menang pertama di Arena", reward: { gold: 500 }, check: (d) => (d.arena?.wins || 0) >= 1, progress: (d) => [d.arena?.wins || 0, 1] },
  { id: "arena_master", name: "Arena Master", emoji: "⚔️", desc: "Menang 50x di Arena", reward: { gold: 5000, energi: 50 }, check: (d) => (d.arena?.wins || 0) >= 50, progress: (d) => [d.arena?.wins || 0, 50] },
  { id: "fisherman", name: "Fisherman", emoji: "🎣", desc: "Tangkap 100 ikan", reward: { gold: 2000 }, check: (d) => (d.fishing?.totalCaught || 0) >= 100, progress: (d) => [d.fishing?.totalCaught || 0, 100] },
  { id: "rich_man", name: "Rich Man", emoji: "💰", desc: "Punya 100k gold", reward: { energi: 100 }, check: (d) => (d.gold || d.balance || 0) >= 100000, progress: (d) => [d.gold || d.balance || 0, 100000] },
  { id: "pet_lover", name: "Pet Lover", emoji: "🐾", desc: "Adopsi pet pertama", reward: { gold: 1000 }, check: (d) => (d.pet?.type) != null, progress: (d) => [d.pet?.type ? 1 : 0, 1] },
  { id: "gacha_lucky", name: "Lucky Gacha", emoji: "🍀", desc: "Pull UR di gacha waifu", reward: { gold: 3000 }, check: (d) => (d.gachawaifu?.collection || []).some(w => w.rarity === "UR"), progress: (d) => [(d.gachawaifu?.collection || []).some(w => w.rarity === "UR") ? 1 : 0, 1] },
  { id: "dedicated", name: "Dedicated Player", emoji: "🔥", desc: "Daily login 7 hari streak", reward: { gold: 2000, energi: 30 }, check: (d) => (d.daily?.totalClaims || 0) >= 7, progress: (d) => [d.daily?.totalClaims || 0, 7] },
  { id: "crafter", name: "Crafter", emoji: "🔨", desc: "Craft 10 items", reward: { gold: 1500 }, check: (d) => (d.crafting?.crafted || []).length >= 10, progress: (d) => [(d.crafting?.crafted || []).length, 10] },
  { id: "miner", name: "Deep Miner", emoji: "⛏️", desc: "Mining 100x", reward: { gold: 1000 }, check: (d) => (d.mining?.count || 0) >= 100, progress: (d) => [d.mining?.count || 0, 100] },
  { id: "dungeon_master", name: "Dungeon Master", emoji: "🏰", desc: "Clear 50 dungeon", reward: { gold: 5000 }, check: (d) => (d.dungeon?.clears || 0) >= 50, progress: (d) => [d.dungeon?.clears || 0, 50] },
];

/** Bar progress achievement standar ▰▱ (14 Sep — bar untuk semua progress) */
function progBar(cur, target) {
  const c = Math.max(0, cur || 0), mx = Math.max(0, target || 0);
  const filled = mx > 0 ? Math.min(10, Math.round((c / mx) * 10)) : 0;
  return "▰".repeat(filled) + "▱".repeat(10 - filled) + ` ${c}/${mx}`;
}

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();

    // Get all player data
    const allData = await db.getPlayerAllData?.(m.sender) || {};
    const claimed = allData.achievements?.claimed || [];

    if (subCmd === "claim") {
      const achId = m.args[1]?.toLowerCase();
      if (!achId) {
        return m.reply(novaRpgBox("achievement", `Mau klaim achievement mana?\n\nContoh: ${m.prefix}achievement claim first_blood`, "guide"));
      }

      const ach = ACHIEVEMENTS.find(a => a.id === achId);
      if (!ach) {
        await m.react("❌");
        return m.reply(novaRpgBox("achievement", "Achievement tidak ditemukan.", "error"));
      }

      if (claimed.includes(achId)) {
        return m.reply(novaRpgBox("achievement", `Achievement "${ach.name}" sudah diklaim.`, "error"));
      }

      if (!ach.check(allData)) {
        await m.react("❌");
        const prog = ach.progress ? `\n\n📊 Progress:\n${progBar(...ach.progress(allData))}` : "";
        return m.reply(novaRpgBox("achievement", `Belum memenuhi syarat: ${ach.desc}${prog}`, "error"));
      }

      // Apply reward
      if (ach.reward.gold) try { await db.addGold?.(m.sender, ach.reward.gold); } catch {}
      if (ach.reward.energi) try { await db.addEnergi?.(m.sender, ach.reward.energi); } catch {}

      claimed.push(achId);
      if (!allData.achievements) allData.achievements = {};
      allData.achievements.claimed = claimed;
      await db.setPlayerData?.(m.sender, "achievements", allData.achievements);

      await m.react("🐣");
      let msg = "";
      msg += `${ach.emoji} *${ach.name}*\n`;
      msg += `${ach.desc}\n`;
      msg += `\n`;
      msg += `Reward:\n`;
      if (ach.reward.gold) msg += `💰 +${ach.reward.gold} Gold\n`;
      if (ach.reward.energi) msg += `⚡ +${ach.reward.energi} Energi\n`;

      await animGeneric(m, sock, '🏆', 'Loading achievements');
      return m.reply(msg);
    }

    // LIST all achievements
    let msg = "";
    msg += `🏆 *ACHIEVEMENTS*\n`;
    msg += `Kumpulkan semua gelar!\n\n`;
    let unlocked = 0;
    let canClaim = 0;

    ACHIEVEMENTS.forEach(a => {
      const isClaimed = claimed.includes(a.id);
      const isUnlocked = a.check(allData);
      if (isClaimed) unlocked++;
      if (isUnlocked && !isClaimed) canClaim++;

      const status = isClaimed ? "✅" : (isUnlocked ? "🎁 KLAIM!" : "🔒");
      msg += `${a.emoji} ${a.name} ${status}\n`;
      msg += `${a.desc}\n`;
      if (!isClaimed && !isUnlocked && a.progress) {
        const [cur, target] = a.progress(allData);
        msg += `   ${progBar(cur, target)}\n`;
      }
    });

    msg += `\n`;
    msg += `Unlocked: *${unlocked}/${ACHIEVEMENTS.length}*\n`;
    msg += `Can claim: *${canClaim}*\n`;
    if (canClaim > 0) msg += `\n`;
    if (canClaim > 0) msg += `${m.prefix}achievement claim <id>\n`;

    await animGeneric(m, sock, '🏆', 'Loading achievements');
    return m.reply(msg);
  } catch (err) {
    console.error("achievement error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("achievement", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };