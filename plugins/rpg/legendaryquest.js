// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// legendaryquest.js — Legendary Quest chain (7-part epic quest)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "legendaryquest",
  alias: ["legendaryquest", "legquest", "epicquest", "questlegend"],
  category: "rpg",
  description: "Legendary Quest — 7 stage epic quest chain dengan hadiah legendary",
  usage: ".legendaryquest (progress)\n.legendaryquest claim (klaim stage reward)",
  example: ".legendaryquest",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

const STAGES = [
  { id: 1, name: "Pembunuh Monster", emoji: "⚔️", desc: "Menang 10x di Arena", target: 10, check: (d) => (d.arena?.wins || 0) >= 10, reward: { gold: 2000, energi: 30 } },
  { id: 2, name: "Kolektor Crystal", emoji: "💎", desc: "Kumpulkan 5 crystal (mining)", target: 5, check: (d) => ((d.crafting?.materials?.crystal) || 0) >= 5, reward: { gold: 3000, energi: 40 } },
  { id: 3, name: "Juara Arena", emoji: "🏆", desc: "Menang 25x di Arena", target: 25, check: (d) => (d.arena?.wins || 0) >= 25, reward: { gold: 5000, energi: 50 } },
  { id: 4, name: "Craftsman", emoji: "🔨", desc: "Craft 5 items", target: 5, check: (d) => (d.crafting?.crafted || []).length >= 5, reward: { gold: 4000, energi: 30 } },
  { id: 5, name: "Dungeon Conqueror", emoji: "🏰", desc: "Clear 5 dungeon", target: 5, check: (d) => (d.dungeon?.clears || 0) >= 5, reward: { gold: 6000, energi: 60 } },
  { id: 6, name: "Master Fisher", emoji: "🎣", desc: "Tangkap 50 ikan", target: 50, check: (d) => (d.fishing?.totalCaught || 0) + (d.fishingv2?.totalCaught || 0) >= 50, reward: { gold: 8000, energi: 80 } },
  { id: 7, name: "Final Boss", emoji: "🐉", desc: "Kalahkan Final Boss (auto battle)", target: 1, check: null, reward: { gold: 50000, energi: 200 } },
];

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();

    const allData = await db.getPlayerAllData?.(m.sender) || {};
    let progress = await db.getPlayerData?.(m.sender, "legendaryquest") || { currentStage: 1, claimed: [] };

    if (subCmd === "claim" || subCmd === "klaim") {
      const stageId = progress.currentStage;
      const stage = STAGES.find(s => s.id === stageId);

      if (!stage) {
        await m.react("❌");
        return m.reply(claraWrap("legendaryquest", "Semua stage sudah selesai!", "error"));
      }

      // Stage 7 = Final Boss (auto battle)
      if (stage.id === 7 && !progress.claimed.includes(7)) {
        await m.react("🕒");
        await m.reply("🐉 Final Boss muncul... Memulai pertempuran...");
        await new Promise(r => setTimeout(r, 2000));

        const win = Math.random() > 0.3; // 70% win chance
        if (!win) {
          await m.react("❌");
          return m.reply(claraWrap("legendaryquest", "💀 Kamu kalah dari Final Boss! Latih lagi dan coba lagi."));
        }

        // Won - claim
        if (stage.reward.gold) try { await db.addGold?.(m.sender, stage.reward.gold); } catch {}
        if (stage.reward.energi) try { await db.addEnergi?.(m.sender, stage.reward.energi); } catch {}
        progress.claimed.push(7);
        progress.currentStage = 8; // complete
        progress.completed = true;
        await db.setPlayerData?.(m.sender, "legendaryquest", progress);

        await m.react("🐣");
        let msg = `╭─「 ʟᴇɢᴇɴᴅᴀʀʏ ǫᴜᴇsᴛ ᴄᴏᴍᴘʟᴇᴛᴇ! 」\n`;
        msg += `│ 🏆 🐉 Final Boss dikalahkan!\n`;
        msg += `│\n`;
        msg += `│ Title: *LEGENDARY HERO*\n`;
        msg += `│ Reward:\n`;
        if (stage.reward.gold) msg += `│ 💰 +${stage.reward.gold} Gold\n`;
        if (stage.reward.energi) msg += `│ ⚡ +${stage.reward.energi} Energi\n`;
        msg += `╰──────────`;
        return m.reply(msg);
      }

      // Stages 1-6: check requirement
      if (!stage.check || !stage.check(allData)) {
        await m.react("❌");
        return m.reply(claraWrap("legendaryquest", `Belum memenuhi syarat!\n\n${stage.emoji} ${stage.name}: ${stage.desc}`, "error"));
      }

      if (progress.claimed?.includes(stageId)) {
        return m.reply(claraWrap("legendaryquest", `Stage ${stageId} sudah diklaim.`, "error"));
      }

      // Claim
      if (stage.reward.gold) try { await db.addGold?.(m.sender, stage.reward.gold); } catch {}
      if (stage.reward.energi) try { await db.addEnergi?.(m.sender, stage.reward.energi); } catch {}
      progress.claimed.push(stageId);
      progress.currentStage = stageId + 1;
      await db.setPlayerData?.(m.sender, "legendaryquest", progress);

      await m.react("🐣");
      let msg = `╭─「 sᴛᴀɢᴇ ᴄʟᴀɪᴍ 」\n`;
      msg += `│ ${stage.emoji} Stage ${stage.id}: *${stage.name}*\n`;
      msg += `│ ✅ Berhasil diklaim!\n`;
      msg += `│\n`;
      if (stage.reward.gold) msg += `│ 💰 +${stage.reward.gold} Gold\n`;
      if (stage.reward.energi) msg += `│ ⚡ +${stage.reward.energi} Energi\n`;
      msg += `│\n`;
      const next = STAGES.find(s => s.id === stageId + 1);
      if (next) {
        msg += `│ Next: ${next.emoji} *${next.name}*\n`;
        msg += `│ ${next.desc}\n`;
      }
      msg += `╰──────────`;
      return m.reply(msg);
    }

    // PROGRESS (default)
    if (progress.completed) {
      let msg = `╭─「 ʟᴇɢᴇɴᴅᴀʀʏ ǫᴜᴇsᴛ 」\n`;
      msg += `│ 🏆 *COMPLETED!*\n`;
      msg += `│ Title: *LEGENDARY HERO*\n`;
      msg += `│ Semua 7 stage selesai!\n`;
      msg += `╰──────────`;
      return m.reply(msg);
    }

    const currentStage = STAGES.find(s => s.id === progress.currentStage);
    let msg = `╭─「 ʟᴇɢᴇɴᴅᴀʀʏ ǫᴜᴇsᴛ 」\n`;
    msg += `│ Progress: *${progress.currentStage - 1}/7* stages\n`;
    msg += `│\n`;

    STAGES.forEach(s => {
      const isDone = progress.claimed?.includes(s.id);
      const isCurrent = s.id === progress.currentStage;
      const isComplete = isDone || (s.check && s.check(allData));

      let status = "🔒";
      if (isDone) status = "✅";
      else if (isCurrent) status = isComplete ? "🎁" : "📋";

      msg += `│ ${s.emoji} Stage ${s.id}: ${s.name} ${status}\n`;
      msg += `│  ${s.desc}\n`;
      if (isCurrent && isComplete) {
        msg += `│  → ${m.prefix}legendaryquest claim\n`;
      }
    });

    msg += `│\n`;
    msg += `│ Reward akhir: *50,000g + 200 energi + Title*\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("legendaryquest error:", err);
    await m.react("❌");
    return m.reply(claraWrap("legendaryquest", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
