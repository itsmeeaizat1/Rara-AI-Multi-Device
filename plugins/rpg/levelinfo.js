// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// levelinfo.js — Lihat info level RPG
import { ensureRpg, getPlayerInfo } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import te from "../../src/lib/rara-error.js";
import { raraRpgBox, psStat } from "../../src/lib/rara-games.js";
import { generateLevelInfoCard, levelPreviewThumb } from "../../src/lib/rara-level.js";
import config from "../../config.js";

const pluginConfig = {
  name: "levelinfo",
  alias: ["levelinfo", "lvlinfo"],
  category: "rpg",
  description: "Lihat info level dan stats RPG",
  usage: ".levelinfo",
  example: ".levelinfo",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("levelinfo", "RPG belum siap. Ketik .daftar dulu.", "error"));

    let msg = "";
    msg += `👤 ${m.pushName || "Player"}\n`;
    msg += `\n`;
    msg += `📊 Level: ${rpg.level || 1}\n`;
    msg += psStat("✨", "EXP", rpg.exp || 0, rpg.expNext || 100) + "\n";
    msg += `💰 Gold: ${(rpg.gold || 0).toLocaleString("id-ID")}\n`;
    msg += `💎 Gems: ${rpg.gems || 0}\n`;
    msg += `\n`;
    msg += psStat("❤️", "HP", rpg.hp || 0, rpg.maxHp || 100) + "\n";
    msg += psStat("🔮", "Mana", rpg.mana || 0, rpg.maxMana || 50) + "\n";
    msg += psStat("⚡", "Energy", rpg.energy || 0, rpg.maxEnergy || 100) + "\n";
    msg += `\n`;
    msg += `👔 Job: ${rpg.job || "novice"} (Lv.${rpg.jobLevel || 1})\n`;
    msg += psStat("📖", "Job EXP", rpg.jobExp || 0, rpg.jobExpNext || 50) + "\n";
    if (rpg.skill) msg += `🃏 Skill: ${rpg.skill}\n`;

    await m.react("🐣");
    await animGeneric(m, sock, '📊', 'Loading level info');

    // 🖼️ KARTU DALAM PREVIEW (owner 15 Sep 2026): canvas stats ditanam di
    // externalAdReply thumbnail (renderLargerThumbnail) — cuma PREVIEW di
    // dalam bubble pesan, BUKAN media langsung → gak bisa disimpan ke galeri.
    let thumb = null;
    try {
      const card = await generateLevelInfoCard({ name: m.pushName || "Player", rpg });
      thumb = await levelPreviewThumb(card);
    } catch (e) {
      console.error("levelinfo card error:", e);
    }
    if (thumb) {
      try {
        return await m.reply(msg, {
          contextInfo: {
            externalAdReply: {
              title: config.bot?.name || "Rara AI - Multi Device",
              body: `Level ${rpg.level || 1} • ${rpg.job || "novice"}`,
              thumbnail: thumb,
              previewType: "PHOTO",
              showAdAttribution: false,
              renderLargerThumbnail: true,
            },
          },
        });
      } catch (e) {
        console.error("levelinfo preview error:", e);
      }
    }
    return m.reply(msg);
  } catch (err) {
    console.error("levelinfo error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("levelinfo", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };